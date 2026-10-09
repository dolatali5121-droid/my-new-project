#!/usr/bin/env python3
"""Generate the HyperFrames compositions for the Gears Villa film from edit.json.

  landscape/index.html  16:9  1920x1080  (vertical footage laid out in editorial panels)
  portrait/index.html   9:16  1080x1920  (full-bleed footage for Reels / mobile)
Each is its own HyperFrames project; footage/, assets/ and vendor/ are shared via symlinks.

Usage: build.py <project-dir>
"""
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
E = json.loads((ROOT / "edit.json").read_text())
SUBS = json.loads((ROOT / "assets/audio/subs.json").read_text())
SHOTS = {s["id"]: s for s in E["shots"]}
DUR = E["duration"]
END_AT = E["endcard"]["at"]
TEXT = {t["id"]: t for t in E["text"]}

RED = "#E10600"

FONTS = """
@font-face { font-family: "Barlow Condensed"; font-weight: 600; src: url("assets/fonts/barlow-condensed-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 700; src: url("assets/fonts/barlow-condensed-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 800; src: url("assets/fonts/barlow-condensed-latin-800-normal.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 400; src: url("assets/fonts/inter-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 500; src: url("assets/fonts/inter-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 600; src: url("assets/fonts/inter-latin-600-normal.woff2") format("woff2"); }
"""

BASE_CSS = """
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { margin: 0; width: %(w)dpx; height: %(h)dpx; overflow: hidden; background: #0A0A0B; }
body { font-family: "Inter", sans-serif; color: #F5F5F2; }
#root { position: relative; width: 100%%; height: 100%%; overflow: hidden; background: #0A0A0B; }
.panel { position: absolute; overflow: hidden; }
.push { position: absolute; inset: 0; }
.push video { position: absolute; inset: 0; width: 100%%; height: 100%%; object-fit: cover; }
.layer { position: absolute; inset: 0; pointer-events: none; }
.hl { position: absolute; font-family: "Barlow Condensed", sans-serif; font-weight: 800; line-height: 0.94; letter-spacing: 0.005em; text-transform: uppercase; }
.hl .line { display: block; overflow: hidden; padding-bottom: 0.04em; }
.hl .line span { display: block; }
.hl .red { color: %(red)s; }
.bar { width: 96px; height: 8px; background: %(red)s; margin-bottom: 26px; transform-origin: left center; }
.kicker { font-family: "Inter", sans-serif; font-weight: 600; font-size: 22px; letter-spacing: 0.32em; color: #FF3B30; margin-bottom: 22px; }
.sub { position: absolute; left: 0; right: 0; display: flex; justify-content: center; }
.sub span { font-family: "Inter", sans-serif; font-weight: 500; color: #F5F5F2; background: rgba(10,10,11,0.62); border-radius: 6px; text-align: center; }
.vline { position: absolute; width: 4px; background: %(red)s; transform-origin: center top; }
#wipe { position: absolute; inset: 0; background: %(red)s; }
#wipe2 { position: absolute; inset: 0; background: %(red)s; }
.vignette { background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%%, rgba(0,0,0,0.38) 100%%); }
#endcard { position: absolute; inset: 0; background: #0A0A0B; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
#ec-name { font-family: "Barlow Condensed", sans-serif; font-weight: 800; letter-spacing: 0.02em; line-height: 0.9; display: flex; overflow: hidden; padding-bottom: 0.03em; }
#ec-name span { display: block; }
#ec-rule { height: 6px; background: %(red)s; transform-origin: center; }
#ec-role { font-family: "Inter", sans-serif; font-weight: 600; color: #F5F5F2; }
#ec-services { font-family: "Barlow Condensed", sans-serif; font-weight: 600; letter-spacing: 0.08em; color: #C9C9C4; }
#ec-services b { color: %(red)s; font-weight: 700; padding: 0 0.6em; }
#ec-ask { font-family: "Inter", sans-serif; font-weight: 500; color: #F5F5F2; }
#ec-cta { font-family: "Barlow Condensed", sans-serif; font-weight: 800; letter-spacing: 0.06em; background: %(red)s; color: #FFFFFF; }
#ec-cta-wrap { overflow: hidden; }
.stripe { position: absolute; height: 3px; background: %(red)s; transform-origin: left center; }
#fade { position: absolute; inset: 0; background: #000; }
"""


