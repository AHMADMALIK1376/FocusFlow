"""Line icons for emails and answer pages, from backend/assets/icons/manifest.json.

Writes, next to the manifest:
  <name>-<tone>.png   96px PNG in each tone colour (emails embed these by cid)
  icons.json          {name: inner SVG markup} for the answer web pages

Usage:  python frontend/scripts/make-email-icons.py
"""
import json
from pathlib import Path

import lucide_png

ICONS = Path(__file__).resolve().parents[2] / "backend" / "assets" / "icons"


def main():
    manifest = json.loads((ICONS / "manifest.json").read_text(encoding="utf-8"))
    specs = [(f"{n}-{t}", n, colour, 96, 2) for n in manifest["names"] for t, colour in manifest["tones"].items()]
    for key, img in lucide_png.render(specs).items():
        img.save(ICONS / f"{key}.png", optimize=True)
    svgs = {n: lucide_png.inner_svg(n) for n in manifest["names"]}
    (ICONS / "icons.json").write_text(json.dumps(svgs, indent=1, sort_keys=True), encoding="utf-8")
    print(f"wrote {len(specs)} PNGs + icons.json to {ICONS}")


if __name__ == "__main__":
    main()
