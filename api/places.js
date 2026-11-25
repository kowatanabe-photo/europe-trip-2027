// Vercel serverless function: the shared list of places someone added themselves (via the AI chat), so the
// other two see them as candidates after a reload. Only the candidates are shared — which places each person
// picks for the plan stays on their own device.
// Storage: Upstash Redis (Vercel → Storage → Upstash for Redis), read over its REST API. The URL/token come from
// the environment variables that integration adds; nothing secret is in the page.
// It also keeps the "行きたい" votes: who wants to go where, so the three can see each other's opinions.
// Reading is open (place names and first names only); adding, removing or voting needs the same passcode as the chat (CHAT_PASSCODE).

const ALLOWED_ORIGINS = ["https://kowatanabe-photo.github.io"];
const REGIONS = ["パリ", "モン・サン・ミッシェル", "ヴェネツィア", "ローマ"];
const KEY = "europe2027:places";
const VOTE_KEY = "europe2027:votes"; // field "<region>|<place>\u0001<name>" = "1" (one field per vote, so votes never overwrite each other)
const MAX_VOTES = 3000;
const MAX_PLACES = 300;
// The integration names its variables after the chosen prefix (KV_REST_API_URL, UPSTASH_REDIS_REST_URL, or <PREFIX>_…),
// so take whichever REST URL / write token pair is present.
function findRedisEnv() {
  const env = process.env;
  for (const [u, t] of [["KV_REST_API_URL", "KV_REST_API_TOKEN"], ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]])
    if (env[u] && env[t]) return [env[u], env[t]];
  for (const k of Object.keys(env)) {
    const m = /^(.*)_(REST_API_URL|REDIS_REST_URL)$/.exec(k);
    if (!m) continue;
    const t = env[`${m[1]}_${m[2].replace("URL", "TOKEN")}`];
    if (env[k] && t && /^https:\/\//.test(env[k])) return [env[k], t];
  }
  return [null, null];
}
const [REDIS_URL, REDIS_TOKEN] = findRedisEnv();

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

const hits = new Map(); // best-effort rate limit per IP for writes
function limited(ip) {
  const now = Date.now(),
    recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const num = (v, lo, hi, d) => (Number.isFinite(+v) && v !== null && v !== "" ? Math.min(hi, Math.max(lo, +v)) : d);
function cleanOH(oh) {
  if (!Array.isArray(oh) || oh.length !== 7) return null;
  const ok = oh.every((v) => v === 0 || (Array.isArray(v) && v.length === 2 && v.every((n) => Number.isFinite(n) && n >= 0 && n <= 48)));
  return ok ? oh : null;
}
function cleanPlace(p) {
  if (!p || typeof p !== "object") return null;
  const r = REGIONS.includes(p.r) ? p.r : null,
    n = str(p.n, 100);
  if (!r || !n) return null;
  const lat = num(p.lat, -90, 90, null),
    lon = num(p.lon, -180, 180, null);
  return {
    r,
    n,
    h: num(p.h, 0.25, 12, 1),
    p: Math.round(num(p.p, 0, 200000, 0)),
    lat: lat != null && lon != null ? lat : null,
    lon: lat != null && lon != null ? lon : null,
    kind: str(p.kind, 20),
    note: str(p.note, 200),
    oh: cleanOH(p.oh),
    at: Date.now(),
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: "not_configured" });

  try {
    if (req.method === "GET") {
      const flat = (await redis(["HGETALL", KEY])) || [];
      const places = [];
      for (let i = 1; i < flat.length; i += 2) {
        try {
          const p = cleanPlace(JSON.parse(flat[i]));
          if (p) places.push({ ...p, at: JSON.parse(flat[i]).at || 0 });
        } catch {}
      }
      places.sort((a, b) => a.at - b.at);
      const vf = (await redis(["HKEYS", VOTE_KEY])) || [];
      const votes = {};
      for (const f of vf) {
        const i = f.lastIndexOf("\u0001");
        if (i < 1) continue;
        (votes[f.slice(0, i)] ||= []).push(f.slice(i + 1));
      }
      return res.json({ places, votes });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "GET or POST only" });

    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    if (!process.env.CHAT_PASSCODE || body.passcode !== process.env.CHAT_PASSCODE)
      return res.status(401).json({ error: "合言葉が違います" });
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
    if (limited(ip)) return res.status(429).json({ error: "少し時間をおいてから試してください" });

    if (body.op === "add") {
      const p = cleanPlace(body.place);
      if (!p) return res.status(400).json({ error: "場所のデータが正しくありません" });
      const field = `${p.r}|${p.n}`;
      const exists = await redis(["HEXISTS", KEY, field]);
      if (!exists && (await redis(["HLEN", KEY])) >= MAX_PLACES)
        return res.status(409).json({ error: "共有の候補がいっぱいです" });
      await redis(["HSET", KEY, field, JSON.stringify(p)]);
      return res.json({ ok: true });
    }
    if (body.op === "remove") {
      const r = REGIONS.includes(body.r) ? body.r : null,
        n = str(body.n, 100);
      if (!r || !n) return res.status(400).json({ error: "場所の指定が正しくありません" });
      await redis(["HDEL", KEY, `${r}|${n}`]);
      return res.json({ ok: true });
    }
    if (body.op === "vote") {
      const r = REGIONS.includes(body.r) ? body.r : null,
        n = str(body.n, 100),
        name = str(body.name, 20).replace(/\u0001/g, "");
      if (!r || !n || !name) return res.status(400).json({ error: "投票の指定が正しくありません" });
      const field = `${r}|${n}\u0001${name}`;
      if (body.on) {
        if ((await redis(["HLEN", VOTE_KEY])) >= MAX_VOTES) return res.status(409).json({ error: "投票がいっぱいです" });
        await redis(["HSET", VOTE_KEY, field, "1"]);
      } else await redis(["HDEL", VOTE_KEY, field]);
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: "op は add・remove・vote のどれか" });
  } catch {
    return res.status(502).json({ error: "共有の保存場所に接続できませんでした" });
  }
}
