// 認証済みかどうかをUI用に返す（公開エンドポイント）
export async function onRequestGet({ request }) {
    const cookie = request.headers.get("cookie") || "";
    // Cloudflare Access のセッションCookieがあるかだけを見る（UIの出し分け用）
    const authenticated =
      /CF_Authorization=/.test(cookie) || /CF_Authorization=/.test(cookie);
  
    return new Response(JSON.stringify({ authenticated }), {
      headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
  }
  