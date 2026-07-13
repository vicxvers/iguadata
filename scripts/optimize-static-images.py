#!/usr/bin/env python3
"""Build lightweight social previews and a compact multi-size favicon."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
INVESTIGATION_ASSETS = ROOT / "assets" / "investigacio"
FAVICON_PNG = ROOT / "favicon-48x48.png"
FAVICON_ICO = ROOT / "favicon.ico"


def rgb_image(image: Image.Image) -> Image.Image:
    if image.mode in {"RGBA", "LA"}:
        rgba = image.convert("RGBA")
        background = Image.new("RGBA", rgba.size, "#f7f5ef")
        return Image.alpha_composite(background, rgba).convert("RGB")
    return image.convert("RGB")


def build_social_previews() -> None:
    for webp_path in sorted(INVESTIGATION_ASSETS.glob("*.webp")):
        png_path = webp_path.with_suffix(".png")
        source_path = png_path if png_path.exists() else webp_path
        output_path = webp_path.with_name(f"{webp_path.stem}-og.jpg")
        with Image.open(source_path) as source:
            rgb_image(source).save(
                output_path,
                "JPEG",
                quality=84,
                optimize=True,
                progressive=True,
                subsampling="4:2:0",
            )
        print(f"Built {output_path.relative_to(ROOT)}")


def build_favicon() -> None:
    with Image.open(FAVICON_PNG) as source:
        source.convert("RGBA").save(
            FAVICON_ICO,
            format="ICO",
            sizes=[(16, 16), (32, 32), (48, 48)],
        )
    print(f"Built {FAVICON_ICO.relative_to(ROOT)}")


if __name__ == "__main__":
    build_social_previews()
    build_favicon()
