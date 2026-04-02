# 🌱 Carbon Neutrality CNN-LSTM Dashboard

A real-time monitoring and prediction dashboard for CO₂ levels using CNN-LSTM neural networks for carbon neutrality tracking.

## 🚀 Features

- **Real-time CO₂ Monitoring**: Live visualization of carbon dioxide levels
- **CNN-LSTM Prediction**: Advanced time series forecasting using convolutional and recurrent neural networks
- **Interactive Dashboard**: Streamlit-based web interface with real-time updates
- **Data Visualization**: Comprehensive charts and metrics for environmental monitoring
- **Model Training**: Built-in training pipeline for custom datasets
- **Historical Analysis**: Trend analysis and pattern recognition

## 📋 Prerequisites

- Python 3.8+
- CO₂ data CSV file with columns: `timestamp`, `co2`, `status`

## 🛠️ Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd windsurf-project
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

## 🎯 Quick Start

### Method 1: Run Dashboard Directly

```bash
streamlit run app.py
```

The dashboard will open at `http://localhost:8501`

### Method 2: Train Model First

1. **Train the CNN-LSTM model**:
```bash
python train_model.py
```

2. **Run the dashboard**:
```bash
streamlit run app.py
```

## 📊 Data Format

Your CSV file should contain:
- `timestamp`: Date/time of measurement
- `co2`: CO₂ concentration in ppm
- `status`: Measurement status (e.g., "OK", "ERROR")

Example:
```csv
timestamp,co2,status
2023-01-01 00:00:00,415.2,OK
2023-01-01 01:00:00,416.1,OK
2023-01-01 02:00:00,414.8,OK
```

## 🎛️ Dashboard Features

### Main Metrics
- **Current CO₂**: Real-time carbon dioxide levels
- **Prediction**: Next-hour forecast
- **Trend**: Direction and magnitude of change
- **Status**: Environmental health indicator

### Interactive Controls
- **Data Upload**: Upload custom CO₂ datasets
- **Window Size**: Adjust time series window (10-100 steps)
- **Prediction Steps**: Configure forecast horizon
- **Model Training**: Train new models on custom data

### Visualizations
- **Time Series Plot**: Historical CO₂ levels
- **Distribution Chart**: Statistical distribution of measurements
- **Real-time Monitoring**: Live prediction updates
- **Prediction Error**: Model accuracy tracking

## 🤖 Model Architecture

The CNN-LSTM model combines:
- **Conv1D Layers**: Feature extraction from time series
- **MaxPooling1D**: Dimensionality reduction
- **LSTM Layers**: Sequential pattern learning
- **Dropout**: Regularization to prevent overfitting
- **Dense Output**: Final prediction layer

### Model Parameters
- Window Size: 60 time steps (configurable)
- Convolutional Filters: 64
- LSTM Units: 50
- Dropout Rate: 0.2
- Optimizer: Adam
- Loss Function: Mean Squared Error

## 📁 Project Structure

```
windsurf-project/
├── app.py                 # Main Streamlit dashboard
├── model_utils.py         # CNN-LSTM model utilities
├── train_model.py         # Model training script
├── requirements.txt       # Python dependencies
├── README.md             # Documentation
└── cnn_lstm_co2_model.keras  # Trained model (generated)
```

## 🔧 Configuration

### Model Training Parameters
```python
# In train_model.py
data_path = "/path/to/your/data.csv"
window_size = 60
epochs = 30
batch_size = 32
```

### Dashboard Settings
```python
# In app.py sidebar
window_size = st.sidebar.slider("Window Size", 10, 100, 60)
prediction_steps = st.sidebar.slider("Prediction Steps", 1, 50, 20)
```

## 📈 Usage Examples

### Basic Monitoring
1. Upload your CO₂ data file
2. Click "Load Data"
3. View visualizations and metrics
4. Start real-time monitoring simulation

### Model Training
1. Prepare your CSV data file
2. Update `data_path` in `train_model.py`
3. Run training script
4. Use trained model in dashboard

### Custom Analysis
1. Adjust window size for different time horizons
2. Modify prediction steps for forecast range
3. Upload multiple datasets for comparison

## 🎨 Customization

### Adding New Metrics
```python
# In app.py
with col1:
    st.metric("Custom Metric", value, change)
```

### New Visualizations
```python
# Add new plot in app.py
fig = go.Figure()
fig.add_trace(go.Scatter(...))
st.plotly_chart(fig)
```

## 🐛 Troubleshooting

### Common Issues

1. **Model Loading Error**:
   - Ensure model file exists: `cnn_lstm_co2_model.keras`
   - Run training script first

2. **Data Loading Error**:
   - Check CSV file path
   - Verify required columns exist
   - Ensure data is not empty

3. **Dependency Issues**:
   - Update pip: `pip install --upgrade pip`
   - Reinstall requirements: `pip install -r requirements.txt`

### Performance Optimization

- Reduce `window_size` for faster training
- Decrease `epochs` for quicker iterations
- Use GPU acceleration if available

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌍 Environmental Impact

This dashboard helps organizations:
- Monitor carbon emissions in real-time
- Predict future CO₂ levels
- Make data-driven environmental decisions
- Work toward carbon neutrality goals

## 📞 Support

For questions or support:
- Create an issue in the repository
- Check the troubleshooting section
- Review the documentation

---

**🌱 Powered by CNN-LSTM Neural Networks for Environmental Sustainability**
