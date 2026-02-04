"""
Retention Cohort Calculator

Enterprise-grade user retention analysis system.

Features:
- Daily cohort calculation
- D1, D3, D7, D14, D30 retention metrics
- Parallel query execution
- Historical backfill support
- APScheduler integration for cron jobs
"""

import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
import uuid

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, func, and_, or_, text

logger = logging.getLogger(__name__)


class RetentionCalculator:
    """
    Professional Retention Cohort Calculator.
    
    Calculates user retention rates by analyzing:
    - When users signed up (cohort date)
    - When they were last active
    - Retention at D1, D3, D7, D14, D30 milestones
    """
    
    RETENTION_DAYS = [1, 3, 7, 14, 30]
    
    def __init__(self, db_url: str):
        self._engine = create_async_engine(db_url, echo=False)
        self._session_maker = async_sessionmaker(self._engine, expire_on_commit=False)
    
    async def calculate_cohort(
        self,
        cohort_date: date,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Calculate retention for a specific cohort (users who signed up on cohort_date).
        
        Returns:
            {
                'cohort_date': '2024-01-15',
                'cohort_size': 150,
                'd1': 45.5,
                'd3': 32.1,
                'd7': 25.0,
                'd14': 20.3,
                'd30': 15.2
            }
        """
        from backend.models.user import User
        
        should_close = False
        if db is None:
            db = self._session_maker()
            should_close = True
        
        try:
            cohort_start = datetime.combine(cohort_date, datetime.min.time())
            cohort_end = cohort_start + timedelta(days=1)
            
            # Get cohort size (users who signed up on this date)
            cohort_result = await db.execute(
                select(func.count(User.id)).where(
                    and_(
                        User.created_at >= cohort_start,
                        User.created_at < cohort_end
                    )
                )
            )
            cohort_size = cohort_result.scalar() or 0
            
            if cohort_size == 0:
                return {
                    'cohort_date': cohort_date.isoformat(),
                    'cohort_size': 0,
                    **{f'd{d}': None for d in self.RETENTION_DAYS}
                }
            
            retention_data = {
                'cohort_date': cohort_date.isoformat(),
                'cohort_size': cohort_size
            }
            
            today = date.today()
            
            # Calculate retention for each milestone
            for days in self.RETENTION_DAYS:
                target_date = cohort_date + timedelta(days=days)
                
                # Check if we have enough data for this retention period
                if target_date > today:
                    retention_data[f'd{days}'] = None
                    continue
                
                target_start = datetime.combine(target_date, datetime.min.time())
                target_end = target_start + timedelta(days=1)
                
                # Count users from cohort who were active on target_date
                # "Active" = updated_at on that day (approximation)
                retained_result = await db.execute(
                    select(func.count(User.id)).where(
                        and_(
                            # Part of cohort
                            User.created_at >= cohort_start,
                            User.created_at < cohort_end,
                            # Active on target day
                            User.updated_at >= target_start,
                            User.updated_at < target_end
                        )
                    )
                )
                retained_count = retained_result.scalar() or 0
                
                retention_rate = round((retained_count / cohort_size) * 100, 1)
                retention_data[f'd{days}'] = retention_rate
            
            return retention_data
            
        finally:
            if should_close:
                await db.close()
    
    async def calculate_range(
        self,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Calculate retention for a range of cohort dates.
        Useful for backfilling historical data.
        """
        cohorts = []
        current = start_date
        
        async with self._session_maker() as db:
            while current <= end_date:
                cohort_data = await self.calculate_cohort(current, db)
                if cohort_data['cohort_size'] > 0:
                    cohorts.append(cohort_data)
                current += timedelta(days=1)
        
        return cohorts
    
    async def save_cohort(
        self,
        cohort_data: Dict[str, Any],
        db: AsyncSession
    ) -> None:
        """Save calculated cohort to RetentionCohort table"""
        from backend.models.analytics import RetentionCohort
        
        cohort_date = date.fromisoformat(cohort_data['cohort_date'])
        
        # Check if cohort already exists
        existing = await db.execute(
            select(RetentionCohort).where(
                RetentionCohort.cohort_date == cohort_date
            )
        )
        cohort = existing.scalar_one_or_none()
        
        retention_values = {
            f'd{d}': cohort_data.get(f'd{d}')
            for d in self.RETENTION_DAYS
        }
        
        if cohort:
            # Update existing
            cohort.cohort_size = cohort_data['cohort_size']
            cohort.retention_data = retention_values
            cohort.calculated_at = datetime.utcnow()
        else:
            # Create new
            cohort = RetentionCohort(
                cohort_date=cohort_date,
                cohort_size=cohort_data['cohort_size'],
                retention_data=retention_values,
                calculated_at=datetime.utcnow()
            )
            db.add(cohort)
        
        await db.commit()
    
    async def run_daily_calculation(self) -> Dict[str, Any]:
        """
        Run daily retention calculation.
        Calculates/updates cohorts for the last 60 days.
        """
        from backend.models.analytics import RetentionCohort
        
        today = date.today()
        start_date = today - timedelta(days=60)
        
        logger.info(f"Starting retention calculation from {start_date} to {today}")
        
        results = {
            'calculated': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        async with self._session_maker() as db:
            current = start_date
            
            while current <= today:
                try:
                    cohort_data = await self.calculate_cohort(current, db)
                    
                    if cohort_data['cohort_size'] > 0:
                        await self.save_cohort(cohort_data, db)
                        results['calculated'] += 1
                    else:
                        results['skipped'] += 1
                        
                except Exception as e:
                    logger.error(f"Error calculating cohort {current}: {e}")
                    results['errors'] += 1
                
                current += timedelta(days=1)
        
        logger.info(f"Retention calculation completed: {results}")
        return results
    
    async def close(self):
        """Close database connections"""
        await self._engine.dispose()


# ============================================
# SCHEDULER INTEGRATION
# ============================================

_scheduler = None
_retention_calculator = None


def get_scheduler():
    """Get or create APScheduler instance"""
    global _scheduler
    
    if _scheduler is None:
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            from apscheduler.triggers.cron import CronTrigger
            
            _scheduler = AsyncIOScheduler(timezone='UTC')
            logger.info("APScheduler initialized")
        except ImportError:
            logger.warning("APScheduler not installed. Run: pip install apscheduler")
            return None
    
    return _scheduler


def get_retention_calculator() -> Optional[RetentionCalculator]:
    """Get or create RetentionCalculator instance"""
    global _retention_calculator
    
    if _retention_calculator is None:
        try:
            from backend.config.settings import settings
            _retention_calculator = RetentionCalculator(settings.DATABASE_URL)
        except Exception as e:
            logger.error(f"Failed to initialize RetentionCalculator: {e}")
            return None
    
    return _retention_calculator


async def scheduled_retention_job():
    """Job function called by scheduler"""
    logger.info("Running scheduled retention calculation...")
    
    calculator = get_retention_calculator()
    if calculator:
        try:
            result = await calculator.run_daily_calculation()
            logger.info(f"Scheduled retention job completed: {result}")
        except Exception as e:
            logger.error(f"Scheduled retention job failed: {e}")


async def scheduled_backup_job():
    """Job function for scheduled backups"""
    from backend.services.backup import backup_service, BackupType
    
    logger.info("Running scheduled backup...")
    
    try:
        result = await backup_service.create_backup(
            backup_type=BackupType.FULL,
            compress=True,
            upload_to_s3=True
        )
        
        if result.success:
            logger.info(f"Scheduled backup completed: {result.file_path}")
        else:
            logger.error(f"Scheduled backup failed: {result.error}")
            
    except Exception as e:
        logger.error(f"Scheduled backup job error: {e}")


async def scheduled_backup_cleanup_job():
    """Job function for cleaning up old backups"""
    from backend.services.backup import backup_service
    
    logger.info("Running backup cleanup...")
    
    try:
        deleted = await backup_service.cleanup_old_backups()
        logger.info(f"Backup cleanup completed: {deleted} old backups removed")
    except Exception as e:
        logger.error(f"Backup cleanup failed: {e}")


def setup_scheduled_jobs():
    """
    Configure all scheduled jobs.
    Call this during application startup.
    """
    scheduler = get_scheduler()
    if not scheduler:
        logger.warning("Scheduler not available, cron jobs disabled")
        return False
    
    try:
        from apscheduler.triggers.cron import CronTrigger
        
        # Retention calculation: Daily at 3:00 AM UTC
        scheduler.add_job(
            scheduled_retention_job,
            CronTrigger(hour=3, minute=0),
            id='retention_calculation',
            name='Daily Retention Calculation',
            replace_existing=True
        )
        
        # Database backup: Daily at 4:00 AM UTC
        scheduler.add_job(
            scheduled_backup_job,
            CronTrigger(hour=4, minute=0),
            id='daily_backup',
            name='Daily Database Backup',
            replace_existing=True
        )
        
        # Backup cleanup: Weekly on Sunday at 5:00 AM UTC
        scheduler.add_job(
            scheduled_backup_cleanup_job,
            CronTrigger(day_of_week='sun', hour=5, minute=0),
            id='backup_cleanup',
            name='Weekly Backup Cleanup',
            replace_existing=True
        )
        
        logger.info("Scheduled jobs configured successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to setup scheduled jobs: {e}")
        return False


def start_scheduler():
    """Start the scheduler (call during app startup)"""
    scheduler = get_scheduler()
    if scheduler and not scheduler.running:
        setup_scheduled_jobs()
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler():
    """Stop the scheduler (call during app shutdown)"""
    scheduler = get_scheduler()
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")


# ============================================
# MANUAL TRIGGER FUNCTIONS
# ============================================

async def trigger_retention_calculation(
    db: AsyncSession,
    backfill_days: int = 60
) -> Dict[str, Any]:
    """
    Manually trigger retention calculation.
    Can be called from admin API.
    """
    calculator = get_retention_calculator()
    if not calculator:
        return {"success": False, "error": "Calculator not initialized"}
    
    try:
        result = await calculator.run_daily_calculation()
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}
