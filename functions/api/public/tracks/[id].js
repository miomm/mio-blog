export async function onRequestGet({ env, params }) {
  const id = params.id;
  const row = await env.DB.prepare(`
    SELECT geom_json FROM tracks
    WHERE id = ? AND is_public = 1
    LIMIT 1
  `).bind(id).first();

  if (!row) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404, headers: { "content-type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ geom: JSON.parse(row.geom_json) }), {
    headers: { "content-type": "application/json" }
  });
}
