# Carbon Neutrality Prediction Service

This folder contains the vendored Streamlit dashboard adapted from `DivyanshDobhal/carbon-neutrality-dashboard`.

## What changed

- The app now reads CO2 history from the main Node backend at `CARBON_API_BASE_URL`.
- The default mode is `ML_MODE=demo`, which keeps the dashboard usable even without Mongo data or a trained model.
- File upload and in-browser training flows are intentionally omitted from the default UI.
- Missing model files are non-fatal. The dashboard falls back to heuristic forecasting.

## Run it

1. Install Python dependencies:

```bash
pip install -r ml-dashboard/requirements.txt
```

2. Start the main backend:

```bash
npm run server
```

3. Start the Streamlit dashboard:

```bash
scripts/start_prediction_dashboard.sh
```

On Windows:

```powershell
.\scripts\start_prediction_dashboard.ps1
```

## Environment variables

- `CARBON_API_BASE_URL` default: `http://localhost:5000/api/ml/co2-history`
- `STREAMLIT_SERVER_PORT` default: `8501`
- `PREDICTION_DASHBOARD_URL` default: `http://localhost:8501`
- `MODEL_PATH` optional: path to a `.keras` model file
- `ML_MODE` default: `demo`

## Optional model training

If you already have a CSV dataset, you can train a model manually:

```bash
export TRAINING_DATA_PATH=/path/to/co2-data.csv
export MODEL_PATH=ml-dashboard/cnn_lstm_co2_model.keras
python ml-dashboard/train_model.py
```

The production dashboard still treats this path as experimental. If model loading or prediction fails, it falls back to demo forecasting instead of crashing.
