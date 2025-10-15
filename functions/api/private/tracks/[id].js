// /api/private/tracks/:id

// 公開/非公開の切替（PATCH）
export async function onRequestPatch({ env, request, params }) {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".trycloudflare.com");
  if (!isLocal) {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return new Response("Unauthorized", { status: 401 });
  }

  const id = params.id;
  let body = {};
  try { body = await request.json(); } catch {}
  const isPublic = body.is_public === 1 ? 1 : 0;

  const res = await env.DB.prepare(
    "UPDATE tracks SET is_public = ? WHERE id = ?"
  ).bind(isPublic, id).run();

  return new Response(JSON.stringify({ ok: true, changed: res.meta?.changes ?? 0 }), {
    headers: { "content-type": "application/json" }
  });
}

// 削除（DELETE）
export async function onRequestDelete({ env, request, params }) {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".trycloudflare.com");
  if (!isLocal) {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return new Response("Unauthorized", { status: 401 });
  }

  const id = params.id;
  const res = await env.DB.prepare("DELETE FROM tracks WHERE id = ?").bind(id).run();

  return new Response(JSON.stringify({ ok: true, deleted: res.meta?.changes ?? 0 }), {
    headers: { "content-type": "application/json" }
  });
}

// 取得（GET）: geom と audio メタ情報を返す
export async function onRequestGet({ env, request, params }) {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".trycloudflare.com");
  if (!isLocal) {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return new Response("Unauthorized", { status: 401 });
  }

  const id = params.id;
  const row = await env.DB.prepare(`
    SELECT
      geom_json,
      audio_url, audio_started_at, audio_mime, audio_bytes, audio_uploaded_at
    FROM tracks WHERE id = ? LIMIT 1
  `).bind(id).first();

  if (!row) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404, headers: { "content-type": "application/json" }
    });
  }

  const geom = safeParse(row.geom_json);
  const audio = (row.audio_url || row.audio_mime || row.audio_bytes)
    ? {
        url: row.audio_url || null,
        mime: row.audio_mime || null,
        bytes: (typeof row.audio_bytes === "number" ? row.audio_bytes : (row.audio_bytes ?? null)),
        started_at: row.audio_started_at || null,
        uploaded_at: row.audio_uploaded_at || null
      }
    : null;

  return new Response(JSON.stringify({ geom, audio }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

function safeParse(s){ try { return JSON.parse(s); } catch { return null; } }


// // ~api/private/tracks/[id].js

// // 公開/非公開の切替（PATCH）
// export async function onRequestPatch({ env, request, params }) {
//   const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
//   if (!jwt) return new Response("Unauthorized", { status: 401 });

//   const id = params.id;
//   let body = {};
//   try { body = await request.json(); } catch {}
//   const isPublic = body.is_public === 1 ? 1 : 0;

//   const res = await env.DB.prepare(
//     "UPDATE tracks SET is_public = ? WHERE id = ?"
//   ).bind(isPublic, id).run();

//   return new Response(JSON.stringify({ ok: true, changed: res.meta?.changes ?? 0 }), {
//     headers: { "content-type": "application/json" }
//   });
// }

// // 削除（DELETE）
// export async function onRequestDelete({ env, request, params }) {
//   const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
//   if (!jwt) return new Response("Unauthorized", { status: 401 });

//   const id = params.id;
//   const res = await env.DB.prepare("DELETE FROM tracks WHERE id = ?").bind(id).run();

//   return new Response(JSON.stringify({ ok: true, deleted: res.meta?.changes ?? 0 }), {
//     headers: { "content-type": "application/json" }
//   });
// }

// // 取得（GET）: geom と audio メタ情報を返す
// export async function onRequestGet({ env, request, params }) {
//   const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
//   if (!jwt) return new Response("Unauthorized", { status: 401 });

//   const id = params.id;
//   const row = await env.DB.prepare(`
//     SELECT
//       geom_json,
//       audio_url,
//       audio_started_at,
//       audio_mime,
//       audio_bytes,
//       audio_uploaded_at
//     FROM tracks
//     WHERE id = ?
//     LIMIT 1
//   `).bind(id).first();

//   if (!row) {
//     return new Response(JSON.stringify({ error: "not found" }), {
//       status: 404,
//       headers: { "content-type": "application/json" }
//     });
//   }

//   const geom = safeParse(row.geom_json);
//   const audio = (row.audio_url || row.audio_mime || row.audio_bytes)
//     ? {
//         url: row.audio_url || null,          // R2のキー（公開URLではない想定）
//         mime: row.audio_mime || null,
//         bytes: typeof row.audio_bytes === "number" ? row.audio_bytes : (row.audio_bytes ?? null),
//         started_at: row.audio_started_at || null,
//         uploaded_at: row.audio_uploaded_at || null
//       }
//     : null;

//   return new Response(JSON.stringify({ geom, audio }), {
//     headers: {
//       "content-type": "application/json",
//       "cache-control": "no-store"
//     }
//   });
// }

// function safeParse(s) {
//   try { return JSON.parse(s); } catch { return null; }
// }
