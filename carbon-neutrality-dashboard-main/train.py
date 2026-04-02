import json
import os
import time
from collections import deque
from typing import Optional

from bson import ObjectId
from dotenv import load_dotenv

from db import MongoRealtimeRepository
from model import CNNLSTMForecaster
from predict import PredictionService


class RealtimeTrainer:
    def __init__(self) -> None:
        self.window_size = int(os.getenv("MODEL_WINDOW_SIZE", "30"))
        self.bootstrap_limit = int(os.getenv("BOOTSTRAP_LIMIT", "5000"))
        self.poll_interval = float(os.getenv("POLL_INTERVAL_SECONDS", "3"))
        self.batch_size = int(os.getenv("TRAIN_BATCH_SIZE", "32"))
        self.incremental_epochs = int(os.getenv("INCREMENTAL_EPOCHS", "1"))
        self.initial_epochs = int(os.getenv("INITIAL_EPOCHS", "10"))
        self.sequence_buffer_limit = int(os.getenv("SEQUENCE_BUFFER_LIMIT", "1000"))
        self.min_new_records = int(os.getenv("MIN_NEW_RECORDS_FOR_TRAIN", "8"))
        self.use_change_streams = os.getenv("USE_CHANGE_STREAMS", "false").lower() == "true"
        self.state_path = os.getenv("TRAINER_STATE_PATH", "artifacts/realtime_model/state.json")

        self.repository = MongoRealtimeRepository(
            database_name=os.getenv("MONGODB_DATABASE", "realtimeDB"),
            source_collection=os.getenv("MONGODB_SOURCE_COLLECTION", "sensorData"),
            prediction_collection=os.getenv("MONGODB_PREDICTION_COLLECTION", "predictions"),
        )
        self.model = CNNLSTMForecaster(window_size=self.window_size)
        self.predictor = PredictionService(self.repository, self.model)
        self.buffer = deque(maxlen=self.sequence_buffer_limit)
        self.last_processed_id: Optional[ObjectId] = None

    def load_state(self) -> None:
        self.model.load()
        if not os.path.exists(self.state_path):
            return

        with open(self.state_path, "r", encoding="utf-8") as handle:
            state = json.load(handle)

        last_id = state.get("last_processed_id")
        self.last_processed_id = ObjectId(last_id) if last_id else None

    def save_state(self) -> None:
        os.makedirs(os.path.dirname(self.state_path), exist_ok=True)
        with open(self.state_path, "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "last_processed_id": str(self.last_processed_id) if self.last_processed_id else None,
                },
                handle,
            )
        self.model.save()

    def bootstrap(self) -> None:
        historical_records = self.repository.fetch_recent_sensor_data(limit=self.bootstrap_limit)
        if not historical_records:
            return

        for record in historical_records:
            self.buffer.append(record)

        self.last_processed_id = historical_records[-1]["_id"]

        frame = self.model.prepare_dataframe(historical_records)
        if self.model.model is None:
            self.model.initial_train(frame, epochs=self.initial_epochs, batch_size=self.batch_size)
        self.predictor.predict_and_store(list(self.buffer))
        self.save_state()

    def process_records(self, records: list[dict]) -> None:
        if not records:
            return

        for record in records:
            self.buffer.append(record)
            self.last_processed_id = record["_id"]

        if len(records) >= self.min_new_records or self.model.model is None:
            frame = self.model.prepare_dataframe(list(self.buffer))
            self.model.incremental_train(frame, epochs=self.incremental_epochs, batch_size=self.batch_size)

        prediction = self.predictor.predict_and_store(list(self.buffer))
        if prediction:
            print(
                f"Predicted next CO2={prediction['predicted_co2_level']:.2f} for {prediction['predicted_for'].isoformat()}",
                flush=True,
            )

        self.save_state()

    def run_polling(self) -> None:
        while True:
            records = self.repository.fetch_new_sensor_data(after_id=self.last_processed_id, limit=500)
            if records:
                self.process_records(records)
            time.sleep(self.poll_interval)

    def run_change_streams(self) -> None:
        for document in self.repository.watch_sensor_data():
            if self.last_processed_id is not None and document["_id"] <= self.last_processed_id:
                continue
            self.process_records([document])

    def run(self) -> None:
        self.repository.ping()
        self.load_state()

        if self.last_processed_id is None:
            self.bootstrap()

        if self.use_change_streams:
            self.run_change_streams()
        else:
            self.run_polling()


def main() -> None:
    load_dotenv()
    trainer = RealtimeTrainer()
    try:
        trainer.run()
    finally:
        trainer.repository.close()


if __name__ == "__main__":
    main()
