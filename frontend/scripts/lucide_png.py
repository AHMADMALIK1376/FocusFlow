"""Lucide line icons (the ones the app's nav bar uses) as SVG markup or PNGs.

Reads the icon shapes straight from node_modules/lucide-react, so emails, phone
pop-ups and answer pages show exactly the same icons as the web app. PNGs are
drawn by the installed Edge/Chrome through Playwright (transparent background),
because email apps can't show SVG.
"""
import io
import re
from pathlib import Path

from PIL import Image

ICON_DIR = Path(__file__).resolve().parent.parent / "node_modules" / "lucide-react" / "dist" / "esm" / "icons"

_NODE = re.compile(r'\[\s*"(\w+)",\s*\{([^}]*)\}\s*\]')
_ATTR = re.compile(r'(\w+):\s*"([^"]*)"')


def inner_svg(name: str) -> str:
    """The icon's shapes (<path>, <circle>, …) without the outer <svg>."""
    src = (ICON_DIR / f"{name}.mjs").read_text(encoding="utf-8")
    if "__iconNode = [" not in src:  # an alias file — follow it
        target = re.search(r"from '\./([\w-]+)\.mjs'", src)
        if not target:
            raise ValueError(f"lucide icon not found: {name}")
        return inner_svg(target.group(1))
    body = src.split("__iconNode = [", 1)[1].split("];", 1)[0]
    parts = []
    for tag, attrs in _NODE.findall(body):
        kv = " ".join(f'{k}="{v}"' for k, v in _ATTR.findall(attrs) if k != "key")
        parts.append(f"<{tag} {kv}/>")
    return "".join(parts)


def svg(name: str, color: str = "currentColor", size: int = 24, stroke: float = 2) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="{color}" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round">{inner_svg(name)}</svg>')


def render(specs):
    """specs: [(key, name, colour, px, stroke)] → {key: RGBA PIL image}."""
    from playwright.sync_api import sync_playwright
    out = {}
    with sync_playwright() as p:
        browser = None
        for channel in ("msedge", "chrome"):
            try:
                browser = p.chromium.launch(channel=channel)
                break
            except Exception:
                continue
        if browser is None:
            raise RuntimeError("Needs Microsoft Edge or Google Chrome installed")
        page = browser.new_page()
        cells = "".join(
            f'<div id="i{i}" style="width:{px}px;height:{px}px">{svg(name, colour, px, stroke)}</div>'
            for i, (_, name, colour, px, stroke) in enumerate(specs)
        )
        page.set_content(f'<html><body style="margin:0;background:transparent">{cells}</body></html>')
        for i, (key, *_rest) in enumerate(specs):
            png = page.locator(f"#i{i}").screenshot(omit_background=True)
            out[key] = Image.open(io.BytesIO(png)).convert("RGBA")
        browser.close()
    return out
