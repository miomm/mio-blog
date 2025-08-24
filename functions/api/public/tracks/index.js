export async function onRequestGet({ env, request }) {
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") || "50", 10)));
  
    const stmt = await env.DB.prepare(`
      SELECT id, title, started_at, ended_at, duration_sec, distance_m, bbox_json, created_at
      FROM tracks
      WHERE is_public = 1
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();
  
    const tracks = (stmt.results || []).map(r => ({
      id: r.id,
      title: r.title, // 使わなくても返しておく（互換）
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_sec: r.duration_sec,
      distance_m: r.distance_m,
      created_at: r.created_at,
      bbox_json: r.bbox_json,
      bbox: safeParse(r.bbox_json)
    }));
  
    return new Response(JSON.stringify({ tracks }), {
      headers: { "content-type": "application/json" }
    });
  }
  
  function safeParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }
  