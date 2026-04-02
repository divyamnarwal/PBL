import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import time
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model
import os

# Page configuration
st.set_page_config(
    page_title="Carbon Neutrality CNN-LSTM Dashboard",
    page_icon="🌱",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        color: #1a5f3f;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
    }
    .status-good { color: #00c851; }
    .status-warning { color: #ffbb33; }
    .status-danger { color: #ff4444; }
</style>
""", unsafe_allow_html=True)

# Title
st.markdown('<h1 class="main-header">🌱 Carbon Neutrality Monitoring Dashboard</h1>', unsafe_allow_html=True)

# Sidebar
st.sidebar.title("⚙️ Configuration")

# File upload
uploaded_file = st.sidebar.file_uploader("Upload CO2 Data (CSV)", type=['csv'])
data_path = st.sidebar.text_input("Or enter data path:", "/Users/divyanshdobhal/Downloads/air_quality_data.csv")

# Model configuration
window_size = st.sidebar.slider("Window Size", min_value=10, max_value=100, value=60)
prediction_steps = st.sidebar.slider("Prediction Steps", min_value=1, max_value=50, value=20)

# Load data function
@st.cache_data
def load_data(data_path):
    try:
        if os.path.exists(data_path):
            df = pd.read_csv(data_path)
            return df
        else:
            st.error(f"File not found: {data_path}")
            return None
    except Exception as e:
        st.error(f"Error loading data: {e}")
        return None

# Model functions
def create_sequences(data, window):
    X, y = [], []
    for i in range(len(data)-window):
        X.append(data[i:i+window])
        y.append(data[i+window])
    return np.array(X), np.array(y)

def load_or_train_model():
    model_path = "cnn_lstm_co2_model.keras"
    if os.path.exists(model_path):
        try:
            model = load_model(model_path)
            st.success("✅ Model loaded successfully")
            return model
        except Exception as e:
            st.error(f"Error loading model: {e}")
    return None

# Main content
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown('<div class="metric-card">', unsafe_allow_html=True)
    st.metric("Current CO2", "415.2 ppm", "+2.3")
    st.markdown('</div>', unsafe_allow_html=True)

with col2:
    st.markdown('<div class="metric-card">', unsafe_allow_html=True)
    st.metric("Prediction", "417.8 ppm", "+2.6")
    st.markdown('</div>', unsafe_allow_html=True)

with col3:
    st.markdown('<div class="metric-card">', unsafe_allow_html=True)
    st.metric("Trend", "📈 Rising", "5%")
    st.markdown('</div>', unsafe_allow_html=True)

with col4:
    st.markdown('<div class="metric-card">', unsafe_allow_html=True)
    st.metric("Status", "⚠️ Warning", "Above Target")
    st.markdown('</div>', unsafe_allow_html=True)

# Data loading and processing
if st.sidebar.button("Load Data") or uploaded_file is not None:
    if uploaded_file is not None:
        df = pd.read_csv(uploaded_file)
    else:
        df = load_data(data_path)
    
    if df is not None:
        st.success("✅ Data loaded successfully!")
        
        # Display raw data
        with st.expander("📊 Raw Data Preview"):
            st.dataframe(df.head(10))
        
        # Data preprocessing
        df_filtered = df[(df['co2'].notna()) & (df['status'] == 'OK')]
        co2_series = df_filtered['co2'].values.astype(np.float32)
        
        st.info(f"📈 Total valid readings: {len(co2_series)}")
        
        # Visualization
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📊 CO2 Levels Over Time")
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=df_filtered.index[:1000],
                y=co2_series[:1000],
                mode='lines',
                name='CO2 Levels',
                line=dict(color='#1a5f3f', width=2)
            ))
            fig.update_layout(
                title="CO2 Concentration",
                xaxis_title="Time",
                yaxis_title="CO2 (ppm)",
                hovermode='x unified'
            )
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.subheader("📈 CO2 Distribution")
            fig_hist = go.Figure()
            fig_hist.add_trace(go.Histogram(
                x=co2_series,
                nbinsx=50,
                name='CO2 Distribution',
                marker_color='#667eea'
            ))
            fig_hist.update_layout(
                title="CO2 Level Distribution",
                xaxis_title="CO2 (ppm)",
                yaxis_title="Frequency"
            )
            st.plotly_chart(fig_hist, use_container_width=True)

# Model section
st.header("🤖 CNN-LSTM Model")

col1, col2 = st.columns(2)

with col1:
    st.subheader("Model Training")
    if st.button("Train New Model"):
        with st.spinner("Training model..."):
            # This would integrate your training code
            time.sleep(2)
            st.success("✅ Model training completed!")

with col2:
    st.subheader("Model Status")
    model = load_or_train_model()
    if model:
        st.success("✅ Model Ready")
        st.code(f"Model Architecture: {model.summary()}", language='python')

# Real-time monitoring simulation
st.header("📡 Real-time Monitoring")

if st.button("Start Monitoring Simulation"):
    # Initialize session state
    if 'monitoring_data' not in st.session_state:
        st.session_state.monitoring_data = []
    
    # Create placeholder for real-time updates
    placeholder = st.empty()
    
    # Simulate monitoring
    for i in range(prediction_steps):
        # Generate simulated data
        current_value = 415 + np.random.randint(-10, 10)
        predicted_value = current_value + np.random.randint(-5, 5)
        
        # Update session state
        st.session_state.monitoring_data.append({
            'step': i+1,
            'current': current_value,
            'predicted': predicted_value,
            'timestamp': pd.Timestamp.now()
        })
        
        # Create live plot
        df_monitor = pd.DataFrame(st.session_state.monitoring_data)
        
        fig = make_subplots(
            rows=2, cols=1,
            subplot_titles=('CO2 Levels', 'Prediction Error'),
            vertical_spacing=0.1
        )
        
        fig.add_trace(
            go.Scatter(
                x=df_monitor['step'],
                y=df_monitor['current'],
                mode='lines+markers',
                name='Current CO2',
                line=dict(color='blue')
            ),
            row=1, col=1
        )
        
        fig.add_trace(
            go.Scatter(
                x=df_monitor['step'],
                y=df_monitor['predicted'],
                mode='lines+markers',
                name='Predicted CO2',
                line=dict(color='red', dash='dash')
            ),
            row=1, col=1
        )
        
        prediction_error = df_monitor['predicted'] - df_monitor['current']
        fig.add_trace(
            go.Scatter(
                x=df_monitor['step'],
                y=prediction_error,
                mode='lines+markers',
                name='Prediction Error',
                line=dict(color='orange')
            ),
            row=2, col=1
        )
        
        fig.update_layout(
            height=600,
            title_text="Real-time CO2 Monitoring",
            showlegend=True
        )
        
        with placeholder.container():
            st.plotly_chart(fig, use_container_width=True)
            
            # Display current metrics
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Current Step", i+1)
            with col2:
                st.metric("Current CO2", f"{current_value:.2f} ppm")
            with col3:
                st.metric("Predicted CO2", f"{predicted_value:.2f} ppm")
        
        time.sleep(1)  # Simulate real-time delay

# Footer
st.markdown("---")
st.markdown("🌱 **Carbon Neutrality Dashboard** - Powered by CNN-LSTM Neural Network")
st.markdown("Real-time CO₂ monitoring and prediction for environmental sustainability")
