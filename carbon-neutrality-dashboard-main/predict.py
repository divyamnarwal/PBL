from datetime import datetime, timedelta, timezone
from typing import Optional

import pandas as pd

from db import MongoRealtimeRepository
from model import CNNLSTMForecaster


class PredictionService:
    def __init__(self, repository: MongoRealtimeRepository, model: CNNLSTMForecaster) -> None:
        self.repository = repository
        self.model = model

    def predict_and_store(self, recent_records: list[dict]) -> Optional[dict]:
        frame = self.model.prepare_dataframe(recent_records)
        predicted_co2 = self.model.predict_next(frame)
        if predicted_co2 is None or frame.empty:
            return None

        latest = frame.iloc[-1]
        interval = self._estimate_interval(frame)
        source_record = recent_records[-1]

        document = {
            "source_id": source_record.get("_id"),
            "source_timestamp": latest["timestamp"].to_pydatetime(),
            "predicted_co2_level": float(predicted_co2),
            "input_co2_level": float(latest["co2_level"]),
            "temperature": float(latest["temperature"]),
            "humidity": float(latest["humidity"]),
            "location": source_record.get("location", "default"),
            "predicted_for": latest["timestamp"].to_pydatetime() + interval,
            "generated_at": datetime.now(timezone.utc),
            "model_name": "cnn_lstm_hybrid",
            "window_size": self.model.window_size,
        }
        self.repository.insert_prediction(document)
        return document

    def _estimate_interval(self, frame: pd.DataFrame) -> timedelta:
        if len(frame) < 2:
            return timedelta(minutes=1)

        deltas = frame["timestamp"].diff().dropna()
        if deltas.empty:
            return timedelta(minutes=1)

        median_delta = deltas.median()
        return median_delta.to_pytimedelta()
