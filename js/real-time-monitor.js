// js/real-time-monitor.js
// Real-Time CO2 Monitoring Dashboard Logic

class RealTimeMonitor {
  constructor(chartCanvasId, topic) {
    this.chartCanvasId = chartCanvasId;
    this.topic = topic;
    this.chart = null;
    this.dataBuffer = [];
    this.maxBufferSize = 100; // Keep last 100 readings
    this.statistics = {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      count: 0
    };

    // DOM elements (will be initialized when DOM is ready)
    this.elements = {};

    // CO2 level thresholds
    this.thresholds = {
      excellent: { max: 600, color: '#10b981', label: 'Excellent', emoji: '🟢' },
      good: { max: 1000, color: '#fbbf24', label: 'Good', emoji: '🟡' },
      moderate: { max: 1500, color: '#f97316', label: 'Moderate', emoji: '🟠' },
      poor: { max: 2000, color: '#ef4444', label: 'Poor', emoji: '🔴' },
      hazardous: { max: 5000, color: '#991b1b', label: 'Hazardous', emoji: '⚫' }
    };
  }

  /**
   * Initialize the monitor
   */
  init() {
    console.log('🚀 Initializing Real-Time CO2 Monitor...');

    // Get DOM elements
    this.initElements();

    // Initialize Chart
    this.initChart();

    console.log('✅ Monitor initialized');
  }

  /**
   * Initialize DOM elements
   */
  initElements() {
    this.elements = {
      // Current reading
      co2Value: document.getElementById('co2-value'),
      co2Quality: document.getElementById('co2-quality'),
      co2Status: document.getElementById('co2-status'),
      lastUpdate: document.getElementById('last-update'),

      // Statistics
      minValue: document.getElementById('min-value'),
      maxValue: document.getElementById('max-value'),
      avgValue: document.getElementById('avg-value'),

      // Connection status
      statusIndicator: document.getElementById('status-indicator'),
      statusText: document.getElementById('status-text'),

      // Chart
      chartCanvas: document.getElementById(this.chartCanvasId),

      // Sensor info
      sensorType: document.getElementById('sensor-type'),
      sensorStatus: document.getElementById('sensor-status')
    };

    console.log('📋 DOM elements initialized:', Object.keys(this.elements).length, 'elements');
  }

