// functions/api/private/tracks/index.js

function bboxFromCoords(coords) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

// 任意：ブラウザ直叩きで動作確認用
export async function onRequestGet() {
  return new Response(
    JSON.stringify({ ok: true, note: "Use POST /api/private/tracks to create." }),
    { headers: { "content-type": "application/json" } }
  );
}

export async function onRequestPost({ env, request }) {
  // ← これが1つだけ。未認証は401で弾く（保険）
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return new Response("Unauthorized", { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const geom = body?.geom;
  const coords = geom?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) {
    return new Response(JSON.stringify({ error: "invalid geometry" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const id           = crypto.randomUUID();
  const title        = String(body.title || "Untitled").slice(0, 200);
  const started_at   = String(body.started_at || "");
  const ended_at     = String(body.ended_at   || "");
  const duration_sec = Number.isFinite(+body.duration_sec) ? Math.max(0, Math.round(+body.duration_sec)) : 0;
  const distance_m   = Number.isFinite(+body.distance_m)   ? +body.distance_m : 0;
  const bbox         = bboxFromCoords(coords);

  await env.DB.prepare(`
    INSERT INTO tracks
      (id, title, started_at, ended_at, duration_sec, distance_m, geom_json, bbox_json, created_at)
    VALUES
      (?,  ?,     ?,          ?,        ?,            ?,          ?,         ?,         datetime('now'))
  `).bind(
    id, title, started_at, ended_at, duration_sec, distance_m,
    JSON.stringify(geom), JSON.stringify(bbox)
  ).run();

  return new Response(JSON.stringify({ ok: true, id }), {
    headers: { "content-type": "application/json" }
  });
}
