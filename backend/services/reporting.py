
import os
import uuid
import pandas as pd
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from tempfile import NamedTemporaryFile

from backend.database import AsyncSessionLocal
from backend.models.advanced import CustomReport, AIUsageLog
from backend.models import User
from backend.crud import advanced as advanced_crud

async def generate_report_task(report_id: uuid.UUID):
    """
    Background task to generate a report file.
    """
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

async def _fetch_data_for_report(db: AsyncSession, report: CustomReport) -> pd.DataFrame:
    report_type = report.report_type
    
    if report_type == "user_analytics":
        # Example: Users by date
        stmt = select(User.created_at, User.email, User.name, User.gender)
        result = await db.execute(stmt)
        data = result.all()
        return pd.DataFrame(data, columns=["Created At", "Email", "Name", "Gender"])
        
    elif report_type == "financial":
        # Mock financial data
        return pd.DataFrame([
            {"Date": "2024-01-01", "Revenue": 100.0, "Source": "Subscription"},
            {"Date": "2024-01-02", "Revenue": 150.0, "Source": "Subscription"},
        ])
        
    elif report_type == "marketing":
        # Mock marketing
        return pd.DataFrame([
             {"Campaign": "Instagram", "Clicks": 1200, "Conversions": 50},
             {"Campaign": "TikTok", "Clicks": 5000, "Conversions": 10}
        ])
        
    elif report_type == "ai_usage":
        stmt = select(AIUsageLog.timestamp, AIUsageLog.feature, AIUsageLog.model, AIUsageLog.tokens_used, AIUsageLog.cost)
        result = await db.execute(stmt)
        data = result.all()
        return pd.DataFrame(data, columns=["Timestamp", "Feature", "Model", "Tokens", "Cost"])

    else:
        return pd.DataFrame([{"Error": "Unknown report type"}])
