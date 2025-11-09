# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Setup on Raspberry Pi

```bash
# 1. Install MQTT broker
sudo apt install -y mosquitto mosquitto-clients

# 2. Configure WebSocket (create /etc/mosquitto/conf.d/websocket.conf)
sudo tee /etc/mosquitto/conf.d/websocket.conf > /dev/null << EOF
listener 9001
protocol websockets
listener 1883
protocol mqtt
allow_anonymous true
EOF

# 3. Restart Mosquitto
sudo systemctl restart mosquitto

# 4. Setup Python environment
cd ~/real_time_monitering_dashboard
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Set serial permissions
sudo chmod 666 /dev/ttyAMA0
```

### Step 2: Start Sensor Publisher

```bash
cd ~/real_time_monitering_dashboard
./start_sensor.sh
```

Or manually:
```bash
source venv/bin/activate
sudo python3 air_quality_mhz19_mqtt.py
```

### Step 3: Start Dashboard (on your local machine)

```bash
cd real_time_monitering_dashboard
./start_dashboard.sh
```

Or manually:
```bash
python3 -m http.server 8080
```

### Step 4: Open Dashboard

Open your browser and go to:
```
http://localhost:8080/co2_mqtt_dashboard.html
```

The dashboard will auto-connect to `raspberrypi.local:9001`

## 🔧 Troubleshooting

**Can't connect to MQTT?**
- Use IP address instead: `192.168.0.211:9001` (replace with your Pi's IP)
- Check if Mosquitto is running: `sudo systemctl status mosquitto`

**Sensor not reading?**
- Check wiring connections
- Verify permissions: `ls -l /dev/ttyAMA0`
- Test sensor: `python3 air_quality_mhz19.py`

**Dashboard not updating?**
- Check browser console (F12) for errors
- Verify MQTT topic: `sensor/co2`
- Test subscription: `mosquitto_sub -h localhost -t sensor/co2 -v`

## 📍 Default Settings

- **MQTT Broker**: `raspberrypi.local` (or use IP: `192.168.0.211`)
- **MQTT Port**: `9001` (WebSocket) or `1883` (MQTT)
- **Topic**: `sensor/co2`
- **Serial Device**: `/dev/ttyAMA0`

## 🎯 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize the dashboard appearance
- Add more sensors or data points
- Set up alerts for high CO₂ levels

