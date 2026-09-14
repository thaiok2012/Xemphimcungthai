/* =========================================================
   CUNGTHÁI PHIM — app.js
   Nguồn dữ liệu: phimapi.com (KKPhim public API)
========================================================= */

const API_BASE = 'https://phimapi.com';
const IMG_BASE = 'https://phimimg.com/';
const app = document.getElementById('app');

const GENRES = [
  { name: 'Hành Động', slug: 'hanh-dong' }, { name: 'Miền Tây', slug: 'mien-tay' },
  { name: 'Trẻ Em', slug: 'tre-em' }, { name: 'Lịch Sử', slug: 'lich-su' },
  { name: 'Cổ Trang', slug: 'co-trang' }, { name: 'Chiến Tranh', slug: 'chien-tranh' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong' }, { name: 'Kinh Dị', slug: 'kinh-di' },
  { name: 'Tài Liệu', slug: 'tai-lieu' }, { name: 'Bí Ẩn', slug: 'bi-an' },
  { name: 'Phim 18+', slug: 'phim-18' }, { name: 'Tình Cảm', slug: 'tinh-cam' },
  { name: 'Tâm Lý', slug: 'tam-ly' }, { name: 'Thể Thao', slug: 'the-thao' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu' }, { name: 'Âm Nhạc', slug: 'am-nhac' },
  { name: 'Gia Đình', slug: 'gia-dinh' }, { name: 'Học Đường', slug: 'hoc-duong' },
  { name: 'Hài Hước', slug: 'hai-huoc' }, { name: 'Hình Sự', slug: 'hinh-su' },
  { name: 'Võ Thuật', slug: 'vo-thuat' }, { name: 'Khoa Học', slug: 'khoa-hoc' },
  { name: 'Thần Thoại', slug: 'than-thoai' }, { name: 'Chính Kịch', slug: 'chinh-kich' },
  { name: 'Kinh Điển', slug: 'kinh-dien' },
];
const COUNTRIES = [
  { name: 'Việt Nam', slug: 'viet-nam' }, { name: 'Trung Quốc', slug: 'trung-quoc' },
  { name: 'Thái Lan', slug: 'thai-lan' }, { name: 'Hồng Kông', slug: 'hong-kong' },
  { name: 'Pháp', slug: 'phap' }, { name: 'Đức', slug: 'duc' },
  { name: 'Hàn Quốc', slug: 'han-quoc' }, { name: 'Nhật Bản', slug: 'nhat-ban' },
  { name: 'Đài Loan', slug: 'dai-loan' }, { name: 'Ấn Độ', slug: 'an-do' },
  { name: 'Anh', slug: 'anh' }, { name: 'Âu Mỹ', slug: 'au-my' },
  { name: 'Canada', slug: 'canada' }, { name: 'Tây Ban Nha', slug: 'tay-ban-nha' },
  { name: 'Nga', slug: 'nga' }, { name: 'Úc', slug: 'uc' },
  { name: 'Philippines', slug: 'philippines' }, { name: 'Mexico', slug: 'mexico' },
  { name: 'Indonesia', slug: 'indonesia' }, { name: 'Malaysia', slug: 'malaysia' },
  { name: 'Brazil', slug: 'brazil' }, { name: 'Thổ Nhĩ Kỳ', slug: 'tho-nhi-ky' },
  { name: 'Ả Rập', slug: 'a-rap' }, { name: 'Châu Phi', slug: 'chau-phi' },
  { name: 'Quốc Gia Khác', slug: 'quoc-gia-khac' },
];

const LIST_LABELS = {
  'phim-bo': 'Phim Bộ', 'phim-le': 'Phim Lẻ', 'hoat-hinh': 'Hoạt Hình',
  'tv-shows': 'TV Shows', 'phim-chieu-rap': 'Phim Chiếu Rạp',
};

/* ---------------- helpers ---------------- */
function posterUrl(p){
  if(!p) return '';
  return p.startsWith('http') ? p : IMG_BASE + p;
}
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function showToast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 2200);
}
function timeoutPromise(ms, label){
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`Quá thời gian chờ: ${label}`)), ms));
}

async function fetchJson(url, timeoutMs = 8000){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const doFetch = (async () => {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if(!res.ok) throw new Error('Máy chủ trả về lỗi ' + res.status);
    return await res.json();
  })();
  try{
    return await Promise.race([doFetch, timeoutPromise(timeoutMs + 500, url)]);
  }catch(err){
    if(err.name === 'AbortError') throw new Error('Kết nối tới máy chủ phim quá lâu, vui lòng thử lại.');
    throw new Error('Không tải được dữ liệu (' + err.message + ')');
  }finally{
    clearTimeout(timer);
  }
}
function normalizeItems(json){
  if(Array.isArray(json?.items)) return json.items;
  if(Array.isArray(json?.data?.items)) return json.data.items;
  if(Array.isArray(json)) return json;
  return [];
}
function getPagination(json){
  return json?.pagination || json?.data?.params?.pagination || null;
}

/* ---------------- localStorage: favorites & history ---------------- */
const LS_FAV = 'ctp_favorites';
const LS_HISTORY = 'ctp_history';

function readLS(key){
  try{ return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch(e){ return []; }
}
function writeLS(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ /* quota / disabled */ }
}

function getFavorites(){ return readLS(LS_FAV); }
function isFavorite(slug){ return getFavorites().some(f => f.slug === slug); }
function toggleFavorite(movie){
  let favs = getFavorites();
  const idx = favs.findIndex(f => f.slug === movie.slug);
  if(idx >= 0){
    favs.splice(idx, 1);
    writeLS(LS_FAV, favs);
    showToast('Đã bỏ yêu thích');
    return false;
  } else {
    favs.unshift({
      slug: movie.slug, name: movie.name, origin_name: movie.origin_name,
      poster_url: movie.poster_url || movie.thumb_url, year: movie.year,
      quality: movie.quality, episode_current: movie.episode_current,
      addedAt: Date.now(),
    });
    writeLS(LS_FAV, favs.slice(0, 300));
    showToast('Đã thêm vào yêu thích');
    return true;
  }
}

function getHistory(){ return readLS(LS_HISTORY); }
function saveHistory(movie, ep, serverIndex, epIndex){
  let hist = getHistory();
  hist = hist.filter(h => h.slug !== movie.slug);
  const countryName = (movie.country && movie.country[0] && movie.country[0].name) || null;
  hist.unshift({
    slug: movie.slug, name: movie.name, origin_name: movie.origin_name,
    poster_url: movie.poster_url || movie.thumb_url, year: movie.year,
    quality: movie.quality, countryName,
    epName: ep.name, serverIndex, epIndex,
    watchedAt: Date.now(),
  });
  writeLS(LS_HISTORY, hist.slice(0, 100));
}
function getHistoryEntry(slug){
  return getHistory().find(h => h.slug === slug);
}
function removeHistoryEntry(slug){
  writeLS(LS_HISTORY, getHistory().filter(h => h.slug !== slug));
}
function clearHistory(){ writeLS(LS_HISTORY, []); }
function clearFavorites(){ writeLS(LS_FAV, []); }

/* Phân tích lịch sử xem để tìm quốc gia được xem nhiều nhất, dùng cho gợi ý cá nhân hóa */
function getTopWatchedCountry(){
  const hist = getHistory();
  if(hist.length < 2) return null; // cần ít nhất vài phim mới đủ tin cậy để gợi ý
  const counts = {};
  hist.forEach(h => {
    if(h.countryName){
      counts[h.countryName] = (counts[h.countryName]||0) + 1;
    }
  });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  return sorted.length ? sorted[0][0] : null;
}

/* ---------------- recent searches ---------------- */
const LS_RECENT_SEARCH = 'ctp_recent_search';
function getRecentSearches(){ return readLS(LS_RECENT_SEARCH); }
function addRecentSearch(term){
  if(!term.trim()) return;
  let list = getRecentSearches().filter(t => t.toLowerCase() !== term.toLowerCase());
  list.unshift(term);
  writeLS(LS_RECENT_SEARCH, list.slice(0, 8));
}
function removeRecentSearch(term){
  writeLS(LS_RECENT_SEARCH, getRecentSearches().filter(t => t !== term));
}

