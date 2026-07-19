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

// App Store-referenced legal pages — these exact paths must keep working.
app.get('/privacy_policy', (req, res) => res.sendFile(path.join(dist, 'privacy_policy.html')));
app.get('/terms_of_use', (req, res) => res.sendFile(path.join(dist, 'terms_of_use.html')));

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

const caseSlugs = new Set(['traintrack-uk', 'top-scores', 'my-boris-bikes', 'bromley-bins']);
app.get('/portfolio/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  res.redirect(301, caseSlugs.has(slug) ? `/#${slug}` : '/#work');
});

app.use(
  express.static(dist, {
    maxAge: '1h',
    setHeaders(res, filePath) {
      // Vite emits content-hashed filenames under /assets — cache those hard.
      if (/\/assets\/index-|\.woff2$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

app.use((req, res) => res.status(404).sendFile(path.join(dist, 'index.html')));

app.listen(port, () => console.log(`sky-no-limit-web listening on :${port}`));
