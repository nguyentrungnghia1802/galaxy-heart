# Petal Heart 3D

An interactive cinematic 3D heart formed by thousands of organic flower petals with accelerating heartbeat, explosion physics, glowing central gem interaction, and 3D love text reveal.

## Development

```bash
# Install dependencies
npm install

# Run local dev server
npm run dev

# Run automated tests
npm test

# Build production bundle locally
npm run build

# Preview local production build
npm run preview
```

## GitHub Pages Deployment

The application is configured for automated static hosting on GitHub Pages:

- **Live URL**: [https://nguyentrungnghia1802.github.io/galaxy-heart/](https://nguyentrungnghia1802.github.io/galaxy-heart/)
- **Workflow**: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
- **Automatic Deployment**: Runs on every push to the `main` branch.
- **Manual Trigger**: Go to **Actions** → **Deploy to GitHub Pages** → click **Run workflow** (`workflow_dispatch`).
- **Build Gate**: Pipeline runs `npm test` and `npm run build` before uploading and deploying.
- **Required Repository Setting**: Ensure GitHub Pages source is set to **GitHub Actions** under **Settings** > **Pages** > **Build and deployment**.

## Music Reveal configuration

The final gem interaction now leads into a configurable music/caption sequence. Supply the future track, segment, volume and caption times in `src/config/musicReveal.js`. Currently no music or caption content is shipped. See [Music Reveal architecture and configuration](petal-heart-web-docs/15-music-reveal.md).
