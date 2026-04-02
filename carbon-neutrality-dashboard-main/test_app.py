import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px

# Page configuration
st.set_page_config(
    page_title="CO2 Monitor",
    layout="wide"
)

# Title
st.title("🌱 Carbon Neutrality Monitor")

# Simple metrics
st.write("Dashboard is loading...")

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Current CO2", "415.2 ppm")
with col2:
    st.metric("Prediction", "417.8 ppm")
with col3:
    st.metric("Trend", "📈 Rising")
with col4:
    st.metric("Status", "⚠️ Warning")

# File upload
st.sidebar.title("Configuration")
uploaded_file = st.sidebar.file_uploader("Upload CO2 Data", type=['csv'])

if uploaded_file:
    try:
        df = pd.read_csv(uploaded_file)
        st.success("Data loaded!")
        st.dataframe(df.head())
        
        if 'co2' in df.columns:
            st.subheader("CO2 Levels")
            fig = px.line(df.head(1000), y='co2', title="CO2 Concentration")
            st.plotly_chart(fig)
    except Exception as e:
        st.error(f"Error: {e}")

# Real-time simulation
if st.button("Start Simulation"):
    placeholder = st.empty()
    for i in range(10):
        with placeholder.container():
            st.write(f"Step {i+1}: CO2 = {415 + np.random.randint(-5, 5)} ppm")
        time.sleep(1)

st.info("Dashboard is running successfully!")
