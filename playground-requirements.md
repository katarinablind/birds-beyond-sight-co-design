# Jiu Jiu Prototyping Playground — Requirements

*Capstone: bringing blind and low-vision birder perspectives to the wider birding
community — "Responsible Social Media: using the attention economy for good."*

A shared, single-page web tool that does two jobs at once:

1. **Starter kit** — a fast, on-brand scaffold so anyone on the team can stand up a
   new prototype in minutes at a *higher* fidelity than a paper sketch, with our
   fonts, colors, phone frame, real bird media, and plug-and-play APIs already wired.
2. **Wrapper / overview** — an organizing layer that shows *every* ideation we've
   explored, **what kind of sharing it's about**, and **to what fidelity** — so we
   can see coverage, find gaps, and compare ideas side by side without scrolling.

> This document is the spec to react to, not a finished decision. Open questions are
> flagged **[DECIDE]** throughout — bring them to the next team sync.

---

## 0. Design principles (why this exists)

- **Lower the cost of a good-looking prototype.** The generic AI-generated look is the
  enemy of a design capstone. The playground bakes in *our* feel so nobody starts from
  a blank Tailwind page.
- **Make exploration legible.** We should be able to answer "have we tried sharing in a
  co-located group?" or "what's still just a sketch?" at a glance.
- **Sharing is the lens.** Every ideation is tagged by *why/how people share*. The
  taxonomy (§4) is not decoration — it guides what we ideate next.
- **Accessibility is the default, not a mode.** Audio-first, alt-text-first, screen-reader
  sane. The kit's components ship accessible so prototypes inherit it for free.

---

## 1. Aesthetic system (the "our feel" guardrails)

Pulled directly from the existing `index.html` / `prototypes.html` so the playground is
continuous with what we've already built — not a third parallel style.

### Type
| Role | Font | Usage |
|---|---|---|
| Primary / UI | **Radio Canada Big** (400–700, incl. italic) | Titles, labels, buttons, nav |
| Secondary / editorial | **Source Serif 4** (400/600/700) | Sub-copy, captions, scientific names, "lens" text |

CSS vars already in use: `--font`, `--font-sub`. Keep these names.

### Color tokens (canonical — copy verbatim)
```css
--black:#1a1a1a;  --text:#1a1a1a;
--green:#67AD5B;  --green-light:#67AD5B18; --green-mid:#67AD5B44; --green-dim:#67AD5B88;
--gray:#6C6C6C;   --gray-light:#6C6C6C22;
--brown:#C4955A;  /* warm accent / "you"-adjacent, second voices */
--blue:#8BB8E8;   /* water / cool accent / map */
--bg:#fafaf8;     --surface:#fff;  --border:#e8e6e1;
--R:14px;         /* default radius */
```
- Green is the brand spine; brown + blue are accents (habitat-coded: brown = land/edge,
  blue = water). **Avoid introducing new hues** without adding them here first.
- Dark variants (for IG-story / sonogram surfaces) live in `sonogram.html`; promote those
  into a shared `--ink`, `--ink-2` set so dark prototypes are also consistent. **[DECIDE]**

### "Rough, not strict"
- Tokens are **required**; layouts are **free**. Components are suggestions, not a locked
  library — a team member can compose freely as long as they pull from the tokens and the
  frame.
- Ship a **one-screen style reference** ("tokens + components" tab) so people copy/paste
  swatches, type ramp, and component markup.

---

## 2. The frame (consistency for comparison)

- **Exact iOS phone frame**, reused as a single component: Dynamic-Island pill, SVG status
  bar (9:41 / signal / wifi / battery), home indicator, frosted bottom nav. Already built
  in `prototypes.html` — extract it into a shared partial/template so every prototype gets
  the identical chrome.
- **Fixed stage, no page scroll.** The phone sits in the *same screen position every time*
  so switching ideations is a flicker-swap, not a reflow. Content scrolls *inside* the
  screen only (as it does today). Target: everything visible above the fold on a 13" laptop.
- **Two-pane layout** (already established): left = controls + context (sharing tags,
  fidelity, the ethical-media-lens panel); right = the phone. The wrapper view (§5) reuses
  this exact geometry so single-prototype and overview modes feel like one tool.
- **Tap cursor.** On hover over the phone screen, swap the desktop cursor for a translucent
  "fingertip" dot; on click, a quick ripple + slight scale so demos read as *touch*, not
  mouse. Confine it to the phone bounds. **[DECIDE]** custom-PNG cursor vs. a JS-drawn
  follower div (follower is easier to animate the press state).

