// 同一路径で GET(再生) / POST(アップロード) を扱う

// GET /api/private/tracks/audio?id=<track_id>
// 優先: D1.audio_url -> R2取得。無ければ R2を <id>/ で探索し最新を返す。
// 見つかったキーは D1 にバックフィル（次回以降の404回避）。
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

  const id = url.searchParams.get("id") || url.searchParams.get("track_id");
  if (!id) {
    return new Response(JSON.stringify({ error: "id required" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  const row = await env.DB.prepare(`
    SELECT audio_url, audio_mime, audio_bytes
    FROM tracks WHERE id = ? LIMIT 1
  `).bind(id).first();

  let key  = row?.audio_url || null;
  let mime = row?.audio_mime || "";
  let body = null;

  // 1) D1キーでR2取得
  if (key) {
    const obj = await env.TRACKS_AUDIO.get(key);
    if (obj?.body) {
      body = obj.body;
      mime = obj.httpMetadata?.contentType || mime || "application/octet-stream";
    } else {
      console.warn("R2 object missing:", key, "id:", id);
      key = null;
    }
  }

  // 2) なければ <id>/ で探索 → 最新っぽいもの
  if (!body) {
    const list = await env.TRACKS_AUDIO.list({ prefix: `${id}/` });
    if (list?.objects?.length) {
      let candidate = list.objects[0];
      if (candidate?.uploaded) {
        candidate = list.objects.slice().sort((a,b)=>
          new Date(b.uploaded) - new Date(a.uploaded)
        )[0];
      } else {
        candidate = list.objects[list.objects.length - 1];
      }
      key = candidate.key;
      const obj = await env.TRACKS_AUDIO.get(key);
      if (obj?.body) {
        body = obj.body;
        mime = obj.httpMetadata?.contentType || mime || "application/octet-stream";
        // バックフィル
        try {
          await env.DB.prepare(`
            UPDATE tracks
               SET audio_url = COALESCE(audio_url, ?),
                   audio_mime = COALESCE(audio_mime, ?),
                   audio_bytes = COALESCE(audio_bytes, ?),
                   audio_uploaded_at = COALESCE(audio_uploaded_at, datetime('now'))
             WHERE id = ?
          `).bind(key, mime, candidate.size || null, id).run();
        } catch (e) { console.warn("backfill failed:", e); }
      }
    }
  }

  if (!body) {
    return new Response(JSON.stringify({ error: "audio not found" }), {
      status: 404, headers: { "content-type": "application/json" }
    });
  }

  return new Response(body, {
    headers: { "content-type": mime || "application/octet-stream" }
  });
}

// POST /api/private/tracks/audio
// FormData: audio, started_at, track_id
export async function onRequestPost({ env, request }) {
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

  let form;
  try { form = await request.formData(); }
  catch { return new Response("invalid form data", { status: 400 }); }

  const id = String(form.get("track_id") || "");
  if (!id) return new Response("id required", { status: 400 });

  const file = form.get("audio");
  const startedAt = String(form.get("started_at") || "");
  if (!file || typeof file === "string") {
    return new Response("audio is required", { status: 400 });
  }

  // クォータ検査
  const mime  = file.type || "";
  const bytes = file.size || 0;
  const QUOTA_BYTES = Number(env.QUOTA_BYTES || 8 * 1024 * 1024 * 1024);
  const usedRow = await env.DB.prepare(
    "SELECT COALESCE(SUM(audio_bytes),0) AS used FROM tracks"
  ).first();
  const used = Number(usedRow?.used || 0);
  if (used + bytes > QUOTA_BYTES) {
    return new Response(JSON.stringify({
      ok: false, error: "quota_exceeded",
      remaining_bytes: Math.max(0, QUOTA_BYTES - used)
    }), { status: 403, headers: { "content-type": "application/json" } });
  }

  // R2へ保存
  const bucket = env.TRACKS_AUDIO;
  if (!bucket || !bucket.put) {
    return new Response("R2 bucket binding TRACKS_AUDIO is not configured", { status: 500 });
  }
  const now = new Date();
  const key = `${id}/${now.toISOString().replace(/[:.]/g, "-")}-${sanitizeFilename(file.name || guessName(file.type))}`;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: mime || "application/octet-stream" }
  });

  // D1更新
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


// // functions/api/private/tracks/audio.js
// // 同一路径で GET(再生) / POST(アップロード) をハンドルします。

// // 再生: GET /api/private/tracks/audio?id=<track_id>
// // 優先: D1.audio_url -> R2取得。無ければ R2を <id>/ で探索し最新を返す。
// // 見つかったキーは D1 にバックフィルして次回以降の404を回避。
// export async function onRequestGet({ env, request }) {
//   const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
//   if (!jwt) return new Response("Unauthorized", { status: 401 });

//   const url = new URL(request.url);
//   const id = url.searchParams.get("id") || url.searchParams.get("track_id");
//   if (!id) {
//     return new Response(JSON.stringify({ error: "id required" }), {
//       status: 400, headers: { "content-type": "application/json" }
//     });
//   }

//   // D1メタ
//   const row = await env.DB.prepare(`
//     SELECT audio_url, audio_mime, audio_bytes
//     FROM tracks WHERE id = ? LIMIT 1
//   `).bind(id).first();

//   let key = row?.audio_url || null;
//   let mime = row?.audio_mime || "";
//   let body = null;

//   // 1) D1のキーでR2取得
//   if (key) {
//     const obj = await env.TRACKS_AUDIO.get(key);
//     if (obj?.body) {
//       body = obj.body;
//       mime = obj.httpMetadata?.contentType || mime || "application/octet-stream";
//     } else {
//       console.warn("R2 object missing for key:", key, "id:", id);
//       key = null;
//     }
//   }

//   // 2) キーが無い/壊れている → R2を <id>/ で探索
//   if (!body) {
//     const list = await env.TRACKS_AUDIO.list({ prefix: `${id}/` });
//     if (list?.objects?.length) {
//       let candidate = list.objects[0];
//       if (candidate?.uploaded) {
//         candidate = list.objects.slice().sort((a,b) =>
//           new Date(b.uploaded) - new Date(a.uploaded)
//         )[0];
//       } else {
//         candidate = list.objects[list.objects.length - 1];
//       }
//       key = candidate.key;

//       const obj = await env.TRACKS_AUDIO.get(key);
//       if (obj?.body) {
//         body = obj.body;
//         mime = obj.httpMetadata?.contentType || mime || "application/octet-stream";
//         // D1にバックフィル
//         try {
//           await env.DB.prepare(`
//             UPDATE tracks
//                SET audio_url = COALESCE(audio_url, ?),
//                    audio_mime = COALESCE(audio_mime, ?),
//                    audio_bytes = COALESCE(audio_bytes, ?),
//                    audio_uploaded_at = COALESCE(audio_uploaded_at, datetime('now'))
//              WHERE id = ?
//           `).bind(key, mime, candidate.size || null, id).run();
//         } catch (e) { console.warn("backfill failed:", e); }
//       }
//     }
//   }

//   if (!body) {
//     return new Response(JSON.stringify({ error: "audio not found" }), {
//       status: 404, headers: { "content-type": "application/json" }
//     });
//   }

//   return new Response(body, {
//     headers: { "content-type": mime || "application/octet-stream" }
//   });
// }

// // アップロード: POST /api/private/tracks/audio
// // FormData: audio, started_at, track_id
// export async function onRequestPost({ env, request }) {
//   const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
//   if (!jwt) return new Response("Unauthorized", { status: 401 });

//   let form;
//   try { form = await request.formData(); }
//   catch { return new Response("invalid form data", { status: 400 }); }

//   const id = String(form.get("track_id") || "");
//   if (!id) return new Response("id required", { status: 400 });

//   const file = form.get("audio");
//   const startedAt = String(form.get("started_at") || "");
//   if (!file || typeof file === "string") {
//     return new Response("audio is required", { status: 400 });
//   }

//   // クォータチェック（8GB 既定、環境変数 QUOTA_BYTES で変更可）
//   const mime  = file.type || "";
//   const bytes = file.size || 0;
//   const QUOTA_BYTES = Number(env.QUOTA_BYTES || 8 * 1024 * 1024 * 1024);
//   const usedRow = await env.DB.prepare(
//     "SELECT COALESCE(SUM(audio_bytes),0) AS used FROM tracks"
//   ).first();
//   const used = Number(usedRow?.used || 0);
//   if (used + bytes > QUOTA_BYTES) {
//     return new Response(JSON.stringify({
//       ok: false, error: "quota_exceeded",
//       remaining_bytes: Math.max(0, QUOTA_BYTES - used)
//     }), { status: 403, headers: { "content-type": "application/json" } });
//   }

//   // R2へ保存
//   const bucket = env.TRACKS_AUDIO;
//   if (!bucket || !bucket.put) {
//     return new Response("R2 bucket binding TRACKS_AUDIO is not configured", { status: 500 });
//   }
//   const now = new Date();
//   const key = `${id}/${now.toISOString().replace(/[:.]/g, "-")}-${sanitizeFilename(file.name || guessName(file.type))}`;
//   await bucket.put(key, file.stream(), {
//     httpMetadata: { contentType: mime || "application/octet-stream" }
//   });

//   // D1更新
//   const res = await env.DB.prepare(`
//     UPDATE tracks
//        SET audio_url         = ?,
//            audio_started_at  = ?,
//            audio_mime        = ?,
//            audio_bytes       = ?,
//            audio_uploaded_at = datetime('now')
//      WHERE id = ?
//   `).bind(key, startedAt, mime, bytes, id).run();

//   if ((res.meta?.changes ?? 0) === 0) {
//     return new Response("track not found", { status: 404 });
//   }

//   return new Response(JSON.stringify({ ok: true, key, bytes, mime }), {
//     headers: { "content-type": "application/json" }
//   });
// }

// function sanitizeFilename(name) {
//   return String(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
// }
// function guessName(mime) {
//   if (!mime) return "audio.bin";
//   if (mime.includes("webm")) return "audio.webm";
//   if (mime.includes("ogg"))  return "audio.ogg";
//   if (mime.includes("mp4"))  return "audio.m4a";
//   if (mime.includes("wav"))  return "audio.wav";
//   if (mime.includes("mpeg")) return "audio.mp3";
//   return "audio.bin";
// }
