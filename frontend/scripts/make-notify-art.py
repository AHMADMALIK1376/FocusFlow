"""Artwork for phone pop-up reminders (Web Push), in the app's clay style.

Writes public/notify/:
  badge.png        96x96 white FocusFlow mark on transparent — Android tints
                   it for the status bar (a full-colour icon shows as a blob)
  <kind>.png       720x360 banner shown when a reminder is expanded: a puffy
                   clay tile with the reminder's emoji on the crème page, the
                   reminder's name, and soft colour blobs behind

Reuses the clay renderer from make-logo.py so everything matches the logo.

Usage:  python frontend/scripts/make-notify-art.py
"""
import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent / "public"
OUT = PUBLIC / "notify"

spec = importlib.util.spec_from_file_location("make_logo", HERE / "make-logo.py")
logo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(logo)

CANVAS = (245, 239, 230)
INK = (52, 46, 62)
CORAL = (236, 112, 109)
WARM_DROP = (190, 160, 122)
EMOJI_FONT = "C:/Windows/Fonts/seguiemj.ttf"
LABEL_FONT = "C:/Windows/Fonts/ARLRDBD.TTF"  # Arial Rounded MT Bold — soft, clay-friendly

# (base, bottom-edge shade) for each clay tone — shades stay light, as in the app.
TONES = {
    "coral": ((236, 112, 109), (226, 100, 97)),
    "sage": ((184, 220, 196), (166, 204, 180)),
    "sun": ((255, 215, 0), (240, 196, 0)),
    "blush": ((255, 226, 222), (246, 208, 203)),
}
# kind: (emoji, label, tile tone, blob colours)
KINDS = {
    "class": ("📚", "Class time", "coral", [(255, 226, 222), (184, 220, 196)]),
    "attendance": ("🎒", "Did you attend?", "sage", [(206, 234, 214), (255, 226, 222)]),
    "exam": ("📝", "Exam ahead", "sun", [(255, 236, 150), (255, 226, 222)]),
    "submit": ("📤", "Hand-in check", "blush", [(255, 214, 208), (206, 234, 214)]),
    "quiz": ("📊", "Marks time", "sage", [(206, 234, 214), (255, 236, 150)]),
    "routine": ("🌿", "Your routine", "sage", [(206, 234, 214), (255, 236, 150)]),
    "digest": ("🌞", "Your day", "sun", [(255, 236, 150), (255, 214, 208)]),
    "report": ("📈", "Attendance", "sage", [(206, 234, 214), (255, 226, 222)]),
    "test": ("🔔", "It works!", "coral", [(255, 214, 208), (255, 236, 150)]),
}


def blobs(size, colours):
    """Soft, out-of-focus colour blobs on the crème page."""
    w, h = size
    layer = Image.new("RGBA", size, CANVAS + (255,))
    d = ImageDraw.Draw(layer)
    d.ellipse([w * 0.55, -h * 0.55, w * 1.25, h * 0.75], fill=colours[0] + (255,))
    d.ellipse([-w * 0.18, h * 0.55, w * 0.32, h * 1.5], fill=colours[1] + (255,))
    return layer.filter(ImageFilter.GaussianBlur(46))


def clay_tile(size, tone):
    """Puffy rounded-square tile: light rim on top, soft shade below, warm drop shadow."""
    mask = Image.new("L", (size, size), 0)
    pad = int(size * 0.08)
    ImageDraw.Draw(mask).rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.3), fill=255)
    base, shade = TONES[tone]
    return logo.clay(mask, (base, shade, WARM_DROP))


def banner(kind):
    emoji, label, tone, colours = KINDS[kind]
    w, h = 720, 360
    img = blobs((w, h), colours)

    tile = clay_tile(250, tone)
    img.alpha_composite(tile, (40, (h - 250) // 2 + 6))
    e = Image.new("RGBA", (250, 250), (0, 0, 0, 0))
    ImageDraw.Draw(e).text((125, 122), emoji, font=ImageFont.truetype(EMOJI_FONT, 104), embedded_color=True, anchor="mm")
    img.alpha_composite(e, (40, (h - 250) // 2 + 6))

    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(LABEL_FONT, 52 if len(label) <= 12 else 42)
    d.text((316, h // 2 - 8), label, font=big, fill=INK, anchor="ls")
    d.text((318, h // 2 + 44), "FocusFlow", font=ImageFont.truetype(LABEL_FONT, 30), fill=CORAL, anchor="ls")
    return img.convert("RGB")


def badge():
    """White silhouette of the mark — Android only uses the alpha channel."""
    alpha = logo.place(logo.mark_alpha(Image.open(PUBLIC / "logos" / "focusflowlogo.png")), 96, 0.1)
    out = Image.new("RGBA", (96, 96), (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def main():
    OUT.mkdir(exist_ok=True)
    badge().save(OUT / "badge.png", optimize=True)
    for kind in KINDS:
        banner(kind).save(OUT / f"{kind}.png", optimize=True)
    print(f"wrote badge + {len(KINDS)} banners to {OUT}")


if __name__ == "__main__":
    main()
