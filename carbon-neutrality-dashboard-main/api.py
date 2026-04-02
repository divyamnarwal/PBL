import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import MongoRealtimeRepository


load_dotenv()
app = FastAPI(title="Carbon Prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
repository = MongoRealtimeRepository(
    database_name=os.getenv("MONGODB_DATABASE", "realtimeDB"),
    source_collection=os.getenv("MONGODB_SOURCE_COLLECTION", "sensorData"),
    prediction_collection=os.getenv("MONGODB_PREDICTION_COLLECTION", "predictions"),
)


@app.get("/health")
def health() -> dict:
    repository.ping()
    return {"status": "ok"}


@app.get("/predictions/latest")
def latest_prediction() -> dict:
    prediction = repository.get_latest_prediction()
    if not prediction:
        return {"prediction": None}

    prediction["_id"] = str(prediction["_id"])
    if prediction.get("source_id") is not None:
        prediction["source_id"] = str(prediction["source_id"])
    return prediction
