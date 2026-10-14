#!/usr/bin/env python3
"""Render a cinematic 9:16 quote Short (1080x1920, 30 fps) with PIL + ffmpeg.

Usage:  python3 render_short.py [output.mp4]

Edit the QUOTE block below to reuse this for another quote. Each line is a
list of (word, style) pairs; style is None, "gold" or "crimson". `at` is the
second the line starts revealing.
"""
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------- config
W, H, FPS = 1080, 1920, 30
DURATION = 14.0

SERIF = "/usr/share/fonts/truetype/crosextra/Caladea-Bold.ttf"
SANS = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"

QUOTE = [
    {"at": 0.00, "words": [("The", None), ("most", None), ("dangerous", "gold")]},
    {"at": 1.10, "words": [("enablers", None), ("of", None), ("patriarchy", None)]},
    {"at": 3.20, "words": [("are", None), ("women", None), ("taught", None)]},
    {"at": 4.50, "words": [("to", None), ("mistake", None), ("oppression", "crimson")]},
    {"at": 6.60, "words": [("for", None), ("tradition.", "gold")]},
]
SIGNATURE = "Hayat writes"
SIGNATURE_AT = 10.2
FOCUS_AT = 8.6          # plain words dim, highlighted words glow
RULE_AT = 9.2           # thin gold rule draws under the quote

FONT_SIZE = 80
LINE_GAP = 1.42
WORD_STAGGER = 0.14     # seconds between words in a line
WORD_IN = 0.55          # seconds per word reveal
RISE = 26               # px each word rises while revealing
TEXT_CENTER_Y = 860     # above true centre: clear of Shorts title/caption UI
SAFE_W = 860            # keep text inside 110..970 px

COLORS = {
    None: (236, 231, 222),
    "gold": (214, 176, 98),
    "crimson": (206, 58, 64),
}
BG = (8, 8, 10)


# ---------------------------------------------------------------- helpers
def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def word_sprite(text, font, color, glow):
    """Return (text RGBA, glow RGBA) sprites with padding, plus ink offset."""
    pad = 60
    l, t, r, b = font.getbbox(text)
    w, h = r - l + pad * 2, b - t + pad * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((pad - l, pad - t), text, font=font, fill=color + (255,))
    glow_img = None
    if glow:
        glow_img = img.filter(ImageFilter.GaussianBlur(22))
        a = np.array(glow_img)
        a[..., 3] = np.clip(a[..., 3].astype(np.float32) * 1.6, 0, 255).astype(np.uint8)
        glow_img = Image.fromarray(a)
    return img, glow_img, (pad - l, pad - t)


def paste_alpha(base, sprite, xy, opacity):
    if opacity <= 0.003:
        return
    if opacity < 0.997:
        a = sprite.getchannel("A").point(lambda v: int(v * opacity))
        sprite = sprite.copy()
        sprite.putalpha(a)
    base.alpha_composite(sprite, (int(round(xy[0])), int(round(xy[1]))))


# ---------------------------------------------------------------- layout
font = ImageFont.truetype(SERIF, FONT_SIZE)
space = font.getlength(" ")
line_h = FONT_SIZE * LINE_GAP
ascent = font.getmetrics()[0]

widest = max(sum(font.getlength(w) for w, _ in ln["words"]) + space * (len(ln["words"]) - 1)
             for ln in QUOTE)
if widest > SAFE_W:
    sys.exit(f"Quote line too wide ({widest:.0f}px > {SAFE_W}px); lower FONT_SIZE")

block_h = line_h * (len(QUOTE) - 1) + FONT_SIZE
top = TEXT_CENTER_Y - block_h / 2

words = []  # dicts: sprite, glow, x, y, start, style
for li, ln in enumerate(QUOTE):
    lw = sum(font.getlength(w) for w, _ in ln["words"]) + space * (len(ln["words"]) - 1)
    x = (W - lw) / 2
    baseline_y = top + li * line_h
    for wi, (text, style) in enumerate(ln["words"]):
        spr, glow, (ox, oy) = word_sprite(text, font, COLORS[style], glow=style is not None)
        words.append({
            "sprite": spr, "glow": glow, "style": style,
            "x": x - ox, "y": baseline_y - oy,
            "start": ln["at"] + wi * WORD_STAGGER,
        })
        x += font.getlength(text) + space
block_bottom = top + block_h

sig_font = ImageFont.truetype(SANS, 40)
sig_text = "—  " + SIGNATURE.upper()
# letter-spaced small caps look via manual tracking
sig_img = Image.new("RGBA", (900, 120), (0, 0, 0, 0))
d = ImageDraw.Draw(sig_img)
cx = 0
for ch in sig_text:
    d.text((cx, 30), ch, font=sig_font, fill=(170, 164, 155, 255))
    cx += sig_font.getlength(ch) + 6
sig_img = sig_img.crop((0, 0, int(cx) + 4, 120))
sig_x = (W - sig_img.width) / 2
sig_y = block_bottom + 150

# ---------------------------------------------------------------- static layers
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def spotlight(cx, cy, strength):
    d = np.sqrt(((xx - cx) / 700) ** 2 + ((yy - cy) / 900) ** 2)
    return np.clip(1 - d, 0, 1) ** 2 * strength


