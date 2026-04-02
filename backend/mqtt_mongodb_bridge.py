import json
import os
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
from pymongo import MongoClient


MONGODB_URI = os.environ["MONGODB_URI"]
MONGODB_DB = os.environ.get("MONGODB_DB", "test")
MONGODB_COLLECTION = os.environ.get("MONGODB_COLLECTION", "co2readings")
MQTT_BROKER = os.environ.get("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "sensor/co2")
LOCATION = os.environ.get("LOCATION", "lab-1")


mongo_client = MongoClient(MONGODB_URI)
collection = mongo_client[MONGODB_DB][MONGODB_COLLECTION]


def get_air_quality(co2_value):
    if co2_value < 400:
        return "Excellent"
    if co2_value < 450:
        return "Good"
    if co2_value < 550:
        return "Moderate"
    if co2_value < 1000:
        return "Fair"
    return "Poor"


def normalize_status(status):
    if status == "live":
        return "OK"
    if status.startswith("error"):
        return "ERROR"
    return status


def parse_timestamp(raw_value):
    if not raw_value:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(raw_value.replace("Z", "+00:00"))


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}", flush=True)
    client.subscribe(MQTT_TOPIC, qos=1)
    print(f"Subscribed to {MQTT_TOPIC}", flush=True)


def on_message(client, userdata, message):
    payload = json.loads(message.payload.decode("utf-8"))
    co2 = int(payload["co2"])
    temperature = payload.get("temp", payload.get("temperature"))
    status = normalize_status(str(payload.get("status", "OK")))
    timestamp = parse_timestamp(payload.get("timestamp"))

    document = {
        "co2": co2,
        "status": status,
        "timestamp": timestamp,
        "sensor": payload.get("sensor", "MH-Z19B"),
        "location": LOCATION,
        "airQuality": get_air_quality(co2),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }

    if temperature is not None:
        document["temperature"] = int(temperature)

    result = collection.insert_one(document)
    print(
        f"Saved reading {result.inserted_id}: CO2={co2}ppm, temp={temperature}, status={status}",
        flush=True,
    )


def main():
    print(
        f"Starting MQTT -> MongoDB bridge ({MQTT_BROKER}:{MQTT_PORT} -> {MONGODB_DB}.{MONGODB_COLLECTION})",
        flush=True,
    )

    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="co2_mongo_bridge")
    except (AttributeError, TypeError):
        client = mqtt.Client(client_id="co2_mongo_bridge")

    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()


if __name__ == "__main__":
    main()
