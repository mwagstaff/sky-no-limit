# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Prospective clients — founders, product owners and teams — looking for an
experienced partner to design and build a mobile app or web platform. They
arrive with a decision to make and judge the studio's credibility and taste
within seconds, then either enquire or leave.

## Product Purpose

skynolimit.dev is the website of Sky No Limit, an independent UK mobile and
web product studio. It exists to make visitors believe the studio is
technically excellent, creatively ambitious and easy to trust, and to turn
that belief into a project enquiry. Success is a visitor who understands what
the studio does, has seen the real shipped work, and starts a conversation.

## Positioning

The portfolio is the studio's own products: five apps live on the App Store
and one web app (Kidsplorers) that Sky No Limit designed, engineered and
still operates end to end,
including the servers and APIs behind them. "We fly what we build." A studio
that only shows client showpieces cannot truthfully make that claim.

## Operating Context

- Visitors reach the site directly, from App Store listings, and from shared
  links (including legacy Ionic-era URLs such as `/portfolio/top-scores`).
- The enquiry is an email (`mailto:`) — there is no form, booking tool or CRM.
- The App Store listings link to `/privacy_policy` and `/terms_of_use`; those
  pages are read by app users, not prospective clients.

## Capabilities and Constraints

- Static Vite build in `web/`, served by `web/server.mjs` (Express, port 3030)
  on the `sky` server via server-tooling; `/healthcheck` and `/healthz`.
- `/privacy_policy` and `/terms_of_use` must keep working at those exact
  paths. Legacy routes 301-redirect to homepage anchors (`#work`,
  `#traintrack-uk`, `#top-scores`, `#bikespot-london`, `#bromley-bins`,
  `#about`, `#contact`) — those anchors must keep existing. Renamed apps keep
  their old anchors as aliases (`#my-boris-bikes` lands on Bikespot London).
- No analytics, advertising or tracking cookies; the cookie notice says so.
- Self-hosted fonts and assets; no third-party requests at runtime.
- Contact address is currently mike.wagstaff@gmail.com (a dedicated studio
  address may replace it later — undecided).

## Brand Commitments

- Name: Sky No Limit. Tagline: "Digital products built to go further."
- Voice: concise, specific, professional, calm confidence. No buzzwords, no
  invented metrics, no playful filler (the old "princess powered" /
  "dino-soar" copy is retired).
- Space is the metaphor for ambition and the studio's world.
- `docs/REDESIGN_BRIEF.md` (Nov 2026) is binding for the website's visual
  direction, including its colour palette and the "universe is the website"
  concept. Mood references supplied with it are mood only; nothing from them
  ships.
- Logo and mark: `web/public/assets/sky-no-limit-logo.svg`,
  `web/public/assets/sky-no-limit-mark.svg`, `favicon.svg`.

## Evidence on Hand

- Five App Store apps, each with real copy, platforms and store links in
  `web/index.html`: TrainTrack UK, TubeTrack UK and Bikespot London (formerly
  My Boris Bikes) (iPhone, iPad, Apple Watch), Top Scores (iPhone, iPad),
  Bromley Bins (iPhone). One web app: Kidsplorers (kidsplorers.com), ideas for
  family days out, UK-focused, starting with London.
- Screenshots: `web/public/assets/portfolio/<slug>/`. TrainTrack, TubeTrack and
  Bikespot use their November 2026 App Store screenshots (WebP); Kidsplorers'
  are captures of the live site at phone size.
- Absent and never to be fabricated: client logos, testimonials, download or
  user counts, ratings, revenue, team size, awards.

## Product Principles

1. Prove with shipped work, not claims.
2. One studio, the whole journey: strategy, design, engineering, operations.
3. The enquiry is always one obvious step away.
4. Ambition in the experience, restraint in the words.

## Accessibility & Inclusion

WCAG-conscious contrast; full keyboard access; screen-reader-complete
semantic content independent of any WebGL scene; `prefers-reduced-motion`
honoured; the site must work fully without WebGL.
