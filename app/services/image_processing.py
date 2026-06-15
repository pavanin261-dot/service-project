from pathlib import Path


def draw_predictions(image_path: Path, output_path: Path, predictions: list[dict]) -> None:
    try:
        import cv2

        image = cv2.imread(str(image_path))
        if image is None:
            output_path.write_bytes(image_path.read_bytes())
            return

        for prediction in predictions:
            box = prediction["box"]
            x1 = int(box["x"])
            y1 = int(box["y"])
            x2 = x1 + int(box["width"])
            y2 = y1 + int(box["height"])
            label = f'{prediction["label"]} {prediction["confidence"]:.2f}'
            color = (80, 80, 255) if prediction["label"].lower() == "pothole" else (0, 220, 255)
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 3)
            cv2.putText(image, label, (x1, max(24, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        cv2.imwrite(str(output_path), image)
    except Exception:
        output_path.write_bytes(image_path.read_bytes())

