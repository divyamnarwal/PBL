#!/bin/bash
# Start script for CO2 sensor MQTT publisher
# Usage: ./start_sensor.sh

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if ! python3 -c "import mh_z19" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Check if running as root (needed for serial port access)
if [ "$EUID" -ne 0 ]; then
    echo "Note: This script needs sudo for serial port access"
    echo "Starting sensor with sudo..."
    sudo -E env PATH=$PATH python3 air_quality_mhz19_mqtt.py
else
    python3 air_quality_mhz19_mqtt.py
fi

