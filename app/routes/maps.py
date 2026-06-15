from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.detection import Detection
from app.schemas import HeatmapPoint

router = APIRouter()


@router.get("/heatmap", response_model=list[HeatmapPoint])
def heatmap(db: Session = Depends(get_db)):
    return (
        db.query(Detection)
        .filter(Detection.latitude.is_not(None), Detection.longitude.is_not(None))
        .order_by(Detection.created_at.desc())
        .limit(500)
        .all()
    )


@router.get("/map-markers")
def map_markers(db: Session = Depends(get_db)):
    detections = (
        db.query(Detection)
        .filter(Detection.latitude.is_not(None), Detection.longitude.is_not(None))
        .order_by(Detection.created_at.desc())
        .limit(500)
        .all()
    )

    return [
        {
            "id": item.id,
            "lat": item.latitude,
            "lng": item.longitude,
            "type": item.damage_type,
            "confidence": item.confidence,
            "color": "yellow" if item.damage_type.lower() == "crack" else "red",
            "location": item.location,
        }
        for item in detections
    ]

