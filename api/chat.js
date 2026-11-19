// Vercel serverless function: turns a request typed in the planner ("ルーヴル美術館を4時間にしたい")
// into a list of edits the page applies itself. The Anthropic API key and the shared passcode live
// only in Vercel's environment variables (ANTHROPIC_API_KEY, CHAT_PASSCODE), never in the page.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const ALLOWED_ORIGINS = ["https://kowatanabe-photo.github.io"];
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const nullable = (t) => ({ anyOf: [{ type: t }, { type: "null" }] });
const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "actions"],
  properties: {
    reply: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["op", "place", "region", "date", "hours", "option"],
        properties: {
          op: {
            type: "string",
            enum: ["set_stay", "add_place", "remove_place", "move_place", "set_hotel", "set_travel", "set_day_hours"],
          },
          place: nullable("string"),
          region: nullable("string"),
          date: nullable("string"),
          hours: nullable("number"),
          option: nullable("string"),
        },
      },
    },
  },
};

const SYSTEM = `あなたは、3人で行くヨーロッパ旅行（2027年3月11日〜23日：パリ → モン・サン・ミッシェル → パリ → ヴェネツィア → ローマ）の旅程アプリに組み込まれたアシスタントです。
ユーザーの依頼を読み、アプリが実行する「変更の一覧」と、短い返事を返してください。

毎回、ユーザーの依頼の前に「現在の計画（JSON）」が渡されます。中身：
- phase: "plan"（計画中）か "trip"（コース確定後）
- days: 日ごとの都市、観光の時間帯(window)、回る場所(stops: name, arrive, hours)、ホテルに戻る時刻(home)、移動の時間帯の選択肢(travel.options)と選択中(travel.selected)
- hotels: 都市ごとの候補(options)と選択中(selected)
- catalog: 都市ごとの、まだ選ばれていない場所（tag が "日帰り" のものはローマからの日帰りで、丸1日かかる）
- settings: 1日の行動開始と、ホテルに戻る目安の時刻

使える変更（op）と、使う項目：
- set_stay: 場所の滞在時間を変える。place（日程にある名前）、hours（時間。例 4、1.5）
- add_place: 場所を追加する。region（パリ / モン・サン・ミッシェル / ヴェネツィア / ローマ）、place。catalog にある場所はその名前をそのまま使う。catalog にない場所も名前を書けば、アプリが位置や料金を調べて追加する
- remove_place: 場所を外す。place
- move_place: 場所を別の日に移す。place、date（YYYY-MM-DD。その都市に滞在している日だけ）
- set_hotel: ホテルを変える。region、option（hotels の options にある名前）
- set_travel: 移動日の時間帯を変える。date、option（travel.options にある文字列をそのまま）
- set_day_hours: 毎日の行動時間を変える。option（"08:00-20:00" の形）
使わない項目は null にする。

ルール：
- 名前は、計画や catalog にある表記をそのまま使う（日本語）。
- add_place で追加した場所の日付はアプリが自動で決めるので、返事で日付を断定しない。日にちの希望がある依頼では、add_place のあとに同じ場所の move_place も返す。
- 依頼があいまいなときは、旅程として自然な案を1〜3件にしぼって提案し、実行する。「ローマ周辺の観光地を追加して」のような依頼では、ローマの丸1日空いている日の数を考えて catalog から選ぶ（日帰りは1日に1つまで）。
- phase が "trip" のときは、予約や確定した流れを崩さないよう、変更は最小限にする。
- 時間が足りなくなりそうな変更は実行してよいが、その旨を返事で伝える。
- 旅程の変更ではない質問（例：おすすめの食べ物）には、actions を空にして返事だけ書く。
- 実行できない依頼は、actions を空にして理由を短く書く。
- reply は日本語で、ていねいだが短く（1〜3文）。何を変えたかと、気をつける点を書く。`;

const hits = new Map(); // best-effort rate limit per IP (resets when the function instance restarts)
function limited(ip) {
  const now = Date.now(),
    recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

function cleanHistory(history) {
  const out = [];
  for (const m of Array.isArray(history) ? history.slice(-6) : []) {
    if (!m || typeof m.content !== "string" || !m.content.trim()) continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    if (!out.length && role !== "user") continue;
    if (out.length && out[out.length - 1].role === role) continue; // keep turns alternating
    out.push({ role, content: m.content.slice(0, 1500) });
  }
  if (out.length && out[out.length - 1].role === "user") out.pop(); // the new message is the user turn
  return out;
}

const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : null);
function cleanAction(a) {
  return {
    op: str(a.op, 20),
    place: str(a.place, 120),
    region: str(a.region, 20),
    date: str(a.date, 10),
    hours: typeof a.hours === "number" && Number.isFinite(a.hours) ? a.hours : null,
    option: str(a.option, 120),
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

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

  const message = String(body.message || "").trim().slice(0, 500);
  if (!message) return res.status(400).json({ error: "依頼の文章が空です" });
  const context = JSON.stringify(body.context || {}).slice(0, 40_000);

  const params = {
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    cache_control: { type: "ephemeral" },
    output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
    messages: [
      ...cleanHistory(body.history),
      { role: "user", content: `現在の計画（JSON）:\n${context}\n\n依頼: ${message}` },
    ],
  };

  try {
    // Opus/Sonnet/Fable: if a safety classifier declines, the API retries on Anthropic's recommended fallback model.
    // Haiku has no server-side fallback, so it uses the plain endpoint.
    const response = /^claude-(opus|sonnet|fable)/.test(MODEL)
      ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await client.messages.create(params);

    if (response.stop_reason === "refusal")
      return res.json({ reply: "ごめんなさい、その依頼には対応できませんでした。言い方を変えて試してください。", actions: [] });
    if (response.stop_reason === "max_tokens")
      return res.status(502).json({ error: "AIの返事が長くなりすぎました。依頼を短くして試してください" });

    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    let out;
    try {
      out = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "AIの返事を読み取れませんでした" });
    }
    const actions = (Array.isArray(out.actions) ? out.actions : []).slice(0, 12).map(cleanAction).filter((a) => a.op);
    return res.json({ reply: String(out.reply || "").slice(0, 1000), actions, model: response.model });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError)
      return res.status(500).json({ error: "APIキーの設定を確認してください（Vercel の ANTHROPIC_API_KEY）" });
    if (error instanceof Anthropic.RateLimitError)
      return res.status(429).json({ error: "AIが混み合っています。少し待ってから試してください" });
    if (error instanceof Anthropic.APIError)
      return res.status(502).json({ error: `AIの呼び出しでエラーが起きました（${error.status ?? "通信"}）` });
    return res.status(500).json({ error: "予期しないエラーが起きました" });
  }
}
