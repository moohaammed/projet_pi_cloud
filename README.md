# 🧠 MediSync — Alzheimer Care Platform

> A cloud-native microservices platform for Alzheimer patient management, built with **Spring Boot**, **Angular 18**, **Flask**, and **Spring Cloud**.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Services](#-services)
  - [Eureka Server (Service Registry)](#1-eureka-server--service-registry)
  - [API Gateway](#2-api-gateway)
  - [Main Backend (backpi)](#3-main-backend-backpi)
  - [Collaboration Service](#4-collaboration-service)
  - [RendezVous Service](#5-rendezvous-service)
  - [Donation Service](#6-donation-service)
  - [Smartwatch Service](#7-smartwatch-service)
  - [Flask AI API](#8-flask-ai-api)
- [Frontend (Angular 18)](#-frontend-angular-18)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [API Routes Reference](#-api-routes-reference)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)

---

## 🔭 Overview

**MediSync** is a comprehensive healthcare platform designed to assist in the management and monitoring of Alzheimer patients. It provides:

- 👤 **User & Patient Management** — Roles for Admin, Doctor, and Patient
- 🗺️ **Geolocation & Safe Zones** — Track and alert on patient location
- 📅 **Appointment Scheduling** — Manage doctor-patient rendezvous
- 💬 **Collaboration Hub** — Messaging, groups, and social feed for medical staff
- 💳 **Donations & Campaigns** — Stripe-powered donation platform
- ❤️ **Smartwatch Heart-Rate Monitoring** — Real-time BLE data ingestion
- 🤖 **AI-Powered Analysis** — MRI scan classification & medical report analysis via LLMs
- 📚 **Education Module** — Events and activities for patients and caregivers
- 📹 **WebRTC Video Calls** — Direct video communication between doctors and patients

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Angular 18 Frontend                           │
│                         localhost:4200                               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼─────────────────────────────────────────┐
│                  Spring Cloud API Gateway                            │
│                         localhost:8080                               │
│  Routes: /api/**, /ws/**, /uploads/**, /api/heart-rate/**,          │
│          /api/rendezvous/**, /api/donations/**, /api/campaigns/**,   │
│          /api/messages/**, /api/groups/**, /api/publications/**      │
└──────┬──────────┬──────────┬──────────┬──────────┬───────────────────┘
       │          │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼─────┐ ┌─▼──────────┐
  │ backpi │ │collab- │ │rende-  │ │donation-│ │smartwatch- │
  │ :8082  │ │service │ │vous-   │ │service  │ │service     │
  │        │ │ :8083  │ │service │ │  :8084  │ │  :8095     │
  └────┬───┘ └───┬────┘ │ :8085  │ └────┬────┘ └─────┬──────┘
       │         │      └───┬────┘      │             │
    MySQL      MongoDB   MongoDB      MongoDB        MongoDB
  alzheimer_db           │                       smartwatch_db
                         ▼
              ┌──────────────────────┐
              │   Flask AI API       │
              │   localhost:5000     │
              │ (MRI + LLM Analysis) │
              └──────────────────────┘

       ┌──────────────────────────┐
       │   Eureka Server          │
       │   localhost:8761         │
       │ (Service Discovery)      │
       └──────────────────────────┘
```

All Spring Boot services register with **Eureka** for service discovery. The **API Gateway** uses load-balanced routing (`lb://service-name`) to forward requests.

---

## 🔧 Services

### 1. Eureka Server — Service Registry

| Property | Value |
|---|---|
| **Directory** | `eureka-server/` |
| **Port** | `8761` |
| **Stack** | Spring Boot 3.3.0, Spring Cloud 2023.0.2 |

**Purpose:** Central service registry. All microservices register here and discover each other by logical name.

**Access:** http://localhost:8761 — view all registered instances

---

### 2. API Gateway

| Property | Value |
|---|---|
| **Directory** | `api-gateway/` |
| **Port** | `8080` |
| **Stack** | Spring Cloud Gateway (Reactive), Eureka Client |

**Purpose:** Single entry point for all client requests. Handles CORS globally and routes traffic to downstream services.

**Route Table:**

| Route ID | Path Pattern | Target Service |
|---|---|---|
| `collab-rest` | `/api/messages/**`, `/api/groups/**`, `/api/publications/**`, `/api/comments/**`, `/api/notifications/**`, `/api/handover/**`, `/api/care-relay/**`, `/api/carebot/**`, `/api/admin/collaboration/**` | `collab-service` |
| `rendezvous-rest` | `/api/rendezvous/**` | `rendezvous-service` |
| `donation-rest` | `/api/donations/**`, `/api/campaigns/**` | `donation-service` |
| `smartwatch-service` | `/api/heart-rate/**` | `smartwatch-service` |
| `main-service` | `/api/**`, `/ws/**`, `/uploads/**` | `backpi` |

**CORS:** Configured globally to allow `http://localhost:4200` with all methods and headers.

**Start:**
```bash
cd api-gateway
mvnw.cmd spring-boot:run
```

---

### 3. Main Backend (backpi)

| Property | Value |
|---|---|
| **Directory** | `backpi/` |
| **Port** | `8082` |
| **Database** | MySQL — `alzheimer_db` |
| **Stack** | Spring Boot 3.3.0, Spring Security, JPA, WebSocket, JavaMail |

**Purpose:** Core service handling user authentication, patient management, geolocation, AI analysis, hospitals, and WebRTC signaling.

**Key Modules & Controllers:**

| Controller | Endpoint | Responsibility |
|---|---|---|
| `AuthController` | `/api/auth/**` | JWT-based login, register, password reset via email |
| `UserController` | `/api/users/**` | User CRUD, role management |
| `PatientLocationController` | `/api/patients/location/**` | Real-time patient GPS tracking |
| `SafeZoneController` | `/api/safe-zones/**` | Geofenced safe zone management |
| `GeoAlertController` | `/api/geo-alerts/**` | Alerts when patient leaves safe zone |
| `HospitalController` | `/api/hospitals/**` | Hospital directory |
| `AiAnalysisController` | `/api/ai/**` | Delegates to Flask AI service |
| `SignalingController` | `/ws/signaling/**` | WebRTC signaling via WebSocket |
| `WebRtcController` | `/api/webrtc/**` | WebRTC session management |

**Entity Domains:**
- `Patient`, `Analyse`, `JeuCognitif`, `Notificationpatient`
- Education: events, activities
- Geolocation: safe zones, location history

**AI Integration:**
- Integrates with the Flask AI API for MRI classification and report analysis
- Uses **Groq** (`llama-3.1-8b-instant`) for LLM-powered features
- Integrates with **OpenRouter** and **Google Gemini** for AI chat features
- Uses **Hugging Face** (`twitter-roberta-base-sentiment`) for sentiment analysis

**Start:**
```bash
cd backpi
mvnw.cmd spring-boot:run
```

---

### 4. Collaboration Service

| Property | Value |
|---|---|
| **Directory** | `collab-service/` |
| **Port** | `8083` |
| **Database** | MongoDB |
| **Stack** | Spring Boot 3.3.0, MongoDB, WebSocket, Spring Security |

**Purpose:** Social and communication hub for medical staff and caregivers.

**Features:**
- 💬 Real-time messaging (WebSocket + STOMP)
- 👥 Group management
- 📰 Social feed with publications and comments
- 🔔 Notification system
- 🤲 Care relay & patient handover workflows
- 🤖 CareBot AI assistant

**API Endpoints:** `/api/messages/**`, `/api/groups/**`, `/api/publications/**`, `/api/comments/**`, `/api/notifications/**`, `/api/handover/**`, `/api/care-relay/**`, `/api/carebot/**`

**Start:**
```bash
cd collab-service
mvnw.cmd spring-boot:run
```

---

### 5. RendezVous Service

| Property | Value |
|---|---|
| **Directory** | `rendezvous-service/` |
| **Port** | `8085` |
| **Database** | MongoDB |
| **Stack** | Spring Boot 3.3.0, MongoDB, Lombok |

**Purpose:** Manages doctor-patient appointment scheduling.

**Features:**
- Create, read, update, delete appointments
- Calendar view support (integrated with FullCalendar in frontend)
- Doctor availability management

**API Endpoints:** `/api/rendezvous/**`

**Start:**
```bash
cd rendezvous-service
mvnw.cmd spring-boot:run
```

---

### 6. Donation Service

| Property | Value |
|---|---|
| **Directory** | `donation-service/` |
| **Port** | `8084` |
| **Database** | MongoDB |
| **Stack** | Spring Boot 3.3.0, MongoDB, Stripe SDK 24.22.0, Lombok |

**Purpose:** Manages donation campaigns and processes payments via Stripe.

**Features:**
- Donation campaign creation and management
- Stripe Checkout integration for secure payments
- Donation history and reporting for admin
- Payment success/cancel webhooks

**API Endpoints:** `/api/donations/**`, `/api/campaigns/**`

**Start:**
```bash
cd donation-service
mvnw.cmd spring-boot:run
```

---

### 7. Smartwatch Service

| Property | Value |
|---|---|
| **Directory** | `smartwatch-service/` |
| **Port** | `8095` |
| **Database** | MongoDB — `smartwatch_db` |
| **Stack** | Spring Boot 3.3.0, MongoDB, Lombok |

**Purpose:** Collects, stores, and serves real-time heart-rate data from BLE smartwatches.

**REST API:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/heart-rate` | Save a new heart-rate reading |
| `GET` | `/api/heart-rate/latest/{userId}` | Get most recent reading for a user |
| `GET` | `/api/heart-rate/history/{userId}` | Get full reading history for a user |
| `GET` | `/api/heart-rate/{id}` | Get a specific record by ID |
| `DELETE` | `/api/heart-rate/{id}` | Delete a specific record |

**Request Body (POST):**
```json
{
  "userId": 1,
  "deviceName": "Mi Band 7",
  "bpm": 78
}
```
> ℹ️ The `recordedAt` timestamp is **server-generated** — do not send it from the client.

**BLE Python Client:** see [scripts/smartwatch-client](#python-ble-client)

**Start:**
```bash
cd smartwatch-service
mvnw.cmd spring-boot:run
```

---

### 8. Flask AI API

| Property | Value |
|---|---|
| **Directory** | `flask_api/` |
| **Port** | `5000` |
| **Stack** | Python 3, Flask, TensorFlow, Groq, pdfplumber |

**Purpose:** AI microservice for MRI scan classification and medical report analysis.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/test-groq` | Health check for Groq LLM connection |
| `POST` | `/predict` | Classify MRI image using VGG16 model |
| `POST` | `/analyze-report` | Analyze medical report PDF via LLM |
| `POST` | `/chat` | Answer patient questions based on their report |

**AI Models Used:**
- **VGG16** (`.h5` model) — Alzheimer MRI classification into 4 classes:
  - `Mild Demented`, `Moderate Demented`, `Non Demented`, `Very Mild Demented`
- **Groq `llama-3.1-8b-instant`** — Report summarization, key findings extraction, recommendations

**Environment variable required:**
```env
GROQ_API_KEY=your_groq_api_key
```

**Start:**
```bash
cd flask_api
pip install -r requirements.txt
python app.py
```

---

## 🎨 Frontend (Angular 18)

| Property | Value |
|---|---|
| **Directory** | `frontend/` |
| **Port** | `4200` |
| **Stack** | Angular 18, Bootstrap 5, Chart.js, FullCalendar, Leaflet, STOMP.js |

**Features & Pages:**

| Route | Component | Role Access | Description |
|---|---|---|---|
| `/auth/login` | LoginComponent | Public | JWT authentication |
| `/auth/register` | RegisterComponent | Public | New user registration |
| `/home` | HomeComponent | All | Landing page |
| `/admin/dashboard` | AdminDashboardHomeComponent | ADMIN | Admin overview |
| `/admin/collaboration` | AdminCollaborationDashboardComponent | ADMIN | Moderate collaboration |
| `/admin/rendezvous` | AdminDashboardComponent | ADMIN | Appointment overview |
| `/admin/education` | AdminEducationDashboardComponent | ADMIN | Education management |
| `/admin/donations` | AdminDonationComponent | ADMIN | Donation management |
| `/admin/patients` | AdminGestionPatientComponent | ADMIN | Patient management |
| `/admin/medecins` | AdminGestionMedecinComponent | ADMIN | Doctor management |
| `/patient-dashboard` | PatientDashboardComponent | PATIENT | Patient home |
| `/medecin-dashboard` | MedecinDashboardComponent | DOCTOR | Doctor home |
| `/patient-profiles` | PatientListComponent | ADMIN, DOCTOR | Patient list |
| `/patient-profiles/:id` | PatientDetailComponent | ADMIN, DOCTOR | Patient details |
| `/hospitals` | HospitalListComponent | All | Hospital directory |
| `/map` | DoctorMapComponent | DOCTOR, ADMIN | Doctor location map |
| `/patient-map` | PatientMapComponent | PATIENT | Patient safe zone map |
| `/medecin/alertes` | AlertDashboardComponent | DOCTOR | Geo-alert dashboard |
| `/collaboration` | CommunicationTestComponent | All | Messaging hub |
| `/collaboration/feed` | FeedComponent | All | Social feed |
| `/collaboration/messenger` | MessengerComponent | All | Real-time messages |
| `/collaboration/groups` | GroupsListComponent | All | Group management |
| `/rendezvous` | RendezVousListComponent | Auth | Appointment list |
| `/rendezvous/new` | RendezVousFormComponent | Auth | Create appointment |
| `/events` | EventListComponent | Auth | Events list |
| `/activities` | ActivityListComponent | Auth | Activities list |
| `/education` | EducationComponent | Auth | Education hub |
| `/donations` | DonationListComponent | Public | Donation campaigns |
| `/donations/:campaignId` | DonationFormComponent | Public | Donate to campaign |
| `/my-donations` | MyDonationsComponent | Auth | My donation history |
| `/heart-rate` | LiveHeartRateComponent | Auth | Real-time ECG monitor |
| `/contact-doctor` | ContactDoctorComponent | All | Find a doctor |
| `/users` | UserListComponent | ADMIN | User management |
| `/videocall` | VideoCallComponent | Auth | WebRTC video call |

**Notable Libraries:**
- `@fullcalendar` — Calendar view for appointments
- `leaflet` — Interactive maps (geolocation, safe zones)
- `chart.js` — Statistics charts and graphs
- `@stomp/stompjs` + `sockjs-client` — WebSocket real-time messaging
- `bootstrap 5` — UI component framework
- `@angular/service-worker` — PWA support

**Start:**
```bash
cd frontend
npm install
npm start
```

---

## 🐍 Python BLE Client

Located in `scripts/smartwatch-client/`.

**Purpose:** Connects to a BLE smartwatch and streams heart-rate data to the API.

```bash
cd scripts/smartwatch-client
pip install -r requirements.txt

# With a real smartwatch
python smartwatch_ble_client.py

# Simulation mode (no device needed)
python smartwatch_ble_client.py --simulate
```

**Configuration (in script):**
```python
DEVICE_NAME = "Mi Band"
API_URL = "http://localhost:8080/api/heart-rate"
USER_ID = 1
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Used In |
|---|---|---|
| Java | 17 | All Spring services |
| Spring Boot | 3.3.0 | All Spring services |
| Spring Cloud | 2023.0.2 | Gateway, Eureka, all services |
| Spring Security | 6.x | backpi, collab-service |
| Spring Data JPA | — | backpi (MySQL) |
| Spring Data MongoDB | — | collab, rendezvous, donation, smartwatch |
| Spring WebSocket | — | backpi, collab-service |
| Lombok | 1.18.32 | All services |
| MySQL | 8 | backpi |
| MongoDB | 6+ | collab, rendezvous, donation, smartwatch |
| Stripe Java SDK | 24.22.0 | donation-service |
| JavaMail | — | backpi (password reset) |

### AI / ML

| Technology | Purpose |
|---|---|
| Python 3 | Flask AI microservice |
| TensorFlow / Keras | VGG16 MRI classification |
| Groq (`llama-3.1-8b-instant`) | LLM report analysis & chat |
| Google Gemini | Collaboration AI features |
| OpenRouter | AI model routing |
| Hugging Face Transformers | Sentiment analysis |
| pdfplumber | Medical PDF text extraction |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Angular | 18.2 | SPA framework |
| TypeScript | ~5.5 | Type safety |
| Bootstrap | 5.3 | UI styling |
| Chart.js | 4.5 | Data visualization |
| FullCalendar | 6.1 | Appointment calendar |
| Leaflet | 1.9 | Interactive maps |
| STOMP.js | 7.3 | WebSocket messaging |
| Angular SSR | 18.2 | Server-Side Rendering |
| Angular PWA | — | Progressive Web App |

---

## ✅ Prerequisites

Before running the project, ensure you have:

- **Java 17+** (JDK)
- **Maven** (or use the `mvnw.cmd` wrapper)
- **Node.js 18+** and **npm**
- **Angular CLI 18** (`npm install -g @angular/cli`)
- **MySQL 8** — running on `localhost:3306`
- **MongoDB 6+** — running on `localhost:27017`
- **Python 3.10+** with pip
- **Git**

---

## 🚀 Getting Started

### Step 1 — Start Databases

```bash
# Start MySQL (ensure alzheimer_db is created or will be auto-created)
# Start MongoDB
```

### Step 2 — Start Eureka Server

```bash
cd eureka-server
mvnw.cmd spring-boot:run
# Access: http://localhost:8761
```

### Step 3 — Start API Gateway

```bash
cd api-gateway
mvnw.cmd spring-boot:run
# Access: http://localhost:8080
```

### Step 4 — Start Backend Services

Open separate terminals for each:

```bash
# Main Backend
cd backpi && mvnw.cmd spring-boot:run

# Collaboration Service
cd collab-service && mvnw.cmd spring-boot:run

# RendezVous Service
cd rendezvous-service && mvnw.cmd spring-boot:run

# Donation Service
cd donation-service && mvnw.cmd spring-boot:run

# Smartwatch Service
cd smartwatch-service && mvnw.cmd spring-boot:run
```

### Step 5 — Start Flask AI API

```bash
cd flask_api
pip install -r requirements.txt
python app.py
# Access: http://localhost:5000
```

### Step 6 — Start Angular Frontend

```bash
cd frontend
npm install
npm start
# Access: http://localhost:4200
```

### Step 7 — (Optional) Start BLE Smartwatch Client

```bash
cd scripts/smartwatch-client
pip install -r requirements.txt
python smartwatch_ble_client.py --simulate
```

### Startup Order Summary

```
1. MySQL + MongoDB
2. eureka-server     → :8761
3. api-gateway       → :8080
4. backpi            → :8082
5. collab-service    → :8083
6. donation-service  → :8084
7. rendezvous-service→ :8085
8. smartwatch-service→ :8095
9. flask_api         → :5000
10. frontend (Angular)→ :4200
```

---

## 📡 API Routes Reference

All requests from the frontend go through the Gateway at `http://localhost:8080`.

| Feature | Method | Gateway Path |
|---|---|---|
| **Auth - Login** | POST | `/api/auth/login` |
| **Auth - Register** | POST | `/api/auth/register` |
| **Users** | GET/POST/PUT/DELETE | `/api/users/**` |
| **Patients** | GET/POST/PUT/DELETE | `/api/patients/**` |
| **Hospitals** | GET/POST/PUT/DELETE | `/api/hospitals/**` |
| **Safe Zones** | GET/POST/PUT/DELETE | `/api/safe-zones/**` |
| **Patient Location** | GET/POST | `/api/patients/location/**` |
| **Geo Alerts** | GET | `/api/geo-alerts/**` |
| **AI Prediction (MRI)** | POST | `/api/ai/predict` |
| **Messages** | GET/POST | `/api/messages/**` |
| **Groups** | GET/POST/PUT/DELETE | `/api/groups/**` |
| **Publications** | GET/POST/PUT/DELETE | `/api/publications/**` |
| **Comments** | GET/POST/PUT/DELETE | `/api/comments/**` |
| **Notifications** | GET | `/api/notifications/**` |
| **CareBot** | POST | `/api/carebot/**` |
| **Appointments** | GET/POST/PUT/DELETE | `/api/rendezvous/**` |
| **Donation Campaigns** | GET/POST/PUT/DELETE | `/api/campaigns/**` |
| **Donations** | GET/POST | `/api/donations/**` |
| **Heart Rate** | GET/POST/DELETE | `/api/heart-rate/**` |
| **File Uploads** | GET | `/uploads/**` |
| **WebSocket** | WS | `/ws/**` |

---

## 🔐 Environment Variables

### `backpi/src/main/resources/application.properties`

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/alzheimer_db
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD

spring.mail.username=YOUR_GMAIL
spring.mail.password=YOUR_APP_PASSWORD

stripe.api.key=YOUR_STRIPE_SECRET_KEY

openrouter.api.key=YOUR_OPENROUTER_KEY
# GEMINI_KEY — set as environment variable
# HF_TOKEN — Hugging Face token (optional)
```

### `flask_api/.env`

```env
GROQ_API_KEY=your_groq_api_key
```

---

## 📁 Project Structure

```
projet_pi_cloud-main/
│
├── eureka-server/              # Spring Cloud Eureka Registry (:8761)
│
├── api-gateway/                # Spring Cloud Gateway (:8080)
│   └── src/main/resources/
│       └── application.yml     # CORS + routing rules
│
├── backpi/                     # Main backend service (:8082) [MySQL]
│   └── src/main/java/esprit/tn/backpi/
│       ├── controller/         # REST controllers (Auth, User, Patient, Hospital, AI...)
│       ├── entities/           # JPA entities (Patient, Analyse, Education...)
│       ├── services/           # Business logic
│       ├── repositories/       # Spring Data JPA repositories
│       ├── config/             # Security, CORS, WebSocket config
│       └── alzheimermodel/     # VGG16 .h5 model file
│
├── collab-service/             # Collaboration microservice (:8083) [MongoDB]
│   └── src/main/java/          # Messages, Groups, Publications, CareBot
│
├── rendezvous-service/         # Appointment microservice (:8085) [MongoDB]
│   └── src/main/java/          # RendezVous CRUD
│
├── donation-service/           # Donation microservice (:8084) [MongoDB + Stripe]
│   └── src/main/java/          # Campaigns, Donations, Stripe integration
│
├── smartwatch-service/         # Heart-rate microservice (:8095) [MongoDB]
│   └── src/main/java/tn/esprit/smartwatchservice/
│       ├── controller/         # HeartRateController
│       ├── entity/             # HeartRateRecord
│       ├── repository/         # HeartRateRepository
│       ├── service/            # HeartRateService
│       └── dto/                # HeartRateRequest
│
├── flask_api/                  # Python AI service (:5000)
│   ├── app.py                  # MRI prediction + LLM analysis endpoints
│   └── requirements.txt
│
├── frontend/                   # Angular 18 SPA (:4200)
│   └── src/app/
│       ├── components/         # All feature components
│       │   ├── auth/           # Login, Register
│       │   ├── admin-*/        # Admin dashboards
│       │   ├── collaboration/  # Messaging, Feed, Groups
│       │   ├── donation/       # Campaigns, Donations
│       │   ├── education/      # Events, Activities
│       │   ├── hospital/       # Hospital directory
│       │   ├── live-heart-rate/# ECG monitor
│       │   ├── map/            # Leaflet maps
│       │   ├── medecin/        # Doctor-specific views
│       │   ├── patient/        # Patient management
│       │   ├── rendezvous-*/   # Appointment views
│       │   └── user/           # User management
│       ├── services/           # HTTP + WebSocket services
│       ├── guards/             # Auth & Role guards
│       ├── models/             # TypeScript interfaces
│       ├── patient-dashboard/  # Patient home
│       ├── medecin-dashboard/  # Doctor home
│       └── app.routes.ts       # Application routing
│
└── scripts/
    └── smartwatch-client/      # Python BLE data simulator/client
        ├── smartwatch_ble_client.py
        └── requirements.txt
```

---

## 👥 Team

> Project developed at **ESPRIT** — École Supérieure Privée d'Ingénierie et de Technologies  
> Group: **2A15** | Academic Year: 2025–2026

---

## 📄 License

This project is for academic purposes only. All rights reserved.
