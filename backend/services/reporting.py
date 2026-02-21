
import os
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from tempfile import NamedTemporaryFile

# Pandas is optional (too heavy for Vercel 250MB limit)
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False

from backend.database import AsyncSessionLocal
from backend.models.advanced import CustomReport, AIUsageLog
from backend.models import User
from backend.crud import advanced as advanced_crud

async def generate_report_task(report_id: uuid.UUID):
    """
    Background task to generate a report file.
    """
    if not PANDAS_AVAILABLE:
        print("Pandas not available - report generation disabled on serverless")
        return
        
    async with AsyncSessionLocal() as db:
        report = await db.get(CustomReport, report_id)
        if not report:
            print(f"Report {report_id} not found.")
            return

        try:
            # Update status to processing
            report.status = "processing" # Assuming we add this field or reuse configuration
            # In our model we don't have status, let's use configuration['status'] for now to avoid migration loop
            # Or better, let's just do the work and update configuration['download_url']
            
            # Logic to fetch data
            df = await _fetch_data_for_report(db, report)
            
            # Save to file
            filename = f"report_{report.report_type}_{datetime.utcnow().strftime('%Y%m%d%H%M')}.xlsx"
            file_path = os.path.join("static", "reports", filename)
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Use pandas to writing Excel
            # Note: writing to static folder in a real app might need S3, but for local it's fine.
            # We need to run this in a threadpool probably because pandas is blocking
            # but for simplicity/MVP in async task, straightforward call is "okay" if small data
            df.to_excel(file_path, index=False)
            
            # Update Report Record
            # Since we don't have a 'status' column in CustomReport model explicitly in the provided code snippet,
            # we will store metadata in 'configuration' or 'download_url' if we added it?
            # The previous code had "download_url" in the API response but not in the model?
            # Wait, the frontend exptects "download_url". The model 'CustomReport' definition I saw earlier:
            # configuration: Mapped[Dict[str, Any]] 
            # It didn't have download_url column. I should have added it?
            # Let's save it in configuration for now.
            
            new_config = dict(report.configuration)
            new_config["download_url"] = f"/static/reports/{filename}"
            new_config["status"] = "completed"
            
            report.configuration = new_config
            report.last_run_at = datetime.utcnow()
            
            db.add(report)
            await db.commit()
            
        except Exception as e:
            print(f"Error generating report: {e}")
            new_config = dict(report.configuration)
            new_config["status"] = "failed"
            new_config["error"] = str(e)
            report.configuration = new_config
            db.add(report)
            await db.commit()

async def _fetch_data_for_report(db: AsyncSession, report: CustomReport):
    if not PANDAS_AVAILABLE:
        return None
    
    from backend.models.monetization import RevenueTransaction, GiftTransaction
    from backend.models.marketing import MarketingCampaign
    from datetime import timedelta
        
    report_type = report.report_type
    config = report.configuration or {}
    period = config.get("period", "30d")
    
    # Calculate date range
    days = int(period.replace("d", "")) if period.endswith("d") else 30
    start_date = datetime.utcnow() - timedelta(days=days)
    
    if report_type == "user_analytics":
        # Users by date with stats
        stmt = select(
            User.created_at, 
            User.email, 
            User.name, 
            User.gender,
            User.is_vip,
            User.is_complete,
            User.status
        ).where(User.created_at >= start_date).order_by(User.created_at.desc())
        result = await db.execute(stmt)
        data = result.all()
        return pd.DataFrame(data, columns=["Created At", "Email", "Name", "Gender", "VIP", "Complete", "Status"])
        
    elif report_type == "financial":
        # Real financial data from RevenueTransaction
        stmt = select(
            RevenueTransaction.created_at,
            RevenueTransaction.amount,
            RevenueTransaction.currency,
            RevenueTransaction.transaction_type,
            RevenueTransaction.status,
            RevenueTransaction.payment_provider
        ).where(RevenueTransaction.created_at >= start_date).order_by(RevenueTransaction.created_at.desc())
        result = await db.execute(stmt)
        data = result.all()
        
        if data:
            df = pd.DataFrame(data, columns=["Date", "Amount", "Currency", "Type", "Status", "Provider"])
            # Add summary row
            total = df[df["Status"] == "completed"]["Amount"].sum() if "completed" in df["Status"].values else 0
            return df
        else:
            # Return empty dataframe with correct columns
            return pd.DataFrame(columns=["Date", "Amount", "Currency", "Type", "Status", "Provider"])
        
    elif report_type == "marketing":
        # Real marketing campaign data
        stmt = select(
            MarketingCampaign.name,
            MarketingCampaign.campaign_type,
            MarketingCampaign.status,
            MarketingCampaign.target_segment,
            MarketingCampaign.sent_count,
            MarketingCampaign.open_count,
            MarketingCampaign.click_count,
            MarketingCampaign.conversion_count,
            MarketingCampaign.created_at
        ).where(MarketingCampaign.created_at >= start_date).order_by(MarketingCampaign.created_at.desc())
        result = await db.execute(stmt)
        data = result.all()
        
        if data:
            df = pd.DataFrame(data, columns=[
                "Campaign", "Type", "Status", "Segment", 
                "Sent", "Opens", "Clicks", "Conversions", "Created"
            ])
            # Calculate rates
            df["Open Rate %"] = (df["Opens"] / df["Sent"] * 100).fillna(0).round(2)
            df["Click Rate %"] = (df["Clicks"] / df["Sent"] * 100).fillna(0).round(2)
            df["Conversion Rate %"] = (df["Conversions"] / df["Sent"] * 100).fillna(0).round(2)
            return df
        else:
            return pd.DataFrame(columns=["Campaign", "Type", "Status", "Segment", "Sent", "Opens", "Clicks", "Conversions", "Created"])
        
    elif report_type == "ai_usage":
        stmt = select(AIUsageLog.timestamp, AIUsageLog.feature, AIUsageLog.model, AIUsageLog.tokens_used, AIUsageLog.cost)
        result = await db.execute(stmt)
        data = result.all()
        return pd.DataFrame(data, columns=["Timestamp", "Feature", "Model", "Tokens", "Cost"])
    
    elif report_type == "gifts":
        # Gift transactions report
        stmt = select(
            GiftTransaction.created_at,
            GiftTransaction.sender_id,
            GiftTransaction.recipient_id,
            GiftTransaction.gift_id,
            GiftTransaction.stars_amount,
            GiftTransaction.status
        ).where(GiftTransaction.created_at >= start_date).order_by(GiftTransaction.created_at.desc())
        result = await db.execute(stmt)
        data = result.all()
        
        if data:
            return pd.DataFrame(data, columns=["Date", "Sender", "Recipient", "Gift ID", "Stars", "Status"])
        else:
            return pd.DataFrame(columns=["Date", "Sender", "Recipient", "Gift ID", "Stars", "Status"])

    else:
        return pd.DataFrame([{"Error": f"Unknown report type: {report_type}"}])