function highlightMatch(text, query){
  if(!query) return escapeHtml(text);
  const idx = (text || '').toLowerCase().indexOf(query.toLowerCase());
  if(idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>' + escapeHtml(text.slice(idx + query.length));
}

function movieCard(m, opts){
  opts = opts || {};
  const poster = posterUrl(m.poster_url || m.thumb_url);
  const badge = m.episode_current && /full|hoàn tất/i.test(m.episode_current)
    ? `<span class="card-badge">FULL</span>`
    : (m.episode_current ? `<span class="card-badge">${escapeHtml(m.episode_current)}</span>` : '');
  const quality = m.quality ? `<span class="card-badge gold">${escapeHtml(m.quality)}</span>` : '';
  const fav = isFavorite(m.slug);
  const histEntry = opts.showProgress ? getHistoryEntry(m.slug) : null;

  return `
  <div class="card" data-slug="${escapeHtml(m.slug)}" role="button" tabindex="0" aria-label="${escapeHtml(m.name)}">
    <div class="card-poster">
      <img src="${poster}" alt="${escapeHtml(m.name)}" loading="lazy" onerror="this.style.opacity=0">
      ${badge}${quality}
      <button class="card-fav-btn ${fav?'active':''}" data-fav-slug="${escapeHtml(m.slug)}" aria-label="Yêu thích" title="Yêu thích">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${fav?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
      <div class="card-play"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="rgba(193,39,45,0.9)"/><path d="M10 8.5l6 3.5-6 3.5v-7z" fill="#fff"/></svg></div>
    </div>
    <div class="card-name">${escapeHtml(m.name)}</div>
    <div class="card-origin">${escapeHtml(m.origin_name || '')}${m.year ? ' · ' + m.year : ''}</div>
    ${histEntry ? `<div class="card-watched-ep">Đã xem: ${escapeHtml(histEntry.epName || '')}</div>` : ''}
  </div>`;
}

function attachCardHandlers(root){
  root.querySelectorAll('.card').forEach(card => {
    const go = (e) => {
      if(e.target.closest('.card-fav-btn')) return;
      location.hash = '#/phim/' + card.dataset.slug;
    };
    card.addEventListener('click', go);
    card.addEventListener('keydown', e => { if(e.key === 'Enter') go(e); });
  });
  root.querySelectorAll('.card-fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.card');
      const movie = {
        slug: btn.dataset.favSlug,
        name: card.querySelector('.card-name')?.textContent || '',
        origin_name: '',
        poster_url: card.querySelector('img')?.src || '',
      };
      const nowFav = toggleFavorite(movie);
      btn.classList.toggle('active', nowFav);
      btn.querySelector('svg').setAttribute('fill', nowFav ? 'currentColor' : 'none');
    });
  });
}

function rowSection(title, items, moreHash){
  if(!items.length) return '';
  return `
  <section class="section">
    <div class="section-head">
      <h2 class="section-title">${title}</h2>
      ${moreHash ? `<a class="section-more" href="${moreHash}">Xem tất cả →</a>` : ''}
    </div>
    <div class="row-scroll">${items.map(m=>movieCard(m)).join('')}</div>
  </section>`;
}

/* ---------------- nav dropdowns ---------------- */
function buildNavPanels(){
  document.getElementById('genrePanel').innerHTML = GENRES
    .map(g => `<a href="#/the-loai/${g.slug}">${g.name}</a>`).join('');
  document.getElementById('countryPanel').innerHTML = COUNTRIES
    .map(c => `<a href="#/quoc-gia/${c.slug}">${c.name}</a>`).join('');

  // Mở/đóng bằng click hoặc phím Enter — hoạt động giống hệt trên chuột,
  // cảm ứng và remote TV (nút OK trên remote phát ra sự kiện click/Enter).
  // Không dùng :hover vì remote/cảm ứng không có khái niệm "rê chuột".
  document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    const btn = dropdown.querySelector('.nav-dropdown-btn');
    if(!btn) return;
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-expanded', 'false');

    function toggle(){
      const willOpen = !dropdown.classList.contains('open');
      // Đóng mọi dropdown khác trước khi mở cái này
      document.querySelectorAll('.nav-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.querySelector('.nav-dropdown-btn')?.setAttribute('aria-expanded', 'false');
      });
      if(willOpen){
        dropdown.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    }

    btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    btn.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); }
    });
  });

  // Click ra ngoài dropdown (hoặc chọn 1 mục) → tự đóng lại
  document.addEventListener('click', e => {
    if(e.target.closest('.nav-dropdown')) return;
    document.querySelectorAll('.nav-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.querySelector('.nav-dropdown-btn')?.setAttribute('aria-expanded', 'false');
    });
  });
  document.querySelectorAll('.nav-dropdown-panel a').forEach(a => {
    a.addEventListener('click', () => {
      a.closest('.nav-dropdown')?.classList.remove('open');
    });
  });
}

