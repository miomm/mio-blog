export async function onRequestGet({ env, request }) {
    const url = new URL(request.url);
    let limit = Number(url.searchParams.get("limit") || "50");
    if (!Number.isFinite(limit) || limit <= 0 || limit > 1000) limit = 50;
  
    const stmt = env.DB.prepare(`
      SELECT id, title, started_at, ended_at, duration_sec, distance_m, created_at, bbox_json
      FROM tracks
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const { results } = await stmt.bind(limit).all();
    const rows = (results || []).map(r => ({
      ...r,
      bbox: r.bbox_json ? JSON.parse(r.bbox_json) : null
    }));
    return new Response(JSON.stringify({ tracks: rows }), {
      headers: { "content-type": "application/json" }
    });
  }
  