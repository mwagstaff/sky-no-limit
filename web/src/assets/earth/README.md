# Earth textures

Equirectangular maps (longitude −180° at the left edge, north up) baked into
the globe by `src/scene/env/earth.js`. All are NASA imagery, public domain; the
footer credits NASA Earth Observatory as NASA asks.

| File | Source | Processing |
| --- | --- | --- |
| `earth-day-3072.webp` (high tier), `earth-day-2048.webp` | Blue Marble: Next Generation, July 2004, with topography and bathymetry, 5400×2700 (`world.topo.bathy.200407.3x5400x2700.jpg`) from [NASA Earth Observatory](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/) | Lanczos resize to 3072×1536 / 2048×1024; `cwebp -q 80`/`-q 82` |
| `earth-clouds-2048.webp` | NASA SVS 3615, "Equirectangular Projected Earth for LARGEST": `flat_earth03.jpg` (with clouds) and `earth_noClouds.0330.jpg` (without), both 2048×1024, from [svs.gsfc.nasa.gov/3615](https://svs.gsfc.nasa.gov/3615/) | Cloud opacity solved from the pair, `(with − without) / (1.03 − without)` in grey, levels 12–85%, faded out above ~58°N and below ~45°S where the renders' polar haze isn't cloud; `cwebp -q 80` |
| `earth-lights-2048.webp` | Black Marble 2016 colour map, 0.1° (`BlackMarble_2016_01deg.jpg`, 3600×1800) from NASA Earth Observatory image record 144898 | Lanczos resize to 2048×1024; lights kept where warm light beats the bluish night land, `(r − 0.82 b − 0.035) × 2.2`; `cwebp -q 80` |

The original Blue Marble cloud layer (`cloud_combined_*`) is no longer online
since NASA moved Earth Observatory's image records, hence the derived mask.
