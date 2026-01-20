// js/db/mongodb.service.js
// MongoDB Connection Service for Carbon Neutrality Dashboard

import mongoose from 'mongoose';

/**
 * MongoDB Connection Service
 * Manages connection to MongoDB Atlas using environment variables
 */
class MongoDBService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * Get MongoDB connection string from environment variables
   * For server-side use only (uses MONGODB_URI, not VITE_ prefixed)
   */
  getConnectionString() {
    // Try multiple environment variable names
    const uri =
      process.env.MONGODB_URI ||
      process.env.MONGODB_CONNECTION_STRING ||
      process.env.VITE_MONGODB_URI ||
      '';

    if (!uri) {
      throw new Error(
        'MongoDB connection string not found. Please set MONGODB_URI in your .env file. ' +
        'Get your connection string from MongoDB Atlas: ' +
        'Data → Connect → Connect your application → Driver: Node.js'
      );
    }

    return uri;
  }

  /**
   * Connect to MongoDB Atlas
   * Uses connection pooling and singleton pattern
   */
  async connect() {
    // Return existing connection if already connected
    if (this.isConnected && this.connection) {
      console.log('♻️  Using existing MongoDB connection');
      return this.connection;
    }

    // Return pending connection if one is in progress
    if (this.connectionPromise) {
      console.log('⏳ Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    // Create new connection
    this.connectionPromise = this._connect();

    try {
      this.connection = await this.connectionPromise;
      this.isConnected = true;
      return this.connection;
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Internal connection method
   */
  async _connect() {
    try {
      const uri = this.getConnectionString();

      console.log('🔌 Connecting to MongoDB Atlas...');

      // Mongoose connection options
      const options = {
        // Auto-reconnect
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 2, // Maintain minimum 2 socket connections
        family: 4 // Use IPv4, skip trying IPv6
      };

      // Connect to MongoDB
      await mongoose.connect(uri, options);

      console.log('✅ Connected to MongoDB Atlas');
      console.log('📊 Database:', mongoose.connection.name);

      // Connection event listeners
      mongoose.connection.on('connected', () => {
        console.log('♻️  MongoDB reconnected');
        this.isConnected = true;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('❌ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
        this.isConnected = false;
      });

      // Handle process termination
      process.on('SIGINT', () => this.disconnect());
      process.on('SIGTERM', () => this.disconnect());

      return mongoose.connection;

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
      console.log('⚠️  Not connected to MongoDB');
      return;
    }

    try {
      await mongoose.disconnect();
      this.connection = null;
      this.isConnected = false;
      this.connectionPromise = null;
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      // Ready states: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][
        mongoose.connection.readyState
      ]
    };
  }

  /**
   * Health check for MongoDB connection
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, message: 'Not connected' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      return { healthy: true, message: 'OK' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Drop all data (use with caution - for testing only)
   */
  async dropDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot drop database in production');
    }

    await mongoose.connection.db.dropDatabase();
    console.log('⚠️  Database dropped');
  }
}

// Export singleton instance
const mongoDBService = new MongoDBService();
export default mongoDBService;
