export async function onRequestGet({ env, params }) {
    const { id } = params;
    const stmt = env.DB.prepare(`
      SELECT id, title, started_at, ended_at, duration_sec, distance_m, created_at, geom_json
      FROM tracks WHERE id = ?
    `);
    const row = await stmt.bind(id).first();
    if (!row) return new Response("Not Found", { status: 404 });
    const geom = JSON.parse(row.geom_json);
    delete row.geom_json;
    return new Response(JSON.stringify({ track: row, geom }), {
      headers: { "content-type": "application/json" }
    });
  }
  