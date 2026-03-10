import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from model_utils import build_demo_forecast, get_model_status, predict_series

API_BASE_URL = os.getenv('CARBON_API_BASE_URL', 'http://localhost:5000/api/ml/co2-history')
DEFAULT_LOCATION = os.getenv('LOCATION', 'default')
DEFAULT_HOURS = int(os.getenv('DEFAULT_HISTORY_HOURS', '24'))
DEFAULT_FORECAST_STEPS = int(os.getenv('DEFAULT_FORECAST_STEPS', '12'))
DEFAULT_WINDOW_SIZE = int(os.getenv('DEFAULT_WINDOW_SIZE', '60'))
ML_MODE = os.getenv('ML_MODE', 'demo').strip().lower() or 'demo'
MODEL_PATH = os.getenv('MODEL_PATH', '')
HTTP_TIMEOUT_SECONDS = 5


st.set_page_config(
    page_title='Carbon Neutrality Predictions',
    page_icon='C',
    layout='wide',
    initial_sidebar_state='expanded',
)

st.markdown(
    """
    <style>
      .block-container { padding-top: 2rem; padding-bottom: 2rem; }
      .status-card {
        border-radius: 18px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        padding: 1rem 1.1rem;
        background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(240,249,255,0.92));
      }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data(ttl=30, show_spinner=False)
def fetch_history(location: str, hours: int) -> pd.DataFrame:
    query = urlencode({'location': location, 'hours': hours})
    request = Request(
        f'{API_BASE_URL}?{query}',
        headers={'Accept': 'application/json', 'User-Agent': 'carbon-neutrality-ml-dashboard'}
    )

    with urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
        payload = json.loads(response.read().decode('utf-8'))

    if not isinstance(payload, list):
        raise ValueError('Expected a JSON array from the CO2 history API.')

    dataframe = pd.DataFrame(payload)
    required_columns = {'timestamp', 'co2', 'status', 'sensor'}
    if not required_columns.issubset(dataframe.columns):
        raise ValueError(f'Missing required columns: {sorted(required_columns - set(dataframe.columns))}')

    dataframe['timestamp'] = pd.to_datetime(dataframe['timestamp'], errors='coerce', utc=True)
    dataframe['co2'] = pd.to_numeric(dataframe['co2'], errors='coerce')
    dataframe['status'] = dataframe['status'].fillna('OK').astype(str)
    dataframe['sensor'] = dataframe['sensor'].fillna('UNKNOWN').astype(str)
    dataframe = dataframe.dropna(subset=['timestamp', 'co2']).sort_values('timestamp').reset_index(drop=True)

    if dataframe.empty:
        raise ValueError('The CO2 history API returned no usable readings.')

    return dataframe


def generate_demo_history(location: str, hours: int) -> pd.DataFrame:
    point_count = min(max(hours * 12, 48), 288)
    timestamps = pd.date_range(
        end=pd.Timestamp.utcnow().floor('min'),
        periods=point_count,
        freq=f'{max(5, int((hours * 60) / point_count))}min'
    )

    baseline = 540
    location_key = location.lower()
    if 'office' in location_key:
        baseline = 690
    elif 'campus' in location_key:
        baseline = 620

    values = []
    for index in range(point_count):
        wave = np.sin(index / 4.0) * 58
        trend = np.sin(index / 15.0) * 33
        noise = ((index % 6) - 3) * 5
        values.append(max(380, baseline + wave + trend + noise))

    return pd.DataFrame(
        {
            'timestamp': timestamps,
            'co2': values,
            'status': ['OK'] * point_count,
            'sensor': ['DEMO-SENSOR'] * point_count,
        }
    )


def load_history(location: str, hours: int):
    try:
        dataframe = fetch_history(location, hours)
        return dataframe, 'API', None
    except (ValueError, HTTPError, URLError, TimeoutError, OSError) as error:
        return generate_demo_history(location, hours), 'Demo fallback', str(error)


def infer_frequency(dataframe: pd.DataFrame) -> pd.Timedelta:
    if len(dataframe.index) < 2:
        return pd.Timedelta(minutes=5)

    deltas = dataframe['timestamp'].diff().dropna()
    median_delta = deltas.median()

    if pd.isna(median_delta) or median_delta <= pd.Timedelta(0):
        return pd.Timedelta(minutes=5)

    return median_delta


def build_forecast(dataframe: pd.DataFrame, steps: int, window_size: int):
    values = dataframe['co2'].astype(float).to_numpy()
    model_status = get_model_status(MODEL_PATH, ML_MODE)
    forecast_mode = 'Heuristic demo forecast'
    forecast_note = model_status['reason']

    if model_status['available']:
        try:
            forecast_values = predict_series(values, MODEL_PATH, window_size=window_size, steps=steps)
            forecast_mode = 'CNN-LSTM model forecast'
            forecast_note = model_status['reason']
        except Exception as error:  # pragma: no cover - depends on optional ML stack
            forecast_values = build_demo_forecast(values, steps=steps)
            forecast_note = f"Model prediction failed, using demo forecast instead: {error}"
    else:
        forecast_values = build_demo_forecast(values, steps=steps)

    frequency = infer_frequency(dataframe)
    start_time = dataframe['timestamp'].iloc[-1] + frequency
    forecast_index = pd.date_range(start=start_time, periods=steps, freq=frequency)

    forecast_dataframe = pd.DataFrame(
        {
            'timestamp': forecast_index,
            'co2': forecast_values,
        }
    )

    return forecast_dataframe, forecast_mode, forecast_note


def get_status_label(value: float) -> str:
    if value < 600:
        return 'Excellent'
    if value < 1000:
        return 'Good'
    if value < 1500:
        return 'Moderate'
    if value < 2000:
        return 'Poor'
    return 'Hazardous'


def get_trend_label(delta: float) -> str:
    if delta > 10:
        return 'Rising'
    if delta < -10:
        return 'Falling'
    return 'Stable'


def build_history_chart(history_df: pd.DataFrame, forecast_df: pd.DataFrame) -> go.Figure:
    figure = go.Figure()
    figure.add_trace(
        go.Scatter(
            x=history_df['timestamp'],
            y=history_df['co2'],
            mode='lines',
            name='Historical CO2',
            line={'color': '#0f766e', 'width': 3},
        )
    )
    figure.add_trace(
        go.Scatter(
            x=forecast_df['timestamp'],
            y=forecast_df['co2'],
            mode='lines+markers',
            name='Forecast',
            line={'color': '#2563eb', 'width': 3, 'dash': 'dash'},
            marker={'size': 7},
        )
    )
    figure.update_layout(
        height=420,
        margin={'l': 10, 'r': 10, 't': 30, 'b': 10},
        legend={'orientation': 'h', 'y': 1.08},
        xaxis_title='Timestamp',
        yaxis_title='CO2 (ppm)',
        template='plotly_white',
    )
    return figure


def build_distribution_chart(history_df: pd.DataFrame) -> go.Figure:
    figure = go.Figure(
        data=[
            go.Histogram(
                x=history_df['co2'],
                nbinsx=24,
                marker={'color': '#10b981'},
                opacity=0.88,
            )
        ]
    )
    figure.update_layout(
        height=320,
        margin={'l': 10, 'r': 10, 't': 30, 'b': 10},
        xaxis_title='CO2 (ppm)',
        yaxis_title='Readings',
        template='plotly_white',
    )
    return figure


st.sidebar.title('Prediction Controls')
location = st.sidebar.text_input('Location', value=DEFAULT_LOCATION)
hours = st.sidebar.slider('History window (hours)', min_value=1, max_value=168, value=min(DEFAULT_HOURS, 168))
forecast_steps = st.sidebar.slider('Forecast points', min_value=6, max_value=48, value=min(DEFAULT_FORECAST_STEPS, 48))
window_size = st.sidebar.slider('Window size', min_value=24, max_value=120, value=min(DEFAULT_WINDOW_SIZE, 120))

if st.sidebar.button('Refresh data'):
    fetch_history.clear()

st.sidebar.caption(f'API source: {API_BASE_URL}')
st.sidebar.caption(f'ML mode: {ML_MODE}')
st.sidebar.caption(f'Model path: {MODEL_PATH or "not configured"}')

history_df, data_source, fallback_reason = load_history(location, hours)
forecast_df, forecast_mode, forecast_note = build_forecast(history_df, forecast_steps, window_size)

current_value = float(history_df['co2'].iloc[-1])
next_prediction = float(forecast_df['co2'].iloc[0])
delta_value = next_prediction - current_value
trend_label = get_trend_label(delta_value)
status_label = get_status_label(current_value)
history_start = history_df['timestamp'].iloc[0]
history_end = history_df['timestamp'].iloc[-1]

st.markdown('## Carbon Neutrality Prediction Service')
st.write(
    'This Streamlit service is vendored into the existing dashboard codebase and reads CO2 history '
    'from the Node API at `/api/ml/co2-history`.'
)

banner = (
    f"Data source: **{data_source}**  |  Forecast mode: **{forecast_mode}**  |  "
    f"Samples: **{len(history_df)}**  |  Window: **{history_start.strftime('%Y-%m-%d %H:%M')} -> {history_end.strftime('%Y-%m-%d %H:%M')}**"
)
st.info(banner)

if fallback_reason:
    st.warning(f'Using demo fallback data because the API request failed: {fallback_reason}')

if forecast_note:
    st.caption(forecast_note)

metric_one, metric_two, metric_three, metric_four = st.columns(4)
metric_one.metric('Current CO2', f'{current_value:.1f} ppm')
metric_two.metric('Next prediction', f'{next_prediction:.1f} ppm', f'{delta_value:+.1f} ppm')
metric_three.metric('Trend', trend_label)
metric_four.metric('Status', status_label)

chart_col, detail_col = st.columns([1.7, 1.0])

with chart_col:
    st.subheader('Historical CO2 with forecast overlay')
    st.plotly_chart(build_history_chart(history_df, forecast_df), use_container_width=True)

with detail_col:
    st.subheader('Distribution')
    st.plotly_chart(build_distribution_chart(history_df), use_container_width=True)

    st.markdown('<div class="status-card">', unsafe_allow_html=True)
    st.markdown(f'**Last update**  \n{history_end.strftime("%Y-%m-%d %H:%M:%S UTC")}')
    st.markdown(f'**Sensor source**  \n{history_df["sensor"].iloc[-1]}')
    st.markdown(f'**Average CO2**  \n{history_df["co2"].mean():.1f} ppm')
    st.markdown(f'**Peak CO2**  \n{history_df["co2"].max():.1f} ppm')
    st.markdown('</div>', unsafe_allow_html=True)

st.subheader('Recent readings')
preview_count = min(25, len(history_df))
preview = history_df.tail(preview_count).copy()
preview['timestamp'] = preview['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S UTC')
preview['co2'] = preview['co2'].round(2)
st.dataframe(preview.iloc[::-1], use_container_width=True, hide_index=True)

with st.expander('Integration notes'):
    st.markdown(
        f"""
        - `CARBON_API_BASE_URL` points to: `{API_BASE_URL}`
        - `ML_MODE` is currently: `{ML_MODE}`
        - `MODEL_PATH` is currently: `{MODEL_PATH or "not configured"}`
        - The default behavior is intentionally demo-safe. If the API is unreachable or the model cannot be loaded, this dashboard stays up and falls back to generated history or heuristic predictions.
        - To use the experimental model path, set `ML_MODE=model` and provide a readable `.keras` file at `MODEL_PATH`.
        """
    )
