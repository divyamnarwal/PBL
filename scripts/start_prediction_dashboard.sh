#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASHBOARD_ROOT="$REPO_ROOT/ml-dashboard"

if ! command -v streamlit >/dev/null 2>&1; then
  echo "streamlit is not installed. Install ml-dashboard requirements first." >&2
  exit 1
fi

export STREAMLIT_SERVER_PORT="${STREAMLIT_SERVER_PORT:-8501}"
export ML_MODE="${ML_MODE:-demo}"
export CARBON_API_BASE_URL="${CARBON_API_BASE_URL:-http://localhost:5000/api/ml/co2-history}"
export MODEL_PATH="${MODEL_PATH:-$DASHBOARD_ROOT/cnn_lstm_co2_model.keras}"
export PREDICTION_DASHBOARD_URL="${PREDICTION_DASHBOARD_URL:-http://localhost:$STREAMLIT_SERVER_PORT}"

echo "Starting Streamlit prediction dashboard..."
echo "  Root: $DASHBOARD_ROOT"
echo "  Port: $STREAMLIT_SERVER_PORT"
echo "  ML_MODE: $ML_MODE"
echo "  CARBON_API_BASE_URL: $CARBON_API_BASE_URL"
echo

cd "$DASHBOARD_ROOT"
streamlit run app.py --server.port "$STREAMLIT_SERVER_PORT" --server.address 0.0.0.0
