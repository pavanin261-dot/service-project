from pathlib import Path
from time import perf_counter

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.detection import Detection
from app.models.user import User
from app.schemas import DetectionRead
from app.services.cloud_storage import storage_service
from app.services.gps_service import normalize_location
from app.services.yolo_service import yolo_service
from app.utils.helpers import safe_image_name
from app.utils.security import get_current_user
from app.websocket.realtime import connection_manager

router = APIRouter()

UPLOAD_DIR = Path("uploads")
PREDICTION_DIR = Path("predictions")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

UPLOAD_DIR.mkdir(exist_ok=True)
PREDICTION_DIR.mkdir(exist_ok=True)


@router.post("/detect", response_model=DetectionRead)
async def detect_damage(
    file: UploadFile = File(...),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    location: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WEBP images are supported")

    upload_name = safe_image_name(file.filename, extension)
    prediction_name = f"{Path(upload_name).stem}.jpg"
    upload_path = UPLOAD_DIR / upload_name
    prediction_path = PREDICTION_DIR / prediction_name

    upload_path.write_bytes(await file.read())

    started_at = perf_counter()
    predictions = yolo_service.detect(upload_path, prediction_path)
    processing_time = round(perf_counter() - started_at, 3)
    top_prediction = max(predictions, key=lambda item: item["confidence"])

    detection = Detection(
        user_id=current_user.id if current_user else None,
        image_url=storage_service.save_upload(upload_path),
        prediction_url=storage_service.save_prediction(prediction_path),
        damage_type=top_prediction["label"],
        confidence=top_prediction["confidence"],
        latitude=latitude,
        longitude=longitude,
        location=normalize_location(latitude, longitude, location),
        predictions=predictions,
        processing_time=processing_time,
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)

    await connection_manager.broadcast(
        {
            "event": "detection_created",
            "id": detection.id,
            "damage_type": detection.damage_type,
            "confidence": detection.confidence,
            "location": detection.location,
        }
    )

    return detection


@router.get("/history", response_model=list[DetectionRead])
def history(db: Session = Depends(get_db)):
    return db.query(Detection).order_by(Detection.created_at.desc()).limit(50).all()


@router.get("/my-history", response_model=list[DetectionRead])
def my_history(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    return (
        db.query(Detection)
        .filter(Detection.user_id == current_user.id)
        .order_by(Detection.created_at.desc())
        .limit(50)
        .all()
    )


@router.delete("/scan/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    detection = db.query(Detection).filter(Detection.id == scan_id).first()
    if detection is None:
        raise HTTPException(status_code=404, detail="Scan not found")

    db.delete(detection)
    db.commit()
    return {"message": "Scan deleted", "scan_id": scan_id}

