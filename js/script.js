// js/script.js
document.addEventListener('DOMContentLoaded', () => {
    const contentEl = document.getElementById('ajax-content');
  
    // ルーティング表（ハッシュ -> テンプレートID）
    const routes = {
      '': 'tpl-home',
      '#/': 'tpl-home',
      '#/about': 'tpl-about',
      '#/bookmark': 'tpl-bookmark',
      '#/memo': 'tpl-memo'
    };
  
    // ---------- ボトムナビを左メニューから自動生成 ----------
    const bottomNavRoot = document.querySelector('.bottom-nav ul');
    if (bottomNavRoot) {
      // 左メニューのリンクを取得（順番そのまま）
      const leftLinks = document.querySelectorAll('.panel.left a');
      leftLinks.forEach((srcA) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = srcA.getAttribute('href');
        a.textContent = srcA.textContent.replace('↗', '').trim(); // 疑似要素の矢印は消す
        // ajax-link / external 等のクラスはそのまま受け継ぐ
        srcA.classList.forEach(c => a.classList.add(c));
        // target / rel も引き継ぎ（外部リンク用）
        if (srcA.target) a.target = srcA.target;
        if (srcA.rel) a.rel = srcA.rel;
  
        li.appendChild(a);
        bottomNavRoot.appendChild(li);
      });
    }
  
    // 指定ルートを描画
    function render(hash) {
      const tplId = routes[hash] || 'tpl-home';
      const tpl = document.getElementById(tplId);
      if (tpl && 'content' in tpl) {
        contentEl.innerHTML = '';
        contentEl.appendChild(tpl.content.cloneNode(true));
      }
  
      // active 切替（サイド＆ボトムの両方を同期）
      const allNavLinks = document.querySelectorAll('.ajax-link');
      allNavLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === hash);
      });
    }
  
    // 初期表示
    render(location.hash);
  
    // ハッシュ変更時
    window.addEventListener('hashchange', () => render(location.hash));
  });
  