/* ---------------- hero ---------------- */
let heroTimer = null;
function renderHero(items){
  const slides = items.slice(0, 6);
  const html = `
  <div class="hero" id="hero">
    ${slides.map((m,i) => `
      <div class="hero-slide ${i===0?'active':''}" data-i="${i}">
        <div class="hero-bg" style="background-image:url('${posterUrl(m.poster_url||m.thumb_url)}')"></div>
        <div class="hero-content">
          <div class="hero-tag">Đang chiếu</div>
          <h1 class="hero-title">${escapeHtml(m.name)}</h1>
          <div class="hero-meta">
            ${m.quality?`<span class="chip gold">${escapeHtml(m.quality)}</span>`:''}
            ${m.year?`<span class="chip">${m.year}</span>`:''}
            ${m.lang?`<span class="chip">${escapeHtml(m.lang)}</span>`:''}
            ${m.episode_current?`<span class="chip">${escapeHtml(m.episode_current)}</span>`:''}
          </div>
          <p class="hero-desc">${escapeHtml((m.content||'').replace(/<[^>]*>/g,'')) || 'Đang cập nhật nội dung phim...'}</p>
          <div class="hero-actions">
            <button class="btn btn-primary hero-play" data-slug="${escapeHtml(m.slug)}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg> Xem ngay
            </button>
            <a class="btn btn-ghost" href="#/phim/${escapeHtml(m.slug)}">Chi tiết</a>
          </div>
        </div>
      </div>`).join('')}
    <div class="hero-dots">${slides.map((_,i)=>`<button data-i="${i}" class="${i===0?'active':''}" aria-label="Slide ${i+1}"></button>`).join('')}</div>
  </div>`;
  return html;
}
function initHero(){
  const hero = document.getElementById('hero');
  if(!hero) return;
  const slideEls = [...hero.querySelectorAll('.hero-slide')];
  const dots = [...hero.querySelectorAll('.hero-dots button')];
  let idx = 0;
  const AUTO_DELAY = 3000; // tự động chuyển sau 3 giây, giống các web phim lớn

  function show(i){
    idx = (i + slideEls.length) % slideEls.length;
    slideEls.forEach(s=>s.classList.remove('active'));
    dots.forEach(d=>d.classList.remove('active'));
    slideEls[idx].classList.add('active');
    dots[idx].classList.add('active');
  }
  function next(){ show(idx+1); }
  function prev(){ show(idx-1); }
  function resetTimer(){
    clearInterval(heroTimer);
    heroTimer = setInterval(next, AUTO_DELAY);
  }
  dots.forEach(d => d.addEventListener('click', () => { show(+d.dataset.i); resetTimer(); }));
  resetTimer();

  hero.querySelectorAll('.hero-play').forEach(btn=>{
    btn.addEventListener('click', () => openPlayerBySlug(btn.dataset.slug));
  });

  // Kéo / vuốt bằng chuột hoặc tay để chuyển slide
  let startX = 0, startY = 0, isDragging = false, dragMoved = false;
  const DRAG_THRESHOLD = 50; // px tối thiểu để tính là vuốt

  function onPointerDown(e){
    // Bỏ qua nếu bấm vào nút hoặc link bên trong hero
    if(e.target.closest('button, a')) return;
    isDragging = true; dragMoved = false;
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    clearInterval(heroTimer);
  }
  function onPointerMove(e){
    if(!isDragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    if(Math.abs(x - startX) > 10) dragMoved = true;
    // Nếu vuốt dọc nhiều hơn ngang (cuộn trang), không chặn hành vi cuộn
    if(Math.abs(y - startY) > Math.abs(x - startX)) return;
    e.preventDefault?.();
  }
  function onPointerUp(e){
    if(!isDragging) return;
    isDragging = false;
    const x = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    const dx = x - startX;
    if(Math.abs(dx) > DRAG_THRESHOLD){
      if(dx < 0) next(); else prev();
    }
    resetTimer();
  }

  hero.addEventListener('mousedown', onPointerDown);
  hero.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  hero.addEventListener('touchstart', onPointerDown, { passive: true });
  hero.addEventListener('touchmove', onPointerMove, { passive: false });
  hero.addEventListener('touchend', onPointerUp);

  // Ngăn việc bấm chọn text/ảnh khi kéo bằng chuột
  hero.addEventListener('dragstart', e => e.preventDefault());

  // Tạm dừng auto-slide khi di chuột vào, tiếp tục khi rời đi (desktop)
  hero.addEventListener('mouseenter', () => clearInterval(heroTimer));
  hero.addEventListener('mouseleave', () => { if(!isDragging) resetTimer(); });
}

/* ---------------- pagination (kiểu 1 2 3 ... 999) ---------------- */
function renderPagination(currentPage, totalPages){
  if(!totalPages || totalPages <= 1) return '';
  const pages = [];
  const add = p => { if(p>=1 && p<=totalPages && !pages.includes(p)) pages.push(p); };
  add(1); add(2); add(totalPages); add(totalPages-1);
  for(let p = currentPage-1; p <= currentPage+1; p++) add(p);
  pages.sort((a,b)=>a-b);

  let html = `<div class="pagination">`;
  html += `<button data-p="${currentPage-1}" ${currentPage<=1?'disabled':''} aria-label="Trang trước">‹</button>`;
  let prev = 0;
  pages.forEach(p => {
    if(prev && p - prev > 1) html += `<button class="dots" disabled>…</button>`;
    html += `<button data-p="${p}" class="${p===currentPage?'active':''}">${p}</button>`;
    prev = p;
  });
  html += `<button data-p="${currentPage+1}" ${currentPage>=totalPages?'disabled':''} aria-label="Trang sau">›</button>`;
  html += `</div>`;
  html += `<div class="pagination-jump">
      <span>Đến trang:</span>
      <input type="number" id="jumpPageInput" min="1" max="${totalPages}" placeholder="1-${totalPages}">
      <button id="jumpPageBtn">Đi</button>
    </div>`;
  html += `<div class="pagination-info">Trang ${currentPage} / ${totalPages}</div>`;
  return html;
}
function attachPagination(root, onGo, totalPages){
  root.querySelectorAll('.pagination button[data-p]').forEach(btn=>{
    if(btn.disabled) return;
    btn.addEventListener('click', () => onGo(+btn.dataset.p));
  });
  const jumpBtn = root.querySelector('#jumpPageBtn');
  const jumpInput = root.querySelector('#jumpPageInput');
  if(jumpBtn && jumpInput){
    const doJump = () => {
      let p = parseInt(jumpInput.value, 10);
      if(!p || p < 1) p = 1;
      if(totalPages && p > totalPages) p = totalPages;
      onGo(p);
    };
    jumpBtn.addEventListener('click', doJump);
    jumpInput.addEventListener('keydown', e => { if(e.key === 'Enter') doJump(); });
  }
}

/* ---------------- lọc & sắp xếp ---------------- */
const SORT_OPTIONS = [
  { key: 'default', label: 'Mới cập nhật' },
  { key: 'year_desc', label: 'Năm mới nhất' },
  { key: 'year_asc', label: 'Năm cũ nhất' },
  { key: 'name_asc', label: 'Tên A → Z' },
  { key: 'name_desc', label: 'Tên Z → A' },
];
function applySortOrder(items, sortKey){
  const arr = items.slice();
  switch(sortKey){
    case 'year_desc': return arr.sort((a,b) => (b.year||0) - (a.year||0));
    case 'year_asc': return arr.sort((a,b) => (a.year||0) - (b.year||0));
    case 'name_asc': return arr.sort((a,b) => (a.name||'').localeCompare(b.name||'', 'vi'));
    case 'name_desc': return arr.sort((a,b) => (b.name||'').localeCompare(a.name||'', 'vi'));
    default: return arr;
  }
}
function sortDropdown(currentKey){
  return `<div class="filters">${sortDropdownRaw(currentKey)}</div>`;
}
function sortDropdownRaw(currentKey){
  return `<select class="filter-select" id="sortSelect" aria-label="Sắp xếp">
    ${SORT_OPTIONS.map(o => `<option value="${o.key}" ${o.key===currentKey?'selected':''}>${o.label}</option>`).join('')}
  </select>`;
}

/* ---------------- ROUTES ---------------- */
const routes = {
  home: renderHomePage,
  list: renderListPage,
  'the-loai': renderGenrePage,
  'quoc-gia': renderCountryPage,
  phim: renderDetailPage,
  xem: renderWatchPage,
  'tim-kiem': renderSearchPage,
  'yeu-thich': renderFavoritesPage,
  'lich-su': renderHistoryPage,
};

function setLoading(){
  app.innerHTML = `<div class="loader-page"><div class="reel"></div></div>`;
}

/* ---------------- skeleton loaders ---------------- */
function skeletonCard(){
  return `<div class="skel-card">
    <div class="skel-poster skel-shimmer"></div>
    <div class="skel-line skel-shimmer" style="width:85%;"></div>
    <div class="skel-line skel-shimmer" style="width:55%;"></div>
  </div>`;
}
function skeletonRow(count){
  count = count || 6;
  return `<div class="row-scroll">${Array(count).fill(0).map(skeletonCard).join('')}</div>`;
}
function skeletonGrid(count){
  count = count || 18;
  return `<div class="grid-view">${Array(count).fill(0).map(skeletonCard).join('')}</div>`;
}
function skeletonHero(){
  return `<div class="skel-hero skel-shimmer"></div>`;
}
function skeletonSection(titleWidth){
  return `<section class="section">
    <div class="section-head"><div class="skel-line skel-shimmer" style="width:${titleWidth||160}px;height:24px;"></div></div>
    ${skeletonRow()}
  </section>`;
}
function showError(msg){
  app.innerHTML = `<div class="empty-state">
    <h3>Không tải được dữ liệu</h3>
    <p>${escapeHtml(msg || 'Vui lòng thử lại sau.')}</p>
    <div style="margin-top:18px;"><a class="btn btn-primary" href="#/home">Về trang chủ</a></div>
  </div>`;
}

async function renderHomePage(){
  app.innerHTML = `
    <div id="heroSlot">${skeletonHero()}</div>
    <div id="rowContinue"></div>
    <div id="rowForYou"></div>
    <div id="rowPhimBo">${skeletonSection(140)}</div>
    <div id="rowPhimLe">${skeletonSection(170)}</div>
    <div id="rowHoatHinh">${skeletonSection(120)}</div>
    <div id="rowTvShows">${skeletonSection(110)}</div>
    <div class="section" style="text-align:center; padding-top:44px; padding-bottom:52px;">
      <a class="btn btn-ghost" href="#/list/phim-moi-cap-nhat" style="margin:0 auto;">Xem tất cả phim trên KKPhim →</a>
    </div>
  `;

  // Xem tiếp (từ lịch sử)
  const hist = getHistory().slice(0, 12);
  if(hist.length){
    const slot = document.getElementById('rowContinue');
    slot.innerHTML = rowSection('Xem Tiếp', hist.map(h => ({
      slug: h.slug, name: h.name, origin_name: h.origin_name,
      poster_url: h.poster_url, year: h.year, quality: h.quality,
      episode_current: h.epName,
    })), '#/lich-su');
    attachCardHandlers(slot);
  }

  // Gợi ý cá nhân hóa theo quốc gia xem nhiều nhất
  const topCountry = getTopWatchedCountry();
  if(topCountry){
    const countrySlug = COUNTRIES.find(c => c.name === topCountry)?.slug;
    if(countrySlug){
      fetchJson(`${API_BASE}/v1/api/quoc-gia/${countrySlug}?page=1`)
        .then(json => {
          const items = normalizeItems(json);
          const slot = document.getElementById('rowForYou');
          if(!slot || !items.length) return;
          slot.innerHTML = rowSection(`Vì Bạn Hay Xem Phim ${escapeHtml(topCountry)}`, items, `#/quoc-gia/${countrySlug}`);
          attachCardHandlers(slot);
        })
        .catch(() => {});
    }
  }

  let anyLoaded = false;
  let anyFailed = false;
  function checkAllFailed(){
    if(anyFailed && !anyLoaded){
      showError('Không kết nối được tới máy chủ phim (phimapi.com). Kiểm tra lại kết nối mạng hoặc thử lại sau.');
    }
  }

  setTimeout(() => {
    const slot = document.getElementById('heroSlot');
    if(slot && slot.querySelector('.loader-page')){
      slot.innerHTML = `<div class="empty-state" style="padding:40px 20px;"><p>Không tải được banner nổi bật. Các danh mục bên dưới vẫn có thể hoạt động.</p></div>`;
    }
  }, 12000);

  fetchJson(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=1`)
    .then(json => {
      const items = normalizeItems(json);
      const slot = document.getElementById('heroSlot');
      if(!slot) return;
      if(items.length){
        anyLoaded = true;
        slot.innerHTML = renderHero(items);
        initHero();
      } else {
        slot.innerHTML = '';
      }
    })
    .catch(() => {
      anyFailed = true;
      const slot = document.getElementById('heroSlot');
      if(slot) slot.innerHTML = '';
      checkAllFailed();
    });

  const rows = [
    { type: 'phim-bo', title: 'Phim Bộ Mới', slotId: 'rowPhimBo' },
    { type: 'phim-le', title: 'Phim Lẻ Đặc Sắc', slotId: 'rowPhimLe' },
    { type: 'hoat-hinh', title: 'Hoạt Hình', slotId: 'rowHoatHinh' },
    { type: 'tv-shows', title: 'TV Shows', slotId: 'rowTvShows' },
  ];
  rows.forEach(row => {
    fetchJson(`${API_BASE}/v1/api/danh-sach/${row.type}?page=1`)
      .then(json => {
        const items = normalizeItems(json);
        const slot = document.getElementById(row.slotId);
        if(!slot) return;
        if(items.length){
          anyLoaded = true;
          slot.innerHTML = rowSection(row.title, items, `#/list/${row.type}`);
          attachCardHandlers(slot);
        }
      })
      .catch(() => { anyFailed = true; checkAllFailed(); });
  });
}

