import json
import os
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
import serial


MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "sensor/co2")
MQTT_CLIENT_ID = os.environ.get("MQTT_CLIENT_ID", "co2_sensor_publisher")
SERIAL_DEV = os.environ.get("SERIAL_DEV", "/dev/serial0")


try:
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=MQTT_CLIENT_ID)
except (AttributeError, TypeError):
    mqtt_client = mqtt.Client(client_id=MQTT_CLIENT_ID)


def connect_mqtt():
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()


def read_sensor():
    with serial.Serial(SERIAL_DEV, 9600, timeout=5) as ser:
        ser.write(b"\xff\x01\x86\x00\x00\x00\x00\x00\x79")
        ser.flush()
        time.sleep(2)
        return ser.read(9)


def read_co2():
    try:
        resp = read_sensor()
        if len(resp) == 9 and resp[0] == 0xFF:
            return {
                "co2": resp[2] * 256 + resp[3],
                "temp": resp[4] - 40,
                "status": "OK",
            }
        return {"co2": None, "temp": None, "status": "READ_ERROR"}
    except Exception as exc:
        return {"co2": None, "temp": None, "status": f"ERROR: {exc.__class__.__name__}"}


def publish_to_mqtt(reading):
    if reading["co2"] is None:
        print(f"Skipping publish: {reading['status']}", flush=True)
        return

    payload = {
        "co2": reading["co2"],
        "temp": reading["temp"],
        "status": reading["status"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sensor": "MH-Z19B",
    }
    message = json.dumps(payload)
    result = mqtt_client.publish(MQTT_TOPIC, message, qos=1)

    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print(f"Published: {message}", flush=True)
    else:
        print(f"Failed to publish: {result.rc}", flush=True)


def main():
    print(f"MH-Z19B MQTT publisher started on {SERIAL_DEV}", flush=True)
    print(f"MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}", flush=True)
    print(f"MQTT Topic: {MQTT_TOPIC}", flush=True)
    connect_mqtt()

    while True:
        reading = read_co2()
        print(json.dumps(reading), flush=True)
        publish_to_mqtt(reading)
        time.sleep(3)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopping...", flush=True)
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
