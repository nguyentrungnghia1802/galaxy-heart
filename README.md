# Petal Heart 3D

An interactive cinematic 3D heart formed by thousands of organic flower petals with accelerating heartbeat, explosion physics, a floating gem, and music with captions revealed word by word.

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

Clicking the gem plays `public/assets/audio/heart.mp3` after its activation. Edit each word's `time`, `text`, `line` and optional `hold` in **`src/config/musicCaptions.js`**; all timestamps follow `audio.currentTime`. The initial alignment is approximate. Open `?captionDebug=1` to see the music clock, current word and line while tuning. See [Music Reveal configuration and QA](petal-heart-web-docs/15-music-reveal.md).
