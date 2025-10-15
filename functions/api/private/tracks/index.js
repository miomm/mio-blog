// /api/private/tracks

// 一覧（GET）
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".trycloudflare.com");
  if (!isLocal) {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return new Response("Unauthorized", { status: 401 });
  }

  // お好みのフィールドに合わせて SELECT を調整してください
  const rows = await env.DB.prepare(`
    SELECT id, title, created_at, is_public,
           audio_url, audio_bytes, audio_mime
    FROM tracks
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  return new Response(JSON.stringify({ items: rows.results || [] }), {
    headers: { "content-type": "application/json" }
  });
}

// 作成（POST）: 既存クライアントの仕様に合わせて body を保存
export async function onRequestPost({ env, request }) {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".trycloudflare.com");
  if (!isLocal) {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return new Response("Unauthorized", { status: 401 });
  }

  let data = {};
  try { data = await request.json(); } catch {
    return new Response("invalid json", { status: 400 });
  }
  // 必須：id, geom_json（クライアント側生成）等。足りない場合は適宜調整。
  const id   = data.id || crypto.randomUUID();
  const geom = JSON.stringify(data.geom || data.geom_json || null);
  const title = data.title || null;
  const started = data.started_at || null;
  const ended   = data.ended_at   || null;
  const duration = data.duration_sec || null;
  const dist     = data.distance_m   || null;
  const bbox     = JSON.stringify(data.bbox || data.bbox_json || null);

  await env.DB.prepare(`
    INSERT INTO tracks
      (id, title, started_at, ended_at, duration_sec, distance_m, geom_json, bbox_json, created_at, is_public)
    VALUES
      (?,  ?,     ?,          ?,        ?,            ?,          ?,         ?,         datetime('now'), 0)
  `).bind(id, title, started, ended, duration, dist, geom, bbox).run();

  return new Response(JSON.stringify({ id }), {
    headers: { "content-type": "application/json" }
  });
}


// // 一覧：管理者用（認証必須）
// export async function onRequestGet({ env, request }) {
//   const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
//   if (!jwt) return new Response("Unauthorized", { status: 401 });

//   const url = new URL(request.url);
//   const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") || "50", 10)));

//   const stmt = await env.DB.prepare(`
//     SELECT id, title, started_at, ended_at, duration_sec, distance_m, is_public, bbox_json, created_at
//     FROM tracks
//     ORDER BY created_at DESC
//     LIMIT ?
//   `).bind(limit).all();

//   const tracks = (stmt.results || []).map(r => ({
//     id: r.id,
//     title: r.title,
//     started_at: r.started_at,
//     ended_at: r.ended_at,
//     duration_sec: r.duration_sec,
//     distance_m: r.distance_m,
//     is_public: r.is_public,
//     created_at: r.created_at,
//     bbox: safeParse(r.bbox_json)
//   }));

//   return new Response(JSON.stringify({ tracks }), {
//     headers: { "content-type": "application/json", "cache-control": "no-store" }
//   });
// }

// // 既存：保存。未認証は401。既定で is_public=0（非公開）
// export async function onRequestPost({ env, request }) {
//   const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
//   if (!jwt) return new Response("Unauthorized", { status: 401 });

//   let body;
//   try { body = await request.json(); }
//   catch { return new Response(JSON.stringify({ error: "invalid JSON" }), {
//     status: 400, headers: { "content-type": "application/json" }
//   }); }

//   const geom = body?.geom;
//   const coords = geom?.geometry?.coordinates;
//   if (!Array.isArray(coords) || coords.length === 0) {
//     return new Response(JSON.stringify({ error: "invalid geometry" }), {
//       status: 400, headers: { "content-type": "application/json" }
//     });
//   }

//   const id           = crypto.randomUUID();
//   const title        = ""; // ← タイトルは使わない
//   const started_at   = String(body.started_at || "");
//   const ended_at     = String(body.ended_at   || "");
//   const duration_sec = Number.isFinite(+body.duration_sec) ? Math.max(0, Math.round(+body.duration_sec)) : 0;
//   const distance_m   = Number.isFinite(+body.distance_m)   ? +body.distance_m : 0;
//   const bbox         = bboxFromCoords(coords);

//   await env.DB.prepare(`
//     INSERT INTO tracks
//       (id, title, started_at, ended_at, duration_sec, distance_m, geom_json, bbox_json, is_public, created_at)
//     VALUES
//       (?,  ?,     ?,          ?,        ?,            ?,          ?,         ?,         0,         datetime('now'))
//   `).bind(
//     id, title, started_at, ended_at, duration_sec, distance_m,
//     JSON.stringify(geom), JSON.stringify(bbox)
//   ).run();

//   return new Response(JSON.stringify({ ok: true, id }), {
//     headers: { "content-type": "application/json" }
//   });
// }

// function bboxFromCoords(coords) {
//   let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
//   for (const [lng, lat] of coords) {
//     if (lng < minLng) minLng = lng;
//     if (lat < minLat) minLat = lat;
//     if (lng > maxLng) maxLng = lng;
//     if (lat > maxLat) maxLat = lat;
//   }
//   return [minLng, minLat, maxLng, maxLat];
// }
// function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
