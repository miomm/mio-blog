// ここにアクセスすると Access のログインに飛び、成功後はトップへ戻す
export async function onRequestGet({ request }) {
    const url = new URL(request.url);
    const ret = url.searchParams.get("return") || "/";
    const safe = ret.startsWith("/") ? ret : "/";
    return Response.redirect(safe, 302);
  }
  