async function renderListPage(params){
  const type = params[0];
  await renderFilterablePage({
    baseHash: `#/list/${type}`,
    heading: LIST_LABELS[type] || (type === 'phim-moi-cap-nhat' ? 'Tất Cả Phim Mới Cập Nhật' : 'Danh sách'),
    breadcrumb: LIST_LABELS[type] || 'Danh sách',
    buildEndpoint: (page, filters) => {
      if(type === 'phim-moi-cap-nhat'){
        return `${API_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`;
      }
      const qs = new URLSearchParams({ page });
      if(filters.category) qs.set('category', filters.category);
      if(filters.country) qs.set('country', filters.country);
      if(filters.year) qs.set('year', filters.year);
      return `${API_BASE}/v1/api/danh-sach/${type}?${qs.toString()}`;
    },
    showGenreFilter: type !== 'phim-moi-cap-nhat',
    showCountryFilter: type !== 'phim-moi-cap-nhat',
  });
}

async function renderGenrePage(params){
  const slug = params[0];
  const genreName = GENRES.find(g=>g.slug===slug)?.name || slug;
  await renderFilterablePage({
    baseHash: `#/the-loai/${slug}`,
    heading: genreName,
    breadcrumb: `Thể loại / ${genreName}`,
    buildEndpoint: (page, filters) => {
      const qs = new URLSearchParams({ page });
      if(filters.country) qs.set('country', filters.country);
      if(filters.year) qs.set('year', filters.year);
      return `${API_BASE}/v1/api/the-loai/${slug}?${qs.toString()}`;
    },
    showGenreFilter: false, // đã lọc theo thể loại qua URL rồi
    showCountryFilter: true,
  });
}

async function renderCountryPage(params){
  const slug = params[0];
  const countryName = COUNTRIES.find(c=>c.slug===slug)?.name || slug;
  await renderFilterablePage({
    baseHash: `#/quoc-gia/${slug}`,
    heading: countryName,
    breadcrumb: `Quốc gia / ${countryName}`,
    buildEndpoint: (page, filters) => {
      const qs = new URLSearchParams({ page });
      if(filters.category) qs.set('category', filters.category);
      if(filters.year) qs.set('year', filters.year);
      return `${API_BASE}/v1/api/quoc-gia/${slug}?${qs.toString()}`;
    },
    showGenreFilter: true,
    showCountryFilter: false, // đã lọc theo quốc gia qua URL rồi
  });
}

/* ---------------- trang danh sách có bộ lọc dùng chung ---------------- */
const FILTER_YEARS = (() => {
  const nowYear = new Date().getFullYear();
  const years = [];
  for(let y = nowYear + 1; y >= 1970; y--) years.push(y);
  return years;
})();

function getQueryParams(){
  return new URLSearchParams(location.hash.split('?')[1] || '');
}

function filterBar(opts, current){
  const { showGenreFilter, showCountryFilter } = opts;
  return `<div class="filter-bar">
    ${showGenreFilter ? `
    <select class="filter-select" id="filterGenre" aria-label="Thể loại">
      <option value="">Tất cả thể loại</option>
      ${GENRES.map(g => `<option value="${g.slug}" ${g.slug===current.category?'selected':''}>${g.name}</option>`).join('')}
    </select>` : ''}
    ${showCountryFilter ? `
    <select class="filter-select" id="filterCountry" aria-label="Quốc gia">
      <option value="">Tất cả quốc gia</option>
      ${COUNTRIES.map(c => `<option value="${c.slug}" ${c.slug===current.country?'selected':''}>${c.name}</option>`).join('')}
    </select>` : ''}
    <select class="filter-select" id="filterYear" aria-label="Năm phát hành">
      <option value="">Tất cả năm</option>
      ${FILTER_YEARS.map(y => `<option value="${y}" ${String(y)===current.year?'selected':''}>${y}</option>`).join('')}
    </select>
    ${sortDropdownRaw(current.sort)}
    ${(current.category||current.country||current.year||current.sort!=='default') ? `<button class="filter-clear" id="filterClearBtn" type="button">Xóa lọc ✕</button>` : ''}
  </div>`;
}

