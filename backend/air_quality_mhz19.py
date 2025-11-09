# air_quality_mhz19.py
# Raspberry Pi + MH‑Z19B/E over UART (/dev/serial0)
# Output format: {"co2": 612, "status": "OK"}

import time, json, mh_z19  # pip install mh_z19

# Select the UART device; /dev/serial0 follows the active UART on Raspberry Pi
SERIAL_DEV = "/dev/ttyAMA0"  # Using ttyAMA0 directly (serial0 is a symlink to this)

# Set the serial device before reading
mh_z19.set_serialdevice(SERIAL_DEV)

def read_co2():
    """
    Returns a dict like {"co2": 612, "status": "OK"} or {"co2": None, "status": "WARMUP/ERROR"}.
    """
    try:
        data = mh_z19.read()  # {'co2': <ppm>}
        ppm = int(data["co2"]) if data and "co2" in data else None
        # MH‑Z19x has no built-in AQI; treat ppm < 400/invalid as warmup/invalid
        status = "OK" if (ppm is not None and ppm > 0) else "WARMUP"
        return {"co2": ppm, "status": status}
    except Exception as e:
        return {"co2": None, "status": f"ERROR: {e.__class__.__name__}"}

def main():
    print("MH‑Z19 UART reader started on", SERIAL_DEV, flush=True)
    while True:
        reading = read_co2()
        print(json.dumps(reading), flush=True)
        time.sleep(2)

if __name__ == "__main__":
    main()

