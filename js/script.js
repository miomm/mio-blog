// js/script.js

// ページ読み込み完了後に実行
document.addEventListener('DOMContentLoaded', () => {
  // 右コンテンツ表示先の要素を取得
  const contentEl = document.getElementById('ajax-content');
  // .ajax-link がついたすべてのリンクをキャッシュ
  const links = document.querySelectorAll('.ajax-link');

  /**
   * 指定 URL のコンテンツを読み込んで挿入し、
   * アドレスバーと active クラスを更新する共通関数
   * @param {string} url - 読み込む URL
   * @param {boolean} pushState - history.pushState を行うかどうか
   */
  async function loadContent(url, pushState = true) {
      try {
          // 非同期で HTML を取得
          const res = await fetch(url);
          if (!res.ok) throw new Error(res.statusText);
          const html = await res.text();

          // 一時要素に流し込んで必要箇所を抜き出し
          const tmp = document.createElement('div');
          tmp.innerHTML = html;
          const newContent = tmp.querySelector('main') || tmp.querySelector('#content');

          if (newContent) {
              // 既存コンテンツをクリアして挿入
              contentEl.innerHTML = '';
              contentEl.appendChild(newContent);

              // アドレスバーを書き換え
              if (pushState) {
                  history.pushState({ path: url }, '', url);
              }
          } else {
              contentEl.innerHTML = '<p>読み込めませんでした。</p>';
          }

          // ─── ここで active クラスの切り替え ───
          links.forEach(l => {
              // 現在読み込んだ URL とリンク href が一致すれば付与、それ以外は削除
              l.classList.toggle('active', l.href === url);
          });
      } catch (err) {
          console.error(err);
          contentEl.innerHTML = `<p>エラー：${err.message}</p>`;
      }
  }

  // 各リンクのクリック時に loadContent を呼び出し
  links.forEach(link => {
      link.addEventListener('click', e => {
          e.preventDefault();
          loadContent(link.href);
      });
  });

  // ブラウザの「戻る／進む」ボタン対応
  window.addEventListener('popstate', e => {
      if (e.state && e.state.path) {
          loadContent(e.state.path, false);
      }
  });
});