async function renderFilterablePage(opts){
  const q = getQueryParams();
  const page = +(q.get('page')) || 1;
  const filters = {
    category: q.get('category') || '',
    country: q.get('country') || '',
    year: q.get('year') || '',
    sort: q.get('sort') || 'default',
  };

  app.innerHTML = `
    <div class="page-heading">
      <div><div class="skel-line skel-shimmer" style="width:160px;height:14px;margin-bottom:10px;"></div><div class="skel-line skel-shimmer" style="width:220px;height:34px;"></div></div>
    </div>
    <section class="section">${skeletonGrid()}</section>`;

  try{
    const endpoint = opts.buildEndpoint(page, filters);
    const json = await fetchJson(endpoint);
    let items = normalizeItems(json);
    const pag = getPagination(json);
    const totalPages = pag ? Math.ceil(pag.totalItems / pag.totalItemsPerPage) : (items.length ? page+1 : page);
    items = applySortOrder(items, filters.sort);

    function buildHash(newParams){
      const merged = { page: 1, ...filters, ...newParams };
      const qs = new URLSearchParams();
      if(merged.page && merged.page !== 1) qs.set('page', merged.page);
      if(merged.category) qs.set('category', merged.category);
      if(merged.country) qs.set('country', merged.country);
      if(merged.year) qs.set('year', merged.year);
      if(merged.sort && merged.sort !== 'default') qs.set('sort', merged.sort);
      const qsStr = qs.toString();
      return opts.baseHash + (qsStr ? '?'+qsStr : '');
    }

    app.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="breadcrumb"><a href="#/home">Trang chủ</a> / ${opts.breadcrumb}</div>
          <h1>${escapeHtml(opts.heading)}</h1>
        </div>
      </div>
      <div class="section">${filterBar(opts, filters)}</div>
      <section class="section">
        ${items.length ? `<div class="grid-view">${items.map(m=>movieCard(m)).join('')}</div>` : emptyBlock('Không tìm thấy phim phù hợp với bộ lọc này.')}
      </section>
      <div class="section">${renderPagination(page, totalPages)}</div>
    `;
    attachCardHandlers(app);
    attachPagination(app, p => { location.hash = buildHash({ page: p }); window.scrollTo({top:0,behavior:'smooth'}); }, totalPages);

    const genreSel = document.getElementById('filterGenre');
    const countrySel = document.getElementById('filterCountry');
    const yearSel = document.getElementById('filterYear');
    const sortSel = document.getElementById('sortSelect');
    const clearBtn = document.getElementById('filterClearBtn');

    if(genreSel) genreSel.addEventListener('change', () => { location.hash = buildHash({ category: genreSel.value, page: 1 }); });
    if(countrySel) countrySel.addEventListener('change', () => { location.hash = buildHash({ country: countrySel.value, page: 1 }); });
    if(yearSel) yearSel.addEventListener('change', () => { location.hash = buildHash({ year: yearSel.value, page: 1 }); });
    if(sortSel) sortSel.addEventListener('change', () => { location.hash = buildHash({ sort: sortSel.value, page: 1 }); });
    if(clearBtn) clearBtn.addEventListener('click', () => { location.hash = opts.baseHash; });
  }catch(e){ showError(e.message); }
}

async function renderSearchPage(params, query){
  const keyword = query.get('keyword') || '';
  app.innerHTML = `
    <div class="page-heading">
      <div><div class="skel-line skel-shimmer" style="width:120px;height:14px;margin-bottom:10px;"></div><div class="skel-line skel-shimmer" style="width:260px;height:34px;"></div></div>
    </div>
    <section class="section">${skeletonGrid(12)}</section>`;
  try{
    const json = await fetchJson(`${API_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=40`);
    const items = normalizeItems(json);
    app.innerHTML = `
      <div class="page-heading">
        <div>
          <div class="breadcrumb"><a href="#/home">Trang chủ</a> / Tìm kiếm</div>
          <h1>Kết quả cho "${escapeHtml(keyword)}"</h1>
        </div>
      </div>
      <section class="section">
        ${items.length ? `<div class="grid-view">${items.map(m=>movieCard(m)).join('')}</div>` : emptyBlock('Không tìm thấy phim phù hợp.')}
      </section>
    `;
    attachCardHandlers(app);
  }catch(e){ showError(e.message); }
}

function emptyBlock(msg){
  return `<div class="empty-state"><h3>Chưa có dữ liệu</h3><p>${escapeHtml(msg || 'Danh sách này hiện đang trống.')}</p></div>`;
}

async function renderFavoritesPage(){
  const favs = getFavorites();
  app.innerHTML = `
    <div class="page-heading">
      <div>
        <div class="breadcrumb"><a href="#/home">Trang chủ</a> / Yêu thích</div>
        <h1>Phim Yêu Thích</h1>
      </div>
    </div>
    <div class="toolbar-row">${favs.length ? `<button class="text-btn" id="clearFavBtn">Xóa tất cả</button>` : ''}</div>
    <section class="section">
      ${favs.length ? `<div class="grid-view">${favs.map(m=>movieCard(m)).join('')}</div>` : emptyBlock('Bạn chưa thêm phim nào vào yêu thích. Bấm biểu tượng trái tim trên poster để lưu phim.')}
    </section>
  `;
  attachCardHandlers(app);
  const clearBtn = document.getElementById('clearFavBtn');
  if(clearBtn) clearBtn.addEventListener('click', () => {
    if(confirm('Xóa toàn bộ danh sách yêu thích?')){ clearFavorites(); renderFavoritesPage(); }
  });
}

async function renderHistoryPage(){
  const hist = getHistory();
  app.innerHTML = `
    <div class="page-heading">
      <div>
        <div class="breadcrumb"><a href="#/home">Trang chủ</a> / Lịch sử xem</div>
        <h1>Lịch Sử Xem Phim</h1>
      </div>
    </div>
    <div class="toolbar-row">${hist.length ? `<button class="text-btn" id="clearHistBtn">Xóa lịch sử</button>` : ''}</div>
    <section class="section">
      ${hist.length ? `<div class="grid-view">${hist.map(m=>movieCard({
        slug: m.slug, name: m.name, origin_name: m.origin_name,
        poster_url: m.poster_url, year: m.year, quality: m.quality,
        episode_current: m.epName,
      })).join('')}</div>` : emptyBlock('Bạn chưa xem phim nào. Lịch sử sẽ tự động lưu khi bạn xem tập phim.')}
    </section>
  `;
  attachCardHandlers(app);
  const clearBtn = document.getElementById('clearHistBtn');
  if(clearBtn) clearBtn.addEventListener('click', () => {
    if(confirm('Xóa toàn bộ lịch sử xem?')){ clearHistory(); renderHistoryPage(); }
  });
}

async function renderDetailPage(params){
  const slug = params[0];
  app.innerHTML = `
    <div class="d2-wrap">
      <div class="skel-poster skel-shimmer" style="width:220px;aspect-ratio:2/3;border-radius:10px;margin:0 auto 20px;"></div>
      <div class="skel-line skel-shimmer" style="width:60%;height:30px;margin:0 auto 10px;"></div>
      <div class="skel-line skel-shimmer" style="width:30%;height:16px;margin:0 auto 30px;"></div>
    </div>`;
  try{
    const json = await fetchJson(`${API_BASE}/v1/api/phim/${slug}`);
    const movie = json.movie || json.data?.item || json;
    const episodes = json.episodes || json.data?.item?.episodes || [];

    if(!movie || !movie.name){ showError('Không tìm thấy phim.'); return; }

    const genres = (movie.category ? Object.values(movie.category) : (movie.genres||[]))
      .map(g => g?.name).filter(Boolean);
    const countries = (movie.country||[]).map(c=>c?.name).filter(Boolean);
    const actors = movie.actor && movie.actor.length && movie.actor[0] !== '' ? movie.actor : [];
    const directors = movie.director && movie.director.length && movie.director[0] !== '' ? movie.director : [];
    const fav = isFavorite(movie.slug);
    const histEntry = getHistoryEntry(movie.slug);
    const description = escapeHtml((movie.content||'').replace(/<[^>]*>/g,'')) || 'Đang cập nhật nội dung.';

    app.innerHTML = `
      <div class="d2-bg" style="background-image:url('${posterUrl(movie.poster_url||movie.thumb_url)}')"></div>
      <div class="d2-wrap">
        <div class="d2-poster"><img src="${posterUrl(movie.poster_url||movie.thumb_url)}" alt="${escapeHtml(movie.name)}"></div>
        <h1 class="d2-title">${escapeHtml(movie.name)}</h1>
        <div class="d2-origin">${escapeHtml(movie.origin_name||'')}</div>

        <button class="d2-info-toggle" id="d2InfoToggle" type="button">
          Thông tin phim
          <svg width="14" height="8" viewBox="0 0 14 8"><path d="M1 1l6 6 6-6" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
        </button>
        <div class="d2-info-panel" id="d2InfoPanel">
          <div class="detail-chips" style="justify-content:center;">
            ${movie.quality?`<span class="chip gold">${escapeHtml(movie.quality)}</span>`:''}
            ${movie.year?`<span class="chip">${movie.year}</span>`:''}
            ${movie.lang?`<span class="chip">${escapeHtml(movie.lang)}</span>`:''}
            ${movie.episode_current?`<span class="chip">${escapeHtml(movie.episode_current)}</span>`:''}
            ${movie.time?`<span class="chip">${escapeHtml(movie.time)}</span>`:''}
          </div>
          <p class="detail-desc" style="text-align:center;margin:14px auto;max-width:640px;">${description}</p>
          <dl class="detail-facts" style="margin:0 auto;justify-content:center;">
            ${genres.length?`<dt>Thể loại</dt><dd>${genres.map(escapeHtml).join(', ')}</dd>`:''}
            ${countries.length?`<dt>Quốc gia</dt><dd>${countries.map(escapeHtml).join(', ')}</dd>`:''}
            ${directors.length?`<dt>Đạo diễn</dt><dd>${directors.map(escapeHtml).join(', ')}</dd>`:''}
          </dl>
        </div>

        <button class="d2-watch-btn" id="watchNowBtn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#201a12"><path d="M8 5v14l11-7z"/></svg>
          ${histEntry ? 'Xem Tiếp ' + escapeHtml(histEntry.epName||'') : 'Xem Ngay'}
        </button>

        <div class="d2-action-row">
          <button class="d2-action-btn ${fav?'active':''}" id="detailFavBtn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="${fav?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>${fav?'Đã thích':'Yêu thích'}</span>
          </button>
        </div>

        <div class="d2-tabs" id="d2Tabs">
          <button class="d2-tab active" data-tab="eps">Tập phim</button>
          ${actors.length ? `<button class="d2-tab" data-tab="cast">Diễn viên</button>` : ''}
          <button class="d2-tab" data-tab="related">Đề xuất</button>
        </div>

        <div class="d2-tab-panel" id="d2Panel-eps">
          <div class="ep-servers" id="epServers"></div>
          <div class="ep-grid" id="epGrid"></div>
          ${!episodes.length ? emptyBlock('Chưa có tập phim nào được cập nhật.') : ''}
        </div>

        ${actors.length ? `
        <div class="d2-tab-panel" id="d2Panel-cast" style="display:none;">
          <div class="cast-list" style="justify-content:center;">${actors.map(a=>`<span class="cast-chip">${escapeHtml(a)}</span>`).join('')}</div>
        </div>` : ''}

        <div class="d2-tab-panel" id="d2Panel-related" style="display:none;">
          <div id="relatedSlot"></div>
        </div>
      </div>
    `;

    // Toggle thông tin phim (mặc định đóng, giống ảnh mẫu)
    const infoToggle = document.getElementById('d2InfoToggle');
    const infoPanel = document.getElementById('d2InfoPanel');
    infoToggle.addEventListener('click', () => {
      const isOpen = infoPanel.classList.toggle('open');
      infoToggle.classList.toggle('open', isOpen);
    });

    // Chuyển tab
    const tabs = document.getElementById('d2Tabs');
    tabs.querySelectorAll('.d2-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.d2-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        ['eps','cast','related'].forEach(key => {
          const panel = document.getElementById('d2Panel-'+key);
          if(panel) panel.style.display = (key === tab.dataset.tab) ? '' : 'none';
        });
        if(tab.dataset.tab === 'related' && !document.getElementById('relatedSlot').dataset.loaded){
          loadRelatedMovies(movie, genres, countries);
          document.getElementById('relatedSlot').dataset.loaded = '1';
        }
      });
    });

    document.getElementById('detailFavBtn').addEventListener('click', (e) => {
      const nowFav = toggleFavorite(movie);
      const btn = e.currentTarget;
      btn.classList.toggle('active', nowFav);
      btn.querySelector('svg').setAttribute('fill', nowFav ? 'currentColor' : 'none');
      btn.querySelector('span').textContent = nowFav ? 'Đã thích' : 'Yêu thích';
    });

    if(episodes.length){
      const serverBtns = document.getElementById('epServers');
      const epGrid = document.getElementById('epGrid');
      const watchedEpName = histEntry ? histEntry.epName : null;

      function renderServer(i){
        [...serverBtns.children].forEach((b,bi)=>b.classList.toggle('active', bi===i));
        const items = episodes[i].server_data || [];
        epGrid.innerHTML = items.map((ep,ei) => {
          const isWatched = watchedEpName && ep.name === watchedEpName;
          return `<button class="ep-btn ${isWatched?'watched':''}" data-ei="${ei}" data-si="${i}">${escapeHtml(ep.name || (ei+1))}</button>`;
        }).join('');
        epGrid.querySelectorAll('.ep-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            location.hash = `#/xem/${movie.slug}/${btn.dataset.si}/${btn.dataset.ei}`;
          });
        });
      }

      serverBtns.innerHTML = episodes.map((s,i) => `<button class="ep-server-btn">${escapeHtml(s.server_name || 'Server ' + (i+1))}</button>`).join('');
      [...serverBtns.children].forEach((b,i) => b.addEventListener('click', () => renderServer(i)));
      renderServer(0);

      document.getElementById('watchNowBtn').addEventListener('click', () => {
        if(histEntry){
          const si = histEntry.serverIndex < episodes.length ? histEntry.serverIndex : 0;
          const list = episodes[si]?.server_data || [];
          const ei = histEntry.epIndex < list.length ? histEntry.epIndex : 0;
          if(list[ei]){ location.hash = `#/xem/${movie.slug}/${si}/${ei}`; return; }
        }
        location.hash = `#/xem/${movie.slug}/0/0`;
      });
    } else {
      document.getElementById('watchNowBtn').addEventListener('click', () => {
        showToast('Phim này chưa có tập để xem.');
      });
    }
  }catch(e){ showError(e.message); }
}

