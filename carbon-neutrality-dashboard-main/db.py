import os
from typing import Generator, Optional

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection


class MongoRealtimeRepository:
    def __init__(
        self,
        uri: Optional[str] = None,
        database_name: str = "realtimeDB",
        source_collection: str = "sensorData",
        prediction_collection: str = "predictions",
    ) -> None:
        self.uri = uri or os.environ["MONGODB_URI"]
        self.client = MongoClient(self.uri, maxPoolSize=20, serverSelectionTimeoutMS=5000)
        self.db = self.client[database_name]
        self.sensor_collection: Collection = self.db[source_collection]
        self.prediction_collection: Collection = self.db[prediction_collection]
        self._ensure_indexes()

    def _ensure_indexes(self) -> None:
        self.sensor_collection.create_index([("timestamp", DESCENDING)])
        self.prediction_collection.create_index([("generated_at", DESCENDING)])
        self.prediction_collection.create_index([("source_id", ASCENDING)], unique=False)

    def ping(self) -> None:
        self.client.admin.command("ping")

    def fetch_recent_sensor_data(self, limit: int = 5000) -> list[dict]:
        cursor = (
            self.sensor_collection.find({})
            .sort([("timestamp", ASCENDING), ("_id", ASCENDING)])
            .limit(limit)
        )
        return list(cursor)

    def fetch_new_sensor_data(self, after_id=None, limit: int = 500) -> list[dict]:
        query = {"_id": {"$gt": after_id}} if after_id is not None else {}
        cursor = self.sensor_collection.find(query).sort([("_id", ASCENDING)]).limit(limit)
        return list(cursor)

    def insert_prediction(self, prediction: dict) -> None:
        self.prediction_collection.insert_one(prediction)

    def get_latest_prediction(self) -> Optional[dict]:
        return self.prediction_collection.find_one(sort=[("generated_at", DESCENDING)])

    def watch_sensor_data(self) -> Generator[dict, None, None]:
        pipeline = [{"$match": {"operationType": "insert"}}]
        with self.sensor_collection.watch(pipeline, full_document="updateLookup") as stream:
            for change in stream:
                full_document = change.get("fullDocument")
                if full_document:
                    yield full_document

    def close(self) -> None:
        self.client.close()
