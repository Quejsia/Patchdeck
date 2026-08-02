# Patchdeck

Paste a link or upload a local file, it plays. Auto-detects YouTube links
(plays audio-only via a hidden player) vs. any direct audio link (.mp3,
.wav, streams) vs. a file from your own device — all play through the
same native `<audio>` element where possible.

## Run locally

```bash
npm install
npm run dev
```

## How the detection works

`src/utils/linkDetector.js` checks the pasted URL against a YouTube pattern
(`youtube.com/watch`, `youtu.be/...`, `/shorts/`, `/embed/`). If it matches,
the track is loaded into a hidden YouTube IFrame player
(`src/components/YouTubeSource.jsx`). Otherwise it's treated as a direct
audio URL and handed to a plain `<audio>` element
(`src/components/AudioSource.jsx`). Both expose the same
play/pause/seek/volume interface so `App.jsx` can control either one
without caring which it is.

## Deploy on Vercel via GitHub

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Patchdeck"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new), import that repo.
3. Vercel auto-detects Vite — framework preset "Vite", build command
   `npm run build`, output directory `dist`. Just click **Deploy**.

## Notes

- YouTube playback depends on the video's owner allowing embedding — a
  small number of videos block it, in which case the deck skips to the
  next track.
- Direct audio links must be served with CORS/hotlinking allowed by their
  host, or the browser will block playback (same as any `<audio src>`).