async function loadRelatedMovies(movie, genres, countries){
  const slot = document.getElementById('relatedSlot');
  if(!slot) return;
  slot.innerHTML = skeletonSection(180);

  // Ưu tiên tìm theo thể loại đầu tiên, nếu không có thì theo quốc gia đầu tiên
  const genreSlug = GENRES.find(g => genres.includes(g.name))?.slug;
  const countrySlug = COUNTRIES.find(c => countries.includes(c.name))?.slug;
  const endpoint = genreSlug
    ? `${API_BASE}/v1/api/the-loai/${genreSlug}?page=1`
    : (countrySlug ? `${API_BASE}/v1/api/quoc-gia/${countrySlug}?page=1` : null);

  if(!endpoint){ slot.innerHTML = ''; return; }

  try{
    const json = await fetchJson(endpoint);
    let items = normalizeItems(json).filter(m => m.slug !== movie.slug);
    if(!items.length){ slot.innerHTML = ''; return; }
    items = items.slice(0, 14);
    const title = genreSlug ? 'Có Thể Bạn Thích' : `Cùng Quốc Gia: ${escapeHtml(countries[0]||'')}`;
    slot.innerHTML = rowSection(title, items);
    attachCardHandlers(slot);
  }catch(e){
    slot.innerHTML = '';
  }
}

async function openPlayerBySlug(slug){
  location.hash = `#/xem/${slug}/0/0`;
}

/* ---------------- trang xem phim (thay cho modal cũ) ---------------- */
let hlsInstance = null;
let autoNextEnabled = readLS('ctp_autonext_pref').length ? readLS('ctp_autonext_pref')[0] : true;
let nextupTimer = null;
let nextupInterval = null;
let currentWatchCtx = null; // { movie, episodes, serverIndex, epIndex }

function setAutoNextPref(val){
  autoNextEnabled = val;
  writeLS('ctp_autonext_pref', [val]);
}

async function renderWatchPage(params){
  const slug = params[0];
  const serverIndex = +(params[1] || 0);
  const epIndex = +(params[2] || 0);

  app.innerHTML = `
    <div class="watch-page">
      <div class="watch-video-col">
        <div class="player-frame" id="playerFrame">
          <div class="loader-page" style="position:absolute;inset:0;"><div class="reel"></div></div>
        </div>
        <div class="watch-info-bar">
          <div class="watch-info-text">
            <div class="skel-line skel-shimmer" style="width:60%;height:26px;margin-bottom:8px;"></div>
            <div class="skel-line skel-shimmer" style="width:35%;height:14px;"></div>
          </div>
        </div>
      </div>
      <div class="watch-eps-col" id="watchEpsCol">${skeletonGrid(12)}</div>
    </div>
  `;
  window.scrollTo({top:0});

  try{
    const json = await fetchJson(`${API_BASE}/v1/api/phim/${slug}`);
    const movie = json.movie || json.data?.item || json;
    const episodes = json.episodes || json.data?.item?.episodes || [];

    if(!movie || !movie.name){ showError('Không tìm thấy phim.'); return; }
    if(!episodes.length){ showError('Phim này chưa có tập để xem.'); return; }

    const si = serverIndex < episodes.length ? serverIndex : 0;
    const list = episodes[si]?.server_data || [];
    const ei = epIndex < list.length ? epIndex : 0;
    const ep = list[ei];
    if(!ep){ showError('Không tìm thấy tập phim.'); return; }

    currentWatchCtx = { movie, episodes, serverIndex: si, epIndex: ei };

    renderWatchChrome(movie, episodes, si, ei);
    playEpisode(ep, movie, si, ei);
  }catch(e){ showError(e.message); }
}

function renderWatchChrome(movie, episodes, serverIndex, epIndex){
  const fav = isFavorite(movie.slug);
  const list = episodes[serverIndex]?.server_data || [];
  const ep = list[epIndex];

  app.innerHTML = `
    <div class="watch-page">
      <div class="watch-video-col">
        <div class="player-frame" id="playerFrame">
          <video id="videoPlayer" controls playsinline></video>
          <div class="player-nextup" id="playerNextup">
            <div class="nextup-card">
              <div class="nextup-label">Tự động phát tập tiếp theo</div>
              <div class="nextup-name" id="nextupName"></div>
              <div class="nextup-actions">
                <button class="btn btn-ghost btn-sm" id="nextupCancel">Hủy</button>
                <button class="btn btn-primary btn-sm" id="nextupPlay">Phát ngay</button>
              </div>
              <svg class="nextup-ring" width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="19" stroke="rgba(237,230,214,0.15)" stroke-width="4" fill="none"/>
                <circle id="nextupRingProgress" cx="22" cy="22" r="19" stroke="var(--gold)" stroke-width="4" fill="none" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="watch-info-bar">
          <div class="watch-info-text">
            <div class="watch-title"><a href="#/phim/${escapeHtml(movie.slug)}">${escapeHtml(movie.name)}</a></div>
            <div class="watch-subtitle" id="watchSubtitle">Đang xem: ${escapeHtml(ep.name||'')}</div>
          </div>
          <div class="watch-info-actions">
            <button class="player-icon-btn" id="autoNextToggle" type="button" title="Tự động chuyển tập">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 5l7 7-7 7M4 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Auto next</span>
            </button>
            <button class="btn-icon ${fav?'active':''}" id="watchFavBtn" title="Yêu thích" aria-label="Yêu thích">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${fav?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>
        </div>
        <div class="ep-section-inline" id="movieMetaSlot"></div>
        <div id="relatedSlot"></div>
      </div>

      <div class="watch-eps-col" id="watchEpsCol">
        <div class="watch-eps-head">
          <div class="ep-servers" id="epServers"></div>
        </div>
        <div class="ep-grid ep-grid-watch" id="epGrid"></div>
      </div>
    </div>
  `;

  document.getElementById('watchFavBtn').addEventListener('click', (e) => {
    const nowFav = toggleFavorite(movie);
    e.currentTarget.classList.toggle('active', nowFav);
    e.currentTarget.querySelector('svg').setAttribute('fill', nowFav ? 'currentColor' : 'none');
  });
  document.getElementById('autoNextToggle').addEventListener('click', () => {
    setAutoNextPref(!autoNextEnabled);
    updateAutoNextBtn();
    showToast(autoNextEnabled ? 'Đã bật tự động chuyển tập' : 'Đã tắt tự động chuyển tập');
  });
  updateAutoNextBtn();

  const serverBtns = document.getElementById('epServers');
  serverBtns.innerHTML = episodes.map((s,i) => `<button class="ep-server-btn ${i===serverIndex?'active':''}">${escapeHtml(s.server_name || 'Server ' + (i+1))}</button>`).join('');
  [...serverBtns.children].forEach((b,i) => b.addEventListener('click', () => {
    location.hash = `#/xem/${movie.slug}/${i}/0`;
  }));

  renderEpisodeGrid(episodes, serverIndex, epIndex, movie);

  // Thông tin phim thu gọn dưới video (thể loại, mô tả ngắn)
  const genres = (movie.category ? Object.values(movie.category) : (movie.genres||[])).map(g=>g?.name).filter(Boolean);
  const countries = (movie.country||[]).map(c=>c?.name).filter(Boolean);
  const metaSlot = document.getElementById('movieMetaSlot');
  metaSlot.innerHTML = `
    <div class="detail-chips" style="margin:16px 0 10px;">
      ${movie.quality?`<span class="chip gold">${escapeHtml(movie.quality)}</span>`:''}
      ${movie.year?`<span class="chip">${movie.year}</span>`:''}
      ${movie.lang?`<span class="chip">${escapeHtml(movie.lang)}</span>`:''}
    </div>
    <p class="detail-desc" style="margin-bottom:8px;">${escapeHtml((movie.content||'').replace(/<[^>]*>/g,'')) || 'Đang cập nhật nội dung.'}</p>
    ${genres.length?`<div class="watch-meta-line"><b>Thể loại:</b> ${genres.map(escapeHtml).join(', ')}</div>`:''}
    ${countries.length?`<div class="watch-meta-line"><b>Quốc gia:</b> ${countries.map(escapeHtml).join(', ')}</div>`:''}
  `;

  loadRelatedMovies(movie, genres, countries);
}

function renderEpisodeGrid(episodes, serverIndex, epIndex, movie){
  const epGrid = document.getElementById('epGrid');
  const items = episodes[serverIndex]?.server_data || [];
  epGrid.innerHTML = items.map((e,i) => `<button class="ep-btn ${i===epIndex?'current':''}" data-i="${i}">${escapeHtml(e.name || i+1)}</button>`).join('');
  epGrid.querySelectorAll('.ep-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      location.hash = `#/xem/${movie.slug}/${serverIndex}/${btn.dataset.i}`;
    });
  });
}

