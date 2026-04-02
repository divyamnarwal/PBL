import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Conv1D, MaxPooling1D, LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import os

class CarbonNeutralityModel:
    def __init__(self, window_size=60):
        self.window_size = window_size
        self.model = None
        self.scaler = MinMaxScaler()
        self.is_trained = False
        
    def preprocess_data(self, data_path):
        """Load and preprocess CO2 data"""
        try:
            df = pd.read_csv(data_path)
            print(f"{'timestamp':<25} {'co2':<5} {'status':<5}")
            for index, row in df.head(4).iterrows():
                print(f"{str(row['timestamp']):<25} {int(row['co2']):<5} {row['status']:<5}")
            
            # Filter valid data
            df_filtered = df[(df['co2'].notna()) & (df['status'] == 'OK')]
            co2_series = df_filtered['co2'].values.astype(np.float32)
            
            print(f"\nTotal readings: {len(co2_series)}")
            return co2_series
            
        except Exception as e:
            print(f"Error preprocessing data: {e}")
            return None
    
    def create_sequences(self, data):
        """Create sequences for time series prediction"""
        X, y = [], []
        for i in range(len(data) - self.window_size):
            X.append(data[i:i + self.window_size])
            y.append(data[i + self.window_size])
        return np.array(X), np.array(y)
    
    def build_model(self):
        """Build CNN-LSTM architecture"""
        self.model = Sequential([
            Conv1D(64, 3, activation='relu', input_shape=(self.window_size, 1)),
            MaxPooling1D(2),
            LSTM(50),
            Dropout(0.2),
            Dense(1)
        ])
        
        self.model.compile(optimizer='adam', loss='mse')
        return self.model
    
    def train(self, data_path, epochs=30, batch_size=32, validation_split=0.2):
        """Train the CNN-LSTM model"""
        # Preprocess data
        co2_series = self.preprocess_data(data_path)
        if co2_series is None:
            return False
        
        # Scale data
        co2_scaled = self.scaler.fit_transform(co2_series.reshape(-1, 1))
        
        # Create sequences
        X, y = self.create_sequences(co2_scaled)
        X = X.reshape(X.shape[0], X.shape[1], 1)
        
        # Split data
        split = int(len(X) * (1 - validation_split))
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]
        
        # Build and train model
        if self.model is None:
            self.build_model()
        
        early_stopping = EarlyStopping(patience=5, restore_best_weights=True)
        
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(X_test, y_test),
            callbacks=[early_stopping],
            verbose=1
        )
        
        self.is_trained = True
        return history
    
    def save_model(self, filepath="cnn_lstm_co2_model.keras"):
        """Save the trained model"""
        if self.model and self.is_trained:
            self.model.save(filepath)
            print(f"Model saved to {filepath}")
            return True
        return False
    
    def load_model(self, filepath="cnn_lstm_co2_model.keras"):
        """Load a pre-trained model"""
        try:
            self.model = load_model(filepath)
            self.is_trained = True
            print("Model loaded successfully")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def predict_next(self, recent_data):
        """Predict next CO2 value given recent data"""
        if not self.is_trained:
            print("Model not trained yet")
            return None
        
        # Ensure we have the right window size
        if len(recent_data) < self.window_size:
            print(f"Need at least {self.window_size} data points")
            return None
        
        # Take the last window_size points
        buffer = recent_data[-self.window_size:]
        
        # Scale and reshape
        arr = np.array(buffer).reshape(-1, 1)
        arr = self.scaler.transform(arr)
        arr = arr.reshape(1, self.window_size, 1)
        
        # Predict
        prediction = self.model.predict(arr, verbose=0)
        prediction_val = self.scaler.inverse_transform(prediction)[0][0]
        
        return prediction_val
    
    def simulate_monitoring(self, co2_series, steps=20):
        """Simulate real-time monitoring"""
        if not self.is_trained:
            print("Model not trained yet")
            return []
        
        results = []
        buffer = list(co2_series[-self.window_size:])
        
        print("\n--- Starting monitoring simulation ---")
        print(f"{'Step':<5} | {'Current CO2 (ppm)':<20} | {'Predicted Next (ppm)':<20}")
        print("-" * 55)
        
        for i in range(steps):
            # Simulate new reading with some noise
            current_value = co2_series[-1] + np.random.randint(-10, 10)
            buffer.append(current_value)
            buffer = buffer[-self.window_size:]
            
            # Predict next value
            predicted_value = self.predict_next(buffer)
            
            results.append({
                'step': i + 1,
                'current': current_value,
                'predicted': predicted_value
            })
            
            print(f"{i+1:<5} | {current_value:<20.2f} | {predicted_value:<20.2f}")
        
        return results
