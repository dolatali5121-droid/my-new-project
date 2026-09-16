# Art Direction Details

## Silhouette-first character/prop design

Before adding any color or detail, a shape should be identifiable as a black silhouette. Techniques used across this genre:

- **Round primary mass**: bodies are circles/ovals/teardrops far more often than boxes. Even "structural" props (crates, TNT boxes) get rounded corners rather than sharp right angles.
- **2–4 second read**: a player glances at the screen for a fraction of a second mid-play — designs are simplified until the silhouette alone conveys what the object is (bird = round body + pointed beak + small wing nub; pig = round body + snout circle + tiny triangle ears).
- **Exaggerated proportion, not realistic proportion**: heads are oversized relative to bodies, eyes are oversized relative to heads. This isn't "cute for its own sake" — bigger features are legible at small size and read as more expressive/emotive, which matters for a game about lobbing characters at things.
- **Asymmetry for personality, symmetry for legibility**: a character's core body stays a simple symmetric primitive (so it reads instantly), while one or two features (an eyebrow angle, a tuft of feathers, a facial expression) break symmetry to give personality/emotion. Don't make every part asymmetric — that reads as noisy/messy rather than characterful.

## Outlines

- Outline weight scales with the object's on-screen size, not a fixed pixel value — small UI icons might use a 2–3px outline while a large hero character or button might use 5–8px, so the ratio of outline-to-shape stays visually consistent (~8-12% of the shape's smallest dimension is a decent starting ratio).
- Outline color is a warm near-black derived from the scene's palette (see `palette.md`), not pure `#000000`. Pure black outlines against warm-saturated fills tend to look harsh/inky rather than "hand-inked."
- Outlines are continuous and closed — every filled shape gets a complete outline, including internal shape boundaries where two colors of the same object meet (e.g. the line between a bird's body-red and belly-cream).

## Shading

Flat, cartoon "cel" shading, not realistic gradients or soft airbrushed shadows:

- Each surface typically gets 2 flat tones (base + one shadow tone), occasionally a third highlight tone for glossy/wet surfaces (eyes, glass, ice). Shadow shapes have hard edges, not soft blurred gradients — they look like flat shapes painted on top, following the rounded form (e.g., a shadow "wrapping" the lower-right of a sphere as a crescent shape).
- Light source is consistently upper-left (or whatever direction is chosen) across an entire scene/character set. Consistency matters more than the specific direction — mixing light directions across elements is one of the fastest ways to make a scene look "off."
- A small specular highlight (a bright oval or two small circles) on rounded glossy surfaces (eyes, wet noses, glass bottles, metal) sells the "toy-like" glossy material read that this genre relies on.

## Typography

- Rounded, extra-bold display faces for titles/logos and large UI text (think chunky "bubble letter" or "toy block letter" styling) — avoid thin or condensed weights anywhere prominent.
- Text at any meaningful size gets a thick outline/stroke plus a drop shadow or bevel, matching the same treatment as the illustrated shapes, so type feels like part of the same painted world rather than a UI overlay.
- Numerals (scores, timers, currency counts) are often even chunkier/rounder than body text, sometimes in a distinct "counter" style with a slight 3D bevel — these are meant to feel tactile, like a slot-machine or pinball score display.
- Keep body/instructional text in a plain, highly legible sans — reserve the decorative treatment for titles, buttons, and numerals so small text stays readable.

## Motion principles (the "juice")

Borrowed from classic animation principles, applied to UI/game feedback:

- **Squash and stretch**: anything that moves or gets tapped deforms slightly along its motion — a button squashes vertically on press, a character stretches when launched and squashes on impact. Scale non-uniformly (e.g. `scaleX(1.1) scaleY(0.85)`), not uniformly — uniform scaling looks like a static resize, not an impact.
- **Anticipation**: a small counter-movement before the main action reads as more responsive/alive — e.g. a button dips down slightly before popping up when released, or a character crouches slightly before jumping.
- **Overshoot / follow-through**: elements entering the screen (popups, HUD updates, character spawns) scale past their final size and settle back (e.g. 0% → 115% → 95% → 100%), using an easing curve like `cubic-bezier(.34,1.56,.64,1)` (a standard "back ease out") rather than linear or basic ease-in-out.
- **Impact feedback**: successful actions (hitting a target, collecting a star, winning a level) get compounding feedback — particle burst + short screen shake + a bouncy scale pop on the relevant UI element + (if audio is in scope) a bright, cartoonish sound cue. Layering 2–3 of these together is what makes an action feel "satisfying"; any single one alone feels flat.
