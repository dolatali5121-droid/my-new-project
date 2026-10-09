#!/usr/bin/env python3
"""Original music bed + sound design + final mix for the Gears Villa film.

Everything here is synthesised from scratch (no samples), so the score carries no
third-party licence. 120 BPM, D minor, progression Dm - Bb - F - C (one chord per bar).

Usage: score.py <project-dir>
Reads  assets/vo/vo1..vo4.wav and footage/raw1.mp4 (factory ambience),
writes assets/audio/music.wav, assets/audio/mix.wav and subtitles.srt.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
rng = np.random.default_rng(7)

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
CFG = json.loads((ROOT / "edit.json").read_text())
LENGTH = CFG["duration"]
N = int(LENGTH * SR)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i: i + len(sig)] += sig * gain


def lp_fft(x, cutoff, slope=4):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** slope)
    return np.fft.irfft(X, len(x))


def hp_fft(x, cutoff, slope=4):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / max(cutoff, 1)) ** slope)
    return np.fft.irfft(X, len(x))


def reverb(x, seconds=2.2, mix=0.25):
    ir_t = t_axis(seconds)
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 6.9 / seconds)
    ir = lp_fft(ir, 5000)
    ir /= np.sqrt((ir ** 2).sum())
    n = len(x) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    return x * (1 - mix) + wet * mix * 0.6


def env_adsr(n, a=0.01, d=0.2, s=0.6, r=0.3):
    t = np.arange(n) / SR
    total = n / SR
    e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    rel = np.clip((total - t) / r, 0, 1)
    return e * rel


# --- instruments -----------------------------------------------------------------

def pad(notes, sec):
    t = t_axis(sec)
    out = np.zeros_like(t)
    for m in notes:
        for det in (-0.12, 0.0, 0.11):
            f = hz(m + det)
            out += 2 * ((t * f + rng.random()) % 1) - 1  # saw
    out = lp_fft(out, 1100)
    return out * env_adsr(len(t), a=0.35, d=0.4, s=0.8, r=0.6) / (3 * len(notes))


def sub(m, sec):
    t = t_axis(sec)
    return np.sin(2 * np.pi * hz(m) * t) * env_adsr(len(t), a=0.005, d=0.15, s=0.7, r=0.08)


def pluck(m, sec=0.22):
    t = t_axis(sec)
    f = hz(m)
    x = (2 * ((t * f) % 1) - 1) * 0.6 + np.sin(2 * np.pi * f * t) * 0.4
    return lp_fft(x, 2600) * np.exp(-t * 14)


def kick(sec=0.45):
    t = t_axis(sec)
    f = 48 + 120 * np.exp(-t * 35)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(1.6 * np.sin(phase) * np.exp(-t * 7.5))


def hat(sec=0.06, open_=False):
    t = t_axis(0.25 if open_ else sec)
    return hp_fft(rng.standard_normal(len(t)), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.5


def clap(sec=0.3):
    t = t_axis(sec)
    n = hp_fft(lp_fft(rng.standard_normal(len(t)), 5000), 900)
    e = np.exp(-t * 22)
    for k in (0.0, 0.011, 0.022):
        e += np.exp(-np.clip(t - k, 0, None) * 140) * (t >= k) * 0.6
    return n * e * 0.5


def riser(sec):
    t = t_axis(sec)
    noise = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    steps = 24
    seg = len(t) // steps
    for k in range(steps):
        cut = 300 + (8000 - 300) * (k / steps) ** 2
        chunk = lp_fft(noise[k * seg:(k + 1) * seg], cut)
        out[k * seg:(k + 1) * seg] = chunk
    return out * (t / sec) ** 2 * 0.5


def whoosh(sec=0.7):
    t = t_axis(sec)
    noise = rng.standard_normal(len(t))
    shape = np.sin(np.pi * t / sec) ** 2
    return hp_fft(lp_fft(noise, 2500), 250) * shape * 0.45


def impact(sec=2.5):
    t = t_axis(sec)
    f = 38 + 70 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    crack = lp_fft(rng.standard_normal(len(t)), 3000) * np.exp(-t * 18) * 0.35
    return reverb(np.tanh(1.3 * body) + crack, 2.6, 0.35)


# --- arrangement -----------------------------------------------------------------

def compose():
    mus = np.zeros(N)
    drums = np.zeros(N)
    sfx = np.zeros(N)
    prog = [(50, [62, 65, 69]), (46, [62, 65, 70]), (41, [60, 65, 69]), (48, [60, 64, 67])]  # Dm Bb F C
    arp_pat = [0, 1, 2, 1, 2, 0, 1, 2]
    m_in, build, peak, end_hit = CFG["music"]["in"], CFG["music"]["build"], CFG["music"]["peak"], CFG["music"]["end_hit"]

    bar_t = m_in
    k = 0
    while bar_t < end_hit - 0.01:
        root, chord = prog[k % 4]
        place(mus, pad(chord, BAR + 0.6), bar_t, 0.55)
        for b in range(8):  # eighth-note sub pulse
            place(mus, sub(root - 12, BEAT / 2 * 0.9), bar_t + b * BEAT / 2, 0.32 if b % 2 == 0 else 0.2)
        if bar_t >= m_in + BAR:  # arp enters on the second bar
            for s in range(16):
                note = chord[arp_pat[s % 8]] + 12
                place(mus, pluck(note), bar_t + s * BEAT / 4, 0.16 if bar_t < build else 0.2)
        for b in range(4):
            bt = bar_t + b * BEAT
            if bt >= end_hit - 0.01:
                break
            place(drums, kick(), bt, 0.55)
            if bt >= build:
                place(drums, hat(), bt + BEAT / 2, 0.22)
                if b in (1, 3):
                    place(drums, clap(), bt, 0.2)
            if bt >= peak:
                place(drums, hat(), bar_t + b * BEAT + BEAT / 4, 0.12)
                place(drums, hat(), bar_t + b * BEAT + 3 * BEAT / 4, 0.12)
        bar_t += BAR
        k += 1

    # everything before the end hit stops on it
    gate = np.clip((end_hit + 0.06 - t_axis(LENGTH)[:N]) / 0.06, 0, 1)
    mus *= gate
    drums *= gate

    # snare-roll lift into the end card
    roll_start = end_hit - BAR
    for i in range(16):
        place(drums, clap(0.15), roll_start + i * BEAT / 4, 0.05 + 0.13 * i / 16)

    # final chord + hit
    place(mus, reverb(pad([62, 65, 69, 74], LENGTH - end_hit), 3.0, 0.4), end_hit, 0.7)
    place(mus, sub(38, 2.5), end_hit, 0.5)

    place(sfx, riser(m_in - 1.6), 1.6, 0.55)
    place(sfx, impact(), m_in, 0.75)
    for w in CFG["sfx"]["whoosh"]:
        place(sfx, whoosh(), w - 0.45, 0.6)
    place(sfx, riser(BAR), end_hit - BAR, 0.45)
    place(sfx, impact(3.5), end_hit, 0.85)

    music = reverb(mus, 1.8, 0.22) + drums
    fade = np.clip((LENGTH - t_axis(LENGTH)[:N]) / 1.8, 0, 1)
    return music * fade, sfx * fade


# --- voiceover, ambience, mix -------------------------------------------------------

def load_wav(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def ambience():
    a = CFG["ambience"]
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(a["src_in"]), "-t", str(LENGTH),
                          "-i", str(ROOT / a["src"]), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    x = np.pad(x, (0, max(0, N - len(x))))[:N]
    x /= np.sqrt((x ** 2).mean()) + 1e-9
    pts = np.array(a["envelope"])  # [[t, gain], ...]
    return x * np.interp(t_axis(LENGTH)[:N], pts[:, 0], pts[:, 1]) * 0.12


def write_wav(path, stereo):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = np.clip(stereo, -1, 1).astype(np.float32).T.copy()
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2",
                    "-i", "-", "-c:a", "pcm_s16le", str(path)], input=data.tobytes(), check=True)


def srt_time(s):
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main():
    music, sfx = compose()
    vo = np.zeros(N)
    duck = np.ones(N)
    t = t_axis(LENGTH)[:N]
    cues = []
    for line in CFG["vo"]:
        x = load_wav(ROOT / line["file"])
        x /= np.abs(x).max() + 1e-9
        place(vo, x, line["at"], 0.8)
        end = line["at"] + len(x) / SR
        cues.append((line, end))
        duck = np.minimum(duck, np.interp(t, [line["at"] - 0.3, line["at"], end, end + 0.4], [1, 0.42, 0.42, 1],
                                          left=1, right=1))
    amb = ambience()

    def stereo(x, width=0.0):
        d = int(0.012 * SR)
        side = np.concatenate([np.zeros(d), x[:-d]]) * width
        return np.stack([x + side, x - side])

    mix = stereo(music * duck * 0.5, 0.25) + stereo(sfx * 0.6, 0.35) + stereo(amb * (0.6 + 0.4 * duck)) + stereo(vo)
    write_wav(ROOT / "assets/audio/music.wav", stereo(music * 0.5, 0.25))
    write_wav(ROOT / "assets/audio/premix.wav", mix / (np.abs(mix).max() + 1e-9) * 0.9)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(ROOT / "assets/audio/premix.wav"),
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), "-c:a", "pcm_s16le",
                    str(ROOT / "assets/audio/mix.wav")], check=True)

    # subtitles: split each line at its chunk boundaries, timed by character share
    srt, n = [], 1
    for line, end in cues:
        chunks = line["subs"]
        total = sum(len(c) for c in chunks)
        start = line["at"]
        for c in chunks:
            stop = start + (end - line["at"]) * len(c) / total
            srt.append(f"{n}\n{srt_time(start)} --> {srt_time(stop)}\n{c}\n")
            n += 1
            start = stop
    (ROOT / "subtitles.srt").write_text("\n".join(srt))
    json.dump([{"text": c, "start": round(s, 3), "end": round(e, 3)} for c, s, e in _sub_spans(cues)],
              open(ROOT / "assets/audio/subs.json", "w"), indent=1)
    print("mix written:", ROOT / "assets/audio/mix.wav")


def _sub_spans(cues):
    for line, end in cues:
        total = sum(len(c) for c in line["subs"])
        start = line["at"]
        for c in line["subs"]:
            stop = start + (end - line["at"]) * len(c) / total
            yield c, start, stop
            start = stop


if __name__ == "__main__":
    main()
