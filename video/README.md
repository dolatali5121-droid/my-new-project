# Video editing with HyperFrames

[HyperFrames](https://github.com/heygen-com/hyperframes) turns HTML, CSS, media and
GSAP animations into deterministic MP4s. This folder is the workspace for editing
footage with it; the HyperFrames agent skills live in `.claude/skills/`
(`hyperframes`, `hyperframes-core`, `hyperframes-animation`, `hyperframes-keyframes`,
`hyperframes-creative`, `hyperframes-audio`, `hyperframes-registry`,
`hyperframes-cli`, `hyperframes-studio`, `media-use`).

## Setup

Requires Node.js 22+ and FFmpeg.

```bash
bash video/setup.sh
```

This fetches the pinned CLI (0.8.143) and the headless Chrome it renders with, keeps
a local `video/vendor/gsap.min.js`, and runs `hyperframes doctor`.

## Editing a clip

1. Put the source clip in `video/source/` (e.g. `video/source/clip.mp4`).
2. Scaffold a project around it:
   ```bash
   cd video
   npx hyperframes@0.8.143 init my-edit --video source/clip.mp4 --resolution portrait --non-interactive
   ```
   Use `--resolution landscape` for 16:9. Add `--skip-transcribe` where Whisper isn't available.
   If `render` warns about sparse keyframes, re-encode the source first:
   `ffmpeg -i in.mp4 -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -c:a copy out.mp4`
3. Build the edit in `my-edit/index.html` (titles, callouts, zooms, grade, audio).
4. Validate and render:
   ```bash
   cd my-edit
   npx hyperframes@0.8.143 check
   npx hyperframes@0.8.143 render -o ../renders/my-edit.mp4
   npx hyperframes@0.8.143 preview   # live studio in the browser (local machine)
   ```

## Claude Code cloud sessions

The cloud network policy blocks `cdn.jsdelivr.net` and `huggingface.co`, so:

- Copy the local GSAP into each project (`cp -r vendor my-edit/`) and load it with
  `<script src="vendor/gsap.min.js"></script>` instead of the CDN URL, or renders fail.
  Asset paths must stay inside the project folder; `../` paths fail `hyperframes lint`.
- Speech transcription (`hyperframes transcribe`, `models install parakeet`) does not
  work there; run it on a local machine, or skip it with `--skip-transcribe`.
