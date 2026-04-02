import streamlit as st
import pandas as pd
import numpy as np
import time

st.set_page_config(page_title="CO2 Monitor", layout="wide")

st.title("🌱 Carbon Neutrality Monitor")

# Simple metrics
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Current CO2", "415.2 ppm")
with col2:
    st.metric("Prediction", "417.8 ppm")
with col3:
    st.metric("Trend", "📈 Rising")
with col4:
    st.metric("Status", "⚠️ Warning")

# Configuration
st.sidebar.title("Configuration")
st.sidebar.success("Dashboard loaded!")

# Data section
st.subheader("📊 CO2 Data")
sample_data = {
    'Time': ['00:00', '01:00', '02:00', '03:00', '04:00'],
    'CO2 (ppm)': [415, 418, 416, 420, 417]
}
df = pd.DataFrame(sample_data)
st.dataframe(df)

# Simple chart
st.subheader("📈 CO2 Trend")
chart_data = pd.DataFrame({
    'Time': np.arange(24),
    'CO2': 415 + 10 * np.sin(np.linspace(0, 4*np.pi, 24)) + np.random.normal(0, 2, 24)
})
st.line_chart(chart_data.set_index('Time'))

# Real-time simulation
st.subheader("🔄 Live Simulation")
if st.button("Start Live Monitoring"):
    placeholder = st.empty()
    for i in range(10):
        with placeholder.container():
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Current", f"{415 + np.random.randint(-5, 5)} ppm")
            with col2:
                st.metric("Predicted", f"{417 + np.random.randint(-3, 3)} ppm")
        time.sleep(1)

st.success("✅ Dashboard is running successfully!")
st.info("🌱 Carbon Neutrality Dashboard - Real-time CO₂ monitoring")