function playEpisode(ep, movie, serverIndex, epIndex){
  const video = document.getElementById('videoPlayer');
  if(!video) return;
  const src = ep.link_m3u8 || ep.link_embed;
  if(hlsInstance){ hlsInstance.destroy(); hlsInstance = null; }
  hideNextup(true);

  if(ep.link_m3u8 && window.Hls && Hls.isSupported()){
    hlsInstance = new Hls();
    hlsInstance.loadSource(ep.link_m3u8);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
  } else if(video.canPlayType('application/vnd.apple.mpegurl') && ep.link_m3u8){
    video.src = ep.link_m3u8;
    video.play().catch(()=>{});
  } else if(src){
    video.src = src;
    video.play().catch(()=>{});
  }

  saveHistory(movie, ep, serverIndex, epIndex);
  video.onended = handleVideoEnded;
}

function findNextEpisode(ctx){
  const list = ctx.episodes[ctx.serverIndex]?.server_data || [];
  if(ctx.epIndex + 1 < list.length) return { ep: list[ctx.epIndex+1], index: ctx.epIndex+1 };
  return null;
}

function handleVideoEnded(){
  if(!currentWatchCtx) return;
  const next = findNextEpisode(currentWatchCtx);
  if(!next) return;
  if(autoNextEnabled) showNextup(next);
}

function showNextup(next){
  const nextupEl = document.getElementById('playerNextup');
  const nameEl = document.getElementById('nextupName');
  if(!nextupEl || !nameEl) return;
  nameEl.textContent = next.ep.name || ('Tập ' + (next.index+1));
  nextupEl.classList.add('show');

  const ring = document.getElementById('nextupRingProgress');
  const circumference = 119.4;
  ring.style.strokeDashoffset = 0;

  clearTimeout(nextupTimer);
  clearInterval(nextupInterval);

  const start = Date.now();
  const duration = 6000;
  nextupInterval = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.min(elapsed / duration, 1);
    ring.style.strokeDashoffset = circumference * pct;
  }, 100);

  nextupTimer = setTimeout(() => { playNextEpisode(next); }, duration);

  document.getElementById('nextupCancel').onclick = () => hideNextup();
  document.getElementById('nextupPlay').onclick = () => playNextEpisode(next);
}
function hideNextup(){
  const nextupEl = document.getElementById('playerNextup');
  if(nextupEl) nextupEl.classList.remove('show');
  clearTimeout(nextupTimer);
  clearInterval(nextupInterval);
}
function playNextEpisode(next){
  hideNextup();
  const ctx = currentWatchCtx;
  location.hash = `#/xem/${ctx.movie.slug}/${ctx.serverIndex}/${next.index}`;
}
function updateAutoNextBtn(){
  const btn = document.getElementById('autoNextToggle');
  if(btn) btn.classList.toggle('on', autoNextEnabled);
}

/* ---------------- phím tắt: bàn phím & remote TV ---------------- */
// Remote TV (Android TV, Smart TV) thường phát ra cùng mã phím với bàn phím:
// OK/Enter = play-pause, ArrowLeft/Right = tua lùi/tiến, ArrowUp/Down = âm lượng
const SEEK_STEP = 10; // giây mỗi lần tua
let keyHintTimer = null;
function showKeyHint(text){
  const frame = document.getElementById('playerFrame');
  if(!frame) return;
  let hint = document.getElementById('playerKeyHint');
  if(!hint){
    hint = document.createElement('div');
    hint.id = 'playerKeyHint';
    hint.className = 'player-key-hint';
    frame.appendChild(hint);
  }
  hint.textContent = text;
  hint.classList.add('show');
  clearTimeout(keyHintTimer);
  keyHintTimer = setTimeout(() => hint.classList.remove('show'), 650);
}
document.addEventListener('keydown', e => {
  const video = document.getElementById('videoPlayer');
  if(!video) return; // không ở trang xem phim
  switch(e.key){
    case ' ':
    case 'Enter':
    case 'MediaPlayPause':
      if(e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return; // để Enter hoạt động bình thường trên nút/link
      e.preventDefault();
      if(video.paused){ video.play().catch(()=>{}); showKeyHint('▶'); }
      else { video.pause(); showKeyHint('❚❚'); }
      break;
    case 'ArrowLeft':
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - SEEK_STEP);
      showKeyHint('« ' + SEEK_STEP + 's');
      break;
    case 'ArrowRight':
      e.preventDefault();
      video.currentTime = Math.min(video.duration || Infinity, video.currentTime + SEEK_STEP);
      showKeyHint(SEEK_STEP + 's »');
      break;
    case 'ArrowUp':
      e.preventDefault();
      video.volume = Math.min(1, video.volume + 0.1);
      showKeyHint('🔊 ' + Math.round(video.volume*100) + '%');
      break;
    case 'ArrowDown':
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.1);
      showKeyHint('🔉 ' + Math.round(video.volume*100) + '%');
      break;
    case 'f':
    case 'F':
      e.preventDefault();
      if(document.fullscreenElement){ document.exitFullscreen(); }
      else { document.getElementById('playerFrame').requestFullscreen?.(); }
      break;
  }
});

/* ---------------- router ---------------- */
function router(){
  const hash = location.hash.replace(/^#\//, '') || 'home';
  const [pathPart, queryPart] = hash.split('?');
  const query = new URLSearchParams(queryPart || '');
  const segments = pathPart.split('/').filter(Boolean);
  const routeKey = segments[0] || 'home';
  const params = segments.slice(1);

  document.querySelectorAll('.main-nav a, .mobile-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === pathPart || (a.dataset.route === 'home' && routeKey === 'home' && !params.length));
  });
  document.getElementById('mobileNav').classList.remove('show');
  document.getElementById('mobileSearchBar').classList.remove('show');

  const handler = routes[routeKey] || renderHomePage;
  try{
    Promise.resolve(handler(params, query)).catch(err => {
      console.error('Lỗi tải trang:', err);
      showError(err.message);
    });
  }catch(err){
    console.error('Lỗi tải trang:', err);
    showError(err.message);
  }
  window.scrollTo({top:0});
}
window.addEventListener('hashchange', router);

/* ---------------- search với gợi ý real-time ---------------- */
function setupSearchBox(inputEl, suggestEl){
  let debounce = null;
  const wrap = inputEl.closest('.search-wrap');
  const clearBtn = wrap ? wrap.querySelector('.search-clear') : null;

  function toggleClear(){
    if(wrap) wrap.classList.toggle('has-value', !!inputEl.value.trim());
  }

  function renderRecent(){
    const recent = getRecentSearches();
    if(!recent.length){ suggestEl.classList.remove('show'); return; }
    suggestEl.innerHTML = `
      <div class="suggest-section-label">Tìm kiếm gần đây</div>
      ${recent.map(t => `<div class="suggest-item recent-item" data-term="${escapeHtml(t)}">
        <svg width="16" height="16" viewBox="0 0 24 24" style="flex-shrink:0;color:var(--cream-dim)"><path d="M12 8v4l3 3m6-3a9 9 0 11-9-9 9 9 0 019 9z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
        <div style="flex:1;"><div class="si-name">${escapeHtml(t)}</div></div>
        <button class="remove-recent" data-term="${escapeHtml(t)}" aria-label="Xóa" style="background:none;border:none;color:var(--cream-dim);font-size:1rem;padding:4px;">&times;</button>
      </div>`).join('')}
    `;
    suggestEl.querySelectorAll('.recent-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if(e.target.closest('.remove-recent')) return;
        inputEl.value = el.dataset.term;
        doSearch(el.dataset.term);
      });
    });
    suggestEl.querySelectorAll('.remove-recent').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeRecentSearch(btn.dataset.term);
        renderRecent();
      });
    });
    suggestEl.classList.add('show');
  }

  function doSearch(term){
    addRecentSearch(term);
    location.hash = '#/tim-kiem?keyword=' + encodeURIComponent(term);
    suggestEl.classList.remove('show');
  }

  inputEl.addEventListener('focus', () => {
    if(!inputEl.value.trim()) renderRecent();
  });

  inputEl.addEventListener('input', () => {
    toggleClear();
    clearTimeout(debounce);
    const val = inputEl.value.trim();
    if(!val){ renderRecent(); return; }
    suggestEl.innerHTML = `<div class="suggest-loading">Đang tìm "${escapeHtml(val)}"...</div>`;
    suggestEl.classList.add('show');
    debounce = setTimeout(async () => {
      try{
        const json = await fetchJson(`${API_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(val)}&limit=7`);
        const items = normalizeItems(json);
        if(inputEl.value.trim() !== val) return; // stale response
        suggestEl.innerHTML = items.length
          ? `<div class="suggest-section-label">Kết quả gợi ý</div>` +
            items.map(m => `
            <div class="suggest-item" data-slug="${escapeHtml(m.slug)}">
              <img src="${posterUrl(m.poster_url||m.thumb_url)}" loading="lazy" onerror="this.style.opacity=0">
              <div><div class="si-name">${highlightMatch(m.name, val)}</div><div class="si-meta">${escapeHtml(m.origin_name||'')} ${m.year?'· '+m.year:''}</div></div>
            </div>`).join('') +
            `<a class="suggest-viewall" href="#/tim-kiem?keyword=${encodeURIComponent(val)}">Xem tất cả kết quả cho "${escapeHtml(val)}" →</a>`
          : `<div class="suggest-empty">Không tìm thấy kết quả cho "${escapeHtml(val)}"</div>`;
        suggestEl.querySelectorAll('.suggest-item[data-slug]').forEach(el => {
          el.addEventListener('click', () => {
            addRecentSearch(val);
            location.hash = '#/phim/' + el.dataset.slug;
            suggestEl.classList.remove('show');
            inputEl.value = '';
            toggleClear();
          });
        });
        const viewAllLink = suggestEl.querySelector('.suggest-viewall');
        if(viewAllLink) viewAllLink.addEventListener('click', () => { addRecentSearch(val); suggestEl.classList.remove('show'); });
        suggestEl.classList.add('show');
      }catch(e){
        suggestEl.innerHTML = `<div class="suggest-empty">Lỗi tìm kiếm, thử lại sau.</div>`;
      }
    }, 300);
  });

  inputEl.addEventListener('keydown', e => {
    if(e.key === 'Enter' && inputEl.value.trim()){
      doSearch(inputEl.value.trim());
    }
  });

  if(clearBtn){
    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      toggleClear();
      inputEl.focus();
      renderRecent();
    });
  }

  document.addEventListener('click', e => {
    if(!e.target.closest('.search-wrap') || (wrap && !wrap.contains(e.target) && !e.target.closest('.search-wrap'))){
      if(!inputEl.contains(e.target)) suggestEl.classList.remove('show');
    }
  });
}