class Comp:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.html = []
        self.js = []
        self.track = 0

    def video(self, vid, src, media_in, at, dur, rate=1.0, cls=""):
        self.track += 1
        grade = E["sources"][src]["grade"]
        rate_attr = f' data-playback-rate="{rate}"' if rate != 1.0 else ""
        return (f'<video id="{vid}" class="clip" src="footage/proc/{src}.mp4" muted playsinline '
                f'data-start="{at}" data-duration="{dur}" data-media-start="{media_in}"{rate_attr} '
                f'data-track-index="{self.track}" style="filter: {grade}"></video>')

    def panel(self, pid, box, shots, extra_cls="", push=0.05, z=1):
        x, y, w, h = box
        inner = []
        for s in shots:
            sid = f"{pid}-{s['id']}"
            inner.append(f'<div class="push" id="p-{sid}">'
                         + self.video(f"v-{sid}", s["src"], s["in"], s["at"], s["dur"], s.get("rate", 1.0))
                         + "</div>")
            amount = s.get("push", push)
            self.js.append(f'tl.fromTo("#p-{sid}", {{scale: 1}}, {{scale: {1 + amount:.3f}, duration: {s["dur"]}, ease: "none"}}, {s["at"]});')
        self.html.append(f'<div class="panel {extra_cls}" id="pn-{pid}" style="left:{x}px; top:{y}px; width:{w}px; height:{h}px; z-index:{z}">'
                         + "".join(inner) + "</div>")

    def plate(self, pid, name, at, dur):
        """Full-frame blurred background plate (pre-rendered by prep.py)."""
        self.track += 1
        self.html.append(f'<div class="panel" id="pn-{pid}" style="left:0; top:0; width:{self.w}px; height:{self.h}px; z-index:1">'
                         f'<div class="push" id="p-{pid}"><video id="v-{pid}" class="clip" src="footage/proc/{name}.mp4" muted playsinline '
                         f'data-start="{at}" data-duration="{dur}" data-media-start="0" data-track-index="{self.track}"></video></div></div>')
        self.js.append(f'tl.fromTo("#p-{pid}", {{scale: 1.04}}, {{scale: 1.1, duration: {dur}, ease: "none"}}, {at});')

    def headline(self, tid, lines, box_css, size, at, out, kicker=None, bar=True, align="left", z=10, lines_red=(1,)):
        t = TEXT[tid]
        start = round(at - 0.05, 2)
        dur = round(out + 0.5 - start, 2)
        parts = []
        if kicker:
            parts.append(f'<div class="kicker" id="{tid}-k">{kicker}</div>')
        if bar:
            origin = "right" if align == "right" else ("center" if align == "center" else "left")
            margin = "margin-left:auto;" if align == "right" else ("margin:0 auto 26px;" if align == "center" else "")
            parts.append(f'<div class="bar" id="{tid}-bar" style="transform-origin:{origin} center; {margin}"></div>')
        for i, ln in enumerate(lines):
            red = ' class="red"' if i in lines_red else ""
            parts.append(f'<div class="line"><span id="{tid}-l{i}"{red}>{ln}</span></div>')
        self.html.append(f'<div class="hl clip" id="{tid}" data-start="{start}" data-duration="{dur}" data-track-index="90" '
                         f'style="{box_css}; font-size:{size}px; text-align:{align}; z-index:{z}">' + "".join(parts) + "</div>")
        ids = [f"#{tid}-l{i}" for i in range(len(lines))]
        if bar:
            self.js.append(f'tl.fromTo("#{tid}-bar", {{scaleX: 0}}, {{scaleX: 1, duration: 0.45, ease: "power3.out"}}, {at});')
        if kicker:
            self.js.append(f'tl.fromTo("#{tid}-k", {{opacity: 0, x: -14}}, {{opacity: 1, x: 0, duration: 0.5, ease: "power2.out"}}, {at});')
        self.js.append(f'tl.fromTo({json.dumps(ids)}, {{yPercent: 110}}, {{yPercent: 0, duration: 0.7, ease: "power4.out", stagger: 0.11}}, {at + 0.12:.2f});')
        self.js.append(f'tl.to({json.dumps(ids)}, {{yPercent: -110, duration: 0.35, ease: "power2.in", stagger: 0.05}}, {out:.2f});')
        if bar:
            self.js.append(f'tl.to("#{tid}-bar", {{scaleX: 0, duration: 0.3, ease: "power2.in"}}, {out + 0.1:.2f});')
        if kicker:
            self.js.append(f'tl.to("#{tid}-k", {{opacity: 0, duration: 0.3}}, {out:.2f});')

    def subtitles(self, bottom, size, maxw):
        for i, s in enumerate(SUBS):
            if s["start"] >= END_AT - 0.05:
                continue  # the end card carries this line on screen
            self.html.append(f'<div class="sub clip" id="sub{i}" data-start="{s["start"]}" data-duration="{round(s["end"] - s["start"], 3)}" '
                             f'data-track-index="95" style="bottom:{bottom}px; z-index:20">'
                             f'<span style="font-size:{size}px; max-width:{maxw}px; padding:{size * 0.22:.0f}px {size * 0.5:.0f}px">{s["text"]}</span></div>')

    def write(self, name, title):
        css = FONTS + BASE_CSS % {"w": self.w, "h": self.h, "red": RED}
        doc = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={self.w}, height={self.h}" />
    <title>{title}</title>
    <!-- Generated by tools/build.py from edit.json - edit those, not this file. -->
    <script src="vendor/gsap.min.js"></script>
    <style>{css}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{DUR}" data-width="{self.w}" data-height="{self.h}">
      {chr(10).join("      " + h for h in self.html).strip()}
      <audio id="soundtrack" src="assets/audio/mix.wav" data-start="0" data-duration="{DUR}" data-track-index="99" data-volume="1"></audio>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      {chr(10).join("      " + j for j in self.js).strip()}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
        proj = ROOT / name
        proj.mkdir(exist_ok=True)
        for shared in ("footage", "assets", "vendor", "hyperframes.json"):
            link = proj / shared
            if not link.exists():
                link.symlink_to(Path("..") / shared)
        (proj / "index.html").write_text(doc)


