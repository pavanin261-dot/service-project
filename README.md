# RoadVision AI – Intelligent Road Damage Detection System

## Project Overview

RoadVision AI is a web-based application that uses Artificial Intelligence and Computer Vision techniques to detect road damages such as potholes and cracks from uploaded images. The system provides real-time analysis, location tracking, dashboards, and historical records to help authorities maintain safer roads.

---

## Features

* AI-based road damage detection using YOLO
* User authentication and authorization
* Image upload and processing
* Detection history management
* Interactive dashboard and analytics
* Real-time updates using WebSockets
* GPS location integration
* Cloud deployment using Render

---

## Technology Stack

### Frontend

* React.js
* Tailwind CSS
* JavaScript

### Backend

* FastAPI
* SQLAlchemy
* WebSockets
* Uvicorn

### Artificial Intelligence

* YOLO (You Only Look Once)
* OpenCV
* Ultralytics

### Database

* SQLite

### Deployment

* GitHub
* Render

---

## System Architecture

User → Frontend (React) → FastAPI Backend → YOLO Model → Database → Dashboard

---

## Project Structure

```text
RoadVision-AI
│
├── frontend/
├── backend_generated/
│   ├── app/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── database/
│   │   └── websocket/
│   ├── uploads/
│   └── predictions/
│
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/pavanin261-dot/service-project.git
cd backend_generated
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Backend

```bash
uvicorn app.main:app --reload
```

### Access Application

```text
http://localhost:8000
```

---

## API Endpoints

### Authentication

* POST /auth/register
* POST /auth/login

### Detection

* POST /detect
* GET /history
* GET /my-history
* DELETE /scan/{id}

### Dashboard

* GET /dashboard

### Maps

* GET /maps

### Health Check

* GET /health

---

## Deployment

Backend is deployed on Render:

https://service-project-6.onrender.com

---

## Future Enhancements

* Mobile application support
* Live camera detection
* Automatic GPS tracking
* Multi-class road damage detection
* Government reporting integration

---

## Team Members

* Revanth Pandla
* Project Team Members

---

## Conclusion

RoadVision AI provides an intelligent and efficient solution for detecting road damages using modern AI techniques. The system can help authorities improve road safety and reduce maintenance costs through early detection and automated reporting.