setupSearchBox(document.getElementById('searchInput'), document.getElementById('searchSuggest'));
setupSearchBox(document.getElementById('searchInputMobile'), document.getElementById('searchSuggestMobile'));

document.addEventListener('click', e => {
  // Không đóng gợi ý nếu bấm vào chính nút mở thanh tìm kiếm mobile
  if(e.target.closest('#mobileSearchBtn')) return;
  document.querySelectorAll('.search-suggest.show').forEach(el => {
    if(!e.target.closest('.search-wrap')) el.classList.remove('show');
  });
});

/* ---------------- mobile nav & search toggle ---------------- */
document.getElementById('hamburger').addEventListener('click', (e) => {
  e.stopPropagation();
  const mobileNav = document.getElementById('mobileNav');
  const searchBar = document.getElementById('mobileSearchBar');
  mobileNav.classList.toggle('show');
  searchBar.classList.remove('show');
});
document.getElementById('mobileSearchBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const bar = document.getElementById('mobileSearchBar');
  const mobileNav = document.getElementById('mobileNav');
  const willShow = !bar.classList.contains('show');
  bar.classList.toggle('show', willShow);
  mobileNav.classList.remove('show');
  if(willShow){
    setTimeout(() => document.getElementById('searchInputMobile').focus(), 50);
  }
});

/* ---------------- topbar scroll shadow ---------------- */
window.addEventListener('scroll', () => {
  const topbar = document.getElementById('topbar');
  topbar.style.boxShadow = window.scrollY > 20 ? '0 6px 20px rgba(0,0,0,0.4)' : 'none';
}, { passive: true });

/* ---------------- init ---------------- */
document.getElementById('year').textContent = new Date().getFullYear();
buildNavPanels();
router();

/* =========================================================
   ĐIỀU KHIỂN BẰNG REMOTE TV (D-PAD NAVIGATION)
   Cho phép dùng phím mũi tên + OK/Enter để duyệt toàn bộ trang.
   Đơn giản hoá: D-pad chỉ lo việc DI CHUYỂN FOCUS + "Enter = click".
   Việc mở/đóng dropdown Thể loại-Quốc gia đã do buildNavPanels() xử lý
   bằng click thật (xem phía trên), nên khi remote bấm OK trên nút đó,
   nó tự hoạt động giống hệt click chuột — không cần logic riêng nữa.
========================================================= */
const TV_FOCUSABLE_SELECTOR = [
  '.card', '.hero-play', '.hero-dots button', '.btn', '.btn-icon', '.btn-ghost',
  '.card-fav-btn', '.nav-dropdown-btn', '.main-nav > a', '.mobile-nav a',
  '.nav-dropdown-panel a',
  '.brand', '#searchInput', '#searchInputMobile', '.search-clear',
  '.hamburger', '.mobile-search-btn', '.ep-server-btn', '.ep-btn',
  '.pagination button:not(:disabled)', '.pagination-jump input', '.pagination-jump button',
  '.filter-select', '.filter-chip', '.text-btn', '.suggest-item', '.suggest-viewall',
  '.section-more', '.nextup-actions button', '.player-icon-btn', 'a[href]',
].join(', ');

let tvNavActive = false;
let tvFocusedEl = null;

function isVisible(el){
  if(!el) return false;
  const rect = el.getBoundingClientRect();
  if(rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if(style.display === 'none' || style.visibility === 'hidden') return false;
  if(style.opacity === '0') return false;
  return true;
}

function getTvFocusableElements(){
  return [...document.querySelectorAll(TV_FOCUSABLE_SELECTOR)].filter(isVisible);
}

function clearTvFocus(){
  document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));
}

function setTvFocus(el, opts){
  if(!el) return;
  clearTvFocus();
  el.classList.add('tv-focused');
  tvFocusedEl = el;
  if(!opts || opts.scroll !== false){
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

// Tìm phần tử focusable gần nhất theo 1 hướng (up/down/left/right)
// dựa trên vị trí hình học thực tế trên màn hình.
function findNextTvFocus(current, direction){
  const all = getTvFocusableElements();
  if(!current){
    return all[0] || null;
  }
  const curRect = current.getBoundingClientRect();
  const curCenter = { x: curRect.left + curRect.width/2, y: curRect.top + curRect.height/2 };

  let best = null;
  let bestScore = Infinity;

  all.forEach(el => {
    if(el === current) return;
    const rect = el.getBoundingClientRect();
    const center = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    const dx = center.x - curCenter.x;
    const dy = center.y - curCenter.y;

    let primary, cross, valid;
    switch(direction){
      case 'right': valid = dx > 4; primary = dx; cross = dy; break;
      case 'left':  valid = dx < -4; primary = -dx; cross = dy; break;
      case 'down':  valid = dy > 4; primary = dy; cross = dx; break;
      case 'up':    valid = dy < -4; primary = -dy; cross = dx; break;
    }
    if(!valid) return;

    // Điểm số ưu tiên: khoảng cách theo hướng chính + phạt nặng độ lệch ngang/dọc
    const score = primary + Math.abs(cross) * 2.2;
    if(score < bestScore){
      bestScore = score;
      best = el;
    }
  });

  return best;
}

function activateTvMode(){
  if(tvNavActive) return;
  tvNavActive = true;
  document.body.classList.add('tv-nav-active');
  if(!tvFocusedEl || !isVisible(tvFocusedEl)){
    const first = getTvFocusableElements()[0];
    if(first) setTvFocus(first, { scroll: false });
  } else {
    setTvFocus(tvFocusedEl, { scroll: false });
  }
}
function deactivateTvMode(){
  tvNavActive = false;
  document.body.classList.remove('tv-nav-active');
  clearTvFocus();
}

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';
  const isWatchPage = !!document.getElementById('videoPlayer');
  const navKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];

  if(navKeys.includes(e.key)){
    if(isTyping) return;    // để gõ tìm kiếm bình thường
    if(isWatchPage) return; // trang xem phim dùng phím tắt riêng (tua, âm lượng...)

    activateTvMode();
    const dirMap = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' };
    const next = findNextTvFocus(tvFocusedEl, dirMap[e.key]);
    if(next){
      e.preventDefault();
      setTvFocus(next);
    }
    return;
  }

  if((e.key === 'Enter' || e.keyCode === 13) && tvNavActive && tvFocusedEl && !isTyping && !isWatchPage){
    // OK trên remote = click phần tử đang focus. Vì dropdown giờ mở bằng click
    // (xem buildNavPanels), việc này tự động mở/đóng đúng như bấm chuột thật.
    e.preventDefault();
    tvFocusedEl.click();
    return;
  }

  if(e.key === 'Escape' && tvNavActive){
    document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
  }
});

// Di chuột tắt chế độ TV — chỉ khi di chuyển đáng kể, để tránh remote TV
// (Magic Remote LG...) phát tín hiệu con trỏ ảo/rung nhẹ làm tắt D-pad ngay khi vừa bật.
let lastMouseX = null, lastMouseY = null;
document.addEventListener('mousemove', (e) => {
  if(!tvNavActive){ lastMouseX = e.clientX; lastMouseY = e.clientY; return; }
  if(lastMouseX === null){ lastMouseX = e.clientX; lastMouseY = e.clientY; return; }
  const moved = Math.abs(e.clientX - lastMouseX) + Math.abs(e.clientY - lastMouseY);
  lastMouseX = e.clientX; lastMouseY = e.clientY;
  if(moved > 8) deactivateTvMode();
}, { passive: true });
document.addEventListener('touchstart', () => { if(tvNavActive) deactivateTvMode(); }, { passive: true });

// Sau mỗi lần chuyển trang, nếu đang ở chế độ TV thì tự focus phần tử đầu tiên
window.addEventListener('hashchange', () => {
  if(tvNavActive){
    setTimeout(() => {
      const first = getTvFocusableElements()[0];
      if(first) setTvFocus(first, { scroll: false });
    }, 120);
  }
});
