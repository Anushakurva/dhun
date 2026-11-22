// Cloudflare Pages Function: GET /api/song?title=...&artist=...
// Finds an embeddable YouTube video for a song and, when possible, synced lyrics from LRCLIB.
// Add YT_API_KEY as a secret in Cloudflare (Pages project, Settings, Variables and Secrets).
const TOLERANCE = 15; // seconds the video length may differ from the lyrics length

const seconds = iso => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) || [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};

async function lyrics(title, artist) {
  const r = await fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`, { headers: { "User-Agent": "anu-app" } });
  if (!r.ok) return null;
  const list = await r.json();
  return list.find(x => x.syncedLyrics && !x.instrumental) || null;
}

async function videos(title, artist, key) {
  const q = encodeURIComponent(`${title} ${artist} official audio`);
  const s = await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=5&q=${q}&key=${key}`)).json();
  if (s.error) throw new Error(s.error.message);
  const ids = (s.items || []).map(i => i.id.videoId).join(",");
  if (!ids) return [];
  const v = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${ids}&key=${key}`)).json();
  return (v.items || []).filter(x => x.status.embeddable).map(x => ({ id: x.id, sec: seconds(x.contentDetails.duration) }));
}

const reply = (obj, status = 200, cacheSeconds = 0) => new Response(JSON.stringify(obj), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": cacheSeconds ? `public, max-age=${cacheSeconds}` : "no-store"
  }
});

export async function onRequestGet(context) {
  const { request, env } = context;
  const key = env.YT_API_KEY;
  const q = new URL(request.url).searchParams;
  const title = String(q.get("title") || "").trim().slice(0, 120);
  const artist = String(q.get("artist") || "").trim().slice(0, 120);
  if (!key) return reply({ error: "YT_API_KEY is not set" }, 501);
  if (!title) return reply({ error: "title is required" }, 400);

  // answers are kept in Cloudflare's cache, so each song costs YouTube quota only once
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (cache) {
    const hit = await cache.match(request);
    if (hit) return hit;
  }
  try {
    const [l, vids] = await Promise.all([lyrics(title, artist), videos(title, artist, key)]);
    let res;
    const match = l && vids.find(v => Math.abs(v.sec - l.duration) <= TOLERANCE);
    const pick = match || vids.find(v => v.sec >= 90 && v.sec <= 600);
    if (!pick) res = reply({ found: false }, 200, 86400);
    // lrc is only sent when the video length matches the lyrics, so the sync is right
    else res = reply({ found: true, yt: pick.id, lrc: match ? l.syncedLyrics : "" }, 200, 2592000);
    if (cache) context.waitUntil(cache.put(request, res.clone()));
    return res;
  } catch (e) {
    return reply({ error: "lookup failed: " + e.message }, 502);
  }
}
