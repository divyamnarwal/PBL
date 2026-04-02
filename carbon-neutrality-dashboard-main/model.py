import json
import os
import pickle
from dataclasses import dataclass
from typing import Iterable, Optional

import numpy as np
import pandas as pd
import torch
from sklearn.preprocessing import StandardScaler
from torch import nn
from torch.utils.data import DataLoader, TensorDataset


@dataclass
class ModelArtifacts:
    model_path: str
    feature_scaler_path: str
    target_scaler_path: str
    metadata_path: str


class CNNLSTMRegressor(nn.Module):
    def __init__(self, input_features: int) -> None:
        super().__init__()
        self.conv1 = nn.Conv1d(input_features, 64, kernel_size=3, padding=1)
        self.conv2 = nn.Conv1d(64, 32, kernel_size=3, padding=1)
        self.relu = nn.ReLU()
        self.pool = nn.MaxPool1d(kernel_size=2)
        self.lstm = nn.LSTM(input_size=32, hidden_size=64, batch_first=True)
        self.dropout = nn.Dropout(p=0.2)
        self.head = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        x = inputs.transpose(1, 2)
        x = self.relu(self.conv1(x))
        x = self.pool(x)
        x = self.relu(self.conv2(x))
        x = x.transpose(1, 2)
        x, _ = self.lstm(x)
        x = x[:, -1, :]
        x = self.dropout(x)
        return self.head(x)