  /**
   * Initialize Chart.js chart
   */
  initChart() {
    if (!this.elements.chartCanvas) {
      console.warn('⚠️ Chart canvas not found');
      return;
    }

    const ctx = this.elements.chartCanvas.getContext('2d');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'CO₂ Level (ppm)',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              label: function(context) {
                return `CO₂: ${context.parsed.y} ppm`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Time'
            },
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'CO₂ (ppm)'
            },
            beginAtZero: false,
            suggestedMin: 400,
            suggestedMax: 1500,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        },
        animation: {
          duration: 750
        }
      }
    });

    console.log('📊 Chart initialized');
  }

  /**
   * Handle incoming sensor data
   */
  handleData(data) {
    console.log('📊 Processing sensor data:', data);

    // Add to buffer
    this.dataBuffer.push(data);
    if (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer.shift(); // Remove oldest
    }

    // Update statistics
    this.updateStatistics(data.co2);

    // Update UI
    this.updateCurrentReading(data);
    this.updateChart(data);
    this.updateStatisticsDisplay();
    this.checkAlerts(data.co2);
  }

  /**
   * Handle connection status changes
   */
  updateStatus(status, message) {
    console.log('📡 Status update:', status, message);

    if (!this.elements.statusIndicator || !this.elements.statusText) return;

    // Update status indicator
    this.elements.statusIndicator.className = 'status-indicator';

    switch (status) {
      case 'connected':
        this.elements.statusIndicator.classList.add('connected');
        this.elements.statusText.textContent = message || 'Connected';
        break;
      case 'connecting':
      case 'reconnecting':
        this.elements.statusIndicator.classList.add('connecting');
        this.elements.statusText.textContent = message || 'Connecting...';
        break;
      case 'disconnected':
      case 'error':
        this.elements.statusIndicator.classList.add('disconnected');
        this.elements.statusText.textContent = message || 'Disconnected';
        break;
    }
  }

  /**
   * Update current reading display
   */
  updateCurrentReading(data) {
    // Update CO2 value
    if (this.elements.co2Value) {
      this.elements.co2Value.textContent = data.co2;
    }

    // Update quality badge
    const quality = this.getQualityLevel(data.co2);
    if (this.elements.co2Quality) {
      this.elements.co2Quality.textContent = `${quality.emoji} ${quality.label}`;
      this.elements.co2Quality.style.color = quality.color;
    }

    // Update sensor status
    if (this.elements.co2Status) {
      this.elements.co2Status.textContent = data.status;
    }

    // Update last update time
    if (this.elements.lastUpdate) {
      this.elements.lastUpdate.textContent = this.formatTime(data.timestamp);
    }

    // Update sensor info
    if (this.elements.sensorType) {
      this.elements.sensorType.textContent = data.sensor || 'MH-Z19';
    }
    if (this.elements.sensorStatus) {
      this.elements.sensorStatus.textContent = data.status === 'OK' ? '✓ Active' : data.status;
    }
  }

  /**
   * Update chart with new data
   */
  updateChart(data) {
    if (!this.chart) return;

    const timeLabel = this.formatTime(data.timestamp, true);

    // Add new data point
    this.chart.data.labels.push(timeLabel);
    this.chart.data.datasets[0].data.push(data.co2);

    // Keep only last 50 points on chart
    if (this.chart.data.labels.length > 50) {
      this.chart.data.labels.shift();
      this.chart.data.datasets[0].data.shift();
    }

    // Update chart color based on CO2 level
    const quality = this.getQualityLevel(data.co2);
    this.chart.data.datasets[0].borderColor = quality.color;
    this.chart.data.datasets[0].backgroundColor = quality.color + '20';

    // Update chart
    this.chart.update('none'); // 'none' for no animation (smoother updates)
  }

  /**
   * Update statistics
   */
  updateStatistics(co2Value) {
    this.statistics.count++;
    this.statistics.min = Math.min(this.statistics.min, co2Value);
    this.statistics.max = Math.max(this.statistics.max, co2Value);
    this.statistics.avg = ((this.statistics.avg * (this.statistics.count - 1)) + co2Value) / this.statistics.count;
  }

  /**
   * Update statistics display
   */
  updateStatisticsDisplay() {
    if (this.elements.minValue) {
      this.elements.minValue.textContent = Math.round(this.statistics.min);
    }
    if (this.elements.maxValue) {
      this.elements.maxValue.textContent = Math.round(this.statistics.max);
    }
    if (this.elements.avgValue) {
      this.elements.avgValue.textContent = Math.round(this.statistics.avg);
    }
  }

  /**
   * Check for alerts
   */
  checkAlerts(co2Value) {
    if (co2Value > 1000 && co2Value < 1500) {
      console.warn('⚠️ CO2 level moderate:', co2Value, 'ppm - Consider ventilation');
    } else if (co2Value >= 1500) {
      console.error('🚨 CO2 level high:', co2Value, 'ppm - Immediate ventilation required!');
      // Could show a notification here
    }
  }

  /**
   * Get quality level based on CO2 value
   */
  getQualityLevel(co2Value) {
    if (co2Value <= this.thresholds.excellent.max) return this.thresholds.excellent;
    if (co2Value <= this.thresholds.good.max) return this.thresholds.good;
    if (co2Value <= this.thresholds.moderate.max) return this.thresholds.moderate;
    if (co2Value <= this.thresholds.poor.max) return this.thresholds.poor;
    return this.thresholds.hazardous;
  }

  /**
   * Format timestamp
   */
  formatTime(timestamp, shortFormat = false) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    if (shortFormat) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleString();
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('❌', message);
    // Could show a toast notification or alert here
  }

  /**
   * Clean up and disconnect
   */
  destroy() {
    console.log('🧹 Cleaning up monitor...');

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.dataBuffer = [];
    this.statistics = {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      count: 0
    };
  }
}

// Export for use in other modules
export { RealTimeMonitor };
