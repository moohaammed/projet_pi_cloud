# KAFKA_VERSION.md — Heart Beat Module Kafka Refactor

## Architecture Overview

The Heart Beat module (smartwatch-service) has been refactored from a synchronous REST→MongoDB flow to an **event-driven architecture using Apache Kafka internally**.

### Previous Architecture
```
Python BLE Client → POST /api/heart-rate → HeartRateService.save() → MongoDB → 201 Created
```

### New Architecture
```
Python BLE Client → POST /api/heart-rate/ingest → Kafka (heartrate.raw) → 202 Accepted
                                                          │
                                                          ├── Persistence Consumer → MongoDB
                                                          │
                                                          └── Stream Consumer → SSE → Angular Frontend
```

**Key principle**: One event ingested, published once to Kafka, then processed independently by multiple internal consumers within the same service.

---

## What Changed

### New Files — Backend (`smartwatch-service`)

| File | Purpose |
|------|---------|
| `dto/HeartRateIngestRequest.java` | Validated DTO for the ingestion endpoint |
| `dto/HeartRateAcceptedResponse.java` | Response DTO (202 Accepted) |
| `dto/HeartRateEvent.java` | Internal Kafka event schema |
| `dto/HeartRateViewDto.java` | DTO for SSE streaming to frontend |
| `kafka/KafkaConfig.java` | Kafka topic auto-creation |
| `kafka/HeartRateProducer.java` | Publishes events to `heartrate.raw` |
| `kafka/HeartRatePersistenceConsumer.java` | Consumes events → saves to MongoDB |
| `kafka/HeartRateStreamConsumer.java` | Consumes events → pushes via SSE |
| `service/HeartRateIngestionService.java` | Validates, enriches, and publishes events |
| `service/HeartRatePersistenceService.java` | Converts events to entities and persists |
| `service/HeartRateStreamingService.java` | Manages SSE emitters and broadcasts |
| `service/HeartRateQueryService.java` | Query operations (latest, history, etc.) |
| `controller/HeartRateIngestionController.java` | `POST /api/heart-rate/ingest` |
| `controller/HeartRateStreamController.java` | `GET /api/heart-rate/stream` (SSE) |

### Modified Files — Backend

| File | Change |
|------|--------|
| `pom.xml` | Added `spring-kafka` dependency |
| `application.properties` | Added Kafka broker, producer/consumer config, topic names |
| `entity/HeartRateRecord.java` | Added `eventId`, `source`, `capturedAt`, `receivedAt` fields |
| `controller/HeartRateController.java` | Removed sync POST, now uses `HeartRateQueryService` |
| `service/HeartRateService.java` | All methods marked `@Deprecated` |

### Modified Files — Frontend

| File | Change |
|------|--------|
| `services/heart-rate.service.ts` | Added `connectLiveStream()` SSE method |
| `components/live-heart-rate/live-heart-rate.component.ts` | Replaced 2s polling with SSE subscription |

### Modified Files — Python Client

| File | Change |
|------|--------|
| `scripts/smartwatch-client/smartwatch_ble_client.py` | Updated to use `/ingest` endpoint, added `source` and `capturedAt` fields, accepts `202` |

---

## Endpoints

### New Endpoint

#### `POST /api/heart-rate/ingest`

Async ingestion endpoint for the Python BLE collector.

**Request:**
```json
{
  "userId": 1,
  "deviceName": "ST2",
  "bpm": 78,
  "source": "BLE_CLIENT",
  "capturedAt": "2026-04-18T16:10:20Z"
}
```

**Response (202 Accepted):**
```json
{
  "status": "ACCEPTED",
  "eventId": "a1b2c3d4-...",
  "message": "Heart-rate event accepted for async processing"
}
```

**Validation:**
- `userId`: required
- `deviceName`: required, non-blank
- `bpm`: required, range 30–220
- `source`: optional (defaults to "UNKNOWN")
- `capturedAt`: optional, ISO-8601

#### `GET /api/heart-rate/stream?userId={userId}`

SSE endpoint for real-time heart-rate streaming.

**Query Parameters:**
- `userId` (optional) — if provided, only events for this user are streamed. If omitted, all events are streamed.

**Content-Type:** `text/event-stream`

**Event format:**
```
event: heartrate
data: {"eventId":"...","userId":1,"deviceName":"ST2","bpm":78,"source":"BLE_CLIENT","capturedAt":"...","receivedAt":"..."}
```

### Preserved Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/heart-rate/latest/{userId}` | Most recent reading for a user |
| GET | `/api/heart-rate/history/{userId}` | Full history (newest first) |
| GET | `/api/heart-rate/{id}` | Get by MongoDB ID |
| DELETE | `/api/heart-rate/{id}` | Delete by MongoDB ID |

---

## Kafka Topics

| Topic | Purpose | Producers | Consumers |
|-------|---------|-----------|-----------|
| `heartrate.raw` | Raw heart-rate events | `HeartRateProducer` | `HeartRatePersistenceConsumer` (group: `heartrate-persistence`), `HeartRateStreamConsumer` (group: `heartrate-stream`) |

**Future topic (not yet implemented):**
- `heartrate.alerts` — For anomaly detection and notifications

---

## How Persistence Works