---

## 3. Functionality — skills, APIs, plug-and-play

### 3a. Claude skills we've already built (drop-in visual techniques)
These live in `~/.claude/skills` and are the fast path to high-fidelity moments. The
playground should list them with a one-line "use this when…" and a copy-paste hook:

| Skill | Good for in a birding prototype |
|---|---|
| `highlightable-grass-field` | Habitat backdrops (marsh/grass), cursor-reactive scenes |
| `proximity-audio-mapping` | Cursor-/distance-driven birdsong gain — "walk toward the sound" |
| `marching-squares-topology` | Sonar/contour map styling, sound-as-terrain |
| `filled-band-topology` / `3d-terrain-contours` | Stylized habitat maps |
| `swimming-fish-tank` | Autonomous ambient creatures (gulls/ducks drifting) |
| `realtime-presence-ping` | "A friend just heard a robin" live pings between viewers |
| `svg-path-grow-animation` | Drawing-on sonograms, growth/lifecycle reveals |
| `minimap-radar-overlay` | The Bird-Friends map HUD |

Requirement: a **"Skills" shelf** in the kit — each entry has name, thumbnail/gif, the
trigger sentence, and a "copy starter" button. We are *cataloguing*, not auto-running them.

### 3b. APIs — "click to plug" panel
A panel of toggleable integrations, each with: status (live / mock / needs-key), a stub
that returns **mock data offline**, and a real adapter when a key is present. Be honest
about what actually exists:

| Need | Reality | Recommendation |
|---|---|---|
| Bird **sound ID** | Merlin Sound ID = Cornell's **BirdNET**; **no official public Merlin API.** | Use **BirdNET** (community/`BirdNET-Analyzer`) for the "Merlin-like" demo, clearly labeled as a stand-in. |
| Bird **sightings / locations** | **eBird API 2.0** — free, key-gated, well-documented (recent obs, hotspots, taxonomy). | Primary real data source for the map/group ideas. |
| Bird **audio archive** | **Macaulay Library** (Cornell) = the official archive, but **licensing is restrictive** for redistribution. **Xeno-canto API** is open + mostly CC-licensed. | Prototype with **Xeno-canto**; cite Macaulay as the "production" source pending licensing. **[DECIDE]** |
| Bird **images** | Same split — Macaulay (Cornell, restrictive) vs. Wikimedia/CC. | CC/Wikimedia for the playground; flag Macaulay for production. |
| **Maps** | Mapbox GL (custom styles), Apple MapKit JS, or Leaflet + OSM. Our look is stylized. | Default to our **stylized SVG map** (already in proto-14); offer **Leaflet/OSM** as the "real data" toggle. |
| **Live audio sonogram** | Web Audio API (already working in `sonogram.html`). | Ship as a kit component, not an external API. |

Requirement: an **`apis.json`-style registry** (id, label, status, docs URL, key-needed,
mock fn, real adapter) rendered as the click-to-plug panel. Keys live in a gitignored
local file, never committed.

> **Licensing is a hard requirement, not a footnote.** Every media/API entry carries its
> license + attribution string. Cornell/Macaulay assets are **not** redistributable by
> default — the playground must visibly mark anything that can't ship in a public artifact.

### 3c. Media library
- Bundle the existing local clips (`birds/*.mp3`) as the always-offline baseline.
- Add a **media browser** that can pull (Xeno-canto first) sound + image by species, with a
  visible attribution chip. Cache locally so demos work without network.

---

## 4. Sharing taxonomy (the guiding lens)

The core conceptual contribution: **classify every ideation by the kind of sharing it
explores**, so the taxonomy drives ideation instead of trailing it. Focus areas the project
already centers: **audio-first**, with undertones of **passive learning** and **retrospection**.

### Two primary axes (the coverage map)
- **Audience** (x): `Self → One friend → Small group → Local community → Public`
- **Time / sync** (y): `Live & co-located → Live remote → Asynchronous → Retrospective`

Plotting ideations on this grid is the overview's centerpiece (§5) — empty cells = unexplored
sharing modes.

### Cross-cutting motivation tags (why people share)
Each ideation also gets 1–3 of these (color-chipped):
- **Keep / remember** (diary, wrapped — sharing with your future self)
- **Connect** (long-distance bird friends, "thinking of you, heard your bird")
- **Teach / pass knowledge** (the experienced birder narrating to the group)
- **Belong to a place** (local map, Union Bay community)
- **Collect / identity** (life list, badges)
- **Witness together** (the co-located group moment)

