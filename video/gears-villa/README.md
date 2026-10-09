# Gears Villa — "Behind Every Great Sports Brand"

36-second B2B brand film built with HyperFrames from the factory footage.

| File | Format |
| --- | --- |
| `renders/gears-villa-16x9.mp4` | 1920×1080, 30 fps, H.264 + AAC stereo, −14.7 LUFS |
| `renders/gears-villa-9x16.mp4` | 1080×1920, 30 fps, H.264 + AAC stereo (Reels / mobile) |
| `subtitles.srt` | English subtitles for platforms that take a caption file |

## Structure

| Time | Scene | Footage | On screen |
| --- | --- | --- | --- |
| 0–4s | Hook | band-knife cutting fabric stack, overlock needle | EVERY GREAT SPORTS BRAND / STARTS WITH A VISION. |
| 4–10s | The craft | triptych: cutting, stitching, sewing floor | PRECISION IN EVERY STITCH. |
| 10–17s | Made for your brand | jersey at the machine, cut panels, operators, bagged garments | YOUR DESIGNS. YOUR IDENTITY. |
| 17–25s | Production to packaging | packing, stacks, carton floor, container loading, truck | CUSTOM SPORTSWEAR. BULK PRODUCTION. |
| 25–29s | Reveal | precision cut, sewing floor, warehouse | — |
| 29–36s | End card | — | GEARS VILLA, services, LET'S TALK. |

## Pipeline

```bash
python3 tools/analyze.py stats footage/raw1.mp4      # sharpness / motion / brightness per 0.5 s
python3 tools/prep.py .                              # seek-friendly proxies + blurred background plates
python3 tools/score.py .                             # original music, SFX, ambience, VO mix, subtitles
python3 tools/build.py .                             # landscape/ and portrait/ compositions from edit.json
cd landscape && npx hyperframes@0.8.143 render -o ../renders/gears-villa-16x9.mp4
cd ../portrait && npx hyperframes@0.8.143 render -o ../renders/gears-villa-9x16.mp4
```

`edit.json` is the single source of truth: every shot (source, in-point, duration), on-screen copy,
voiceover timing, music cue points and the ambience envelope. Change it and re-run score/build/render.

`footage/` is not committed. Put the source clips there as `raw1.mp4` (fabric cutting), `raw2.mp4`
(warehouse/shipment), `raw4.mp4` (sewing floor) before running the pipeline.

## Decisions and limits

- **Clip excluded:** the "Most people see the product…" clip has captions burned into every frame
  and ends on a **LEOON INDUSTRY** card. It is not used, so the film doesn't present another
  company's footage as Gears Villa's. If that footage is yours, add it to `edit.json`; it has the
  only embroidery, screen-print and finished-hoodie shots.
- **Audio:** only the fabric-cutting clip has real machine sound; it is the factory ambience. The
  other clips carry added social-media music and are muted.
- **Music:** composed in code (`tools/score.py`, 120 BPM, D minor). No samples, so no third-party
  licence. Swap in a licensed track by replacing `assets/audio/music.wav` handling in `score.py`.
- **Voiceover:** local Kokoro TTS (voice `am_michael`). Replace `assets/vo/vo1..4.wav` with a
  human recording of the same lines and re-run `score.py` and the renders.
- **Logo:** no logo file was supplied, so the end card sets "GEARS VILLA" in type (Barlow Condensed).
  Drop the official logo into `assets/` and swap it into `endcard()` in `tools/build.py`.
- **Source quality:** most clips are 720×1280 phone footage. The 16:9 cut lays them out as vertical
  panels so they are never upscaled past their resolution; the 9:16 cut is full-bleed (1.5× upscale).
- Fonts: Barlow Condensed and Inter (SIL OFL, licences in `assets/fonts/`).
