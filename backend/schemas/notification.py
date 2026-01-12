
from pydantic import BaseModel, HttpUrl

class PushKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionCreate(BaseModel):
    endpoint: str  # Can be long URL, string is fine. HttpUrl sometimes strict.
    keys: PushKeys

class PushSubscriptionResponse(BaseModel):
    id: str
    endpoint: str
