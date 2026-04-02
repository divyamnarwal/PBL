import json
import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient


SOURCE_DB = os.getenv("SOURCE_DB", "test")
SOURCE_COLLECTION = os.getenv("SOURCE_COLLECTION", "co2readings")
TARGET_DB = os.getenv("MONGODB_DATABASE", "realtimeDB")
TARGET_COLLECTION = os.getenv("MONGODB_SOURCE_COLLECTION", "sensorData")
POLL_INTERVAL = float(os.getenv("SYNC_POLL_INTERVAL_SECONDS", "3"))


def to_document(source: dict) -> dict:
    temperature = source.get("temperature", source.get("temp"))
    humidity = source.get("humidity")
    return {
        "source_id": source.get("_id"),
        "co2_level": float(source.get("co2", source.get("co2_level", 0.0))),
        "temperature": float(temperature) if temperature is not None else 0.0,
        "humidity": float(humidity) if humidity is not None else 0.0,
        "timestamp": source.get("timestamp") or datetime.now(timezone.utc),
        "location": source.get("location", "lab-1"),
        "status": source.get("status", "OK"),
        "sensor": source.get("sensor", "MH-Z19B"),
        "created_at": datetime.now(timezone.utc),
    }


def main() -> None:
    load_dotenv()
    client = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=5000)
    source = client[SOURCE_DB][SOURCE_COLLECTION]
    target = client[TARGET_DB][TARGET_COLLECTION]
    target.create_index("source_id", unique=True)
    target.create_index("timestamp")

    last_seen = None

    recent = list(source.find({}).sort([("_id", -1)]).limit(1000))
    recent.reverse()
    if recent:
        for record in recent:
            target.update_one(
                {"source_id": record["_id"]},
                {"$setOnInsert": to_document(record)},
                upsert=True,
            )
        last_seen = recent[-1]["_id"]

    print("sync_sensor_data started", flush=True)

    while True:
        query = {"_id": {"$gt": last_seen}} if last_seen is not None else {}
        new_records = list(source.find(query).sort([("_id", 1)]).limit(500))
        for record in new_records:
            target.update_one(
                {"source_id": record["_id"]},
                {"$setOnInsert": to_document(record)},
                upsert=True,
            )
            last_seen = record["_id"]
            print(f"synced {record['_id']}", flush=True)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
