import asyncio
import random
import requests
from datetime import datetime, timezone

BACKEND_URL = "http://localhost:8080/api/heart-rate/ingest"
USER_ID = 5
DEVICE_NAME = "SIMULATOR_ST2"
SOURCE = "SIMULATOR"

# Choose one:
# "TACHYCARDIE"
# "BRADYCARDIE"
# "VARIATION_ANORMALE"
# "DONNEE_INCOHERENTE"
# "PIC_SOUDAIN"
SCENARIO = "TACHYCARDIE"

NORMAL_DURATION_SECONDS = 80
SEND_INTERVAL_SECONDS = 1.0


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def post_bpm(bpm: int):
    payload = {
        "userId": USER_ID,
        "deviceName": DEVICE_NAME,
        "bpm": bpm,
        "source": SOURCE,
        "capturedAt": now_utc_iso()
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=5)
        print(f"[POST] {response.status_code} -> BPM={bpm} | payload={payload}")

        if response.status_code not in (200, 201, 202):
            print(f"[POST RESPONSE] {response.text}")
        elif response.status_code == 202:
            try:
                body = response.json()
                print(f"[ACCEPTED] eventId={body.get('eventId', 'N/A')}")
            except Exception:
                print("[WARN] Accepted but response JSON could not be parsed.")
    except Exception as e:
        print(f"[ERROR] Failed to send BPM={bpm}: {e}")


def generate_normal_bpm() -> int:
    return random.randint(72, 88)


async def run_normal_phase():
    print(f"\n--- NORMAL PHASE for {NORMAL_DURATION_SECONDS} seconds ---")
    for _ in range(NORMAL_DURATION_SECONDS):
        bpm = generate_normal_bpm()
        post_bpm(bpm)
        await asyncio.sleep(SEND_INTERVAL_SECONDS)


async def run_tachycardia():
    print("\n--- TRIGGERING TACHYCARDIE ---")
    print("Rule: BPM > 120 sustained for 15 seconds")

    # 16 seconds above 120 to make sure it triggers
    for _ in range(16):
        bpm = random.randint(125, 140)
        post_bpm(bpm)
        await asyncio.sleep(SEND_INTERVAL_SECONDS)


async def run_bradycardia():
    print("\n--- TRIGGERING BRADYCARDIE ---")
    print("Rule: BPM < 50 sustained for 15 seconds")

    # 16 seconds below 50
    for _ in range(16):
        bpm = random.randint(40, 48)
        post_bpm(bpm)
        await asyncio.sleep(SEND_INTERVAL_SECONDS)


async def run_variation_anormale():
    print("\n--- TRIGGERING VARIATION_ANORMALE ---")
    print("Rule: abs(BPM now - BPM 5s ago) > 30")

    # Send stable values for 5 seconds
    base = 78
    for _ in range(5):
        post_bpm(base + random.randint(-2, 2))
        await asyncio.sleep(SEND_INTERVAL_SECONDS)

    # Then jump strongly
    bpm = 115
    post_bpm(bpm)
    await asyncio.sleep(SEND_INTERVAL_SECONDS)

    # Keep some extra values
    for _ in range(5):
        post_bpm(random.randint(110, 118))
        await asyncio.sleep(SEND_INTERVAL_SECONDS)


async def run_donnee_incoherente():
    print("\n--- TRIGGERING DONNEE_INCOHERENTE ---")
    print("Rule: BPM == 0 or BPM > 220")

    # Immediate incoherent value
    bpm = 0
    post_bpm(bpm)
    await asyncio.sleep(SEND_INTERVAL_SECONDS)

    # Optional second incoherent value
    bpm = 230
    post_bpm(bpm)
    await asyncio.sleep(SEND_INTERVAL_SECONDS)


async def run_pic_soudain():
    print("\n--- TRIGGERING PIC_SOUDAIN ---")
    print("Rule: Max-min spread > 40 within 3 seconds")

    sequence = [78, 82, 125]  # spread = 47 within 3 seconds
    for bpm in sequence:
        post_bpm(bpm)
        await asyncio.sleep(SEND_INTERVAL_SECONDS)

    # Continue a bit after spike
    for _ in range(4):
        post_bpm(random.randint(118, 128))
        await asyncio.sleep(SEND_INTERVAL_SECONDS)


async def run_selected_scenario():
    scenario = SCENARIO.upper().strip()

    if scenario == "TACHYCARDIE":
        await run_tachycardia()
    elif scenario == "BRADYCARDIE":
        await run_bradycardia()
    elif scenario == "VARIATION_ANORMALE":
        await run_variation_anormale()
    elif scenario == "DONNEE_INCOHERENTE":
        await run_donnee_incoherente()
    elif scenario == "PIC_SOUDAIN":
        await run_pic_soudain()
    else:
        raise ValueError(f"Unknown SCENARIO: {SCENARIO}")


async def main():
    print("Starting heart-rate simulator...")
    print(f"Scenario = {SCENARIO}")
    print(f"Backend  = {BACKEND_URL}")

    await run_normal_phase()
    #await run_selected_scenario()

    print("\nSimulation finished.")


if __name__ == "__main__":
    asyncio.run(main())