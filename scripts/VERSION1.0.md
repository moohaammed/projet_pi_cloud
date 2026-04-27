# VERSION 1.0 — Smartwatch-Service & Help Notification Architecture

## What Changed

This version adds **automatic heart-rate danger detection** to the MediSync platform.
Previously, help notifications could only be triggered manually by a patient clicking a button.
Now, dangerous heart-rate conditions detected from real-time Kafka-streamed BPM data
automatically trigger the same help notification workflow.

### Summary of Changes

| Service | Change Type | Description |
|---------|-------------|-------------|
| **smartwatch-service** | 4 new files, 2 modified | Condition detection pipeline + alert Kafka topic |
| **backpi** | 3 new files, 2 modified, 5 moved | Kafka consumer + help notification reorganization |
| **frontend** | None | Existing popup/WebSocket flow works unchanged |
| **api-gateway** | None | No routing changes needed |

---

## Final Architecture

### High-Level Flow

```
Python/BLE script
   → smartwatch-service REST ingest
   → HeartRateProducer
   → Kafka topic: heartrate.raw

heartrate.raw consumed by 3 independent consumer groups:
   → HeartRateStreamConsumer       → SSE dashboard (unchanged)
   → HeartRatePersistenceConsumer  → MongoDB (unchanged)
   → HeartRateAlertConsumer        → condition detection (NEW)

HeartRateAlertConsumer
   → HeartRateConditionEvaluator (in-memory per-user state)
   → HeartRateAlertProducer
   → Kafka topic: heartrate.alerts (NEW)

heartrate.alerts consumed by:
   → backpi / HeartRateHelpNotificationConsumer (NEW)
   → existing HelpNotificationService
   → doctor/relation WebSocket popup + email
```

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      smartwatch-service                          │
│                                                                  │
│  Python Script ──► HeartRateIngestionService                     │
│                         │                                        │
│                         ▼                                        │
│                   HeartRateProducer                               │
│                         │                                        │
│                         ▼                                        │
│              ┌─── heartrate.raw (Kafka) ───┐                     │
│              │          │                  │                      │
│              ▼          ▼                  ▼                      │
│    StreamConsumer  PersistConsumer   AlertConsumer (NEW)          │
│         │              │                  │                      │
│         ▼              ▼                  ▼                      │
│    SSE Dashboard    MongoDB     ConditionEvaluator (NEW)         │
│                                          │                      │
│                                          ▼                      │
│                                  AlertProducer (NEW)             │
│                                          │                      │
│                                          ▼                      │
│                               heartrate.alerts (NEW Kafka topic) │
└──────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                           backpi                                 │
│                                                                  │
│  heartrate.alerts ──► HeartRateHelpNotificationConsumer (NEW)    │
│                              │                                   │
│                              ▼                                   │
│                    HelpNotificationService                        │
│                     (Mode A: manual button)                      │
│                     (Mode B: automatic Kafka) ◄── NEW            │
│                              │                                   │
│                    ┌─────────┴─────────┐                         │
│                    ▼                   ▼                          │
│             WebSocket Push        Email (SMTP)                   │
│          (/user/queue/help-       (external contacts)            │
│            notifications)                                        │
│                    │                                             │
│                    ▼                                             │
│              Frontend Popup                                      │
│              (unchanged)                                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Role of Each Component

### smartwatch-service Components

| Component | File | Role |
|-----------|------|------|
| **HeartRateIngestionService** | `service/HeartRateIngestionService.java` | Validates incoming BPM readings, enriches with metadata, publishes to Kafka |
| **HeartRateProducer** | `kafka/HeartRateProducer.java` | Publishes `HeartRateEvent` to `heartrate.raw` topic |
| **HeartRateStreamConsumer** | `kafka/HeartRateStreamConsumer.java` | Consumes `heartrate.raw`, pushes to SSE for live dashboard |
| **HeartRatePersistenceConsumer** | `kafka/HeartRatePersistenceConsumer.java` | Consumes `heartrate.raw`, persists to MongoDB |
| **HeartRateAlertConsumer** *(NEW)* | `kafka/HeartRateAlertConsumer.java` | Consumes `heartrate.raw`, delegates to condition evaluator, publishes alerts |
| **HeartRateConditionEvaluator** *(NEW)* | `service/HeartRateConditionEvaluator.java` | Evaluates 5 danger conditions per userId with in-memory state and cooldown |
| **HeartRateAlertProducer** *(NEW)* | `kafka/HeartRateAlertProducer.java` | Publishes `HeartRateAlertEvent` to `heartrate.alerts` topic |
| **HeartRateAlertEvent** *(NEW)* | `dto/HeartRateAlertEvent.java` | Structured alert event DTO (condition type, severity, message) |
| **KafkaConfig** *(MODIFIED)* | `kafka/KafkaConfig.java` | Now creates both `heartrate.raw` and `heartrate.alerts` topics |

### backpi Components

