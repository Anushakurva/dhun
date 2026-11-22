// Builds songs.json: keeps only songs that have synced lyrics on LRCLIB
// AND an embeddable YouTube video whose length matches the lyrics.
//
// Run once:   YT_API_KEY=your_key node tools/build-songs.mjs
// (Node 18 or newer. Windows PowerShell:  $env:YT_API_KEY="your_key"; node tools/build-songs.mjs)
import fs from "node:fs";

const KEY = process.env.YT_API_KEY;
if (!KEY) { console.error("Set YT_API_KEY first (see README)."); process.exit(1); }

const seed = JSON.parse(fs.readFileSync(new URL("./seed.json", import.meta.url), "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => s.replace(/\(.*?\)|\[.*?\]/g, "").trim();
const TOLERANCE = 15; // seconds the video length may differ from the lyrics length

async function findLyrics(title, artist) {
  const u = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  const r = await fetch(u, { headers: { "User-Agent": "anu-app" } });
  if (!r.ok) return null;
  const list = await r.json();
  return list.find(x => x.syncedLyrics && !x.instrumental) || null;
}

const seconds = iso => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) || [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};

async function findVideo(title, artist, lyricsSeconds) {
  const q = encodeURIComponent(`${title} ${artist} official audio`);
  const s = await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=5&q=${q}&key=${KEY}`)).json();
  if (s.error) throw new Error(s.error.message);
  const ids = (s.items || []).map(i => i.id.videoId).join(",");
  if (!ids) return null;
  const v = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${ids}&key=${KEY}`)).json();
  const ok = (v.items || []).filter(x => x.status.embeddable && Math.abs(seconds(x.contentDetails.duration) - lyricsSeconds) <= TOLERANCE);
  return ok[0]?.id || null;
}

const out = [], skipped = [];
for (const s of seed) {
  try {
    const l = await findLyrics(clean(s.title), s.artist.split(/,|&/)[0].trim());
    if (!l) { skipped.push(`${s.title}: no synced lyrics on LRCLIB`); continue; }
    const yt = await findVideo(s.title, s.artist, l.duration);
    if (!yt) { skipped.push(`${s.title}: no embeddable YouTube video with a matching length`); continue; }
    out.push({ ...s, yt });
    console.log("ok     ", s.title);
  } catch (e) {
    skipped.push(`${s.title}: ${e.message}`);
  }
  await sleep(300);
}
fs.writeFileSync(new URL("../songs.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`\n${out.length} songs saved to songs.json`);
skipped.forEach(x => console.log("skipped -", x));
