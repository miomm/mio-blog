// GET /api/private/tracks/usage
export async function onRequestGet({ env, request }) {
  // 認証：ローカル/trycloudflare だけバイパス。本番は必ず認証。
  const url = new URL(request.url);
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.endsWith(".trycloudflare.com");
  if (!isLocal) {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return new Response("Unauthorized", { status: 401 });
  }

  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS cnt, COALESCE(SUM(audio_bytes),0) AS used
    FROM tracks
  `).first();

  const QUOTA_BYTES = Number(env.QUOTA_BYTES || 8 * 1024 * 1024 * 1024);
  const used = Number(row?.used || 0);
  const cnt  = Number(row?.cnt  || 0);

  return new Response(JSON.stringify({
    count: cnt,
    used_bytes: used,
    quota_bytes: QUOTA_BYTES,
    remaining_bytes: Math.max(0, QUOTA_BYTES - used)
  }), { headers: { "content-type": "application/json" } });
}


// // GET /api/private/tracks/usage
// export async function onRequestGet({ env, request }) {
//   const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
//   if (!jwt) return new Response("Unauthorized", { status: 401 });

//   const row = await env.DB.prepare(`
//     SELECT COUNT(*) AS cnt, COALESCE(SUM(audio_bytes),0) AS used
//     FROM tracks
//   `).first();

//   const QUOTA_BYTES = Number(env.QUOTA_BYTES || 8 * 1024 * 1024 * 1024);
//   const used = Number(row?.used || 0);
//   const cnt = Number(row?.cnt || 0);

//   return new Response(JSON.stringify({
//     count: cnt,
//     used_bytes: used,
//     quota_bytes: QUOTA_BYTES,
//     remaining_bytes: Math.max(0, QUOTA_BYTES - used)
//   }), { headers: { "content-type": "application/json" } });
// }
