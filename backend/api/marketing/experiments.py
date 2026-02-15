"""Growth experiments routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from backend.database import get_db
from backend.auth import get_current_user_from_token
from backend.models.user import User

router = APIRouter()


@router.get("/experiments")
async def get_growth_experiments(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get growth experiments"""

    experiments = [
        {
            "id": "exp-1",
            "name": "Onboarding Flow V2",
            "hypothesis": "Simplified onboarding will increase completion rate",
            "status": "running",
            "start_date": "2024-02-01",
            "variants": [
                {"name": "Control", "users": 5000, "completion_rate": 68.5, "conversion": 12.3},
                {"name": "Simplified", "users": 5000, "completion_rate": 78.2, "conversion": 15.8}
            ],
            "significance": 95,
            "winner": "Simplified"
        },
        {
            "id": "exp-2",
            "name": "Push Timing Test",
            "hypothesis": "Evening push notifications have higher engagement",
            "status": "running",
            "start_date": "2024-02-03",
            "variants": [
                {"name": "Morning 9AM", "users": 3000, "open_rate": 28.5, "ctr": 7.2},
                {"name": "Evening 7PM", "users": 3000, "open_rate": 35.8, "ctr": 9.8},
                {"name": "Night 10PM", "users": 3000, "open_rate": 32.1, "ctr": 8.4}
            ],
            "significance": 92,
            "winner": "Evening 7PM"
        },
        {
            "id": "exp-3",
            "name": "Pricing Page Redesign",
            "hypothesis": "New pricing layout will increase premium conversions",
            "status": "completed",
            "start_date": "2024-01-15",
            "end_date": "2024-02-05",
            "variants": [
                {"name": "Control", "users": 8000, "conversion": 4.2},
                {"name": "New Layout", "users": 8000, "conversion": 5.8}
            ],
            "significance": 99,
            "winner": "New Layout",
            "implemented": True
        }
    ]

    if status:
        experiments = [e for e in experiments if e["status"] == status]

    return {"experiments": experiments}


@router.get("/experiments/{experiment_id}")
async def get_experiment_details(
    experiment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get detailed experiment results"""

    return {
        "id": experiment_id,
        "name": "Onboarding Flow V2",
        "hypothesis": "Simplified onboarding will increase completion rate",
        "status": "running",
        "metrics": {
            "primary": "onboarding_completion",
            "secondary": ["first_swipe", "first_match", "premium_conversion"]
        },
        "variants": [
            {
                "name": "Control",
                "users": 5000,
                "metrics": {
                    "onboarding_completion": 68.5,
                    "first_swipe": 85.2,
                    "first_match": 42.3,
                    "premium_conversion": 12.3
                }
            },
            {
                "name": "Simplified",
                "users": 5000,
                "metrics": {
                    "onboarding_completion": 78.2,
                    "first_swipe": 92.1,
                    "first_match": 48.7,
                    "premium_conversion": 15.8
                },
                "lift": {
                    "onboarding_completion": "+14.2%",
                    "first_swipe": "+8.1%",
                    "first_match": "+15.1%",
                    "premium_conversion": "+28.5%"
                }
            }
        ],
        "daily_data": [
            {"date": "2024-02-01", "control": 65.2, "treatment": 75.8},
            {"date": "2024-02-02", "control": 68.1, "treatment": 77.4},
            {"date": "2024-02-03", "control": 69.3, "treatment": 78.9},
            {"date": "2024-02-04", "control": 68.8, "treatment": 78.1},
            {"date": "2024-02-05", "control": 70.1, "treatment": 79.2}
        ]
    }
