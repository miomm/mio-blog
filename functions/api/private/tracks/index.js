function bboxFromCoords(coords) {
    // coords: [[lng,lat,t], ...]
    let minLng=Infinity,minLat=Infinity,maxLng=-Infinity,maxLat=-Infinity;
    for (const c of coords) {
      const [lng, lat] = c;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    return [minLng, minLat, maxLng, maxLat];
  }
  
  export async function onRequestPost({ env, request }) {
    try {
      const body = await request.json();
      // 必須チェック（最低限）
      if (!body?.geom?.geometry?.coordinates?.length) {
        return new Response(JSON.stringify({ error: "invalid geometry" }), { status: 400 });
      }
  
      const id = crypto.randomUUID();
      const title = (body.title || "Untitled").slice(0, 200);
      const started_at = String(body.started_at || "");
      const ended_at   = String(body.ended_at   || "");
      const duration_sec = Number(body.duration_sec || 0);
      const distance_m   = Number(body.distance_m || 0);
  
      const coords = body.geom.geometry.coordinates;
      const bbox = bboxFromCoords(coords);
  
      const insert = env.DB.prepare(`
        INSERT INTO tracks
        (id, title, started_at, ended_at, duration_sec, distance_m, geom_json, bbox_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, title, started_at, ended_at, duration_sec, distance_m,
        JSON.stringify(body.geom),
        JSON.stringify(bbox)
      );
      await insert.run();
  
      return new Response(JSON.stringify({ ok: true, id }), {
        headers: { "content-type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message || "bad request" }), { status: 400 });
    }
  }
  