1. The ingestion controller validates the request and publishes a `HeartRateEvent` to `heartrate.raw`
2. `HeartRatePersistenceConsumer` (consumer group: `heartrate-persistence`) receives the event
3. `HeartRatePersistenceService` converts the event to a `HeartRateRecord` entity
4. The entity is saved to MongoDB collection `heart_rate_records`
5. Both new fields (`eventId`, `source`, `capturedAt`, `receivedAt`) and the legacy `recordedAt` field are populated

---

## How Live Streaming Works

1. The Angular frontend connects to `GET /api/heart-rate/stream?userId=X` (SSE)
2. `HeartRateStreamingService` creates an `SseEmitter` paired with the optional `userId` filter and adds it to the active subscriber list
3. When `HeartRateStreamConsumer` (consumer group: `heartrate-stream`) receives an event from Kafka:
   - It converts the event to a `HeartRateViewDto`
   - It calls `streamingService.broadcast()` which sends the DTO only to matching SSE clients (those with `userId=null` or matching the event's userId)
4. The Angular component receives the event and updates the BPM display, ECG waveform, and stats in real time

---

## What Was Intentionally Left Unchanged

- **API Gateway** — Already routes `/api/heart-rate/**` to smartwatch-service
- **Eureka Server** — No changes needed
- **Other microservices** — backpi, collab-service, donation-service, rendezvous-service, flask_api untouched
- **Frontend routing** — Route `/heart-rate` still loads `LiveHeartRateComponent`
- **Frontend design** — HTML template and CSS unchanged, only the data source changed (SSE vs polling)
- **MongoDB schema** — Existing records remain valid; new fields are additive
- **HeartRateRepository** — Existing query methods still work

---

## How to Run and Test

### Prerequisites

1. **Apache Kafka** running on `localhost:9092`
2. **MongoDB** running on `localhost:27017`
3. **Eureka Server** running on `localhost:8761`

### Start Kafka (Docker)

```bash
# Start Zookeeper
docker run -d --name zookeeper -p 2181:2181 confluentinc/cp-zookeeper:latest \
  -e ZOOKEEPER_CLIENT_PORT=2181

# Start Kafka
docker run -d --name kafka -p 9092:9092 confluentinc/cp-kafka:latest \
  -e KAFKA_BROKER_ID=1 \
  -e KAFKA_ZOOKEEPER_CONNECT=host.docker.internal:2181 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
```

Or using `docker-compose`:

```yaml
version: '3'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:latest
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
```

### Start the Services

```bash
# 1. Eureka Server
cd eureka-server && mvn spring-boot:run

# 2. API Gateway
cd api-gateway && mvn spring-boot:run

# 3. Smartwatch Service (Heart Beat)
cd smartwatch-service && mvn spring-boot:run

# 4. Angular Frontend
cd frontend && npm start
```

### Test with curl

```bash
# Send a heart-rate reading
curl -X POST http://localhost:8080/api/heart-rate/ingest \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"deviceName":"ST2","bpm":78,"source":"BLE_CLIENT","capturedAt":"2026-04-18T16:10:20Z"}'

# Expected: 202 Accepted with eventId

# Check latest reading
curl http://localhost:8080/api/heart-rate/latest/1

# Check history
curl http://localhost:8080/api/heart-rate/history/1

# Connect to SSE stream for all users (in terminal)
curl -N http://localhost:8080/api/heart-rate/stream

# Connect to SSE stream for a specific user
curl -N "http://localhost:8080/api/heart-rate/stream?userId=1"
```

### Test with Python BLE Client

```bash
cd scripts/smartwatch-client
pip install -r requirements.txt
python smartwatch_ble_client.py
```

### End-to-End Flow Verification

1. Open browser at `http://localhost:4200/heart-rate`
2. Run `curl` or the Python client to send readings
3. Verify:
   - Console logs: `[INGEST ENDPOINT]`, `[KAFKA PUBLISH]`, `[PERSISTENCE CONSUMER]`, `[STREAM CONSUMER]`, `[SSE]`
   - MongoDB: records appear in `heart_rate_records` collection
   - Browser: BPM value updates in real time, ECG waveform animates

---

## Package Structure

```
tn.esprit.smartwatchservice
├── SmartwatchServiceApplication.java
├── controller/
│   ├── HeartRateController.java          (query endpoints)
│   ├── HeartRateIngestionController.java (POST /ingest)
│   └── HeartRateStreamController.java    (GET /stream — SSE)
├── dto/
│   ├── HeartRateIngestRequest.java
│   ├── HeartRateAcceptedResponse.java
│   ├── HeartRateEvent.java
│   ├── HeartRateViewDto.java
│   └── HeartRateRequest.java             (legacy, kept)
├── entity/
│   └── HeartRateRecord.java
├── kafka/
│   ├── KafkaConfig.java
│   ├── HeartRateProducer.java
│   ├── HeartRatePersistenceConsumer.java
│   └── HeartRateStreamConsumer.java
├── repository/
│   └── HeartRateRepository.java
└── service/
    ├── HeartRateIngestionService.java
    ├── HeartRatePersistenceService.java
    ├── HeartRateStreamingService.java
    ├── HeartRateQueryService.java
    └── HeartRateService.java              (deprecated, kept)
```