| Component | File | Role |
|-----------|------|------|
| **HeartRateHelpNotificationConsumer** *(NEW)* | `helpnotification/kafka/HeartRateHelpNotificationConsumer.java` | Consumes `heartrate.alerts`, calls HelpNotificationService |
| **KafkaConsumerConfig** *(NEW)* | `helpnotification/kafka/KafkaConsumerConfig.java` | Kafka consumer factory configuration |
| **HeartRateAlertEvent** *(NEW)* | `helpnotification/dto/HeartRateAlertEvent.java` | Mirror DTO for deserializing alert events |
| **HelpNotificationService** *(MOVED+MODIFIED)* | `helpnotification/service/HelpNotificationService.java` | Mode A: manual button / Mode B: automatic Kafka trigger |
| **HelpNotificationController** *(MOVED)* | `helpnotification/controller/HelpNotificationController.java` | REST endpoint for manual trigger (unchanged) |
| **PatientContactController** *(MOVED)* | `helpnotification/controller/PatientContactController.java` | CRUD for patient contacts (unchanged) |
| **PatientContactService** *(MOVED)* | `helpnotification/service/PatientContactService.java` | Contact management logic (unchanged) |
| **PatientContactDTO** *(MOVED)* | `helpnotification/dto/PatientContactDTO.java` | Contact DTO (unchanged) |

---

## Kafka Topics

| Topic | Publisher | Consumers | Content |
|-------|-----------|-----------|---------|
| `heartrate.raw` | `HeartRateProducer` (smartwatch) | `HeartRateStreamConsumer` (group: heartrate-stream), `HeartRatePersistenceConsumer` (group: heartrate-persistence), `HeartRateAlertConsumer` (group: heartrate-alert) | Raw BPM readings |
| `heartrate.alerts` *(NEW)* | `HeartRateAlertProducer` (smartwatch) | `HeartRateHelpNotificationConsumer` (group: backpi-help-notification) | Structured alert events with condition type and severity |

---

## Danger Conditions Detected

| Condition | Condition Type | Detection Rule | Severity |
|-----------|---------------|----------------|----------|
| Tachycardie | `TACHYCARDIE` | BPM > 120 sustained for 15 seconds | WARNING |
| Bradycardie | `BRADYCARDIE` | BPM < 50 sustained for 15 seconds | WARNING |
| Variation anormale | `VARIATION_ANORMALE` | abs(BPM now - BPM 5s ago) > 30 | WARNING |
| Donnée incohérente | `DONNEE_INCOHERENTE` | BPM == 0 or BPM > 220 | CRITICAL |
| Pic soudain | `PIC_SOUDAIN` | Max-min spread > 40 within 3 seconds | CRITICAL |

### Deduplication / Cooldown

