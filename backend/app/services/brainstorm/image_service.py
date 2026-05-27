"""Image inspection and preprocessing hooks for Brainstorm."""

from dataclasses import dataclass
import asyncio
from pathlib import Path

from PIL import Image, UnidentifiedImageError


class ImageProcessingError(Exception):
    """Raised when an image cannot be validated."""


@dataclass(slots=True)
class ImageMetadata:
    width: int
    height: int
    format: str
    mode: str


class ImageService:
    """Validate images and expose future OCR/vision preprocessing hooks."""

    async def inspect_image(self, image_path: str | Path) -> ImageMetadata:
        return await asyncio.to_thread(self._inspect_image_sync, Path(image_path))

    async def prepare_for_vision(self, image_path: str | Path) -> Path:
        """Return a vision-ready image path. Future OCR/resizing can hook in here."""
        metadata = await self.inspect_image(image_path)
        if metadata.width <= 0 or metadata.height <= 0:
            raise ImageProcessingError("Image has invalid dimensions.")
        return Path(image_path)

    def _inspect_image_sync(self, image_path: Path) -> ImageMetadata:
        if not image_path.exists():
            raise ImageProcessingError("Image file does not exist.")

        try:
            with Image.open(image_path) as image:
                image.verify()
            with Image.open(image_path) as image:
                width, height = image.size
                return ImageMetadata(
                    width=width,
                    height=height,
                    format=image.format or image_path.suffix.upper().lstrip("."),
                    mode=image.mode,
                )
        except UnidentifiedImageError as exc:
            raise ImageProcessingError("Uploaded file is not a valid image.") from exc
        except Exception as exc:
            raise ImageProcessingError("Image could not be inspected.") from exc
