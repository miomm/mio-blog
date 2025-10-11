// GET /api/private/tracks/audio?id=<track_id>
// R2に保存した音声をストリーミング返却（認証必須）
export async function onRequestGet({ env, request }) {
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || url.searchParams.get("track_id");
  if (!id) return new Response("id required", { status: 400 });

  // D1からR2キーとMIMEを取得
  const row = await env.DB.prepare(
    `SELECT audio_url, audio_mime FROM tracks WHERE id = ? LIMIT 1`
  ).bind(id).first();

  if (!row?.audio_url) return new Response("not found", { status: 404 });

  // R2から取得（TRACKS_AUDIO バインディング）
  const obj = await env.TRACKS_AUDIO.get(row.audio_url);
  if (!obj?.body) return new Response("not found", { status: 404 });

  return new Response(obj.body, {
    headers: { "content-type": row.audio_mime || "application/octet-stream" }
  });
}
