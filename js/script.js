// js/script.js (hash-based router, no fetch needed)
// ページ読み込み完了後に実行
document.addEventListener('DOMContentLoaded', () => {
    const contentEl = document.getElementById('ajax-content');
    const navLinks = document.querySelectorAll('.ajax-link');
  
    // ルーティング表（ハッシュ -> テンプレートID）
    const routes = {
      '': 'tpl-home',
      '#/': 'tpl-home',
      '#/about': 'tpl-about',
      '#/bookmark': 'tpl-bookmark',
      '#/memo': 'tpl-memo'
    };
  
    // 指定ルートを描画
    function render(hash) {
      const tplId = routes[hash] || 'tpl-home';
      const tpl = document.getElementById(tplId);
      if (tpl && 'content' in tpl) {
        contentEl.innerHTML = '';
        contentEl.appendChild(tpl.content.cloneNode(true));
      }
  
      // active切り替え
      navLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === hash);
      });
    }
  
    // 初期表示
    render(location.hash);
  
    // ハッシュ変更時
    window.addEventListener('hashchange', () => render(location.hash));
  });
  