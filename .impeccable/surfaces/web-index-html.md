---
version: 1
slug: "web-index-html"
primary_target: "web/index.html"
related_targets: []
---

## Scope

Homepage `web/index.html` — the whole skynolimit.dev journey. Visitor mode:
Persuade, delivered as an immersive experience. Legal pages are out of scope
(they keep their own stylesheet, `web/src/legal.css`).

## Strategy

- Audience/job: prospective clients judging credibility in seconds.
- Action: start a project (mailto). Secondary: explore the four apps.
- Proof: the four live App Store apps, their screenshots and store links.
- Constraints: content works without WebGL; reduced motion; anchors for legacy
  redirects; no fabricated claims.

## Agreed decisions (2026-11-07)

Procedural rendering only (mood references are not shipped); refined sans
display (Mona Sans variable, width + weight axes); section order Opening →
Work → Capabilities → About → Contact; black hole as the About set piece on
high/medium tiers; current content with light copy changes; ~250 kB gz
lazy-loaded WebGL bundle accepted. Build path: code-led (no image generation).

## Direction contract

THESIS: The site is one continuous flight through a single rendered star
system; every section is a place the camera travels to, and the studio's four
shipped apps are worlds you can fly to. It refuses the category default: a
starfield wallpaper behind a headline, then a grid of cards.

OWN-WORLD: Deep space #03040B and midnight #080D20 own the ground; light comes
only from bodies — the gold star #FBBF24, cyan atmospheres #38BDF8, cosmic
blue #2563EB; violet #8B5CF6 and magenta #D946EF live inside the nebula only.
Mona Sans: light, expanded display; normal-width body. Line language is the
orbit: 1px hairline rings and rules. Panels are midnight translucency with
restrained blur, only where text sits over the scene. No kickers, no section
numerals, no card grids.

STORY: Hang off a sunlit Earth and learn in one line what the studio does;
see four real apps orbiting the gold star; fly to each; cross the nebula of
capabilities; pass the black hole ("We fly what we build"); reach the galaxy
horizon, where the one action waits: start a project.

FIRST VIEWPORT: (revised 2026-11-08 at the user's request: "a green and blue
jewel set against the blackness of space", replacing the dawn limb.) A sunlit
Earth sits low and right of centre, whole and round against black, Europe and
Africa turned to face us (NASA Blue Marble and Black Marble imagery, credited
in the footer; provenance in web/src/assets/earth/README.md): blue oceans,
green and tan land, drifting cloud, a soft blue atmospheric rim, city
lights along the terminator at lower left. The gold star burns in open sky
above it with a soft corona and a delicate horizontal lens streak (no hard
edges anywhere). A dim violet nebula far behind. "Sky No Limit" in light
expanded type spans the upper-left third; the tagline and one plain line
beneath; primary "Start a project" and secondary "Explore the work". The
four app worlds glint as small named lights along one tilted orbit round the
star. A thin trajectory rail on the right edge, clear of the globe. On tall screens the
globe rises from the bottom edge and the star sits beside the actions. Quiet
life throughout: twinkling stars, a shooting star every few seconds, a slow
comet now and then (only ever in empty sky), drifting dust, one satellite.

FORM: Brief-pinned (docs/REDESIGN_BRIEF.md: scroll-driven camera journey
through one universe); concept-seed not run because the brief pins the
direction. Signature interaction: selecting an app world flies the camera to
it and opens its panel; Esc/back flies home.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Phasing

1 Foundation (grey-box journey) → 2 Opening slice (user sign-off) → 3 Work
system → 4 Nebula/About/Contact → 5 Post-processing & polish → 6 Mobile,
a11y, performance → 7 QA, finish review, DESIGN.md, deploy.

## Unresolved

Dedicated contact address; legal pages restyle into the new system (Phase 7).
