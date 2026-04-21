import urllib.request
import urllib.error
import json

data = {
    "title": "Test",
    "startDateTime": "2026-05-10T15:30:00",
    "location": "Loc",
    "description": "Desc long enough",
    "capacity": 10,
    "userId": 1
}

req = urllib.request.Request("http://localhost:8080/api/events", data=json.dumps(data).encode('utf-8'))
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req) as res:
        print("Status", res.status)
        print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
