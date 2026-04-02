#!/usr/bin/env python3
"""
Training script for Carbon Neutrality CNN-LSTM Model
"""

import sys
import os
from model_utils import CarbonNeutralityModel

def main():
    # Configuration
    data_path = "/Users/divyanshdobhal/Downloads/air_quality_data.csv"
    window_size = 60
    epochs = 30
    batch_size = 32
    
    print("🌱 Carbon Neutrality CNN-LSTM Model Training")
    print("=" * 50)
    
    # Initialize model
    model = CarbonNeutralityModel(window_size=window_size)
    
    # Check if data file exists
    if not os.path.exists(data_path):
        print(f"❌ Data file not found: {data_path}")
        print("Please update the data_path in train_model.py")
        return
    
    print(f"📊 Loading data from: {data_path}")
    
    # Train model
    try:
        history = model.train(
            data_path=data_path,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2
        )
        
        if history:
            print("\n✅ Training completed successfully!")
            
            # Save model
            if model.save_model():
                print("✅ Model saved successfully!")
            else:
                print("❌ Failed to save model")
                
        else:
            print("❌ Training failed")
            
    except Exception as e:
        print(f"❌ Error during training: {e}")

if __name__ == "__main__":
    main()
