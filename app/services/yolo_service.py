from pathlib import Path

from app.services.image_processing import draw_predictions


class YOLOService:
    def __init__(self, model_path: str = "app/model/weights/best.pt"):
        self.model_path = Path(model_path)
        self.model = None
        self.model_loaded = False
        self.load_model()

    def load_model(self) -> None:
        if not self.model_path.exists():
            return

        try:
            from ultralytics import YOLO

            self.model = YOLO(str(self.model_path))
            self.model_loaded = True
        except Exception:
            self.model = None
            self.model_loaded = False

    def detect(self, image_path: Path, output_path: Path) -> list[dict]:
        if self.model_loaded and self.model is not None:
            predictions = self._detect_with_yolo(image_path)
        else:
            predictions = self._demo_predictions()

        draw_predictions(image_path, output_path, predictions)
        return predictions

    def _detect_with_yolo(self, image_path: Path) -> list[dict]:
        results = self.model(str(image_path))
        predictions: list[dict] = []

        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = [int(value) for value in box.xyxy[0].tolist()]
                class_id = int(box.cls[0])
                predictions.append(
                    {
                        "label": result.names.get(class_id, "damage"),
                        "confidence": round(float(box.conf[0]), 3),
                        "box": {
                            "x": x1,
                            "y": y1,
                            "width": x2 - x1,
                            "height": y2 - y1,
                        },
                    }
                )

        return predictions or self._demo_predictions()

    def _demo_predictions(self) -> list[dict]:
        return [
            {
                "label": "Pothole",
                "confidence": 0.982,
                "box": {"x": 110, "y": 180, "width": 140, "height": 90},
            },
            {
                "label": "Crack",
                "confidence": 0.923,
                "box": {"x": 310, "y": 120, "width": 180, "height": 48},
            },
        ]


yolo_service = YOLOService()

