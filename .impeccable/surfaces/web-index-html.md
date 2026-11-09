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
- Action: start a project (mailto). Secondary: explore the work.
- Proof: the five live App Store apps and the Kidsplorers web app, their
  screenshots and links.
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
system; every section is a place the camera travels to, and the studio's
shipped products are worlds you can fly to. It refuses the category default: a
starfield wallpaper behind a headline, then a grid of cards.

OWN-WORLD: Deep space #03040B and midnight #080D20 own the ground; light comes
only from bodies — the gold star #FBBF24, cyan atmospheres #38BDF8, cosmic
blue #2563EB; violet #8B5CF6 and magenta #D946EF live inside the nebula only.
Mona Sans: light, expanded display; normal-width body. Line language is the
orbit: 1px hairline rings and rules. Panels are midnight translucency with
restrained blur, only where text sits over the scene. No kickers, no section
numerals, no card grids.

STORY: Hang off a sunlit Earth and learn in one line what the studio does;
see the studio's real products orbiting the gold star; fly to each; cross the nebula of
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
edges anywhere). The Veil's far filaments glimmer faintly at the top edge. "Sky No Limit" in light
expanded type spans the upper-left third; the tagline and one plain line
beneath; primary "Start a project" and secondary "Explore the work". The
app worlds glint as small named lights along one tilted orbit round the
star. A thin trajectory rail on the right edge, clear of the globe. On tall screens the
globe rises from the bottom edge and the star sits beside the actions. Quiet
life throughout: twinkling stars, a shooting star every few seconds, a slow
comet now and then (only ever in empty sky), drifting dust, one satellite.
Earth faces the visitor's region (from their time zone) in the real sun's
light for their clock, so evening visitors see their city lights; it turns
once an hour from there. It can be taken hold of and turned any way, trackball
style (a sideways swipe takes hold on touch): the whole universe turns with
it, a fling coasts to a stop, and the view eases back onto the journey's path
when the visitor scrolls on. Once turned, a quiet "Reset view" pill appears
bottom right and swings everything home.

ADDRESSES: the URL follows the journey (/#top-scores, /#capabilities; the
opening is the bare address) by replacing the history entry, so any station
can be shared or bookmarked; deep links and in-page links land exactly where
the camera rests at that station, not at the section's top edge.

WORLDS: (2026-11-08, at the user's request for more features "based off NASA
imagery") each app world is a real body from NASA's maps: TrainTrack UK is
Europa, bright ice crossed by long fractures like lines on a network map;
TubeTrack UK is Enceladus, its south lined with blue "tiger stripes"; Bikespot
London (formerly My Boris Bikes) is Mars (Viking), with a dusty limb and a blue
sunset edge; Top Scores is Jupiter (Cassini); Kidsplorers, the one web app, is
Io; Bromley Bins is the Moon (LRO colour, LOLA relief). Six worlds, journey
order alternating panel sides (added 2026-11-08).
Provenance in web/src/assets/space/README.md, credits in the footer.

NEBULA: (2026-11-08, replacing additive cloud puffs the user found "too bright
and overwhelming... a giant blur") Hubble's Veil Nebula, stars removed, as
three layers of light (a broad glow, the gas, its finest filaments) that line
up from the Capabilities station and part with parallax anywhere else; a slow
ripple keeps the gas drifting. It sweeps diagonally up through the free space
between the panel and the rail, and the rest of the frame stays dark.

GLASS: while the universe animates, panel frost is drawn by the renderer in the
same frame as the scene behind it (Chrome's live backdrop blur of a canvas
redrawn every frame flickered behind the Bromley Bins and Capabilities
panels); the CSS blur remains for reduced motion and no WebGL.

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
