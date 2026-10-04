"""Turn the FocusFlow logo artwork (dark mark on a light background) into the
app's clay-style logo files. Keeps only the symbol (drops any wordmark or
tagline under it), removes the background and renders it as clay: soft white
top highlight, lighter bottom shade, soft drop shadow — no dark colours.
Writes:

  public/logo/focusflow-mark.png      cream clay mark (sits on coral: navbar, tiles)
  public/logo/mark-top-coral.png      upper line only, coral clay   } same canvas,
  public/logo/mark-bottom-coral.png   lower line only, coral clay   } for the loader
  public/logo192.png, logo512.png, logo-maskable.png   app icons (coral clay tile)
  public/favicon.ico                  16/32/48 px browser-tab icon

Usage:  python frontend/scripts/make-logo.py [source image]
        (default source: frontend/public/logos/focusflowlogo.png)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
# (base, bottom-edge shade, drop shadow) — shades are only slightly deeper
# than the base so nothing reads as dark.
CREAM_CLAY = ((255, 246, 232), (236, 214, 188), (222, 112, 108))   # on coral
CORAL_CLAY = ((236, 112, 109), (226, 100, 97), (190, 160, 122))    # on cream page
CORAL_TOP = (245, 140, 137)
CORAL = (236, 112, 109)


def mark_alpha(src: Image.Image) -> Image.Image:
    """Alpha mask of the symbol only, cropped tight."""
    gray = np.asarray(src.convert("L"), dtype=np.float32)
    bg = np.percentile(gray, 90)  # the light paper colour
    ink = np.clip((bg - gray) / max(bg - gray.min(), 1), 0, 1)
    ink = np.clip((ink - 0.22) / 0.33, 0, 1)  # paper texture → background, soft edge kept
    dark = ink > 0.5

    # The symbol is the first block of inked rows; a run of blank rows
    # separates it from any text below.
    rows = dark.sum(axis=1) > 0
    start = int(np.argmax(rows))
    end, blank = start, 0
    gap_needed = max(4, int(src.height * 0.04))
    for y in range(start, len(rows)):
        if rows[y]:
            end, blank = y, 0
        else:
            blank += 1
            if blank >= gap_needed:
                break
    cols = dark[start:end + 1].sum(axis=0) > 0
    x0, x1 = int(np.argmax(cols)), len(cols) - int(np.argmax(cols[::-1])) - 1
    return Image.fromarray((ink[start:end + 1, x0:x1 + 1] * 255).astype(np.uint8))


def components(alpha: Image.Image):
    """Split the mask into its connected pieces, largest first."""
    a = np.asarray(alpha) > 127
    lab = np.zeros(a.shape, int)
    n = 0
    for y, x in zip(*np.nonzero(a)):
        if lab[y, x]:
            continue
        n += 1
        stack = [(y, x)]
        lab[y, x] = n
        while stack:
            cy, cx = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < a.shape[0] and 0 <= nx < a.shape[1] and a[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n
                        stack.append((ny, nx))
    # Grow each label by 2px so the soft anti-aliased edge goes with its piece.
    full = np.asarray(alpha)
    parts = []
    for i in range(1, n + 1):
        m = Image.fromarray(((lab == i) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
        parts.append(Image.fromarray(np.minimum(full, np.asarray(m))))
    return sorted(parts, key=lambda p: -np.count_nonzero(np.asarray(p) > 127))


def place(alpha: Image.Image, size: int, pad: float, ref: Image.Image = None) -> Image.Image:
    """Centre `alpha` (scaled like `ref`) in a square canvas with padding."""
    ref = ref or alpha
    inner = int(size * (1 - 2 * pad))
    scale = inner / max(ref.size)
    w, h = max(1, round(alpha.width * scale)), max(1, round(alpha.height * scale))
    resized = alpha.resize((w, h), Image.LANCZOS)
    resized = resized.filter(ImageFilter.GaussianBlur(radius=max(0.0, scale / 6 - 0.2)))
    canvas = Image.new("L", (size, size), 0)
    canvas.paste(resized, ((size - round(ref.width * scale)) // 2, (size - round(ref.height * scale)) // 2))
    return canvas


def shift(a: np.ndarray, dx: int, dy: int) -> np.ndarray:
    out = np.zeros_like(a)
    h, w = a.shape
    out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = a[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return out


def blur(a: np.ndarray, r: float) -> np.ndarray:
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(img, dtype=np.float32) / 255


def clay(alpha_sq: Image.Image, palette=CREAM_CLAY, shadow=True) -> Image.Image:
    """Clay rendering of a mask: white highlight top-left, slightly deeper
    shade bottom-right, soft drop shadow."""
    base, shade, drop = (np.array(c, np.float32) for c in palette)
    size = alpha_sq.width
    a = np.asarray(alpha_sq, dtype=np.float32) / 255
    k = max(1, round(size * 0.014))
    hl = blur(np.clip(a - shift(a, k, k), 0, 1), size * 0.008) * a      # lit top-left rim
    sh = blur(np.clip(a - shift(a, -k, -k), 0, 1), size * 0.010) * a    # shaded bottom-right rim
    rgb = base[None, None, :] * np.ones((size, size, 1), np.float32)
    rgb = rgb * (1 - 0.75 * sh[..., None]) + shade * (0.75 * sh[..., None])
    rgb = rgb * (1 - 0.9 * hl[..., None]) + 255 * (0.9 * hl[..., None])
    mark = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert("RGBA")
    mark.putalpha(alpha_sq)
    if not shadow:
        return mark
    d = blur(shift(a, 0, round(size * 0.02)), size * 0.018) * 0.38
    out = Image.new("RGBA", (size, size), tuple(int(c) for c in drop) + (0,))
    out.putalpha(Image.fromarray((d * 255).astype(np.uint8)))
    out.alpha_composite(mark)
    return out


def tile(mark: Image.Image, radius_frac: float) -> Image.Image:
    """Clay mark on a rounded coral clay tile (light top → coral, white highlight)."""
    size = mark.width
    t = np.linspace(0, 1, size, dtype=np.float32)[:, None, None]
    grad = np.array(CORAL_TOP, np.float32) * (1 - t) + np.array(CORAL, np.float32) * t
    grad = np.repeat(grad, size, axis=1)
    hl = np.clip(1 - np.linspace(0, 1, size, dtype=np.float32) * 5, 0, 1)[:, None, None] * 0.35  # top highlight
    grad = grad * (1 - hl) + 255 * hl
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_frac), fill=255)
    out.paste(Image.fromarray(grad.astype(np.uint8)), (0, 0), mask)
    out.alpha_composite(mark)
    return out


def main(src_path: str) -> None:
    src = Image.open(src_path)
    alpha = mark_alpha(src)
    (PUBLIC / "logo").mkdir(exist_ok=True)

    clay(place(alpha, 1024, 0.06)).save(PUBLIC / "logo" / "focusflow-mark.png")

    # The two lines on the same canvas as the full mark, in coral clay, for the
    # loader (it draws the logo line by line on the cream page).
    parts = components(alpha)
    if len(parts) >= 2:
        sqs = [place(p, 512, 0.06, ref=alpha) for p in parts[:2]]
        tops = [np.nonzero(np.asarray(q) > 64)[0].mean() for q in sqs]
        top, bottom = (sqs[0], sqs[1]) if tops[0] < tops[1] else (sqs[1], sqs[0])
        clay(top, CORAL_CLAY).save(PUBLIC / "logo" / "mark-top-coral.png")
        clay(bottom, CORAL_CLAY).save(PUBLIC / "logo" / "mark-bottom-coral.png")

    for size, name in ((192, "logo192.png"), (512, "logo512.png")):
        tile(clay(place(alpha, size, 0.2)), 0.22).save(PUBLIC / name)
    tile(clay(place(alpha, 512, 0.27)), 0).save(PUBLIC / "logo-maskable.png")  # Android safe zone
    tile(clay(place(alpha, 256, 0.15)), 0.22).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"source {src.width}x{src.height} -> symbol {alpha.width}x{alpha.height}, {len(parts)} pieces; files written")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(PUBLIC / "logos" / "focusflowlogo.png"))
