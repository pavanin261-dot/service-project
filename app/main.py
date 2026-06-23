from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models
from app.database.db import Base, engine
from app.routes import auth, dashboard, detect, maps
from app.websocket.realtime import router as realtime_router
from app.services.yolo_service import yolo_service

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RoadVision AI Backend",
    description="Backend API for road damage detection, login, analytics, maps, and realtime updates.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(detect.router, tags=["AI Detection"])
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(maps.router, tags=["Maps"])
app.include_router(realtime_router, tags=["Realtime"])

Path("uploads").mkdir(exist_ok=True)
Path("predictions").mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/predictions", StaticFiles(directory="predictions"), name="predictions")


frontend_dir = Path(__file__).resolve().parent / "static"

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": yolo_service.model_loaded,
        "model_path": str(yolo_service.model_path),
    }

if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")