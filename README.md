# Carbon Neutrality Dashboard

A comprehensive real-time CO2 monitoring system with a modern web dashboard. Track air quality, visualize environmental data, and promote carbon awareness with an integrated SPA featuring Firebase authentication, MongoDB storage, and MQTT-based real-time sensor integration.

## Features

- **Real-Time CO2 Monitoring**: Live readings from MH-Z19 CO2 sensors via MQTT
- **Firebase Authentication**: Secure login/signup with email and password
- **MongoDB Integration**: Store historical CO2 readings in MongoDB Atlas
- **MQTT-MongoDB Bridge**: Background service that listens to MQTT and stores data
- **AQI Dashboard**: Check air quality by city with detailed pollutant breakdown
- **Carbon Calculator**: Calculate and offset your carbon footprint
- **Interactive Charts**: Visualize CO2 trends with Chart.js
- **MQTT Integration**: WebSocket-based real-time data streaming
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between visual themes

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Build Tool | Vite 5.x |
| Authentication | Firebase Auth (npm) |
| Database | MongoDB Atlas with Mongoose |
| Real-time Communication | MQTT over WebSockets |
| Charts | Chart.js 4.x |
| Backend (Bridge) | Node.js with MQTT.js |
| Backend (Sensor) | Python with paho-mqtt |
| MQTT Broker | Mosquitto |

## Project Structure

```
carbon-neutrality/
├── public/                    # Static HTML files
│   ├── index.html            # Landing/redirect page
│   ├── login.html            # Authentication page
│   ├── signup.html           # Registration page
│   └── dashboard.html        # Main application dashboard
│
├── js/                        # JavaScript modules
│   ├── firebase.js           # Firebase configuration
│   ├── auth.js               # Authentication logic
│   ├── mqtt-service.js       # MQTT client wrapper
│   ├── config.js             # Environment configuration
│   └── db/                   # MongoDB services
│       ├── mongodb.service.js      # MongoDB connection
│       ├── co2Reading.schema.js    # Mongoose schema
│       └── co2Storage.service.js   # Storage operations
│
├── backend/                   # Python sensor scripts
│   ├── air_quality_mhz19.py          # Basic sensor reader
│   ├── air_quality_mhz19_mqtt.py     # MQTT publisher
│   └── requirements.txt              # Python dependencies
│
├── scripts/                   # Utility scripts
│   ├── mqtt-mongodb-bridge.js # MQTT to MongoDB bridge
│   ├── simulate-sensor.js      # Sensor simulator
│   └── start_dashboard.sh      # Start development server
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # System architecture details
│   ├── QUICKSTART.md          # Quick start guide
│   └── ...
│
├── .env                       # Environment variables (NOT in git)
├── .env.example              # Example environment variables
├── package.json               # Node.js dependencies
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for sensor backend, optional)
- Firebase project with Auth enabled
- MongoDB Atlas account (free tier works)
- Mosquitto MQTT Broker (for sensor integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd carbon-neutrality
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and add your credentials:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # MQTT Configuration
   VITE_MQTT_BROKER_URL=ws://localhost:9001
   VITE_MQTT_TOPIC=sensor/co2

   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. **Enable Firebase Authentication**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to **Authentication** → **Sign-in method**
   - Enable **Email/Password**
   - Click **Save**

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:5173`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Build for production |
| `npm run serve` | Serve production build on port 3000 |
| `npm run bridge` | Start MQTT-MongoDB bridge service |

## MQTT-MongoDB Bridge

The bridge service listens to MQTT sensor data and stores it in MongoDB Atlas:

```bash
npm run bridge
```

**Features:**
- Connects to MQTT broker via WebSocket
- Subscribes to `sensor/co2` topic
- Stores readings in MongoDB with automatic air quality classification
- Batch inserts for efficiency (configurable)
- Graceful shutdown with data flush

**Configuration** (in `.env`):
```env
MQTT_WS_URL=ws://localhost:9001
LOCATION=lab-1              # Location identifier for multi-sensor setups
BATCH_SIZE=50              # Number of readings before bulk insert
BATCH_TIMEOUT=5000         # Max wait time before flushing batch (ms)
```

## Sensor Setup (Optional)

### Hardware Requirements

- Raspberry Pi (any model with GPIO)
- MH-Z19B or MH-Z19E CO2 sensor
- Jumper wires

### Wiring