### Concrete scenarios to make sure the grid covers
These are the user's own framings — treat as required test cases for coverage:
- **Co-located group, one Merlin.** A group walks together; **one person runs the ID** and
  the result is shared to everyone present (audio + name + place) — *Live & co-located ×
  Small group × Witness/Teach.*
- **Long-distance bird friends.** Async one-to-one gifting of a clip across distance —
  *Asynchronous × One friend × Connect.*
- **Retrospective self-share.** Weekly recap / wrapped — *Retrospective × Self × Remember.*

Requirement: taxonomy is **data**, not prose — a tag schema every prototype references, so
the grid and filters are generated, not hand-maintained.

---

## 5. The wrapper / ideation overview

The "zoom out" mode. Same two-pane geometry as the single view.

- **Registry-driven.** One source of truth (`ideations.json`-style): each entry =
  `{ id, title, oneLiner, fidelity, sharingTags{audience,time,motivations}, skillsUsed,
  apisUsed, screen (route/iframe), status, owner, license-flags }`.
- **Three switchable lenses over the same set:**
  1. **Gallery** — the current seg-control strip of phone screens (proto-1…N).
  2. **Sharing grid** — the Audience × Time matrix with each ideation as a chip in its cell;
     instantly shows gaps. Filter by motivation tag.
  3. **Fidelity board** — columns `Sketch → Static mock → Interactive → Real data/audio →
     Validated w/ users`; cards move across as they mature. Answers "what have we explored
     and how far."
- **Fidelity ladder (shared definition):**
  | Level | Means |
  |---|---|
  | 1 Sketch | Idea + still image / wireframe only |
  | 2 Static mock | On-brand screen, no interaction |
  | 3 Interactive | Clickable, fake data |
  | 4 Real media/audio | Live audio engine + real bird media/API |
  | 5 Validated | Tested with blind/LV birders (co-design) |
- **Compare mode.** Pin two ideations into twin frames side by side (reuses the fixed-stage
  geometry) for A/B discussion in critique.
- **Add-new flow.** "New ideation" clones the kit template, registers a stub entry, opens it
  in the frame — the §1 "fast for the team" goal, made literal.

---

## 6. Architecture / non-functional

- **Single-page, no build step** (matches the repo: vanilla HTML/CSS/JS, `python3 -m
  http.server`). Keep zero-dependency so any teammate can open and edit. **[DECIDE]** if/when
  we outgrow this and want a light bundler.
- **Each ideation is an isolated screen** (separate file or `<template>`) loaded into the
  shared frame — so one person's broken prototype can't take down the wrapper.
- **Shared core** factored out of today's duplication: `frame.css/js`, `tokens.css`,
  `audio-engine.js` (the AnalyserNode player already in `prototypes.html`), `cursor.js`,
  `registry.js`.
- **Accessibility baseline** every component must meet: semantic landmarks, focus states,
  alt text on media, captions/transcript for audio, prefers-reduced-motion respected,
  screen-reader-tested nav. (Dogfooding our own thesis.)
- **No secrets in git.** Keys in a gitignored local config; registry ships with mock data so
  the playground is fully functional offline.
- **Attribution surfaced**, never buried — per §3 licensing requirement.

---

## 7. Scope — phased

**MVP (v0):**
- Extract shared frame + tokens + tap cursor.
- Registry schema + Gallery lens wrapping the existing 15 proto screens.
- Sharing grid (manual tags on current screens) + fidelity board.
- Skills shelf (catalogue + copy-starter). Local `birds/*.mp3` media only.

**v1:**
- Click-to-plug API panel with eBird + Xeno-canto adapters (mock-first).
- Media browser with attribution + local cache.
- "New ideation" clone flow. Compare mode.

**Later:**
- BirdNET "Merlin-like" demo (clearly labeled). Real-time presence pings between viewers.
- Dark-surface token set promoted from `sonogram.html`. Light bundler if needed.

---

## 8. Open decisions **[DECIDE]**
1. Tap cursor: custom-image cursor vs. JS follower div (press-state animation).
2. Xeno-canto vs. Macaulay as the prototyping media source (licensing reality).
3. Promote dark/IG-story tokens into the shared system now, or later.
4. Stay zero-build, or adopt a light bundler once shared modules grow.
5. Exact fidelity-ladder labels — do "Validated" and the co-design level match how the
   team actually talks about maturity?
6. Is "Audience × Time" the right pair of axes, or should **motivation** be an axis instead
   of a cross-cut tag?
