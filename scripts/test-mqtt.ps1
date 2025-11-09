# Test Real-Time CO2 Monitoring System
# This script helps test the MQTT integration without a real sensor

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Real-Time CO2 Monitoring - Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  1. Mosquitto MQTT broker installed and running" -ForegroundColor White
Write-Host "  2. WebSocket configured on port 9001" -ForegroundColor White
Write-Host "  3. MQTT listening on port 1883" -ForegroundColor White
Write-Host ""

Write-Host "Testing..." -ForegroundColor Green
Write-Host ""

# Test 1: Check if Mosquitto is installed
Write-Host "[1/4] Checking Mosquitto installation..." -ForegroundColor Cyan
$mosquittoPath = Get-Command mosquitto -ErrorAction SilentlyContinue
if ($mosquittoPath) {
    Write-Host "  ✓ Mosquitto found: $($mosquittoPath.Source)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Mosquitto not found in PATH" -ForegroundColor Red
    Write-Host "    Download from: https://mosquitto.org/download/" -ForegroundColor Yellow
}
Write-Host ""

# Test 2: Check if port 1883 is listening
Write-Host "[2/4] Checking MQTT port (1883)..." -ForegroundColor Cyan
$mqttPort = Get-NetTCPConnection -LocalPort 1883 -State Listen -ErrorAction SilentlyContinue
if ($mqttPort) {
    Write-Host "  ✓ Port 1883 is listening" -ForegroundColor Green
} else {
    Write-Host "  ✗ Port 1883 is not listening" -ForegroundColor Red
    Write-Host "    Start Mosquitto: mosquitto -c mosquitto.conf" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check if port 9001 is listening
Write-Host "[3/4] Checking WebSocket port (9001)..." -ForegroundColor Cyan
$wsPort = Get-NetTCPConnection -LocalPort 9001 -State Listen -ErrorAction SilentlyContinue
if ($wsPort) {
    Write-Host "  ✓ Port 9001 is listening" -ForegroundColor Green
} else {
    Write-Host "  ✗ Port 9001 is not listening" -ForegroundColor Red
    Write-Host "    Configure WebSocket in mosquitto.conf:" -ForegroundColor Yellow
    Write-Host "      listener 9001" -ForegroundColor Gray
    Write-Host "      protocol websockets" -ForegroundColor Gray
}
Write-Host ""

# Test 4: Try to publish a test message
Write-Host "[4/4] Publishing test message..." -ForegroundColor Cyan
$testMessage = '{"co2":650,"status":"OK","timestamp":"' + (Get-Date -Format "o") + '","sensor":"MH-Z19"}'

if (Get-Command mosquitto_pub -ErrorAction SilentlyContinue) {
    try {
        mosquitto_pub -h localhost -t "sensor/co2" -m $testMessage
        Write-Host "  ✓ Test message published successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed to publish test message" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠ mosquitto_pub not found - skipping test publish" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. If Mosquitto is not running, start it:" -ForegroundColor White
Write-Host "     mosquitto -c mosquitto.conf" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Open dashboard in browser:" -ForegroundColor White
Write-Host "     d:\carbon-frontend\public\index.html" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. To simulate sensor data, run:" -ForegroundColor White
Write-Host "     mosquitto_pub -h localhost -t sensor/co2 -m '$testMessage'" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Or use the PowerShell loop below:" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To continuously publish test data, run:" -ForegroundColor Green
Write-Host ""
Write-Host '$co2 = 650' -ForegroundColor Gray
Write-Host 'while ($true) {' -ForegroundColor Gray
Write-Host '  $co2 = $co2 + (Get-Random -Minimum -20 -Maximum 20)' -ForegroundColor Gray
Write-Host '  $msg = "{\"co2\":$co2,\"status\":\"OK\",\"timestamp\":\"$(Get-Date -Format o)\",\"sensor\":\"MH-Z19\"}"' -ForegroundColor Gray
Write-Host '  mosquitto_pub -h localhost -t "sensor/co2" -m $msg' -ForegroundColor Gray
Write-Host '  Write-Host "Published: CO2=$co2 ppm"' -ForegroundColor Gray
Write-Host '  Start-Sleep -Seconds 2' -ForegroundColor Gray
Write-Host '}' -ForegroundColor Gray
Write-Host ""
