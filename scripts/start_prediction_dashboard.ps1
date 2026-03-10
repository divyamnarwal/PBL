param(
    [int]$Port = $(if ($env:STREAMLIT_SERVER_PORT) { [int]$env:STREAMLIT_SERVER_PORT } else { 8501 })
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$dashboardRoot = Join-Path $repoRoot "ml-dashboard"

if (-not (Get-Command streamlit -ErrorAction SilentlyContinue)) {
    Write-Error "streamlit is not installed. Install ml-dashboard requirements first."
    exit 1
}

if (-not $env:ML_MODE) {
    $env:ML_MODE = "demo"
}

if (-not $env:CARBON_API_BASE_URL) {
    $env:CARBON_API_BASE_URL = "http://localhost:5000/api/ml/co2-history"
}

if (-not $env:MODEL_PATH) {
    $env:MODEL_PATH = Join-Path $dashboardRoot "cnn_lstm_co2_model.keras"
}

$env:STREAMLIT_SERVER_PORT = "$Port"
$env:PREDICTION_DASHBOARD_URL = "http://localhost:$Port"

Write-Host "Starting Streamlit prediction dashboard..." -ForegroundColor Cyan
Write-Host "  Root: $dashboardRoot" -ForegroundColor Gray
Write-Host "  Port: $Port" -ForegroundColor Gray
Write-Host "  ML_MODE: $env:ML_MODE" -ForegroundColor Gray
Write-Host "  CARBON_API_BASE_URL: $env:CARBON_API_BASE_URL" -ForegroundColor Gray
Write-Host ""

Set-Location $dashboardRoot
streamlit run app.py --server.port $Port --server.address 0.0.0.0