def shots(*ids, **over):
    out = []
    for i in ids:
        s = dict(SHOTS[i])
        s.update(over.get(i, {}))
        out.append(s)
    return out


def endcard(c, scale, stacked=False):
    name = "GEARS VILLA"
    letters = "".join(f'<span id="ec-n{i}">{"&nbsp;" if ch == " " else ch}</span>' for i, ch in enumerate(name))
    s = scale
    services = ("<div>CUSTOM SPORTSWEAR</div><div>TEAM UNIFORMS</div><div>BULK PRODUCTION</div>" if stacked
                else "CUSTOM SPORTSWEAR<b>|</b>TEAM UNIFORMS<b>|</b>BULK PRODUCTION")
    c.html.append(f'''<div id="endcard" class="clip" data-start="{END_AT - 0.1}" data-duration="{round(DUR - END_AT + 0.1, 2)}" data-track-index="80" style="z-index:25">
        <div class="stripe" id="ec-s1" style="width:{int(520 * s)}px; left:{int(-60 * s)}px; top:{int(130 * s)}px; transform: rotate(-24deg)"></div>
        <div class="stripe" id="ec-s2" style="width:{int(520 * s)}px; left:{int(-60 * s)}px; top:{int(170 * s)}px; transform: rotate(-24deg)"></div>
        <div id="ec-name" style="font-size:{int(176 * s)}px">{letters}</div>
        <div id="ec-rule" style="width:{int(120 * s)}px; margin:{int(30 * s)}px 0 {int(26 * s)}px"></div>
        <div id="ec-role" style="font-size:{int(30 * s)}px; letter-spacing:0.42em; margin-right:-0.42em">SPORTSWEAR MANUFACTURER</div>
        <div id="ec-services" style="font-size:{int(36 * s)}px; margin-top:{int(30 * s)}px; line-height:1.45">{services}</div>
        <div id="ec-ask" style="font-size:{int(32 * s)}px; margin-top:{int(78 * s)}px">LOOKING FOR A MANUFACTURING PARTNER?</div>
        <div id="ec-cta-wrap" style="margin-top:{int(26 * s)}px"><div id="ec-cta" style="font-size:{int(60 * s)}px; padding:{int(10 * s)}px {int(38 * s)}px {int(6 * s)}px">LET&#8217;S TALK.</div></div>
      </div>''')
    a = END_AT
    ids = [f"#ec-n{i}" for i in range(len(name))]
    c.js += [
        f'tl.fromTo({json.dumps(ids)}, {{yPercent: 105}}, {{yPercent: 0, duration: 0.8, ease: "power4.out", stagger: 0.035}}, {a + 0.32});',
        f'tl.fromTo("#ec-rule", {{scaleX: 0}}, {{scaleX: 1, duration: 0.6, ease: "power3.inOut"}}, {a + 0.9});',
        f'tl.fromTo("#ec-role", {{opacity: 0, y: 14}}, {{opacity: 1, y: 0, duration: 0.8, ease: "power3.out"}}, {a + 1.0});',
        f'tl.fromTo("#ec-services", {{opacity: 0, y: 16}}, {{opacity: 1, y: 0, duration: 0.7, ease: "power3.out"}}, {a + 1.7});',
        f'tl.fromTo("#ec-ask", {{opacity: 0, y: 16}}, {{opacity: 1, y: 0, duration: 0.7, ease: "power3.out"}}, {a + 3.0});',
        f'tl.fromTo("#ec-cta", {{yPercent: 102}}, {{yPercent: 0, duration: 0.6, ease: "power4.out"}}, {a + 3.6});',
        f'tl.fromTo(["#ec-s1", "#ec-s2"], {{scaleX: 0}}, {{scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.12}}, {a + 0.5});',
    ]
    c.html.append(f'<div id="fade" class="layer" style="z-index:40; opacity:0"></div>')
    c.js.append(f'tl.fromTo("#fade", {{opacity: 0}}, {{opacity: 1, duration: 0.5, ease: "none", immediateRender: false}}, {DUR - 0.5});')