| Sensor Pin | Raspberry Pi Pin |
|------------|------------------|
| Vin (5V)   | Pin 2 (5V)       |
| GND        | Pin 6 (GND)      |
| RX         | Pin 8 (GPIO14)   |
| TX         | Pin 10 (GPIO15)  |

### Software Setup

1. **Install Mosquitto MQTT Broker**
   ```bash
   sudo apt update
   sudo apt install -y mosquitto mosquitto-clients
   ```

2. **Configure WebSocket support**

   Create `/etc/mosquitto/conf.d/websocket.conf`:
   ```conf
   listener 9001
   protocol websockets

   listener 1883
   protocol mqtt

   allow_anonymous true
   ```

3. **Restart Mosquitto**
   ```bash
   sudo systemctl restart mosquitto
   sudo systemctl enable mosquitto
   ```

4. **Install Python dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

5. **Run the sensor script**
   ```bash
   sudo python3 backend/air_quality_mhz19_mqtt.py
   ```

## Usage Without Hardware

Use the included sensor simulator for testing:

```bash
node scripts/simulate-sensor.js
```

This publishes mock CO2 data to the MQTT broker for dashboard testing.

## MongoDB Data Model

**CO2 Reading Schema:**
```javascript
{
  co2: Number,              // CO2 value in ppm (300-5000)
  status: String,           // OK, WARMUP, ERROR
  timestamp: Date,          // Reading timestamp
  sensor: String,           // Sensor model (default: MH-Z19)
  airQuality: String,       // Auto-calculated: Excellent, Good, Moderate, Fair, Poor
  location: String,         // Location identifier
  temperature: Number,      // Optional: Temperature in Celsius
  humidity: Number          // Optional: Humidity percentage
}
```

**Available Storage Service Methods:**
```javascript
import co2StorageService from './js/db/co2Storage.service.js';

// Save a reading
await co2StorageService.saveReading(data, 'location-name');

// Get latest reading
await co2StorageService.getLatest('location-name');

// Get recent readings (last N hours)
await co2StorageService.getRecent(24, 'location-name');

// Get statistics
await co2StorageService.getStats(24, 'location-name');

// Get air quality breakdown
await co2StorageService.getByAirQuality('location-name');
```

## Air Quality Levels

| CO2 Level (ppm) | Quality | Description |
|-----------------|---------|-------------|
| < 400 | Excellent | Outdoor fresh air |
| 400 - 450 | Good | Well-ventilated indoor |
| 450 - 550 | Moderate | Acceptable ventilation |
| 550 - 1000 | Fair | Ventilation recommended |
| > 1000 | Poor | Poor ventilation, open windows |

## MQTT Topics

| Topic | Description |
|-------|-------------|
| `sensor/co2` | Real-time CO2 readings |

**Message Format:**
```json
{
  "co2": 420,
  "status": "OK",
  "timestamp": "2025-01-20T12:00:00.000000",
  "sensor": "MH-Z19"
}
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and data flow
- [Quick Start](docs/QUICKSTART.md) - Detailed setup guide
- [Environment Setup](docs/ENVIRONMENT.md) - Development environment
- [Integration Plan](docs/INTEGRATION_PLAN.md) - Implementation roadmap

## Troubleshooting

### Authentication Issues

1. **Check Firebase configuration** - Verify `.env` has correct Firebase credentials
2. **Enable Email/Password Auth** - Go to Firebase Console → Authentication → Sign-in method
3. **Check browser console** - Look for Firebase initialization errors

### MongoDB Connection Issues

1. **Verify connection string** - Check `MONGODB_URI` in `.env`
2. **Whitelist IP address** - Go to MongoDB Atlas → Network Access → Add IP
3. **Check username/password** - Verify credentials in connection string

### MQTT Connection Issues

1. **Check Mosquitto status**
   ```bash
   sudo systemctl status mosquitto
   ```

2. **Test MQTT subscription**
   ```bash
   mosquitto_sub -h localhost -t sensor/co2 -v
   ```

3. **Verify WebSocket port**
   ```bash
   netstat -an | grep 9001
   ```

## Security Considerations

For production deployment:
- Enable MQTT authentication
- Use TLS/SSL for MQTT connections (wss://)
- Enable MongoDB authentication and whitelist IPs
- Enable Firebase security rules
- Use strong passwords
- Never commit `.env` file to git (already in .gitignore)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- MH-Z19 sensor by Winsen Sensor
- Chart.js for beautiful visualizations
- MQTT.js for WebSocket MQTT client
- Firebase for authentication backend
- MongoDB for data storage

---

**Built with concern for the environment.** Let's make the world breathable again.
