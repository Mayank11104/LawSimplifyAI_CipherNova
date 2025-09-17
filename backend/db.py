from motor.motor_asyncio import AsyncIOMotorClient 
from bson import ObjectId
from settings.config import settings




client = AsyncIOMotorClient(settings.DATABASE_URL) 

db=client["Genai_Hackathon"]
users=db["users"]


async def get_user_data(user_id:str):
    return await users.find_one({"_id": ObjectId(user_id)})