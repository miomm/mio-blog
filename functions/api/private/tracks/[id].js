// 公開/非公開の切替（PATCH）
export async function onRequestPatch({ env, request, params }) {
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return new Response("Unauthorized", { status: 401 });
  
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
    const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) return new Response("Unauthorized", { status: 401 });
  
    const id = params.id;
    const res = await env.DB.prepare("DELETE FROM tracks WHERE id = ?").bind(id).run();
  
    return new Response(JSON.stringify({ ok: true, deleted: res.meta?.changes ?? 0 }), {
      headers: { "content-type": "application/json" }
    });
  }
  // GET /api/private/tracks/:id  （認証必須：自分用の再生/ズームに使う）
    export async function onRequestGet({ env, request, params }) {
        const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
        if (!jwt) return new Response("Unauthorized", { status: 401 });
    
        const id = params.id;
        const row = await env.DB.prepare(`SELECT geom_json FROM tracks WHERE id = ? LIMIT 1`)
        .bind(id).first();
    
        if (!row) return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { "content-type": "application/json" }
        });
    
        return new Response(JSON.stringify({ geom: JSON.parse(row.geom_json) }), {
        headers: { "content-type": "application/json", "cache-control": "no-store" }
        });
    }
  
  