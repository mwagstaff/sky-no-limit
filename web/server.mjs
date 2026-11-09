import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const port = process.env.PORT || 3030;

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html not found — run "npm run build" first.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');

// /healthcheck is the path the deploy tooling and Caddy expect; keep /healthz as an alias.
app.get(['/healthcheck', '/healthz'], (req, res) => res.json({ status: 'ok' }));

// App Store-referenced legal pages — keep the canonical and .html variants fresh.
const sendLegalPage = (fileName) => (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(dist, fileName), { cacheControl: false });
};

app.get(['/privacy_policy', '/privacy_policy.html'], sendLegalPage('privacy_policy.html'));
app.get(['/terms_of_use', '/terms_of_use.html'], sendLegalPage('terms_of_use.html'));

// Legacy routes from the old Firebase-hosted Ionic app.
const redirects = {
  '/home': '/',
  '/portfolio': '/#work',
  '/about': '/#about',
  '/about-us': '/#about',
  '/about_us': '/#about',
  '/contact': '/#contact',
};
for (const [from, to] of Object.entries(redirects)) {
  app.get(from, (req, res) => res.redirect(301, to));
}

const caseSlugs = new Set(['traintrack-uk', 'tubetrack-uk', 'bikespot-london', 'top-scores', 'kidsplorers', 'bromley-bins']);
// apps that have since been renamed
const renamedSlugs = { 'my-boris-bikes': 'bikespot-london' };
app.get('/portfolio/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const current = renamedSlugs[slug] ?? slug;
  res.redirect(301, caseSlugs.has(current) ? `/#${current}` : '/#work');
});

app.use(
  express.static(dist, {
    maxAge: '1h',
    setHeaders(res, filePath) {
      // Vite emits content-hashed bundles, chunks and imported images under /assets
      // (name-<hash>.js|css|webp); cache those and fonts hard. Hand-placed files in
      // public/assets keep the 1h default.
      if (/\/assets\/[^/]+-[\w-]{8}\.(js|css|webp)$|\.woff2$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

app.use((req, res) => res.status(404).sendFile(path.join(dist, 'index.html')));

app.listen(port, () => console.log(`sky-no-limit-web listening on :${port}`));
