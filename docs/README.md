# Real-Time CO₂ Monitoring Dashboard

A complete real-time monitoring system for MH-Z19 CO₂ sensors using MQTT protocol and a web-based dashboard.

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Hardware Requirements](#hardware-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **Real-time CO₂ Monitoring**: Live readings from MH-Z19 sensor via UART
- **MQTT Integration**: Publish sensor data to MQTT broker for distributed monitoring
- **Web Dashboard**: Beautiful, responsive dashboard with real-time charts
- **Air Quality Indicators**: Automatic air quality assessment based on CO₂ levels
- **Historical Data**: Chart showing last 30 readings
- **WebSocket Support**: Browser-based dashboard connects via MQTT WebSocket

## 🏗️ System Architecture

```
MH-Z19 Sensor (UART) → Raspberry Pi → MQTT Broker → Web Dashboard
                              ↓
                    air_quality_mhz19_mqtt.py
                              ↓
                    MQTT Topic: sensor/co2
                              ↓
                    Dashboard (Browser)
```

## 🔧 Hardware Requirements

- Raspberry Pi (any model with GPIO)
- MH-Z19B or MH-Z19E CO₂ sensor
- Wiring connections:
  - **5V Power**: Raspberry Pi Pin 2 → MH-Z19 Vin
  - **GND**: Raspberry Pi Pin 6 → MH-Z19 GND
  - **TXD**: Raspberry Pi Pin 8 (GPIO14) → MH-Z19 RX
  - **RXD**: Raspberry Pi Pin 10 (GPIO15) → MH-Z19 TX

## 📦 Installation

### On Raspberry Pi

1. **Install MQTT Broker (Mosquitto)**
   ```bash
   sudo apt update
   sudo apt install -y mosquitto mosquitto-clients
   ```

2. **Configure Mosquitto for WebSocket**
   Create `/etc/mosquitto/conf.d/websocket.conf`:
   ```conf
   # WebSocket listener for browser connections
   listener 9001
   protocol websockets

   # Standard MQTT listener
   listener 1883
   protocol mqtt

   # Allow anonymous connections (for local network)
   allow_anonymous true
   ```

3. **Restart Mosquitto**
   ```bash
   sudo systemctl restart mosquitto
   sudo systemctl enable mosquitto
   ```

4. **Install Python Dependencies**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install mh_z19 paho-mqtt
   ```

5. **Set Serial Port Permissions**
   ```bash
   sudo chmod 666 /dev/ttyAMA0
   # Or add user to dialout group:
   sudo usermod -a -G dialout $USER
   ```

6. **Enable UART** (if not already enabled)
   ```bash
   sudo raspi-config
   # Navigate to: Interface Options → Serial Port → Enable
   ```

### On Local Machine (for Dashboard)

No installation required! The dashboard is a standalone HTML file that runs in your browser.

## ⚙️ Configuration

### Sensor Script Configuration

Edit `air_quality_mhz19_mqtt.py` to modify:

```python
MQTT_BROKER = "localhost"  # Change if broker is on different machine
MQTT_PORT = 1883
MQTT_TOPIC = "sensor/co2"
SERIAL_DEV = "/dev/ttyAMA0"  # Change if using different serial port
```

### Dashboard Configuration

The dashboard has built-in connection settings. Default values:
- **MQTT Broker**: `raspberrypi.local`
- **Port**: `9001` (WebSocket)
- **Topic**: `sensor/co2`

You can change these in the dashboard UI or modify the HTML file.

## 🚀 Usage

### 1. Start MQTT Publisher on Raspberry Pi

```bash
cd ~/real_time_monitering_dashboard
source venv/bin/activate
sudo python3 air_quality_mhz19_mqtt.py
```

Or run as a background service:
```bash
nohup sudo -E env PATH=$PATH python3 air_quality_mhz19_mqtt.py > /tmp/co2_mqtt.log 2>&1 &
```

### 2. Start Dashboard Locally

**Option A: Using Python HTTP Server**
```bash
cd real_time_monitering_dashboard
python3 -m http.server 8080
```

Then open: `http://localhost:8080/co2_mqtt_dashboard.html`

**Option B: Direct File Access**
Simply open `co2_mqtt_dashboard.html` in your web browser.

### 3. Connect Dashboard to MQTT

1. Open the dashboard in your browser
2. The dashboard will auto-connect to `raspberrypi.local:9001`
3. If auto-connect fails, use the connection settings at the bottom:
   - Enter your Raspberry Pi's IP or hostname
   - Port: `9001` (WebSocket) or `1883` (MQTT)
   - Topic: `sensor/co2`
   - Click "Connect"

## 📁 File Structure

```
real_time_monitering_dashboard/
├── README.md                          # This file
├── air_quality_mhz19.py               # Basic sensor reader (console output)
├── air_quality_mhz19_mqtt.py          # MQTT publisher script
└── co2_mqtt_dashboard.html            # Web dashboard
```

## 🔍 Troubleshooting

### Sensor Not Responding

1. **Check Wiring**: Verify all connections are correct
2. **Check Permissions**: Ensure `/dev/ttyAMA0` is accessible
   ```bash
   ls -l /dev/ttyAMA0
   sudo chmod 666 /dev/ttyAMA0
   ```
3. **Check UART**: Verify UART is enabled
   ```bash
   cat /boot/firmware/config.txt | grep enable_uart
   # Should show: enable_uart=1
   ```
4. **Test Sensor Directly**:
   ```bash
   python3 air_quality_mhz19.py
   ```

### MQTT Connection Issues

1. **Check Mosquitto Status**:
   ```bash
   sudo systemctl status mosquitto
   ```

2. **Test MQTT Subscription**:
   ```bash
   mosquitto_sub -h localhost -t sensor/co2 -v
   ```

3. **Check Firewall**: Ensure ports 1883 and 9001 are open

4. **Verify WebSocket Configuration**: Check `/etc/mosquitto/conf.d/websocket.conf`

### Dashboard Not Connecting

1. **Check MQTT Broker Address**: Use IP address instead of hostname if DNS fails
   - Find Pi IP: `hostname -I` on Raspberry Pi
   - Use format: `192.168.x.x:9001`

2. **Check Browser Console**: Open Developer Tools (F12) to see connection errors

3. **Test WebSocket Connection**:
   ```bash
   # On Raspberry Pi
   mosquitto_sub -h localhost -t sensor/co2 -v
   ```

4. **CORS Issues**: If accessing from different domain, configure Mosquitto CORS settings

## 📊 Data Format

MQTT messages are published as JSON:

```json
{
  "co2": 420,
  "status": "OK",
  "timestamp": "2025-11-07T18:00:00.000000",
  "sensor": "MH-Z19"
}
```

**Status Values:**
- `OK`: Sensor is working and providing valid readings
- `WARMUP`: Sensor is warming up (first few minutes)
- `ERROR: <ErrorType>`: An error occurred

## 🎨 Dashboard Features

- **Real-time CO₂ Display**: Large, easy-to-read current value
- **Status Indicators**: Visual status badges (OK/WARMUP/ERROR)
- **Air Quality Assessment**: Automatic classification based on CO₂ levels
  - Excellent: < 400 ppm
  - Good: 400-450 ppm
  - Moderate: 450-550 ppm
  - Unhealthy: > 550 ppm
- **Live Chart**: Last 30 readings displayed in real-time
- **Sensor Statistics**: Message count, uptime, last update time
- **Connection Status**: Visual indicator for MQTT connection

## 🔒 Security Notes

⚠️ **For Production Use:**
- Enable authentication in Mosquitto
- Use TLS/SSL for MQTT connections
- Restrict network access
- Use strong passwords
- Consider VPN for remote access

Current configuration allows anonymous connections for local network development only.

## 📝 License

This project is provided as-is for educational and development purposes.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Verify all connections and configurations
3. Check system logs: `journalctl -u mosquitto`

## 📅 Version History

- **v1.0** (2025-11-07)
  - Initial release
  - MQTT integration
  - Web dashboard
  - Real-time monitoring

