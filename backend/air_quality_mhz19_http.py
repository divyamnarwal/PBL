import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import serial


data = {"co2": 0, "temp": 0, "status": "live"}

SERIAL_DEV = os.environ.get("SERIAL_DEV", "/dev/serial0")
HTTP_HOST = os.environ.get("HTTP_HOST", "0.0.0.0")
HTTP_PORT = int(os.environ.get("HTTP_PORT", "8081"))


class APIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        return


def start_http_server():
    HTTPServer((HTTP_HOST, HTTP_PORT), APIHandler).serve_forever()


def read_sensor():
    with serial.Serial(SERIAL_DEV, 9600, timeout=5) as ser:
        ser.write(b"\xff\x01\x86\x00\x00\x00\x00\x00\x79")
        ser.flush()
        time.sleep(2)
        return ser.read(9)


def main():
    print(f"MH-Z19B LIVE - {SERIAL_DEV}", flush=True)
    print(f"HTTP API on http://{HTTP_HOST}:{HTTP_PORT}", flush=True)

    threading.Thread(target=start_http_server, daemon=True).start()

    while True:
        try:
            resp = read_sensor()

            if len(resp) == 9 and resp[0] == 0xFF:
                data["co2"] = resp[2] * 256 + resp[3]
                data["temp"] = resp[4] - 40
                print(
                    f"LIVE: CO2={data['co2']}ppm | T={data['temp']}C",
                    flush=True,
                )
            else:
                data["status"] = "read_error"
                print(f"Unexpected response: {resp!r}", flush=True)
        except Exception as exc:
            data["status"] = f"error:{exc.__class__.__name__}"
            print(f"Sensor error: {exc}", flush=True)

        time.sleep(3)


if __name__ == "__main__":
    main()
