#!/usr/bin/env python3

import os
import sys

from model_utils import CarbonNeutralityModel


def main():
    data_path = os.getenv('TRAINING_DATA_PATH', '')
    model_path = os.getenv('MODEL_PATH', 'cnn_lstm_co2_model.keras')
    window_size = int(os.getenv('TRAINING_WINDOW_SIZE', '60'))
    epochs = int(os.getenv('TRAINING_EPOCHS', '30'))
    batch_size = int(os.getenv('TRAINING_BATCH_SIZE', '32'))

    if not data_path:
        print('TRAINING_DATA_PATH is not set.')
        print('Example:')
        print('  set TRAINING_DATA_PATH=C:\\path\\to\\co2-data.csv')
        print('  python train_model.py')
        return 1

    print('Carbon Neutrality CNN-LSTM training')
    print(f'  Data path: {data_path}')
    print(f'  Model path: {model_path}')
    print(f'  Window size: {window_size}')
    print(f'  Epochs: {epochs}')
    print(f'  Batch size: {batch_size}')
    print('')

    model = CarbonNeutralityModel(window_size=window_size)

    try:
        history = model.train(
            data_path=data_path,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
        )
    except Exception as error:
        print(f'Training failed: {error}')
        return 1

    if not history:
        print('Training did not produce a valid history object.')
        return 1

    if not model.save_model(model_path):
        print('Model training finished, but saving the model failed.')
        return 1

    print(f'Model saved to {model_path}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
