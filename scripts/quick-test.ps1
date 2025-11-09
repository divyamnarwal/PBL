# Quick MQTT Test for Real-Time CO2 Monitoring

Write-Host "`n========== MQTT System Test ==========" -ForegroundColor Cyan
Write-Host ""

# Check Mosquitto
Write-Host "Checking Mosquitto..." -ForegroundColor Yellow
if (Get-Command mosquitto -ErrorAction SilentlyContinue) {
    Write-Host "  [OK] Mosquitto found" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Mosquitto not installed" -ForegroundColor Red
    Write-Host "  Download: https://mosquitto.org/download/" -ForegroundColor Gray
}

# Check ports
Write-Host "`nChecking ports..." -ForegroundColor Yellow
try {
    $mqtt = Get-NetTCPConnection -LocalPort 1883 -State Listen -ErrorAction Stop
    Write-Host "  [OK] Port 1883 listening" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Port 1883 not listening" -ForegroundColor Red
}

try {
    $ws = Get-NetTCPConnection -LocalPort 9001 -State Listen -ErrorAction Stop
    Write-Host "  [OK] Port 9001 listening" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Port 9001 not listening" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "`nTo test the dashboard:" -ForegroundColor Yellow
Write-Host "1. Open: d:\carbon-frontend\public\index.html" -ForegroundColor White
Write-Host "2. Login with your Firebase credentials" -ForegroundColor White
Write-Host "3. Look for the 'Live CO2 Monitoring' section" -ForegroundColor White
Write-Host ""
Write-Host "To publish test data:" -ForegroundColor Yellow
Write-Host 'mosquitto_pub -h localhost -t "sensor/co2" -m ''{"co2":650,"status":"OK","timestamp":"2025-11-09T14:30:00Z","sensor":"MH-Z19"}''' -ForegroundColor Gray
Write-Host ""
