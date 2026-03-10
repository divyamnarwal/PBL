from pathlib import Path

import numpy as np

try:
    from sklearn.preprocessing import MinMaxScaler
except Exception:  # pragma: no cover - optional dependency in runtime environments
    MinMaxScaler = None

try:
    from tensorflow.keras.callbacks import EarlyStopping
    from tensorflow.keras.layers import Conv1D, Dense, Dropout, LSTM, MaxPooling1D
    from tensorflow.keras.models import Sequential, load_model
except Exception:  # pragma: no cover - optional dependency in runtime environments
    EarlyStopping = None
    Conv1D = None
    Dense = None
    Dropout = None
    LSTM = None
    MaxPooling1D = None
    Sequential = None
    load_model = None


class CarbonNeutralityModel:
    def __init__(self, window_size=60):
        self.window_size = window_size
        self.model = None
        self.scaler = MinMaxScaler() if MinMaxScaler else None
        self.is_trained = False

    def preprocess_data(self, data_path):
        import pandas as pd

        data_file = Path(data_path)
        if not data_file.exists():
            raise FileNotFoundError(f'Data file not found: {data_file}')

        dataframe = pd.read_csv(data_file)
        filtered = dataframe[(dataframe['co2'].notna()) & (dataframe['status'] == 'OK')]
        return filtered['co2'].values.astype(np.float32)

    def create_sequences(self, data):
        sequences = []
        targets = []
        for index in range(len(data) - self.window_size):
            sequences.append(data[index:index + self.window_size])
            targets.append(data[index + self.window_size])
        return np.array(sequences), np.array(targets)

    def build_model(self):
        if not all([Sequential, Conv1D, MaxPooling1D, LSTM, Dropout, Dense]):
            raise RuntimeError('TensorFlow is not available. Install ml-dashboard requirements first.')

        self.model = Sequential([
            Conv1D(64, 3, activation='relu', input_shape=(self.window_size, 1)),
            MaxPooling1D(2),
            LSTM(50),
            Dropout(0.2),
            Dense(1),
        ])
        self.model.compile(optimizer='adam', loss='mse')
        return self.model

    def train(self, data_path, epochs=30, batch_size=32, validation_split=0.2):
        if self.scaler is None:
            raise RuntimeError('scikit-learn is not available. Install ml-dashboard requirements first.')
        if EarlyStopping is None:
            raise RuntimeError('TensorFlow is not available. Install ml-dashboard requirements first.')

        series = self.preprocess_data(data_path)
        scaled_series = self.scaler.fit_transform(series.reshape(-1, 1))
        sequences, targets = self.create_sequences(scaled_series)
        sequences = sequences.reshape(sequences.shape[0], sequences.shape[1], 1)

        split_index = int(len(sequences) * (1 - validation_split))
        x_train, x_test = sequences[:split_index], sequences[split_index:]
        y_train, y_test = targets[:split_index], targets[split_index:]

        if self.model is None:
            self.build_model()

        callbacks = [EarlyStopping(patience=5, restore_best_weights=True)]
        history = self.model.fit(
            x_train,
            y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(x_test, y_test),
            callbacks=callbacks,
            verbose=1,
        )

        self.is_trained = True
        return history

    def save_model(self, filepath='cnn_lstm_co2_model.keras'):
        if self.model is None or not self.is_trained:
            return False

        self.model.save(filepath)
        return True

    def load_model(self, filepath='cnn_lstm_co2_model.keras'):
        if load_model is None:
            raise RuntimeError('TensorFlow is not available. Install ml-dashboard requirements first.')

        self.model = load_model(filepath)
        self.is_trained = True
        return True


def get_model_status(model_path, ml_mode):
    if (ml_mode or 'demo').lower() != 'model':
        return {
            'available': False,
            'reason': 'ML_MODE=demo, so the dashboard is using heuristic forecasting by default.'
        }

    if not model_path:
        return {
            'available': False,
            'reason': 'MODEL_PATH is not configured. Set ML_MODE=model and provide a readable .keras file.'
        }

    model_file = Path(model_path)
    if not model_file.exists():
        return {
            'available': False,
            'reason': f'Model file not found at {model_file}. Falling back to demo forecasting.'
        }

    if load_model is None or MinMaxScaler is None:
        return {
            'available': False,
            'reason': 'TensorFlow or scikit-learn is unavailable. Install ml-dashboard requirements to enable model mode.'
        }

    return {
        'available': True,
        'reason': f'Using model file at {model_file}.',
    }


def build_demo_forecast(values, steps=12):
    values = np.asarray(values, dtype=np.float32)
    if values.size == 0:
        return [420.0 for _ in range(steps)]

    window = values[-min(values.size, 12):]
    baseline = float(window.mean())
    slope = float((window[-1] - window[0]) / max(len(window) - 1, 1))
    current = float(window[-1])
    forecast = []

    for step in range(steps):
        seasonal_push = np.sin((step + 1) / 2.5) * 6.0
        mean_reversion = (baseline - current) * 0.15
        current = np.clip(current + (slope * 0.7) + seasonal_push + mean_reversion, 350.0, 5000.0)
        forecast.append(round(float(current), 2))

    return forecast


def predict_series(values, model_path, window_size=60, steps=12):
    if load_model is None or MinMaxScaler is None:
        raise RuntimeError('TensorFlow and scikit-learn are required for model predictions.')

    values = np.asarray(values, dtype=np.float32)
    if values.size < window_size:
        raise ValueError(f'Need at least {window_size} readings to run the CNN-LSTM model.')

    model = load_model(model_path)
    scaler = MinMaxScaler()
    scaling_window = values[-max(window_size * 4, window_size):].reshape(-1, 1)
    scaler.fit(scaling_window)

    buffer = list(values[-window_size:])
    predictions = []

    for _ in range(steps):
        input_array = np.array(buffer[-window_size:], dtype=np.float32).reshape(-1, 1)
        scaled_input = scaler.transform(input_array).reshape(1, window_size, 1)
        scaled_prediction = model.predict(scaled_input, verbose=0)
        prediction = float(scaler.inverse_transform(np.array(scaled_prediction).reshape(-1, 1))[0][0])
        prediction = float(np.clip(prediction, 350.0, 5000.0))
        predictions.append(round(prediction, 2))
        buffer.append(prediction)

    return predictions