def wipes(c, axis):
    """Two red wipes: into Scene 3 (motivated by the stack being pushed) and into the end card."""
    prop = "xPercent" if axis == "x" else "yPercent"
    for wid, at in (("wipe", 10.0), ("wipe2", END_AT)):
        c.html.append(f'<div id="{wid}" style="z-index:30"></div>')
        c.js.append(f'tl.fromTo("#{wid}", {{{prop}: -101}}, {{{prop}: 0, duration: 0.26, ease: "power2.in"}}, {at - 0.26});')
        c.js.append(f'tl.to("#{wid}", {{{prop}: 101, duration: 0.34, ease: "power2.out"}}, {at});')


# ---------------------------------------------------------------- 16:9
def landscape():
    c = Comp(1920, 1080)
    PW = 608
    cx = (1920 - PW) // 2

    # Scene 1 - hook: centred panel on a blurred, darkened copy of itself; copy split either side.
    hook = shots("A1", "A2", A1={"push": 0.1})
    c.plate("hkbg", "bg_hook", 0.5, 3.5)
    c.panel("hk", (cx, 0, PW, 1080), hook, z=3)
    c.html.append(f'<div class="vline" id="hk-line" style="left:958px; top:0; height:1080px; z-index:4"></div>')
    c.js += [
        'tl.fromTo("#hk-line", {scaleY: 0}, {scaleY: 1, duration: 0.35, ease: "power3.out"}, 0.15);',
        'tl.to("#hk-line", {opacity: 0, duration: 0.3}, 0.75);',
        'tl.fromTo("#pn-hk", {clipPath: "inset(0% 50% 0% 50%)"}, {clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power3.inOut"}, 0.5);',
        'tl.fromTo("#pn-hkbg", {opacity: 0}, {opacity: 1, duration: 0.8, ease: "power1.out"}, 0.7);',
    ]
    t1 = TEXT["t1"]
    c.headline("t1", t1["lines"], f"right:{1920 - cx + 48}px; top:420px", 92, t1["at"], t1["out"], align="right", lines_red=())
    TEXT["t1b"] = dict(t1, id="t1b")
    c.headline("t1b", t1["lines_b"], f"left:{cx + PW + 48}px; top:420px", 92, t1["at"] + 0.6, t1["out"], bar=False)

    # Scene 2 - craft: triptych, panels open from their centre lines one after another.
    tp = E["triptych"]
    gut, pw = 12, (1920 - 24) // 3
    for k, pshots in enumerate(tp["panels"]):
        ss = [dict(s, id=f"s{j}") for j, s in enumerate(pshots)]
        c.panel(f"tp{k}", (k * (pw + gut), 0, pw, 1080), ss, z=3)
        c.js.append(f'tl.fromTo("#pn-tp{k}", {{clipPath: "inset(50% 0% 50% 0%)"}}, {{clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "power3.out"}}, {pshots[0]["at"]});')
    c.html.append('<div id="tp-grad" class="layer clip" data-start="4" data-duration="6" data-track-index="85" style="z-index:6; background: linear-gradient(to top, rgba(10,10,11,0.88) 0%, rgba(10,10,11,0.55) 30%, rgba(10,10,11,0) 55%)"></div>')
    t2 = TEXT["t2"]
    c.headline("t2", t2["lines"], "left:88px; bottom:150px", 96, t2["at"], t2["out"])

    # Scene 3 - made for your brand: panel left, type right, red rule between.
    c.panel("br", (200, 0, PW, 1080), shots("C1", "C2", "C3", "C4", "C5"), z=3)
    c.html.append('<div class="vline clip" id="br-line" data-start="10" data-duration="7" data-track-index="86" style="left:868px; top:300px; height:480px; z-index:4"></div>')
    c.js.append('tl.fromTo("#br-line", {scaleY: 0}, {scaleY: 1, duration: 0.6, ease: "power3.out"}, 10.3);')
    c.js.append('tl.fromTo("#pn-br", {y: 18}, {y: -18, duration: 7, ease: "none"}, 10);')
    t3 = TEXT["t3"]
    c.headline("t3", t3["lines"], "left:928px; top:388px", 136, t3["at"], t3["out"], kicker="MADE FOR YOUR BRAND", bar=False)
    c.js.append('tl.fromTo("#t3", {x: 0}, {x: -14, duration: 6.4, ease: "none"}, 10.6);')

    # Scene 4 - production to packaging: mirrored layout, panel enters from the top.
    c.panel("bk", (1920 - 200 - PW, 0, PW, 1080), shots("D1", "D2", "D3", "D4", "D5"), z=3)
    c.js.append('tl.fromTo("#pn-bk", {clipPath: "inset(0% 0% 100% 0%)"}, {clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power3.out"}, 17);')
    c.html.append(f'<div class="vline clip" id="bk-line" data-start="17" data-duration="8" data-track-index="87" style="left:{1920 - 200 - PW - 64}px; top:300px; height:480px; z-index:4"></div>')
    c.js.append('tl.fromTo("#bk-line", {scaleY: 0}, {scaleY: 1, duration: 0.6, ease: "power3.out"}, 17.3);')
    t4 = TEXT["t4"]
    c.headline("t4", t4["lines"], f"right:{200 + PW + 112}px; top:400px", 112, t4["at"], t4["out"], kicker="PRODUCTION TO PACKAGING", bar=False, align="right")

    # Scene 5 - reveal: back to the centred hook layout (bookend), then the end card.
    rv = shots("E1", "E2", "E3")
    c.plate("rvbg", "bg_reveal", 25.0, 4.0)
    c.panel("rv", (cx, 0, PW, 1080), rv, z=3)
    c.js.append('tl.fromTo("#pn-rv", {scale: 1.07}, {scale: 1, duration: 0.6, ease: "power3.out"}, 25);')

    c.html.append('<div class="layer vignette" style="z-index:5"></div>')
    c.subtitles(bottom=46, size=34, maxw=1600)
    endcard(c, 1.0)
    wipes(c, "x")
    c.write("landscape", "Gears Villa - Behind Every Great Sports Brand (16:9)")


