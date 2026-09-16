# UI Component Patterns (CSS)

Concrete, adaptable patterns. Swap colors for the chosen palette (see `palette.md`); keep the structural techniques (layered shadows, gradient fills, overshoot easing).

## Chunky pressable button

The core trick: a solid drop-shadow "pedestal" behind the button that shrinks/moves when pressed, combined with the button itself translating down — this reads as the button physically pressing into the screen rather than just a hover-color-change.

```css
.game-button {
  --fill-top: #8BDB4A;
  --fill-bottom: #5FA82E;
  --outline: #2B2118;
  --shadow: #3D5A1E;

  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 0 rgba(0,0,0,.25);
  padding: 18px 40px;
  border: 4px solid var(--outline);
  border-radius: 999px; /* pill shape */
  background: linear-gradient(to bottom, var(--fill-top), var(--fill-bottom));
  box-shadow:
    inset 0 3px 0 rgba(255,255,255,.35), /* glossy top highlight */
    0 8px 0 var(--shadow),               /* the "pedestal" */
    0 10px 12px rgba(0,0,0,.25);         /* soft ambient shadow */
  transform: translateY(0);
  transition: transform .08s ease-out, box-shadow .08s ease-out;
  cursor: pointer;
}

.game-button:active {
  transform: translateY(6px);
  box-shadow:
    inset 0 3px 0 rgba(255,255,255,.35),
    0 2px 0 var(--shadow),
    0 4px 6px rgba(0,0,0,.2);
}

/* entrance pop */
@keyframes pop-in {
  0%   { transform: scale(0); opacity: 0; }
  70%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}
.game-button.entering {
  animation: pop-in .4s cubic-bezier(.34,1.56,.64,1);
}
```

## HUD badge (score / stars / currency)

```css
.hud-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(to bottom, #FFE9A8, #F7C94C);
  border: 3px solid #2B2118;
  border-radius: 999px;
  padding: 6px 16px;
  font-weight: 800;
  color: #2B2118;
  box-shadow: 0 4px 0 #8A5E08;
}

/* bounce when the value updates — toggle this class via JS on change */
@keyframes value-bump {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.35); }
  100% { transform: scale(1); }
}
.hud-badge.bump { animation: value-bump .3s cubic-bezier(.34,1.56,.64,1); }
```

## Popup / dialog card ("wood sign" style)

```css
.game-popup {
  background: linear-gradient(to bottom, #FDF3D9, #F2E2AE);
  border: 6px solid #8B5A2B;
  border-radius: 28px;
  box-shadow: 0 14px 0 rgba(0,0,0,.15), 0 18px 30px rgba(0,0,0,.3);
  padding: 32px;
  transform: scale(0);
  animation: popup-in .35s cubic-bezier(.34,1.56,.64,1) forwards;
}

@keyframes popup-in {
  0%   { transform: scale(0) rotate(-4deg); opacity: 0; }
  60%  { transform: scale(1.08) rotate(1deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); }
}

/* dim/blur the scene behind the popup */
.game-popup-backdrop {
  background: rgba(20, 15, 10, .45);
  backdrop-filter: blur(2px);
}
```

## Level-select node (winding path map)

```html
<svg class="level-path" viewBox="0 0 400 800">
  <path d="M40,760 C 120,700 20,620 80,560 S 320,460 260,380 S 60,260 120,180 S 340,80 320,20"
        stroke="#F2E2AE" stroke-width="10" stroke-dasharray="4 14" stroke-linecap="round" fill="none"/>
</svg>
```

```css
.level-node {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 4px solid #2B2118;
  background: radial-gradient(circle at 35% 30%, #FFE9A8, #F7C94C 70%);
  box-shadow: 0 5px 0 #8A5E08;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
.level-node.locked {
  background: radial-gradient(circle at 35% 30%, #C9C4B8, #9A9484 70%);
  box-shadow: 0 5px 0 #6B6759;
  filter: grayscale(.3);
}
.level-node .stars { display: flex; gap: 2px; position: absolute; bottom: -10px; }
```

## Particle burst (success feedback)

A simple JS-free CSS approach: several small elements positioned at the burst origin, each animated outward on its own radial trajectory using per-element custom properties.

```css
.particle {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color, #F4C430);
  animation: burst .6s ease-out forwards;
  --dx: 0px; --dy: 0px;
}
@keyframes burst {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(.3); opacity: 0; }
}
```

```js
// generate N particles around a burst point, each with a random angle/distance
function burst(container, x, y, count = 12) {
  const colors = ['#F4C430', '#E8433A', '#6FBF44', '#3E9BDC'];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 60 + Math.random() * 40;
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--color', colors[i % colors.length]);
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    container.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}
```

## Screen shake (impact feedback)

```css
@keyframes screen-shake {
  0%, 100% { transform: translate(0, 0); }
  20%      { transform: translate(-6px, 3px); }
  40%      { transform: translate(5px, -4px); }
  60%      { transform: translate(-4px, -2px); }
  80%      { transform: translate(3px, 4px); }
}
.shake { animation: screen-shake .3s ease-in-out; }
```

Trigger by toggling the `.shake` class on the game container and removing it after the animation ends — keep the shake distance small (under ~8px) so it reads as "impact" rather than causing motion sickness or obscuring the UI.
