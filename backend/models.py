from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

# The User model defines the data structure for creating or updating a user.
# It remains unchanged as it doesn't contain database-specific ID logic.
class User(BaseModel):
    username: str
    email: str
    google_id: Optional[str] = None
    profile_pic : Optional[str] = None
    password : Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- THIS IS THE FIX ---
# The UserOut model is used for API responses.
# It is now simplified to work with Firestore's string-based IDs.
class UserOut(BaseModel):
    id: str  # Changed from the complex ObjectId to a simple string
    username: str
    email: str
    profile_pic : Optional[str] = None
    # The complex Mongo-specific configuration has been removed.

# The Room and Message models remain unchanged as they are not tied
# to a specific database ID implementation.
class Room(BaseModel):
    room_id: str
    name: str
    members: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    room_id: str
    sender_id: str
    content: str
    content_type: str = "text"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "delivered"
