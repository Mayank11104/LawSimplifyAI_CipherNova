# from motor.motor_asyncio import AsyncIOMotorClient 
# from bson import ObjectId
# from settings.config import settings




# client = AsyncIOMotorClient(settings.DATABASE_URL) 

# db=client["Genai_Hackathon"]
# users=db["users"]


# async def get_user_data(user_id:str):
#     return await users.find_one({"_id": ObjectId(user_id)})
# 1. Import the main 'firestore' module
from google.cloud import firestore

# When running on Cloud Run, the client automatically finds the
# correct project and credentials from the environment.
# No connection string or setup is needed.

# 2. Instantiate the AsyncClient class from the firestore module
db = firestore.AsyncClient()
users_ref = db.collection("users")


async def get_user_data(user_id: str):
    """
    Fetches a user document from Firestore by its unique ID.
    """
    # In Firestore, you get a document directly by its ID.
    # There's no need to convert the ID to an ObjectId.
    doc_ref = users_ref.document(user_id)
    doc = await doc_ref.get()

    if not doc.exists:
        return None
    
    

    # Combine the document data with its ID for a consistent data structure.
    user_data = doc.to_dict()

    if user_data is None:
        user_data = {}

    user_data["id"] = doc.id
    return user_data
