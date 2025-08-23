// 認証画面→成功後に元ページへ戻すための入口（このパス自体は /api/private/* で保護）
export async function onRequestGet({ request }) {
    try {
      const url = new URL(request.url);
      const ret = url.searchParams.get("return") || "/";
      const safe = ret.startsWith("/") ? ret : "/";           // 内部パスのみ許可
      const dest = new URL(safe, url.origin).toString();      // ← 絶対URLに変換
      return Response.redirect(dest, 302);
    } catch (e) {
      // 何かあっても 400 で返す（1101 を避ける）
      return new Response("Bad request", { status: 400 });
    }
  }
  