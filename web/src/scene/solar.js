// Where the real sun is overhead right now, and roughly where the visitor is,
// so the opening shows their part of the world in its true daylight or dark.
// The region comes from the browser's time zone: no location permission, no
// network. ?time=<ISO date> sets the clock, for previewing other hours.

const DEG = Math.PI / 180;

/** The moment the opening depicts: now, or ?time= when given and valid. */
export function sceneDate() {
  const forced = new URLSearchParams(window.location.search).get('time');
  const date = forced ? new Date(forced) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/**
 * The subsolar point (latitude, longitude in degrees) at `date`: low-precision
 * solar coordinates, good to a fraction of a degree, which is far finer than
 * a terminator can show.
 */
export function subsolarPoint(date) {
  const days = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 864e5;
  const meanAnomaly = (357.529 + 0.98560028 * days) * DEG;
  const meanLongitude = 280.459 + 0.98564736 * days;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG;
  const obliquity = (23.439 - 0.00000036 * days) * DEG;

  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const siderealDegrees = (18.697374558 + 24.06570982441908 * days) * 15;

  const longitude = ((((rightAscension / DEG - siderealDegrees) % 360) + 540) % 360) - 180;
  return { lat: declination / DEG, lon: longitude };
}

// rough latitudes for time-zone regions; good enough to pick a face of the globe
const REGION_LATITUDE = {
  Europe: 50,
  America: 38,
  Asia: 30,
  Africa: 5,
  Australia: -30,
  Pacific: -15,
  Atlantic: 35,
  Indian: -10,
  Antarctica: -75,
};
const SOUTH_AMERICA = /America\/(Argentina|Sao_Paulo|Santiago|Lima|Bogota|Montevideo|Asuncion|La_Paz|Caracas|Guayaquil|Bahia|Fortaleza|Recife|Manaus|Belem)/;

/** Roughly where the visitor is (degrees), from their time zone. */
export function visitorRegion(date) {
  let zone = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    // no Intl time zone: fall back on the offset alone
  }
  const lat = SOUTH_AMERICA.test(zone) ? -18 : (REGION_LATITUDE[zone.split('/')[0]] ?? 25);
  const lon = Math.max(-180, Math.min(180, -date.getTimezoneOffset() / 4));
  return { lat, lon };
}
