# air_quality_mhz19_mqtt.py
# Raspberry Pi + MH‑Z19B/E over UART with MQTT publishing
# Publishes CO2 readings to MQTT topic: sensor/co2

import time
import json
import mh_z19
import paho.mqtt.client as mqtt
from datetime import datetime

# MQTT Configuration
MQTT_BROKER = "localhost"  # MQTT broker on same Raspberry Pi
MQTT_PORT = 1883
MQTT_TOPIC = "sensor/co2"
MQTT_CLIENT_ID = "co2_sensor_publisher"

# Serial device configuration
SERIAL_DEV = "/dev/ttyAMA0"

# Set the serial device before reading
mh_z19.set_serialdevice(SERIAL_DEV)

# Initialize MQTT client
mqtt_client = mqtt.Client(client_id=MQTT_CLIENT_ID)
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
mqtt_client.loop_start()

def read_co2():
    """
    Returns a dict like {"co2": 612, "status": "OK"} or {"co2": None, "status": "WARMUP/ERROR"}.
    """
    try:
        data = mh_z19.read()
        ppm = int(data["co2"]) if data and "co2" in data else None
        status = "OK" if (ppm is not None and ppm > 0) else "WARMUP"
        return {"co2": ppm, "status": status}
    except Exception as e:
        return {"co2": None, "status": f"ERROR: {e.__class__.__name__}"}

def publish_to_mqtt(reading):
    """Publish sensor reading to MQTT topic"""
    payload = {
        "co2": reading["co2"],
        "status": reading["status"],
        "timestamp": datetime.now().isoformat(),
        "sensor": "MH-Z19"
    }
    message = json.dumps(payload)
    result = mqtt_client.publish(MQTT_TOPIC, message, qos=1)
    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print(f"Published: {message}", flush=True)
    else:
        print(f"Failed to publish: {result.rc}", flush=True)

def main():
    print(f"MH‑Z19 UART reader started on {SERIAL_DEV}", flush=True)
    print(f"MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}", flush=True)
    print(f"MQTT Topic: {MQTT_TOPIC}", flush=True)
    
    while True:
        reading = read_co2()
        # Print to console (for debugging)
        print(json.dumps(reading), flush=True)
        # Publish to MQTT
        publish_to_mqtt(reading)
        time.sleep(2)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopping...", flush=True)
        mqtt_client.loop_stop()
        mqtt_client.disconnect()