- **60 seconds** cooldown per userId + conditionType (configurable via `heartrate.alert.cooldown-seconds`)
- After triggering an alert for condition X for user Y, no re-trigger within the cooldown period
- Each condition cooldown is independent (triggering TACHYCARDIE doesn't block BRADYCARDIE)

---

## How Help Notification is Triggered from Heart-Rate Conditions

### Mode A — Manual (existing, unchanged)

1. Patient clicks "Send Help" button in frontend
2. Frontend calls `POST /api/help-notifications/send?userId={id}`
3. `HelpNotificationController` → `HelpNotificationService.sendHelpNotification(userId)`
4. Service loads contacts, sends WebSocket push + email

### Mode B — Automatic from Kafka (NEW)

1. Python script sends BPM readings → smartwatch-service ingestion
2. `HeartRateProducer` publishes `HeartRateEvent` to `heartrate.raw`
3. `HeartRateAlertConsumer` receives event (consumer group: `heartrate-alert`)
4. `HeartRateConditionEvaluator` evaluates 5 conditions with per-user in-memory state
5. If condition met + cooldown expired → builds `HeartRateAlertEvent`
6. `HeartRateAlertProducer` publishes to `heartrate.alerts`
7. **backpi**'s `HeartRateHelpNotificationConsumer` receives the alert
8. Calls `HelpNotificationService.sendHelpNotification(userId, message, source, conditionType)`
9. Same notification delivery: WebSocket push + email

Both modes share the same core notification logic (`doSendHelpNotification()`).

---

## How to Test

### Prerequisites

1. **Kafka** running on `localhost:9092`
2. **MongoDB** running on `localhost:27017`
3. **MySQL** running on `localhost:3306` with `alzheimer_db` database
4. **Eureka** running on `localhost:8761`
5. Start **smartwatch-service** (port 8095)
6. Start **backpi** (port 8082)

### Test Scenarios

#### 1. Normal BPM — No Alert

```bash
# Send a few normal BPM readings
curl -X POST "http://localhost:8095/api/heart-rate/ingest" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "bpm": 72, "deviceName": "TestWatch", "source": "TEST"}'
```

**Expected**: No alert in logs, no notification.

#### 2. Tachycardie (BPM > 120 for 15s)

```bash
# Send BPM > 120 every second for 16+ seconds
for i in $(seq 1 18); do
  curl -s -X POST "http://localhost:8095/api/heart-rate/ingest" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": 1, \"bpm\": 135, \"deviceName\": \"TestWatch\", \"source\": \"TEST\"}"
  sleep 1
done
```

**Expected**: After ~15s, see `🚨 [CONDITION] TACHYCARDIE` in smartwatch logs and notification in backpi logs.

#### 3. Bradycardie (BPM < 50 for 15s)

```bash
for i in $(seq 1 18); do
  curl -s -X POST "http://localhost:8095/api/heart-rate/ingest" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": 1, \"bpm\": 40, \"deviceName\": \"TestWatch\", \"source\": \"TEST\"}"
  sleep 1
done
```

**Expected**: After ~15s, see `🚨 [CONDITION] BRADYCARDIE`.

#### 4. Donnée incohérente (immediate)

```bash
curl -X POST "http://localhost:8095/api/heart-rate/ingest" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "bpm": 0, "deviceName": "TestWatch", "source": "TEST"}'

curl -X POST "http://localhost:8095/api/heart-rate/ingest" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "bpm": 250, "deviceName": "TestWatch", "source": "TEST"}'
```

**Expected**: Immediate `🚨 [CONDITION] DONNEE_INCOHERENTE` for both.

#### 5. Pic soudain (spike > 40 in 3s)

```bash
curl -X POST "http://localhost:8095/api/heart-rate/ingest" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "bpm": 70, "deviceName": "TestWatch", "source": "TEST"}'
sleep 1
curl -X POST "http://localhost:8095/api/heart-rate/ingest" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "bpm": 120, "deviceName": "TestWatch", "source": "TEST"}'
```

**Expected**: `🚨 [CONDITION] PIC_SOUDAIN` (spread = 50 > 40).

#### 6. Variation anormale

```bash
curl -X POST "http://localhost:8095/api/heart-rate/ingest" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "bpm": 70, "deviceName": "TestWatch", "source": "TEST"}'
sleep 5
curl -X POST "http://localhost:8095/api/heart-rate/ingest" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "bpm": 110, "deviceName": "TestWatch", "source": "TEST"}'
```

**Expected**: `🚨 [CONDITION] VARIATION_ANORMALE` (diff = 40 > 30).

#### 7. Cooldown verification

Repeat any condition immediately after it triggers.

**Expected**: No duplicate alert within 60 seconds.

#### 8. Manual button still works

```bash
curl -X POST "http://localhost:8082/api/help-notifications/send?userId=1"
```

**Expected**: Manual help notification sent as before.

#### 9. SSE dashboard still works

Open the SSE endpoint in browser or curl:
```bash
curl -N "http://localhost:8095/api/heart-rate/stream"
```

Send BPM readings — they should appear in the SSE stream.

#### 10. MongoDB persistence still works

Check MongoDB after sending readings:
```bash
mongosh smartwatch_db --eval "db.heart_rate_records.find().sort({recordedAt: -1}).limit(5)"
```

---

## Configuration Reference

### smartwatch-service (`application.properties`)

```properties
heartrate.topic.raw=heartrate.raw
heartrate.topic.alerts=heartrate.alerts
heartrate.alert.cooldown-seconds=60
```

### backpi (`application.properties`)

```properties
spring.kafka.bootstrap-servers=localhost:9092
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.JsonDeserializer
spring.kafka.consumer.properties.spring.json.trusted.packages=*
spring.kafka.consumer.auto-offset-reset=latest
heartrate.topic.alerts=heartrate.alerts
```

---

## Files Changed

### Created

| # | Service | File |
|---|---------|------|
| 1 | smartwatch | `dto/HeartRateAlertEvent.java` |
| 2 | smartwatch | `service/HeartRateConditionEvaluator.java` |
| 3 | smartwatch | `kafka/HeartRateAlertConsumer.java` |
| 4 | smartwatch | `kafka/HeartRateAlertProducer.java` |
| 5 | backpi | `helpnotification/dto/HeartRateAlertEvent.java` |
| 6 | backpi | `helpnotification/kafka/KafkaConsumerConfig.java` |
| 7 | backpi | `helpnotification/kafka/HeartRateHelpNotificationConsumer.java` |

### Modified

| # | Service | File | Change |
|---|---------|------|--------|
| 1 | smartwatch | `kafka/KafkaConfig.java` | Added `heartrate.alerts` topic bean |
| 2 | smartwatch | `application.properties` | Added alert topic + cooldown config |
| 3 | backpi | `pom.xml` | Added `spring-kafka` dependency |
| 4 | backpi | `application.properties` | Added Kafka consumer config |

### Moved (package reorganization)

| # | From | To |
|---|------|----|
| 1 | `service/HelpNotificationService.java` | `helpnotification/service/HelpNotificationService.java` (+ Mode B method) |
| 2 | `controller/HelpNotificationController.java` | `helpnotification/controller/HelpNotificationController.java` |
| 3 | `controller/PatientContactController.java` | `helpnotification/controller/PatientContactController.java` |
| 4 | `service/PatientContactService.java` | `helpnotification/service/PatientContactService.java` |
| 5 | `dto/PatientContactDTO.java` | `helpnotification/dto/PatientContactDTO.java` |
