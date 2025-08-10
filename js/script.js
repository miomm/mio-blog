// js/script.js
document.addEventListener('DOMContentLoaded', () => {
    const contentEl = document.getElementById('ajax-content');
    const container = document.querySelector('.container');
  
    // 3カラム目の要素を用意（なければ生成）
    let thirdCol = document.getElementById('third-column');
    if (!thirdCol) {
      thirdCol = document.createElement('aside');
      thirdCol.className = 'panel third';
      thirdCol.id = 'third-column';
      thirdCol.innerHTML = '<div id="third-content"></div>';
      container.appendChild(thirdCol);
    }
    const thirdContent = thirdCol.querySelector('#third-content');
  
    // 開閉用の関数
    function openThird() {
        // 本文＋ヒントUIをまとめて挿入
            thirdContent.innerHTML = `
            <p class="third-text">
                このサイトのタイトルとして表示している "yes, I'm dreaming." には意味、由来があります。それは一体なんでしょう？
            </p>

            <div class="hints">
                <button type="button" class="hint-toggle" data-target="hint1" aria-expanded="false">hint01</button>
                <div id="hint1" class="hint-body" hidden>私のことを深く知っている必要はない</div>

                <button type="button" class="hint-toggle" data-target="hint2" aria-expanded="false">hint02</button>
                <div id="hint2" class="hint-body" hidden>インターネットが関係している</div>

                <button type="button" class="hint-toggle" data-target="hint3" aria-expanded="false">hint03</button>
                <div id="hint3" class="hint-body" hidden>このサイトの中を探す必要はない</div>

                <button type="button" class="hint-toggle" data-target="hint4" aria-expanded="false">hint04</button>
                <div id="hint4" class="hint-body" hidden>対になっている</div>

                <button type="button" class="hint-toggle" data-target="hint5" aria-expanded="false">hint05</button>
                <div id="hint5" class="hint-body" hidden>何かに対する応答である</div>

                <button type="button" class="hint-toggle" data-target="hint6" aria-expanded="false">hint06</button>
                <div id="hint6" class="hint-body" hidden>ドメインが関係している</div>

                <button type="button" class="hint-toggle" data-target="hint7" aria-expanded="false">hint07</button>
                <div id="hint7" class="hint-body" hidden>私の名前はmioである</div>

                <button type="button" class="hint-toggle" data-target="hint8" aria-expanded="false">hint08</button>
                <div id="hint8" class="hint-body" hidden>本当はmi.orgというドメインにしたかった</div>

                <button type="button" class="hint-toggle" data-target="hint9" aria-expanded="false">hint09</button>
                <div id="hint9" class="hint-body" hidden>2文字では短すぎた</div>

                <button type="button" class="hint-toggle" data-target="hint10" aria-expanded="false">hint10</button>
                <div id="hint10" class="hint-body" hidden>miomi.orgは...</div>

            </div>`;

// クリックで対象のヒント本文をトグル
thirdContent.querySelectorAll('.hint-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.target;
    const body = thirdContent.querySelector('#' + id);
    const willOpen = body.hasAttribute('hidden');
    body.toggleAttribute('hidden');             // 表示/非表示
    btn.setAttribute('aria-expanded', String(willOpen));
  });
});

        
        thirdCol.classList.add('active');
      container.classList.add('three-columns');
    }
    function closeThird() {
      thirdCol.classList.remove('active');
      container.classList.remove('three-columns');
      thirdContent.textContent = '';
    }
  
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
      const leftLinks = document.querySelectorAll('.panel.left a');
      leftLinks.forEach((srcA) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = srcA.getAttribute('href');
        a.textContent = srcA.textContent.replace('↗', '').trim();
        srcA.classList.forEach(c => a.classList.add(c));
        if (srcA.target) a.target = srcA.target;
        if (srcA.rel) a.rel = srcA.rel;
  
        li.appendChild(a);
        bottomNavRoot.appendChild(li);
      });
    }
  
    // 指定ルートを描画
    function render(hash) {
      // 毎回 third panel を初期状態に戻す
      closeThird();
  
      const tplId = routes[hash] || 'tpl-home';
      const tpl = document.getElementById(tplId);
      if (tpl && 'content' in tpl) {
        contentEl.innerHTML = '';
        contentEl.appendChild(tpl.content.cloneNode(true));
  
        // why? リンクのイベント（home のときだけ存在）
        const whyLink = document.getElementById('why-link');
        if (whyLink) {
          whyLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (thirdCol.classList.contains('active')) {
              closeThird(); // 開いていれば閉じる
            } else {
              openThird();  // 閉じていれば開く
            }
          });
        }
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
  