edge = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
vignette = np.clip(1.15 - edge * 0.55, 0.45, 1.0)[..., None]

rng = np.random.default_rng(7)
grain_tiles = [rng.normal(0, 5.5, (H, W, 1)).astype(np.float32) for _ in range(6)]
warm = np.array([1.0, 0.86, 0.68], dtype=np.float32)


def background(t):
    # slow drifting warm spotlight behind the text
    cx = W / 2 + math.sin(t * 0.35) * 60
    cy = TEXT_CENTER_Y - 40 + math.cos(t * 0.27) * 40
    light = spotlight(cx, cy, 38 * (0.55 + 0.45 * ease_out(t / 1.2)))[..., None]
    bg = np.array(BG, dtype=np.float32) + light * warm
    return bg


# ---------------------------------------------------------------- frames
def render(t):
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    focus = ease_in_out((t - FOCUS_AT) / 1.0)

    for w in words:
        p = (t - w["start"]) / WORD_IN
        if p <= 0:
            continue
        e = ease_out(p)
        opacity = e
        if w["style"] is None:
            opacity *= 1 - 0.45 * focus
        y = w["y"] + RISE * (1 - e)
        if w["glow"] is not None:
            # glow blooms on reveal, settles, then breathes during focus
            bloom = max(0.0, 1 - abs(p - 1.0)) * 0.9
            breathe = focus * (0.55 + 0.2 * math.sin((t - FOCUS_AT) * 2.2))
            paste_alpha(canvas, w["glow"], (w["x"], y), min(1.0, bloom + breathe) * e)
        paste_alpha(canvas, w["sprite"], (w["x"], y), opacity)

    # thin gold rule drawing outward from centre
    r = ease_in_out((t - RULE_AT) / 1.1)
    if r > 0:
        half = 130 * r
        ry = int(block_bottom + 70)
        ImageDraw.Draw(canvas).rectangle(
            (W / 2 - half, ry, W / 2 + half, ry + 2), fill=COLORS["gold"] + (int(200 * r),))

    s = ease_out((t - SIGNATURE_AT) / 1.2)
    paste_alpha(canvas, sig_img, (sig_x, sig_y + 14 * (1 - s)), s)

    # composite over background
    bg = background(t)
    a = np.asarray(canvas, dtype=np.float32)
    alpha = a[..., 3:4] / 255.0
    frame = bg * (1 - alpha) + a[..., :3] * alpha
    frame = frame * vignette + grain_tiles[int(t * 12) % len(grain_tiles)]

    img = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8), "RGB")

    # slow cinematic push-in (sub-pixel accurate crop + resize)
    z = 1.0 + 0.045 * ease_in_out(t / DURATION)
    cw, ch = W / z, H / z
    x0, y0 = (W - cw) / 2, (TEXT_CENTER_Y * (1 - 1 / z))
    img = img.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))

    # open from black over the first 6 frames so frame 0 isn't empty-dark for long
    fade = ease_out(t / 0.2)
    if fade < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, fade)
    return img


# ---------------------------------------------------------------- audio
def make_audio(path, sr=48000):
    """Placeholder score: low A-minor pad + soft sub hits on key words."""
    n = int(DURATION * sr)
    t = np.arange(n) / sr
    pad = np.zeros(n)
    for f, amp in [(55.0, 0.30), (110.0, 0.22), (164.81, 0.12), (220.0, 0.08), (261.63, 0.05)]:
        detune = np.sin(2 * np.pi * 0.11 * t) * 0.15
        pad += amp * np.sin(2 * np.pi * (f + detune) * t)
    env = np.clip(t / 2.5, 0, 1) * np.clip((DURATION - t) / 1.5, 0, 1)
    swell = 0.8 + 0.2 * np.clip((t - FOCUS_AT) / 1.5, 0, 1)
    pad *= env * swell * 0.55

    def hit(at, gain):
        tt = t - at
        m = tt >= 0
        out = np.zeros(n)
        f = 48 * np.exp(-tt[m] * 3) + 32
        out[m] = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt[m] * 2.2) * gain
        return out

    audio = pad + hit(0.0, 0.7) + hit(4.5 + 2 * WORD_STAGGER, 0.45) + hit(6.6 + WORD_STAGGER, 0.5)
    audio = audio / np.max(np.abs(audio)) * 0.5   # ~ -6 dBFS peak, sits under voice/music
    stereo = np.stack([audio, audio], axis=1)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes((stereo * 32767).astype(np.int16).tobytes())


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "quote_short.mp4").resolve()
    wav = out.with_suffix(".wav")
    make_audio(wav)
    total = int(DURATION * FPS)
    proc = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", str(wav),
        "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out),
    ], stdin=subprocess.PIPE)
    for i in range(total):
        proc.stdin.write(render(i / FPS).tobytes())
        if i % 60 == 0:
            print(f"frame {i}/{total}", flush=True)
    proc.stdin.close()
    proc.wait()
    wav.unlink()
    # poster frame for thumbnails / review
    render(DURATION - 0.5).save(out.with_name(out.stem + "_final_frame.png"))
    print("wrote", out)


if __name__ == "__main__":
    main()
