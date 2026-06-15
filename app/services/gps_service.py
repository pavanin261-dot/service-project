def normalize_location(latitude: float | None, longitude: float | None, location: str | None) -> str:
    if location:
        return location
    if latitude is not None and longitude is not None:
        return f"{latitude:.5f}, {longitude:.5f}"
    return "Unknown location"

