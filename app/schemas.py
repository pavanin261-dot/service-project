from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class Prediction(BaseModel):
    label: str
    confidence: float
    box: BoundingBox


class DetectionRead(BaseModel):
    id: int
    image_url: str
    prediction_url: str
    damage_type: str
    confidence: float
    latitude: float | None = None
    longitude: float | None = None
    location: str | None = None
    predictions: list[Prediction]
    processing_time: float
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_scans: int
    total_potholes: int
    total_cracks: int
    average_confidence: float
    average_processing_time: float
    damage_counts: dict[str, int]
    city_wise_reports: dict[str, int]


class HeatmapPoint(BaseModel):
    id: int
    damage_type: str
    confidence: float
    latitude: float
    longitude: float
    location: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