# ---------------------------------------------------------------- 9:16
def portrait():
    c = Comp(1080, 1920)
    allshots = shots(*[s["id"] for s in E["shots"]], A1={"push": 0.1})
    c.panel("full", (0, 0, 1080, 1920), allshots, z=2)
    c.js.append('tl.fromTo("#pn-full", {clipPath: "inset(50% 0% 50% 0%)"}, {clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power3.inOut"}, 0.5);')
    c.html.append('<div class="layer" style="z-index:5; background: linear-gradient(to bottom, rgba(10,10,11,0.92) 0%, rgba(10,10,11,0.8) 24%, rgba(10,10,11,0.45) 36%, rgba(10,10,11,0) 48%, rgba(10,10,11,0) 66%, rgba(10,10,11,0.55) 88%)"></div>')
    c.html.append('<div class="layer vignette" style="z-index:5"></div>')
    t1 = TEXT["t1"]
    c.headline("t1", t1["lines"] + t1["lines_b"], "left:80px; top:250px", 112, t1["at"], t1["out"], lines_red=(3,))
    c.headline("t2", TEXT["t2"]["lines"], "left:80px; top:250px", 112, TEXT["t2"]["at"], TEXT["t2"]["out"])
    c.headline("t3", TEXT["t3"]["lines"], "left:80px; top:250px", 112, TEXT["t3"]["at"], TEXT["t3"]["out"], kicker="MADE FOR YOUR BRAND", bar=False)
    c.headline("t4", TEXT["t4"]["lines"], "left:80px; top:250px", 104, TEXT["t4"]["at"], TEXT["t4"]["out"], kicker="PRODUCTION TO PACKAGING", bar=False)
    c.html.append('<style>.hl { text-shadow: 0 2px 28px rgba(0,0,0,0.55); }</style>')
    c.subtitles(bottom=430, size=40, maxw=900)
    endcard(c, 1.12, stacked=True)
    wipes(c, "y")
    c.write("portrait", "Gears Villa - Behind Every Great Sports Brand (9:16)")


if __name__ == "__main__":
    landscape()
    portrait()
    print("wrote landscape/index.html and portrait/index.html")
