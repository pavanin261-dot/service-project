from pathlib import Path
from uuid import uuid4


def safe_image_name(original_name: str | None, default_extension: str = ".jpg") -> str:
    extension = Path(original_name or "").suffix.lower() or default_extension
    return f"{uuid4()}{extension}"

