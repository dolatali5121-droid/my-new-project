#!/usr/bin/env python3
"""Prepare footage for the Gears Villa film.

- footage/proc/<src>.mp4: H.264, keyframe every 0.5 s (seek-accurate renders), audio removed
  (the soundtrack is mixed separately by score.py).
- footage/proc/bg_<name>.mp4: 1920x1080 blurred, darkened plates that sit behind the centred
  panel in the 16:9 hook and reveal scenes, cut to the same shots as the panel.

Usage: prep.py <project-dir>
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
E = json.loads((ROOT / "edit.json").read_text())
PROC = ROOT / "footage/proc"
PROC.mkdir(parents=True, exist_ok=True)
SHOTS = {s["id"]: s for s in E["shots"]}
BG = {"hook": ["A1", "A2"], "reveal": ["E1", "E2", "E3"]}


def run(args):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], check=True)


for name, src in E["sources"].items():
    out = PROC / f"{name}.mp4"
    if not out.exists():
        run(["-i", str(ROOT / src["file"]), "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "14",
             "-pix_fmt", "yuv420p", "-r", "30", "-g", "15", "-keyint_min", "15", "-sc_threshold", "0",
             "-movflags", "+faststart", str(out)])

for name, ids in BG.items():
    inputs, chains = [], []
    for k, sid in enumerate(ids):
        s = SHOTS[sid]
        rate = s.get("rate", 1.0)
        inputs += ["-ss", str(s["in"]), "-t", str(s["dur"] * rate), "-i", str(PROC / f"{s['src']}.mp4")]
        chains.append(f"[{k}:v]setpts=PTS/{rate},fps=30,scale=1920:-2,crop=1920:1080,"
                      f"gblur=sigma=40,eq=brightness=-0.26:saturation=0.55,setsar=1[v{k}]")
    graph = ";".join(chains) + ";" + "".join(f"[v{k}]" for k in range(len(ids))) + f"concat=n={len(ids)}:v=1:a=0[out]"
    run([*inputs, "-filter_complex", graph, "-map", "[out]", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
         "-pix_fmt", "yuv420p", "-g", "15", "-keyint_min", "15", "-movflags", "+faststart", str(PROC / f"bg_{name}.mp4")])
print("footage ready in", PROC)
