// js/script.js
document.addEventListener('DOMContentLoaded', () => {
  const contentEl = document.getElementById('ajax-content');
  const container = document.querySelector('.container');

  // ====== 作品データ ======
  const DEFAULT_FALLBACK_EXT = 'jpg';

  // slug は img/works/<slug>/ と content/works/<slug>.md の“<slug>”と完全一致
  const WORKS = [
    { slug: 'zanpa-echoingwaves-2025',                title: '残波 -Echoing waves' },
    { slug: 'zanpa-2024',                              title: '残波' },
    { slug: 'echochops-AppleVisionPro-inIAMAS-2025',  title: 'Echochops Performance in IAMAS' },
    { slug: 'ghosts-inLinz-2023',                      title: 'Ghosts' },
    { slug: 'waterwalk-AppleVisionPro-2025',           title: 'WaterWalk2024 -Apple Vision Pro' },
    { slug: 'sacrifice-container-mexico-2023',         title: 'Sacrifice container' },
    { slug: 'unreal-container-yokohama-2021',          title: 'unreal container' },
    { slug: 'SFC-ORF-Yokai-2022',                      title: '妖怪たちの声 -異形を知覚する-' },
  ];
  // ====== 作品データここまで ======

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

  // 開いた直後の外クリック誤閉じ抑制
  let suppressNextOutsideClose = false;

  // 画像パス（WebP優先）
  function imgPaths(slug, fallbackExt = DEFAULT_FALLBACK_EXT) {
    const base = `./img/works/${slug}`;
    return {
      thumbWebp: `${base}/thumb.webp`,
      thumb: `${base}/thumb.${fallbackExt}`,
      coverWebp: `${base}/cover.webp`,
      cover: `${base}/cover.${fallbackExt}`,
    };
  }

  // third panel 制御
  function setThird(html) {
    thirdContent.innerHTML = html;
    thirdCol.classList.add('active');
    container.classList.add('three-columns');
  }
  function closeThird() {
    thirdCol.classList.remove('active', 'works-detail');
    container.classList.remove('three-columns');
    thirdContent.textContent = '';
  }

  // why? ヒント
  function openWhyHints() {
    setThird(`
      <p class="third-text">
        https://miomi.org/
      </p>
    `);
  }

  // ルーティング
  const routes = {
    '': renderHome,
    '#/': renderHome,
    '#/about': () => renderTemplate('tpl-about'),
    '#/bookmark': () => renderTemplate('tpl-bookmark'),
    '#/memo': () => renderTemplate('tpl-memo'),
    '#/works': renderWorks,
  };

  // ボトムナビ生成
  const bottomNavRoot = document.querySelector('.bottom-nav ul');
  if (bottomNavRoot) {
    const leftLinks = document.querySelectorAll('.panel.left a');
    bottomNavRoot.innerHTML = '';
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

  // テンプレ描画
  function renderTemplate(tplId) {
    const tpl = document.getElementById(tplId);
    contentEl.innerHTML = '';
    if (tpl && 'content' in tpl) {
      contentEl.appendChild(tpl.content.cloneNode(true));
    }
  }

  // Home
  function renderHome() {
    renderTemplate('tpl-home');
    const whyLink = document.getElementById('why-link');
    if (whyLink) {
      whyLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (thirdCol.classList.contains('active')) {
          closeThird();
        } else {
          suppressNextOutsideClose = true;
          openWhyHints();
          setTimeout(() => { suppressNextOutsideClose = false; }, 0);
        }
      });
    }
  }

  // works 一覧（サムネはタイトル付きのまま）
  function renderWorks() {
    contentEl.innerHTML = `
      <main>
        <h2 class="section-title">works</h2>
        <div class="works-grid" id="works-grid" aria-live="polite"></div>
      </main>
    `;

    const grid = document.getElementById('works-grid');

    WORKS.forEach((item, index) => {
      const paths = imgPaths(item.slug, item.fallback);
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'works-card';
      a.setAttribute('data-id', String(index));
      a.innerHTML = `
        <div class="works-thumb">
          <picture>
            <source type="image/webp" srcset="${paths.thumbWebp}">
            <img src="${paths.thumb}" alt="${item.title}" loading="lazy" decoding="async">
          </picture>
        </div>
        <div class="works-caption">${item.title}</div>
      `;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openWorkDetail(item);
      });
      grid.appendChild(a);
    });
  }

  // 詳細を読み込んで表示（まず .md → なければ .html）
  async function openWorkDetail(item) {
    const paths = imgPaths(item.slug, item.fallback);
    thirdCol.classList.add('works-detail');
    suppressNextOutsideClose = true;

    // 先に土台だけ描画：※ タイトルは表示しない！
    setThird(`
      <div class="work-detail">
        <picture>
          <source type="image/webp" srcset="${paths.coverWebp}">
          <img src="${paths.cover}" alt="${item.title}" decoding="async">
        </picture>
        <div class="body markdown-body">読み込み中…</div>
      </div>
    `);
    setTimeout(() => { suppressNextOutsideClose = false; }, 0);

    const mdUrl = `./content/works/${item.slug}.md`;
    const htmlUrl = `./content/works/${item.slug}.html`;
    const bodyEl = thirdContent.querySelector('.body');

    try {
      // 1) Markdown を試す
      let res = await fetch(mdUrl, { cache: 'no-cache' });
      if (res.ok) {
        const md = await res.text();
        if (!window.marked) throw new Error('marked not loaded');
        const htmlFromMd = window.marked.parse(md);
        bodyEl.innerHTML = htmlFromMd;
        upgradeLinkCards(bodyEl); // URLカード化
      } else {
        // 2) なければ HTML を試す
        res = await fetch(htmlUrl, { cache: 'no-cache' });
        if (res.ok) {
          const html = await res.text();
          bodyEl.innerHTML = html;
          upgradeLinkCards(bodyEl); // URLカード化
        } else {
          // 3) どちらも無ければ空に
          bodyEl.textContent = '';
        }
      }

      // カード化されなかった通常リンクは新規タブで
      bodyEl.querySelectorAll('a[href^="http"]').forEach(a => {
        if (!a.classList.contains('link-card')) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
      });
    } catch (err) {
      console.info(`[works] detail not found or parser missing for "${item.slug}"`, err);
      bodyEl.textContent = '';
    }
  }

  // ルーター
  function render(hash) {
    closeThird(); // 画面切替ごとに third panel 初期化
    const fn = routes[hash] || renderHome;
    fn();

    // active 切替
    document.querySelectorAll('.ajax-link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === hash);
    });
  }

  // 初期表示＆ハッシュ監視
  render(location.hash);
  window.addEventListener('hashchange', () => render(location.hash));

  // 外クリック／Escで閉じる
  document.addEventListener('click', (e) => {
    if (!thirdCol.classList.contains('active')) return;
    if (suppressNextOutsideClose) return;
    if (thirdCol.contains(e.target)) return;
    closeThird();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && thirdCol.classList.contains('active')) {
      closeThird();
    }
  });

  // ===== URLカード化（画像なし） =====
  function upgradeLinkCards(scope) {
    // <p>内にリンクが1個だけ（裸URLやリンク1個の段落）をカード化
    const paras = scope.querySelectorAll('p');
    paras.forEach(p => {
      const a = p.querySelector('a[href^="http"]');
      if (!a) return;

      // 段落要素内の“唯一の子要素”が <a> のときだけ
      const onlyOneElement = p.children.length === 1 && p.children[0] === a;
      if (!onlyOneElement) return;

      const url = a.href;
      const title = (a.textContent || url).trim();
      const host = new URL(url).hostname.replace(/^www\./,'');
      const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${host}`;

      const card = document.createElement('a');
      card.href = url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'link-card noimg';
      card.innerHTML = `
        <div class="link-card__meta">
          <div class="link-card__host"><img src="${favicon}" alt="">${host}</div>
          <div class="link-card__title">${title}</div>
        </div>
      `;
      p.replaceWith(card);
    });
  }
});
