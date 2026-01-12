from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class BlockCreate(BaseModel):
    user_id: UUID
    reason: Optional[str] = None

class ReportCreate(BaseModel):
    user_id: UUID
    reason: str = Field(..., description="Reason for reporting (e.g. spam, abuse)")
    description: Optional[str] = Field(None, description="Detailed description")

class BlockResponse(BaseModel):
    success: bool
    message: str

class ReportResponse(BaseModel):
    success: bool
    report_id: UUID
    message: str
