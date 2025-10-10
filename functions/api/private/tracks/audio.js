// functions/api/private/tracks/audio.js
export async function onRequestPost({ env, request }) {
  // 認可（他の private API と揃える）
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return new Response("Unauthorized", { status: 401 });

  // multipart/form-data の取得
  let form;
  try {
    form = await request.formData();
  } catch {
    return new Response("invalid form data", { status: 400 });
  }

  // ← FormData からトラックIDを受け取る（URLは /tracks/audio 固定）
  const id = String(form.get("track_id") || "");
  if (!id) return new Response("id required", { status: 400 });

  const file = form.get("audio");
  const startedAt = String(form.get("started_at") || "");
  if (!file || typeof file === "string") {
    return new Response("audio is required", { status: 400 });
  }

  // ---- クォータ事前チェック（合計 + 今回サイズ が上限超なら403）
  const mime  = file.type || "";
  const bytes = file.size || 0;
  const QUOTA_BYTES = Number(env.QUOTA_BYTES || 8 * 1024 * 1024 * 1024); // 既定8GB
  const usedRow = await env.DB.prepare(
    "SELECT COALESCE(SUM(audio_bytes),0) AS used FROM tracks"
  ).first();
  const used = Number(usedRow?.used || 0);
  if (used + bytes > QUOTA_BYTES) {
    return new Response(JSON.stringify({
      ok: false,
      error: "quota_exceeded",
      remaining_bytes: Math.max(0, QUOTA_BYTES - used)
    }), { status: 403, headers: { "content-type": "application/json" } });
  }

  // R2 バケット（Bindings: TRACKS_AUDIO）
  const bucket = env.TRACKS_AUDIO;
  if (!bucket || !bucket.put) {
    return new Response("R2 bucket binding TRACKS_AUDIO is not configured", { status: 500 });
  }

  // 保存キー: {id}/{ISO}-ファイル名
  const now = new Date();
  const key = `${id}/${now.toISOString().replace(/[:.]/g, "-")}-${sanitizeFilename(file.name || guessName(file.type))}`;

  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: mime || "application/octet-stream" }
  });

  // D1 更新（Bindings: DB）
  const res = await env.DB.prepare(`
    UPDATE tracks
       SET audio_url         = ?,
           audio_started_at  = ?,
           audio_mime        = ?,
           audio_bytes       = ?,
           audio_uploaded_at = datetime('now')
     WHERE id = ?
  `).bind(key, startedAt, mime, bytes, id).run();

  if ((res.meta?.changes ?? 0) === 0) {
    return new Response("track not found", { status: 404 });
  }

  return new Response(JSON.stringify({ ok: true, key, bytes, mime }), {
    headers: { "content-type": "application/json" }
  });
}

function sanitizeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
function guessName(mime) {
  if (!mime) return "audio.bin";
  if (mime.includes("webm")) return "audio.webm";
  if (mime.includes("ogg"))  return "audio.ogg";
  if (mime.includes("mp4"))  return "audio.m4a";
  if (mime.includes("wav"))  return "audio.wav";
  if (mime.includes("mpeg")) return "audio.mp3";
  return "audio.bin";
}