#!/bin/bash
# Start script for local dashboard web server
# Usage: ./start_dashboard.sh [port]

PORT=${1:-8080}
cd "$(dirname "$0")"

echo "Starting dashboard web server on port $PORT..."
echo "Open http://localhost:$PORT/co2_mqtt_dashboard.html in your browser"
echo "Press Ctrl+C to stop"

python3 -m http.server $PORT

