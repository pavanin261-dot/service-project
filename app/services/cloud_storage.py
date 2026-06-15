from pathlib import Path


class LocalStorageService:
    def save_upload(self, upload_path: Path) -> str:
        return f"/uploads/{upload_path.name}"

    def save_prediction(self, prediction_path: Path) -> str:
        return f"/predictions/{prediction_path.name}"


storage_service = LocalStorageService()

