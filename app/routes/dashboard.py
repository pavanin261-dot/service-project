from collections import Counter, defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.detection import Detection
from app.schemas import DashboardStats, DetectionRead

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db)):
    detections = db.query(Detection).all()
    if not detections:
        return DashboardStats(
            total_scans=0,
            total_potholes=0,
            total_cracks=0,
            average_confidence=0,
            average_processing_time=0,
            damage_counts={},
            city_wise_reports={},
        )

    damage_counts = Counter(item.damage_type for item in detections)
    city_counts: dict[str, int] = defaultdict(int)
    for item in detections:
        city_counts[item.location or "Unknown"] += 1

    return DashboardStats(
        total_scans=len(detections),
        total_potholes=damage_counts.get("Pothole", 0),
        total_cracks=damage_counts.get("Crack", 0),
        average_confidence=round(sum(item.confidence for item in detections) / len(detections), 3),
        average_processing_time=round(sum(item.processing_time for item in detections) / len(detections), 3),
        damage_counts=dict(damage_counts),
        city_wise_reports=dict(city_counts),
    )


@router.get("/reports", response_model=list[DetectionRead])
def reports(db: Session = Depends(get_db)):
    return db.query(Detection).order_by(Detection.created_at.desc()).limit(100).all()


@router.get("/alerts")
def alerts(db: Session = Depends(get_db)):
    severe = (
        db.query(Detection)
        .filter(Detection.confidence >= 0.9)
        .order_by(Detection.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": item.id,
            "message": f"High-confidence {item.damage_type} detected at {item.location}",
            "confidence": item.confidence,
            "created_at": item.created_at,
        }
        for item in severe
    ]


@router.get("/export")
def export_reports(db: Session = Depends(get_db)):
    detections = db.query(Detection).order_by(Detection.created_at.desc()).all()
    return {
        "format": "json",
        "count": len(detections),
        "items": [
            {
                "id": item.id,
                "damage_type": item.damage_type,
                "confidence": item.confidence,
                "latitude": item.latitude,
                "longitude": item.longitude,
                "location": item.location,
                "created_at": item.created_at,
            }
            for item in detections
        ],
    }

