# GPT image generation and reused assets

## Mode

Built-in GPT image tool, opaque room backgrounds. No CLI/model substitution. The character was not regenerated or replaced.

## Room, initial generation

- Original output: `C:/Users/zureeal/.codex/generated_images/01a1b4a7-f891-7d81-9329-9ebd1c580dbc/exec-41431d6a-06fa-4c10-a031-c83c6929cbef.png`
- Preserved workspace draft: `D:/blog/Firefly_zureeallv/sketches/hermes-world-demo/v5/assets/room.png`
- The raster is scenery only, never the interactive star map.

Exact submitted prompt:

Use case: stylized-concept. Create a premium painted anime visual-novel background for an interactive cyber memory room, landscape 16:9, full-bleed. A quiet spacious architectural hacker sanctuary at rainy night, matte graphite structural walls, desaturated deep blue-green, restrained thin mint optical lighting and one small warm recessed wall light. Strong believable room depth with ceiling beams receding to the rear, broad floor with subtle reflections, a tall rain-covered window along the LEFT edge revealing distant apartment silhouettes, a rear wall recessed alcove on the right. Large EMPTY AIR SPACE in the CENTER and LEFT-MIDDLE (x=15%-72%, y=14%-78%) intended for a floating interactive memory projection, NOT a flat black monitor. Right x=77%-94%, y=15%-83% contains an empty slender vertical dark glass optical display niche, upright, minimalist, no content; leave room for a separate character overlay. A low foreground architectural ledge at bottom edge and subtle side columns establish foreground depth. View from slightly elevated human standing perspective, exquisite architectural linework, tactile concrete and brushed dark metal, readable shadow details. Intimate calm cyber atmosphere, NOT a spaceship cockpit or ordinary computer desk. Absolutely no computers, no monitors on stands, no keyboards, no desk setup, no clutter, no chairs, no characters, no writing, no letters, no numerals, no logos, no symbols, no fake UI, no star map painted into the image. No purple or magenta neon, no bright RGB. Empty central volume must feel spacious, dark and usable for real rendered luminous points. Finished background illustration, not a screenshot or website mockup.

## Targeted edit, final background

The first image painted a fixed glass niche that duplicated the real responsive portrait display. A GPT edit removed only that niche to allow the independent HTML display to adapt without double frames. The original raster was inspected before editing.

- Edit target: `D:/blog/Firefly_zureeallv/sketches/hermes-world-demo/v5/assets/room.png`
- Output: `C:/Users/zureeal/.codex/generated_images/01a1b4a7-f891-7d81-9329-9ebd1c580dbc/exec-e8af48be-710a-42b8-98ce-b98bd4b27ff4.png`
- Final consuming asset: `D:/blog/Firefly_zureeallv/sketches/hermes-world-demo/v5/assets/room-final.png`

Exact submitted edit prompt:

Edit the supplied room background. Remove ONLY the empty glass vertical display niche and its projecting base on the right wall. Replace that entire niche area with a quiet flat dark graphite recessed architectural wall, with subtle vertical panel seams and matching room lighting. It must have no glowing rectangular frame, no screen, no pedestal. Preserve everything else: the exact rain window, distant buildings, ceiling beams, central empty volume, floor reflections, small amber recessed light, foreground ledge, camera perspective, anime-painted material style and restrained mint/graphite palette. No people, no text, no UI. A real interactive portrait display will be composited over this empty right wall later.

## Character, unchanged

`assets/hermes-expressions.png` is an exact copy from V4. It keeps the approved turquoise twin tails, turquoise eyes, black/pink rectangular ornaments, grey-white sleeveless shirt, turquoise tie, detached black sleeves and red 01 upper-arm marking. The marking is part of the approved character, not a new decorative UI label. The 2×2 atlas is used without stretching: idle / blink / talking / smirk. Original reference-guided generation is recorded in `D:/blog/Firefly_zureeallv/sketches/hermes-world-demo/v3/PROMPTS.md`.

No Live2D, skeletal animation or live model connection is claimed. CSS adds optical display glass and a fade, not a replacement drawing.

## Font and license notes

`assets/zpix.woff` is an exact copy of V4's repaired WOFF. The inconsistent original TTF was not reintroduced. Zpix is used only in short voluntary dialogue; body text uses readable Chinese system fonts. `assets/LICENSE.needy-streamer-overload.txt` is copied from V4. Existing source attribution is `public/lab/internet-angel/NOTICE.md` (read-only reference). The old MIT source attribution does not establish all font/reference-character rights. This remains an unpublished local study; publication licensing is a separate review.

## 3D dependency reference

Three.js pinned to 0.180.0, local runtime modules only. Official documentation consulted before adoption: [Three.js documentation](https://threejs.org/docs/), especially PerspectiveCamera, Points, Raycaster and WebGLRenderer. No front-end CDN requests.
