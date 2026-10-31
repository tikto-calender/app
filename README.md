# TikTo Frontend

Static frontend built with Vite and vanilla JavaScript. The production artifact is `dist/`, suitable for a private S3 bucket served through CloudFront.

## Local development

Run the backend on port `3000`, then:

```bash
npm install
npm run dev
```

Vite serves the UI at `http://localhost:5173` and proxies `/api/*` to `http://localhost:3000`.

## Production build

```bash
npm run build
```

Upload the generated `dist/` directory to S3. With one CloudFront distribution, route the default behavior to S3 and `/api/*` to the backend origin. Leave `VITE_API_ORIGIN` empty so requests remain same-origin.

Do not place secrets or AWS credentials in any `VITE_*` variable; those values are embedded in browser assets.
