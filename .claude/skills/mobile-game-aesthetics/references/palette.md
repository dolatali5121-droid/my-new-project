# Color Palettes

A palette in this style is small and warm-leaning: one saturated hero color, one or two supporting colors, a warm neutral for ground/structure, and a bright gradient sky. Resist adding more than ~5 hues to any single scene — variety comes from value/shade steps within each hue, not from adding more hues.

## Environment sets

### Grassy hills (default outdoor scene)
| Role | Hex | Notes |
|---|---|---|
| Sky top | `#7EC8E3` | light cyan-blue |
| Sky bottom (near horizon) | `#C9EFFA` | gradient toward near-white |
| Cloud | `#FFFFFF` @ 90% opacity | soft rounded blob shapes, outlined in very light blue `#DDEFF7` |
| Grass highlight | `#8BC34A` | top of hills, sunlit side |
| Grass shadow | `#5D9C2E` | underside/shadow of hills |
| Dirt/wood | `#8B5A2B` | slingshot, crates, trunks |
| Dirt shadow | `#5C3A1A` | |
| Stone | `#A9A9A0` | light gray-brown, not neutral gray |
| Stone shadow | `#75736B` | |
| Outline (universal) | `#2B2118` | near-black warm brown, NOT pure black — keeps the palette warm |

### Desert / canyon
| Role | Hex |
|---|---|
| Sky top | `#F7C873` |
| Sky bottom | `#FCE8B5` |
| Sand highlight | `#E8B15C` |
| Sand shadow | `#C4863A` |
| Rock | `#B5654A` |
| Outline | `#3A1F12` |

### Ice / winter
| Role | Hex |
|---|---|
| Sky top | `#B9DDF1` |
| Sky bottom | `#EAF6FC` |
| Ice highlight | `#D6F0FA` |
| Ice shadow | `#8FCBE0` |
| Wood (still warm, contrasts cold scene) | `#8B5A2B` |
| Outline | `#1F2E38` |

## Character palette formula

Pick ONE saturated hero color for the character's body (red `#E8433A`, yellow `#F4C430`, green `#6FBF44`, blue `#3E9BDC` all read well against the environment sets above). Then:
- **Body highlight**: hero color mixed ~25% toward white
- **Body shadow**: hero color mixed ~30% toward its outline color (not toward black/gray — this is what keeps characters from looking muddy)
- **Beak/feet/accent**: a warm neutral (orange `#F0973B` or cream `#F7E8C4`) so the character isn't monochrome
- **Outline**: same warm near-black as the environment (`#2B2118` or scene equivalent) — using the same outline color across characters and environment is what makes them feel like they belong in the same world

## UI chrome palette (buttons, HUD, popups)

These sit on top of the scene and should feel like painted wood/cloth/metal, not flat app-UI material:

| Element | Fill top | Fill bottom | Outline | Drop shadow |
|---|---|---|---|---|
| Primary button (e.g. PLAY) | `#8BDB4A` | `#5FA82E` | `#2B2118` | `#3D5A1E` |
| Secondary button | `#F4C430` | `#D89F0E` | `#2B2118` | `#8A5E08` |
| Danger/reset button | `#F0553F` | `#C22E1D` | `#2B2118` | `#7A1D10` |
| Popup/card background | `#FDF3D9` (parchment) | `#F2E2AE` | `#8B5A2B` (wood-brown, not black) | — |
| HUD badge (score/stars) | `#FFE9A8` | `#F7C94C` | `#2B2118` | `#8A5E08` |

Always give buttons a top-to-bottom gradient (lighter → darker) to imply a rounded 3D surface, never a flat single color.
