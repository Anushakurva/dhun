# anu

Mood songs in every Indian language, full songs with live lyrics, a fresh match game every time you open it, and chat with a stranger where you both listen to the same song.

Plain HTML, CSS and JavaScript plus one small serverless function. No build step.

## Put it online on Cloudflare Pages (free, address like dhun.pages.dev)

1. Upload this whole folder to a GitHub repo (keep `functions`, `netlify`, `api` and `tools`).
2. Cloudflare dashboard, **Workers & Pages**, **Create application**, **Pages**, **Connect to Git**. Pick the repo.
3. Project name: `dhun` (this becomes `dhun.pages.dev`). Framework preset: **None**. Build command: leave empty. Build output directory: `/`. Click **Save and Deploy**.
4. Project **Settings**, **Variables and Secrets** (may be called Environment variables): add `YT_API_KEY` as a secret, for Production. Then **Deployments**, **Retry deployment** (or push any small commit).
5. Test: `https://dhun.pages.dev/api/song?title=Tum%20Hi%20Ho&artist=Arijit%20Singh` should show `"found":true`.

## Or put it online on Netlify (free, short address like dhun.netlify.app)

1. Upload this whole folder to a GitHub repo (keep the `netlify`, `api` and `tools` folders).
2. On netlify.com sign in with GitHub, then **Add new site**, **Import an existing project**, pick the repo. Leave build command and publish directory empty, then **Deploy**.
3. **Site configuration**, **Change site name**: type `dhun` (or any free name). Your address becomes `dhun.netlify.app`.
4. **Site configuration**, **Environment variables**: add `YT_API_KEY` with your YouTube key. Then **Deploys**, **Trigger deploy**.
5. Test: `https://dhun.netlify.app/api/song?title=Tum%20Hi%20Ho&artist=Arijit%20Singh` should show `"found":true`.

Netlify's free plan allows commercial use. It has a monthly usage cap, and if you pass it the site pauses until next month (upgrade to continue).

## Or put it online on Vercel

1. Upload this whole folder to a GitHub repo (keep `api/` and `tools/` folders).
2. On vercel.com: **Add New, Project**, pick the repo, framework **Other**, **Deploy**.
3. Then do the two setups below and redeploy (Deployments, Redeploy).

## Setup A: full songs and synced lyrics (fixes the 30-second previews)

Without this, songs are 30-second previews and lyrics only show as plain text.

1. Google Cloud Console: new project, enable **YouTube Data API v3**, **Credentials, Create API key**.
2. Vercel: Project Settings, Environment Variables, add `YT_API_KEY` = your key.
3. That's it. When someone plays a song, `/api/song` finds a YouTube video and synced lyrics. Vercel caches each answer, so one song costs YouTube quota only once. The free quota (10,000 units a day) covers about 90 new songs a day. You can request more in Google Cloud later.

Optional: `tools/build-songs.mjs` pre-builds `songs.json` for a hand-picked list (see the top of that file).

## Setup B: stranger chat and listen together

1. supabase.com: create a free project.
2. SQL Editor: paste `supabase.sql` and run it (only creates the reports table).
3. Project Settings, API: copy the Project URL and the anon key into `config.js`.
4. Commit and redeploy.

How it works: everyone who taps "Find someone" joins one lobby channel. Two waiting people are paired, and they get a private room. Messages, the picked song, and play/pause are sent between the two browsers. Nothing is stored except reports.

Safety already in: 18+ checkbox, block (remembered on that device), report (saved to the `reports` table and disconnects), end chat. Before a big public launch also add: a terms and privacy page, a word filter, and check `reports` regularly.

Free Supabase limits: about 200 people connected at once.

## If something does not work

- **Songs are only 30 seconds:** open `https://YOUR-SITE.vercel.app/api/song?title=Tum%20Hi%20Ho&artist=Arijit%20Singh` in the browser.
  - `"found":true` means it works. Hard refresh the app.
  - `YT_API_KEY is not set` means add the key in Vercel, then Redeploy.
  - `API key not valid` or `quota` means fix the key or wait for the daily quota to reset.
  - `404` means the `api` folder was not uploaded to GitHub.
  - Opening `index.html` by double-clicking never gives full songs. Use the Vercel link or `vercel dev`.
- **"chat is taking a break":** the Supabase URL and key in `config.js` are empty or wrong. Fill them in and redeploy.

## Try it on your computer

    npm i -g vercel
    vercel dev

(`npx serve .` also works, but then `/api/song` does not exist, so you only get previews.)

## What it uses

- Songs, artwork, previews: iTunes Search API. Full songs: YouTube IFrame Player. Lyrics: LRCLIB.
- Saved data (nickname, favorites, points): the visitor's browser.

## Rules and limits

- YouTube requires the video to stay visible: big on the Now Playing screen, a small tile otherwise.
- If a song has no embeddable video, it plays the 30-second preview with plain lyrics.
- Browsers may block autoplay for the person who receives a "listen together" song until they tap once on the page.
