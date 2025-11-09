// js/mqtt-service.js
// MQTT WebSocket Client Service for Real-Time CO2 Monitoring

class MQTTService {
  constructor(config = {}) {
    // MQTT Configuration
    this.config = {
      brokerUrl: config.brokerUrl || 'ws://localhost:9001',
      topic: config.topic || 'sensor/co2',
      clientId: config.clientId || 'carbon-spa-' + Math.random().toString(16).substr(2, 8),
      reconnectPeriod: config.reconnectPeriod || 5000, // 5 seconds
      keepalive: config.keepalive || 60,
      ...config
    };

    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.messageHandlers = [];
    this.statusHandlers = [];
  }

  /**
   * Connect to MQTT broker via WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to MQTT broker:', this.config.brokerUrl);
        this.emitStatus('connecting', 'Connecting to MQTT broker...');

        // Create MQTT client using mqtt.js library
        this.client = mqtt.connect(this.config.brokerUrl, {
          clientId: this.config.clientId,
          keepalive: this.config.keepalive,
          reconnectPeriod: this.config.reconnectPeriod,
          clean: true
        });

        // Connection successful
        this.client.on('connect', () => {
          console.log('✅ Connected to MQTT broker');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emitStatus('connected', 'Connected to MQTT broker');
          
          // Subscribe to topic
          this.subscribe(this.config.topic);
          resolve();
        });

        // Connection error
        this.client.on('error', (error) => {
          console.error('❌ MQTT connection error:', error);
          this.isConnected = false;
          this.emitStatus('error', `Connection error: ${error.message}`);
          reject(error);
        });

        // Disconnected
        this.client.on('close', () => {
          console.log('🔌 Disconnected from MQTT broker');
          this.isConnected = false;
          this.emitStatus('disconnected', 'Disconnected from MQTT broker');
        });

        // Reconnecting
        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts})`);
          this.emitStatus('reconnecting', `Reconnecting... (attempt ${this.reconnectAttempts})`);
          
          // Stop trying after max attempts
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.client.end();
            this.emitStatus('error', 'Failed to reconnect after multiple attempts');
          }
        });

        // Message received
        this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message);
        });

      } catch (error) {
        console.error('❌ Failed to create MQTT client:', error);
        this.emitStatus('error', `Failed to connect: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Subscribe to MQTT topic
   */
  subscribe(topic) {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Cannot subscribe: not connected');
      return;
    }

    this.client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        console.error('❌ Subscription error:', error);
        this.emitStatus('error', `Subscription error: ${error.message}`);
      } else {
        console.log('✅ Subscribed to topic:', topic);
      }
    });
  }

  /**
   * Unsubscribe from MQTT topic
   */
  unsubscribe(topic) {
    if (!this.client) return;

    this.client.unsubscribe(topic, (error) => {
      if (error) {
        console.error('❌ Unsubscribe error:', error);
      } else {
        console.log('✅ Unsubscribed from topic:', topic);
      }
    });
  }

  /**
   * Publish message to topic (for future use)
   */
  publish(topic, message, options = {}) {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Cannot publish: not connected');
      return;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.client.publish(topic, payload, { qos: options.qos || 1 }, (error) => {
      if (error) {
        console.error('❌ Publish error:', error);
      }
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  handleMessage(topic, message) {
    try {
      const messageStr = message.toString();
      console.log('📨 Received message on', topic, ':', messageStr);

      // Parse JSON message
      const data = JSON.parse(messageStr);

      // Validate data structure
      if (!this.validateData(data)) {
        console.warn('⚠️ Invalid data format:', data);
        return;
      }

      // Emit to all registered handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(data, topic);
        } catch (error) {
          console.error('❌ Error in message handler:', error);
        }
      });

    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  }

  /**
   * Validate CO2 sensor data
   */
  validateData(data) {
    // Check required fields
    if (typeof data.co2 !== 'number') return false;
    if (!data.status) return false;
    if (!data.timestamp) return false;

    // Check CO2 range (valid range: 300-5000 ppm)
    if (data.co2 < 300 || data.co2 > 5000) {
      console.warn('⚠️ CO2 value out of range:', data.co2);
      return false;
    }

    return true;
  }

  /**
   * Register message handler
   */
  onMessage(handler) {
    if (typeof handler === 'function') {
      this.messageHandlers.push(handler);
    }
  }

  /**
   * Register status handler
   */
  onStatus(handler) {
    if (typeof handler === 'function') {
      this.statusHandlers.push(handler);
    }
  }

  /**
   * Emit status update
   */
  emitStatus(status, message) {
    this.statusHandlers.forEach(handler => {
      try {
        handler(status, message);
      } catch (error) {
        console.error('❌ Error in status handler:', error);
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect() {
    if (this.client) {
      console.log('🔌 Disconnecting from MQTT broker...');
      this.client.end();
      this.client = null;
      this.isConnected = false;
      this.messageHandlers = [];
      this.statusHandlers = [];
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      brokerUrl: this.config.brokerUrl,
      topic: this.config.topic
    };
  }
}

// Export for use in other modules
export { MQTTService };
