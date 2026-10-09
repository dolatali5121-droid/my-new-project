#!/usr/bin/env python3
"""Footage analysis for the Gears Villa film.

Usage:
  analyze.py stats <clip.mp4> [--step 0.5]       per-step sharpness / motion / brightness table
  analyze.py frames <out.png> <clip>@<t> ...      labelled grid of frames (8 per row)

Sharpness is the variance of a Laplacian over a 360px-wide grey frame (higher = crisper),
motion is the mean absolute difference to the previous sample, brightness is mean luma.
"""
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def frame(path, t, width=360):
    out = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-ss", str(t), "-i", path, "-frames:v", "1",
         "-vf", f"scale={width}:-2", "-f", "image2pipe", "-vcodec", "png", "-"],
        capture_output=True, check=True).stdout
    from io import BytesIO
    return Image.open(BytesIO(out)).convert("RGB")


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    return float(out.stdout.strip())


def stats(path, step):
    prev = None
    t = 0.0
    end = duration(path)
    print(f"# {path}  ({end:.1f}s)\n   t  sharp  motion  bright")
    while t < end - 0.05:
        g = np.asarray(frame(path, t).convert("L"), dtype=np.float32)
        lap = (-4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:])
        motion = float(np.abs(g - prev).mean()) if prev is not None and prev.shape == g.shape else 0.0
        print(f"{t:5.1f} {lap.var():6.0f} {motion:7.1f} {g.mean():7.0f}")
        prev = g
        t += step


def frames(out, specs, cols=8, w=270):
    tiles = []
    font = ImageFont.truetype(FONT, 18)
    for spec in specs:
        clip, t = spec.rsplit("@", 1)
        im = frame(clip, float(t), w)
        d = ImageDraw.Draw(im)
        label = f"{clip.split('/')[-1].split('.')[0]} @{t}"
        d.rectangle([0, 0, 10 + 11 * len(label), 26], fill=(0, 0, 0))
        d.text((5, 3), label, font=font, fill=(255, 220, 0))
        tiles.append(im)
    h = max(i.height for i in tiles)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h))
    for n, im in enumerate(tiles):
        sheet.paste(im, ((n % cols) * w, (n // cols) * h))
    sheet.save(out)


if __name__ == "__main__":
    if sys.argv[1] == "stats":
        step = float(sys.argv[sys.argv.index("--step") + 1]) if "--step" in sys.argv else 0.5
        stats(sys.argv[2], step)
    elif sys.argv[1] == "frames":
        frames(sys.argv[2], sys.argv[3:])
