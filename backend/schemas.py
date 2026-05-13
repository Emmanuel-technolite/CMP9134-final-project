from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "Viewer" # or "Commander"

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True
        
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
