---
name: mobile-game-aesthetics
description: Design and build casual mobile game visuals and UI in the bold, cartoonish "physics-slingshot" style popularized by Angry Birds — chunky rounded shapes, thick dark outlines, saturated candy-bright palettes, comic-style characters, and juicy, bouncy UI feedback. Use this whenever the user asks to design, mock up, restyle, or theme a mobile/casual game's look — art direction, color palettes, character or prop shapes, HUD, buttons, menus, level-select maps, popups, or particle/animation effects — even if they don't say "Angry Birds" explicitly and instead describe wanting something "cartoony," "playful," "bouncy," "candy-colored," "juicy," or "casual game" for mobile. Also use it when building HTML/CSS/React mockups or game asset specs that need this cartoon-physics-game look and feel.
---

# Mobile Game Aesthetics (Angry-Birds-style Casual Game Design)

## Why this look works

Angry Birds and its imitators (Cut the Rope, Bad Piggies, Crossy Road-adjacent casual titles) share a design language built for two things: reading instantly at thumbnail/small-screen size, and feeling *fun to touch*. Every choice below serves one of those two goals — keep that in mind when making judgment calls the reference files don't cover directly, rather than treating the rules as arbitrary style requirements.

Two goals, five techniques:

1. **Instant readability at small size** → bold silhouettes, thick dark outlines, high color contrast, simple shapes.
2. **Feels fun to touch** → squash/stretch animation, chunky "pressable" 3D buttons, particle bursts, bouncy easing.

## Core visual language

Read `references/art-direction.md` for the full breakdown with examples. The short version:

- **Silhouette-first shapes**: characters and props read as clean, simple outlines even in solid black — round bodies, minimal limbs, exaggerated proportions (big heads, tiny bodies or vice versa). If you can't tell what it is from a black silhouette thumbnail, simplify it further.
- **Thick dark outlines** (typically 3–6px at UI scale, proportionally thicker on characters) on every shape — this is what makes flat colors read as "comic" rather than "flat design." Never leave a colored shape unoutlined.
- **Saturated, warm-leaning palettes** with a small number of hero colors per scene, not a rainbow. See `references/palette.md` for ready-to-use hex palettes (sky/grass/wood/stone environment sets, plus character palettes).
- **Chunky, rounded everything**: border-radius is generous (buttons, cards, speech bubbles all look "inflated," almost like balloons). Sharp right angles are rare and reserved for structural things like wood planks or stone blocks, and even those get rounded corners.
- **Exaggerated, bouncy motion**: squash-and-stretch on impact, overshoot easing (anticipation + follow-through) rather than linear or simple ease-in-out. A button doesn't just scale down on press — it squashes, and pops back past 100% before settling.

## UI component patterns

Read `references/ui-patterns.md` for concrete CSS/HTML patterns (buttons, HUD, popups, level-select nodes, particle bursts) you can drop into a mockup. Highlights:

- **Buttons**: thick outline, gradient fill (lighter on top), a hard drop-shadow offset downward (like a pressed cardboard cutout) that shrinks/disappears on `:active`, plus a translateY so the button visibly "presses into" the screen.
- **HUD elements** (score, stars, currency): pill-shaped or badge-shaped containers, bold rounded numerals, small bounce-in animation when values change.
- **Level-select maps**: a winding dotted/rope path over a painted background with round node badges (stars earned, lock icons) rather than a flat grid or list.
- **Popups/dialogs**: styled like a wood sign, banner, or torn-paper card hanging from rope/nails, entering with an overshoot scale-in, not a plain fade.
- **Particles/juice**: star bursts, feathers, wood splinters, or confetti on success events; a subtle screen-shake on impacts. These sell "satisfying" more than any static art does — never skip the feedback animation even in a rough mockup, describe it if you can't implement it.

## Workflow

1. **Clarify the asset type** if it's ambiguous — full screen mockup vs. a single component (button, popup, HUD) vs. a character/prop design vs. a palette only. Don't build more than was asked for.
2. **Pick a palette** from `references/palette.md` (or derive a new one using its formula: 1 saturated hero color, 1–2 supporting colors, warm neutral for ground/wood, sky gradient) — state which one you're using.
3. **Build outlines-first**: block out shapes, then add the thick dark outline, then fill color, then add a small rim-light/highlight on the upper-left of rounded surfaces to sell the "inflated" volume.
4. **Add motion/feedback last**, but don't skip it — a static screenshot of a "juicy" game UI without any hover/press/success animation misses the point of the style. For HTML/CSS output, implement real CSS transitions/keyframes; for a design spec, describe the specific animation (easing curve, duration, what overshoots).
5. **Sanity-check readability**: would this shape/button/character still be identifiable shrunk to a thumbnail or viewed as a flat silhouette? If not, simplify further before adding detail.

## When building HTML/CSS mockups

`assets/example-mockup.html` is a self-contained reference example (start screen with a title banner, a bouncy "PLAY" button, and a level-select node) demonstrating the outline/gradient/shadow/animation techniques together — open it or read it for concrete, copy-adaptable CSS rather than re-deriving the technique from scratch each time. Adapt its class names and values to the specific ask; don't ship it verbatim as the deliverable.
