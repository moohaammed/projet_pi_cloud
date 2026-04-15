import asyncio
import requests
from bleak import BleakScanner, BleakClient

WATCH_NAME_KEYWORD = "ST2"
CHAR_UUID = "000033f2-0000-1000-8000-00805f9b34fb"
BACKEND_URL = "http://localhost:8080/api/heart-rate"
USER_ID = 1

last_sent_bpm = None


def parse_heart_rate(data: bytearray):
    """
    Expected useful packet:
    E5 11 00 XX
    where XX = BPM
    """
    if len(data) == 4 and data[0] == 0xE5 and data[1] == 0x11 and data[2] == 0x00:
        return data[3]
    return None


def notification_handler(sender, data: bytearray):
    global last_sent_bpm

    raw_hex = data.hex(" ").upper()
    print(f"[NOTIFY] {raw_hex}")

    bpm = parse_heart_rate(data)
    if bpm is None:
        print("[INFO] Ignored non-heart-rate packet")
        return

    print(f"[HEART RATE] {bpm} BPM")

    if bpm == last_sent_bpm:
        return

    last_sent_bpm = bpm

    payload = {
        "userId": USER_ID,
        "deviceName": "ST2",
        "bpm": bpm
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=3)
        print(f"[POST] {response.status_code} -> {payload}")
        if response.status_code not in (200, 201):
            print(f"[POST RESPONSE] {response.text}")
    except Exception as e:
        print(f"[ERROR] Failed to send to backend: {e}")


async def find_device():
    print("[SCAN] Scanning for BLE devices...")
    devices = await BleakScanner.discover(timeout=15.0)

    for device in devices:
        name = device.name or ""
        print(f"Found: {name} - {device.address}")
        if WATCH_NAME_KEYWORD.lower() in name.lower():
            print(f"[FOUND] Target device: {name} - {device.address}")
            return device

    return None


async def main():
    device = await find_device()

    if not device:
        print("[ERROR] ST2 watch not found.")
        return

    print(f"[CONNECT] Trying to connect to {device.name} - {device.address}")

    try:
        async with BleakClient(device, timeout=30.0) as client:
            print("[CONNECTED] Connected to watch")

            services = client.services
            print("[SERVICES] Discovered services and characteristics:")
            for service in services:
                print(f"Service: {service.uuid}")
                for char in service.characteristics:
                    props = ",".join(char.properties)
                    print(f"  Characteristic: {char.uuid} | Properties: {props}")

            print(f"[SUBSCRIBE] Starting notifications on {CHAR_UUID}")
            await client.start_notify(CHAR_UUID, notification_handler)
            print("[LISTENING] Waiting for heart rate notifications... Press Ctrl+C to stop.")

            try:
                while True:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                print("[STOP] Graceful shutdown...")
            finally:
                await client.stop_notify(CHAR_UUID)
                print("[DISCONNECTED] Notifications stopped")

    except Exception as e:
        print(f"[ERROR] Connection or notification failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())