class CNNLSTMForecaster:
    def __init__(
        self,
        window_size: int = 30,
        feature_columns: Optional[list[str]] = None,
        artifact_dir: str = "artifacts/realtime_model",
        learning_rate: float = 1e-3,
    ) -> None:
        self.window_size = window_size
        self.feature_columns = feature_columns or ["co2_level", "temperature", "humidity"]
        self.target_column = "co2_level"
        self.feature_scaler = StandardScaler()
        self.target_scaler = StandardScaler()
        self.model = None
        self.learning_rate = learning_rate
        self.artifact_dir = artifact_dir
        self.scalers_fitted = False
        self.training_steps = 0
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.loss_fn = nn.MSELoss()
        self.optimizer = None

    def artifacts(self) -> ModelArtifacts:
        return ModelArtifacts(
            model_path=os.path.join(self.artifact_dir, "cnn_lstm.pt"),
            feature_scaler_path=os.path.join(self.artifact_dir, "feature_scaler.pkl"),
            target_scaler_path=os.path.join(self.artifact_dir, "target_scaler.pkl"),
            metadata_path=os.path.join(self.artifact_dir, "metadata.json"),
        )

    def prepare_dataframe(self, records: Iterable[dict]) -> pd.DataFrame:
        frame = pd.DataFrame(list(records))
        if frame.empty:
            return frame

        frame = frame.copy()
        frame["co2_level"] = pd.to_numeric(
            frame.get("co2_level", frame.get("co2")), errors="coerce"
        )
        frame["temperature"] = pd.to_numeric(
            frame.get("temperature", frame.get("temp")), errors="coerce"
        )
        frame["humidity"] = pd.to_numeric(frame.get("humidity"), errors="coerce")
        frame["timestamp"] = pd.to_datetime(frame.get("timestamp"), utc=True, errors="coerce")

        frame = frame.dropna(subset=["timestamp"]).sort_values("timestamp").reset_index(drop=True)
        frame = frame.drop_duplicates(subset=["timestamp"], keep="last")

        numeric_columns = ["co2_level", "temperature", "humidity"]
        frame[numeric_columns] = frame[numeric_columns].ffill().bfill()
        medians = frame[numeric_columns].median(numeric_only=True)
        frame[numeric_columns] = frame[numeric_columns].fillna(medians).fillna(0.0)

        return frame

    def build_model(self, feature_count: int) -> None:
        self.model = CNNLSTMRegressor(feature_count).to(self.device)
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=self.learning_rate)

    def _fit_scalers(self, frame: pd.DataFrame) -> None:
        feature_values = frame[self.feature_columns].to_numpy(dtype=np.float32)
        target_values = frame[[self.target_column]].to_numpy(dtype=np.float32)

        if not self.scalers_fitted:
            self.feature_scaler.fit(feature_values)
            self.target_scaler.fit(target_values)
            self.scalers_fitted = True
        else:
            self.feature_scaler.partial_fit(feature_values)
            self.target_scaler.partial_fit(target_values)

    def create_sequences(self, frame: pd.DataFrame, update_scalers: bool) -> tuple[np.ndarray, np.ndarray]:
        if frame.empty or len(frame) <= self.window_size:
            return np.empty((0, self.window_size, len(self.feature_columns))), np.empty((0, 1))

        if update_scalers:
            self._fit_scalers(frame)

        features = self.feature_scaler.transform(frame[self.feature_columns].to_numpy(dtype=np.float32))
        targets = self.target_scaler.transform(frame[[self.target_column]].to_numpy(dtype=np.float32))

        x_values = []
        y_values = []

        for index in range(self.window_size, len(frame)):
            x_values.append(features[index - self.window_size : index])
            y_values.append(targets[index])

        return np.asarray(x_values, dtype=np.float32), np.asarray(y_values, dtype=np.float32)

    def _fit_model(self, x_values: np.ndarray, y_values: np.ndarray, epochs: int, batch_size: int) -> None:
        dataset = TensorDataset(
            torch.tensor(x_values, dtype=torch.float32),
            torch.tensor(y_values, dtype=torch.float32),
        )
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=False)

        self.model.train()
        for _ in range(epochs):
            for batch_x, batch_y in loader:
                batch_x = batch_x.to(self.device)
                batch_y = batch_y.to(self.device)
                self.optimizer.zero_grad()
                predictions = self.model(batch_x)
                loss = self.loss_fn(predictions, batch_y)
                loss.backward()
                self.optimizer.step()

    def initial_train(self, frame: pd.DataFrame, epochs: int = 20, batch_size: int = 32) -> bool:
        x_values, y_values = self.create_sequences(frame, update_scalers=True)
        if len(x_values) == 0:
            return False

        if self.model is None:
            self.build_model(feature_count=x_values.shape[-1])

        self._fit_model(x_values, y_values, epochs=epochs, batch_size=batch_size)
        self.training_steps += len(x_values)
        return True

    def incremental_train(self, frame: pd.DataFrame, epochs: int = 1, batch_size: int = 16) -> bool:
        x_values, y_values = self.create_sequences(frame, update_scalers=True)
        if len(x_values) == 0:
            return False

        if self.model is None:
            self.build_model(feature_count=x_values.shape[-1])

        self._fit_model(x_values, y_values, epochs=epochs, batch_size=batch_size)
        self.training_steps += len(x_values)
        return True

    def predict_next(self, frame: pd.DataFrame) -> Optional[float]:
        if self.model is None or not self.scalers_fitted or len(frame) < self.window_size:
            return None

        latest = frame.tail(self.window_size)
        features = self.feature_scaler.transform(latest[self.feature_columns].to_numpy(dtype=np.float32))
        sequence = torch.tensor(np.expand_dims(features, axis=0), dtype=torch.float32).to(self.device)
        self.model.eval()
        with torch.no_grad():
            prediction = self.model(sequence).cpu().numpy()
        value = self.target_scaler.inverse_transform(prediction)[0][0]
        return float(value)

    def save(self) -> None:
        if self.model is None or not self.scalers_fitted:
            return

        os.makedirs(self.artifact_dir, exist_ok=True)
        paths = self.artifacts()
        torch.save(self.model.state_dict(), paths.model_path)

        with open(paths.feature_scaler_path, "wb") as handle:
            pickle.dump(self.feature_scaler, handle)
        with open(paths.target_scaler_path, "wb") as handle:
            pickle.dump(self.target_scaler, handle)
        with open(paths.metadata_path, "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "window_size": self.window_size,
                    "feature_columns": self.feature_columns,
                    "training_steps": self.training_steps,
                },
                handle,
            )

    def load(self) -> bool:
        paths = self.artifacts()
        if not (
            os.path.exists(paths.model_path)
            and os.path.exists(paths.feature_scaler_path)
            and os.path.exists(paths.target_scaler_path)
            and os.path.exists(paths.metadata_path)
        ):
            return False

        with open(paths.feature_scaler_path, "rb") as handle:
            self.feature_scaler = pickle.load(handle)
        with open(paths.target_scaler_path, "rb") as handle:
            self.target_scaler = pickle.load(handle)
        with open(paths.metadata_path, "r", encoding="utf-8") as handle:
            metadata = json.load(handle)

        self.window_size = int(metadata.get("window_size", self.window_size))
        self.feature_columns = list(metadata.get("feature_columns", self.feature_columns))
        self.training_steps = int(metadata.get("training_steps", 0))
        self.build_model(feature_count=len(self.feature_columns))
        state_dict = torch.load(paths.model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.scalers_fitted = True
        return True
