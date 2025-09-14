from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema



class PydanticObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.is_instance_schema(ObjectId),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )



class User(BaseModel):
    username: str
    email: str
    google_id: Optional[str] = None
    profile_pic : Optional[str] = None
    password : Optional[str] = None
    created_at: datetime = datetime.now(timezone.utc)

class MongoBaseModel(BaseModel):
    id: PydanticObjectId = Field(alias="_id")

    class Config:
        model_config = {
            "json_encoders": {ObjectId: str},
            "populate_by_name": True,
        }    

class UserOut(MongoBaseModel):
    
    username: str
    email: str
    profile_pic : Optional[str] = None

class Room(BaseModel):
    room_id: str
    name: str
    members: List[str] = []
    created_at: datetime = datetime.now(timezone.utc)

class Message(BaseModel):
    room_id: str
    sender_id: str
    content: str
    content_type: str = "text"
    timestamp: datetime = datetime.now(timezone.utc)
    status: str = "delivered"
