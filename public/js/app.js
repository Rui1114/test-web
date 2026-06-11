/* ═══════════════════════════════════════════════════════════
   Policy Debt Intelligence — App Logic  v3.0
   ═══════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────
const state = {
  bonds: [],
  policies: { central: [], local: {} },
  summaries: {},
  metadata: {},
  regions: {},
  selectedLocalProvince: null,
  currentPage: 'landing',
  currentLBTab: 'lb-select',
  currentInnerTabs: { 'lb-tracking': 'central-policy' }
};

// ─── Region definitions ───────────────────────────────────────
const REGIONS = {
  '北部区域': ['北京', '天津', '河北', '辽宁', '吉林', '内蒙古'],
  '中部区域': ['河南', '山西', '陕西'],
  '西南区域': ['四川', '云南', '重庆'],
  '贵州区域': ['贵州'],
  '华南区域': ['广东', '福建', '江西', '广西', '湖南', '湖北'],
  '东部区域': ['山东', '浙江'],
};

const REGION_COLORS = {
  '北部区域': 'tag-blue', '中部区域': 'tag-orange',
  '西南区域': 'tag-orange', '贵州区域': 'tag-red',
  '华南区域': 'tag-blue', '东部区域': 'tag-teal',
  '北部': 'tag-blue', '中部': 'tag-orange',
  '西南': 'tag-orange', '贵州': 'tag-red',
  '华南': 'tag-blue', '东部': 'tag-teal',
};

// ─── Region policy summaries (drawer exteriors) ──────────────
const REGION_SUMMARIES = {
  '北部区域': {
    tags: ['再融资主导', '部分自审自发'],
    summary: '河北已纳入自审自发试点，发债节奏明显提速；吉林正式退出高风险名单后新增额度空间打开；内蒙古化债资金集中向清欠方向倾斜，专项清欠资金持续落地；辽宁特殊专项债占比超60%，清偿拖欠账款优先级高。'
  },
  '中部区域': {
    tags: ['省委强力部署', '再融资主导'],
    summary: '陕西省委专题部署"加力清理拖欠企业账款"，力争隐性债务全面清零，政策落地推进力度领先；河南补充财力类清欠台账已录入171个项目；山西以再融资为主，重点关注服务类欠款清理窗口。'
  },
  '西南区域': {
    tags: ['化债力度大', '部分自审自发'],
    summary: '四川化债力度全国最强之一，省级承担5%配套减轻市县压力；云南大规模置换债持续落地，资金到账后30–60天为最佳跟进窗口；重庆纳入自审自发扩围，再融资释放大量财政现金流。'
  },
  '贵州区域': {
    tags: ['全国化债重点', '政策倾斜最强'],
    summary: '全国化债重点省份，新增专项债主要向化债方向倾斜，补充财力类资金优先用于清偿企业欠款。建议将在贵州的欠款优先纳入全口径债务监测平台，争取下一批次资金拨付。'
  },
  '华南区域': {
    tags: ['自审自发扩围', '发行规模最大'],
    summary: '广东新增专项债全国占比最高，湖南清欠纳入省级督查激励体系，存量欠款清偿概率较高；湖北、江西相继纳入自审自发扩围，审批效率大幅提升；福建全年置换进度全国领先，华南为整体发债最活跃区域。'
  },
  '东部区域': {
    tags: ['发行规模大', '建设类为主'],
    summary: '山东发债批次密集、规模全国前列，但化债资金占比偏低，以建设类专项债为主；浙江财政实力强，债务压力相对较小，化债资金主要来源于自审自发试点的补充财力类资金。'
  }
};

// ─── Level 1: Main page navigation ──────────────────────────
function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  const page = document.getElementById(pageId);
  if (page) { page.style.display = 'block'; page.classList.add('active'); }
  state.currentPage = pageId;
}

function goToPage(pageId) {
  switchPage(pageId);
  if (pageId === 'central-subsidies') initSubsidiesPage();
  if (pageId === 'local-bonds') switchLBSubPage('lb-select');
}

// ─── Level 2: Sub-pages within 地方债券 ─────────────────────
function switchLBSubPage(subPageId) {
  document.querySelectorAll('#local-bonds .lb-subpage').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  const p = document.getElementById(subPageId);
  if (p) { p.style.display = 'block'; p.classList.add('active'); }
  state.currentLBTab = subPageId;
  if (subPageId === 'lb-policy-news')  renderPolicyNewsPage();
  if (subPageId === 'lb-policy-track') renderHuaZhaiSpecial();
}

// ─── Level 3: Inner tabs within a lb-tab ────────────────────
function switchInnerTab(parentId, tabId, btn) {
  const parent = document.getElementById(parentId);
  if (!parent) return;
  parent.querySelectorAll('.tab-content').forEach(t => { t.style.display = 'none'; t.classList.remove('active'); });
  parent.querySelectorAll('.inner-sub-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
  if (btn) btn.classList.add('active');
  state.currentInnerTabs[parentId] = tabId;
}


// ─── Fetch data ───────────────────────────────────────────────
async function fetchData() {
  try {
    const [metaRes, bondsRes, policiesRes, summariesRes] = await Promise.all([
      fetch('/data/metadata.json'), fetch('/data/bonds.json'),
      fetch('/data/policies.json'), fetch('/data/summaries.json')
    ]);
    state.metadata = await metaRes.json();
    const bondsData = await bondsRes.json();
    state.bonds = bondsData.bonds || [];
    state.policies = await policiesRes.json();
    state.summaries = await summariesRes.json();
  } catch (e) {
    console.error('Failed to fetch data:', e);
  }
}

// ─── Render Header ───────────────────────────────────────────
function renderHeader() {
  const m = state.metadata;
  const start = m.dataRangeStartLabel || m.dataRangeStart || '—';
  const end   = m.dataRangeEndLabel   || m.dataRangeEnd   || '—';
  const el = document.getElementById('dbValidity');
  if (el) el.textContent = `数据库有效期: ${start} — ${end}`;
  const lu = document.getElementById('lastUpdateLabel');
  if (lu) lu.textContent = `最后更新: ${m.lastUpdated || '—'}`;
}

// ─── 总览 overview ─────────────────────────────────────────
function renderOverview() {
  const bonds = state.bonds;
  if (!bonds.length) return;

  // Beijing time: use local date (server is likely UTC+8 or JS will use local TZ)
  const now = new Date();
  const bjOffset = 8 * 60; // UTC+8
  const bjDate = new Date(now.getTime() + (bjOffset - now.getTimezoneOffset()) * 60000);
  const thisYear = bjDate.getUTCFullYear();
  const lastYear = thisYear - 1;

  const yr = b => parseInt((b.issueMonth || b.addedDate || '2000-01').slice(0, 4), 10);

  const thisYearBonds = bonds.filter(b => yr(b) === thisYear);
  const lastYearBonds = bonds.filter(b => yr(b) === lastYear);

  const sumActual = arr => arr.reduce((s, b) => s + (b.actualAmount || 0), 0);
  const sumPlanned = arr => arr.reduce((s, b) => s + (b.plannedAmount || 0), 0);

  const tyActual = sumActual(thisYearBonds);
  const lyActual = sumActual(lastYearBonds);

  const bizBonds = thisYearBonds.filter(b =>
    b.isSpecial ||
    (b.purpose && (b.purpose.includes('补充财力') || b.purpose.includes('清欠') || b.purpose.includes('清偿拖欠')))
  );
  const zhiBonds = thisYearBonds.filter(b => b.subtype && b.subtype.includes('置换存量隐性债务'));

  const $ = s => document.getElementById(s);
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };

  set('ovTotalCount', bonds.length + ' 条');
  set('ovThisYearActual', tyActual >= 10000 ? (tyActual / 10000).toFixed(2) + '万' : tyActual.toFixed(0));
  set('ovThisYearLabel', `亿元 (${thisYear}年1-${bjDate.getUTCMonth() + 1}月 YTD)`);
  set('ovLastYearActual', lyActual >= 10000 ? (lyActual / 10000).toFixed(2) + '万' : lyActual.toFixed(0));
  set('ovLastYearLabel', `亿元 (${lastYear}年全年)`);
  set('ovNewBizBond', sumActual(bizBonds).toFixed(0));
  set('ovRefiZhiHuan', sumActual(zhiBonds).toFixed(0));

  // ── Two-year comparison grid ──
  const compare = document.getElementById('ovYearCompare');
  if (compare) {
    const makeCard = (year, yrBonds, label) => {
      const total = sumActual(yrBonds);
      const newSpecial = yrBonds.filter(b => b.type && b.type.includes('新增专项'));
      const refi = yrBonds.filter(b => b.type && b.type.includes('再融资'));
      const newGeneral = yrBonds.filter(b => b.type && b.type.includes('新增一般'));
      const special = yrBonds.filter(b => b.isSpecial);
      return `
        <div class="section-card">
          <div class="section-card-header">
            <div class="section-card-title">${year}年 发债概况 <span style="font-size:.75rem;font-weight:400;color:var(--gray-500)">${label}</span></div>
            <span class="tag tag-teal">${yrBonds.length} 笔</span>
          </div>
          <div class="section-card-body">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
              <div class="region-stat">
                <div class="region-stat-label">实际发行合计</div>
                <div class="region-stat-value">${total >= 10000 ? (total/10000).toFixed(2)+'万' : total.toFixed(0)}<span>亿</span></div>
              </div>
              <div class="region-stat">
                <div class="region-stat-label">发债笔数</div>
                <div class="region-stat-value">${yrBonds.length}<span>笔</span></div>
              </div>
              <div class="region-stat">
                <div class="region-stat-label">特殊专项债</div>
                <div class="region-stat-value">${special.length}<span>笔</span></div>
              </div>
            </div>
            <div style="font-size:.78rem;color:var(--gray-600);line-height:1.8">
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--gray-100);padding:3px 0"><span>新增专项债</span><strong>${newSpecial.length} 笔 / ${sumActual(newSpecial).toFixed(0)} 亿</strong></div>
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--gray-100);padding:3px 0"><span>再融资债（专项+一般）</span><strong>${refi.length} 笔 / ${sumActual(refi).toFixed(0)} 亿</strong></div>
              <div style="display:flex;justify-content:space-between;padding:3px 0"><span>新增一般债</span><strong>${newGeneral.length} 笔 / ${sumActual(newGeneral).toFixed(0)} 亿</strong></div>
            </div>
          </div>
        </div>`;
    };
    compare.innerHTML =
      makeCard(thisYear, thisYearBonds, `YTD截至${bjDate.getUTCMonth()+1}月`) +
      makeCard(lastYear, lastYearBonds, '全年数据');
  }

}

// ─── Render Central Policies ─────────────────────────────────
function renderCentralPolicies() {
  const list = document.getElementById('centralPolicyList');
  if (!list) return;
  const typeFilter = document.getElementById('cpTypeFilter')?.value || '';
  const search = (document.getElementById('cpSearch')?.value || '').toLowerCase();

  let policies = (state.policies.central || []).filter(p => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (search && !p.title.toLowerCase().includes(search) && !p.summary.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const cpCount = document.getElementById('cpCount');
  if (cpCount) cpCount.textContent = policies.length;

  if (!policies.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">未找到匹配的政策记录</div></div>`;
    return;
  }
  list.innerHTML = policies.map(p => `
    <div class="policy-card">
      <div class="policy-card-header">
        <div class="policy-title">${escHtml(p.title)}</div>
        <span class="tag tag-blue" style="white-space:nowrap">${escHtml(p.type)}</span>
      </div>
      <div class="policy-meta">
        <span class="policy-date">📅 ${p.date}</span>
        ${(p.bondTypes || []).map(t => `<span class="tag tag-special">${escHtml(t)}</span>`).join('')}
      </div>
      <div class="policy-summary">${escHtml(p.summary)}</div>
      ${p.keyPoints && p.keyPoints.length ? `
        <div class="policy-keypoints">
          <ul class="key-points" style="margin-top:10px">
            ${p.keyPoints.map(k => `<li>${escHtml(k)}</li>`).join('')}
          </ul>
        </div>` : ''}
      <div class="policy-footer">
        ${p.url ? `<a href="${escHtml(p.url)}" target="_blank" rel="noopener" class="link-icon">🔗 查看原文</a>` : ''}
      </div>
    </div>
  `).join('');
}

// ─── Province Selectors ───────────────────────────────────────
function renderProvinceSelectorLocal() {
  const container = document.getElementById('provinceSelectorLocal');
  if (!container) return;
  let html = '';
  for (const [region, provinces] of Object.entries(REGIONS)) {
    html += `<button class="region-header-chip" onclick="filterLocalByRegion('${region}')">${region}</button>`;
    provinces.forEach(p => {
      html += `<button class="province-chip ${state.selectedLocalProvince === p ? 'active' : ''}" onclick="filterLocalByProvince('${p}', this)">${p}</button>`;
    });
  }
  container.innerHTML = html;
}

function filterLocalByRegion(region) {
  const provinces = REGIONS[region] || [];
  if (!provinces.length) return;
  filterLocalByProvince(provinces[0], null);
  document.querySelectorAll('#provinceSelectorLocal .province-chip').forEach(chip => {
    chip.classList.toggle('active', provinces.includes(chip.textContent));
  });
}

function filterLocalByProvince(province, btn) {
  state.selectedLocalProvince = province;
  document.querySelectorAll('#provinceSelectorLocal .province-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelectorAll('#provinceSelectorLocal .province-chip').forEach(c => {
    if (c.textContent === province) c.classList.add('active');
  });
  renderLocalPolicies();
}

function renderLocalPolicies() {
  const list = document.getElementById('localPolicyList');
  if (!list) return;
  const local = state.policies.local || {};
  const provincesToShow = state.selectedLocalProvince ? [state.selectedLocalProvince] : Object.keys(local);
  let html = '';
  for (const province of provincesToShow) {
    const pols = local[province] || [];
    if (!pols.length) continue;
    const regionName = Object.entries(REGIONS).find(([, ps]) => ps.includes(province))?.[0] || '';
    html += `<div class="section-card" style="margin-bottom:14px">
      <div class="section-card-header">
        <div class="section-card-title">${province} ${regionName ? `<span class="tag ${REGION_COLORS[regionName] || 'tag-blue'}">${regionName}</span>` : ''}</div>
        <span class="tag tag-teal">${pols.length} 条记录</span>
      </div>
      <div class="section-card-body" style="padding:12px 16px">
        ${pols.map(p => `
          <div class="policy-card local" style="margin-bottom:10px;border-left-color:var(--green-600)">
            <div class="policy-card-header">
              <div class="policy-title">${escHtml(p.title)}</div>
              <span class="tag tag-green" style="white-space:nowrap">${escHtml(p.type)}</span>
            </div>
            <div class="policy-meta">
              <span class="policy-date">📅 ${p.date}</span>
              ${(p.bondTypes || []).map(t => `<span class="tag tag-special">${escHtml(t)}</span>`).join('')}
            </div>
            <div class="policy-summary">${escHtml(p.summary)}</div>
            ${p.keyPoints && p.keyPoints.length ? `<ul class="key-points" style="margin-top:10px">${p.keyPoints.map(k => `<li>${escHtml(k)}</li>`).join('')}</ul>` : ''}
            <div class="policy-footer">${p.url ? `<a href="${escHtml(p.url)}" target="_blank" rel="noopener" class="link-icon">🔗 原文</a>` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }
  if (!html) html = `<div class="empty-state"><div class="empty-icon">🗺️</div><div class="empty-text">请选择省份查看地方政策</div></div>`;
  list.innerHTML = html;
}

// ─── Policy News Page ────────────────────────────────────────
function renderPolicyNewsPage() {
  renderCentralSummary();
  renderRegionDrawers();
  document.getElementById('policy-news-overview').style.display = 'block';
  document.getElementById('region-detail-view').style.display = 'none';
}

function renderCentralSummary() {
  const wrap = document.getElementById('central-policy-summary-wrap');
  if (!wrap) return;
  const central = state.policies.central || [];
  const count = central.length;
  const typeGroups = {};
  central.forEach(p => { typeGroups[p.type] = (typeGroups[p.type] || 0) + 1; });
  const typeStr = Object.entries(typeGroups).map(([t, n]) => `${t}${n}项`).join('、');
  wrap.innerHTML = `
    <div class="section-card" style="margin-bottom:22px">
      <div class="section-card-header">
        <div class="section-card-title">🏛️ 中央政策概况</div>
        <span class="tag tag-blue">${count} 条记录（过去两个单位年）</span>
      </div>
      <div class="section-card-body">
        <p style="font-size:.87rem;color:var(--gray-700);line-height:1.9;margin-bottom:16px">
          2025至2026年间，中央共出台 <strong>${count}</strong> 项化债相关政策，涵盖${typeStr}。
          政策重点围绕三条主线推进：① 2026年全国新增专项债额度达 <strong>4.4万亿元</strong>，其中特殊新增专项债额度同比增长
          <strong>39%</strong>，可直接用于偿付服务类欠款与化解隐性债务；
          ② 超长期特别国债（设备更新与消费方向）2000亿元下达进度已达 <strong>92%</strong>，对接条件持续放宽；
          ③ <strong>8000亿元</strong>新型政策性金融工具已于二季度启动，为市县化债提供低息融资支撑。
          整体政策方向明确：以"补充财力类"专项债为核心化债工具，推动地方财政化债与清偿企业欠款并行落地。
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div class="stat-chip"><span>新增专项债额度</span><strong>4.4万亿</strong></div>
          <div class="stat-chip"><span>特殊新增专项债增幅</span><strong>+39%</strong></div>
          <div class="stat-chip"><span>超长期国债（设备更新）</span><strong>2000亿</strong></div>
          <div class="stat-chip"><span>政策性金融工具</span><strong>8000亿</strong></div>
        </div>
      </div>
    </div>`;
}

function renderRegionDrawers() {
  const wrap = document.getElementById('region-drawers-wrap');
  if (!wrap) return;
  const local = state.policies.local || {};
  wrap.innerHTML = `
    <div style="font-size:.88rem;font-weight:700;color:var(--gray-700);margin-bottom:14px;display:flex;align-items:center;gap:10px">
      🗺️ 六大区域政策动态
      <span style="font-size:.75rem;font-weight:400;color:var(--gray-500)">点击区域名称查看各省详细政策信息</span>
    </div>
    <div class="region-drawer-grid">
      ${Object.entries(REGION_SUMMARIES).map(([region, data]) => {
        const provinces = REGIONS[region] || [];
        const count = provinces.reduce((s, p) => s + (local[p]?.length || 0), 0);
        return `
          <div class="region-drawer-card">
            <div class="region-drawer-header" onclick="openRegionDetail('${region}')">
              <div class="region-drawer-title">
                <span class="region-drawer-name">${region}</span>
                <span class="region-drawer-count">${count} 条政策</span>
              </div>
              <div class="region-drawer-provinces">
                ${provinces.map(p => `<span class="province-mini-tag">${p}</span>`).join('')}
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  ${data.tags.map(t => `<span class="tag tag-blue" style="font-size:.68rem">${t}</span>`).join('')}
                </div>
                <span class="region-drawer-arrow">查看详情 →</span>
              </div>
            </div>
            <div class="region-drawer-summary">${data.summary}</div>
          </div>`;
      }).join('')}
    </div>`;
}

function openRegionDetail(regionName) {
  document.getElementById('policy-news-overview').style.display = 'none';
  const detail = document.getElementById('region-detail-view');
  detail.style.display = 'block';
  document.getElementById('region-detail-title-label').textContent = regionName + ' — 详细政策动态';
  const local = state.policies.local || {};
  const provinces = REGIONS[regionName] || [];
  let html = '';
  for (const province of provinces) {
    const pols = local[province] || [];
    if (!pols.length) continue;
    html += `<div class="section-card" style="margin-bottom:14px">
      <div class="section-card-header">
        <div class="section-card-title">${province}</div>
        <span class="tag tag-teal">${pols.length} 条记录</span>
      </div>
      <div class="section-card-body" style="padding:12px 16px">
        ${pols.map(p => `
          <div class="policy-card local" style="margin-bottom:10px;border-left-color:var(--green-600)">
            <div class="policy-card-header">
              <div class="policy-title">${escHtml(p.title)}</div>
              <span class="tag tag-green" style="white-space:nowrap">${escHtml(p.type)}</span>
            </div>
            <div class="policy-meta">
              <span class="policy-date">📅 ${p.date}</span>
              ${(p.bondTypes||[]).map(t=>`<span class="tag tag-special">${escHtml(t)}</span>`).join('')}
            </div>
            <div class="policy-summary">${escHtml(p.summary)}</div>
            ${p.keyPoints&&p.keyPoints.length?`<ul class="key-points" style="margin-top:10px">${p.keyPoints.map(k=>`<li>${escHtml(k)}</li>`).join('')}</ul>`:''}
            <div class="policy-footer">${p.url?`<a href="${escHtml(p.url)}" target="_blank" rel="noopener" class="link-icon">🔗 原文</a>`:''}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }
  if (!html) html = `<div class="empty-state"><div class="empty-icon">🗺️</div><div class="empty-text">${regionName}暂无收录政策记录</div></div>`;
  document.getElementById('region-detail-content').innerHTML = html;
}

function closeRegionDetail() {
  document.getElementById('region-detail-view').style.display = 'none';
  document.getElementById('policy-news-overview').style.display = 'block';
}

// ─── Bond Table (近三月) ──────────────────────────────────────
function populateBondFilters() {
  const regionSel = document.getElementById('bondRegionFilter');
  if (regionSel && regionSel.options.length === 1) {
    Object.keys(REGIONS).forEach(r => {
      const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
      regionSel.appendChild(opt);
    });
  }
}

function onBondRegionChange() {
  const region = document.getElementById('bondRegionFilter')?.value;
  const provinceSel = document.getElementById('bondProvinceFilter');
  if (!provinceSel) return;
  while (provinceSel.options.length > 1) provinceSel.remove(1);
  const provinces = region && REGIONS[region]
    ? REGIONS[region]
    : [...new Set(state.bonds.map(b => b.province))].sort();
  provinces.forEach(p => {
    const opt = document.createElement('option'); opt.value = p; opt.textContent = p;
    provinceSel.appendChild(opt);
  });
  renderBondTable();
}

function resetBondFilters() {
  ['bondRegionFilter','bondProvinceFilter','bondTypeFilter'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const cb = document.getElementById('bondSpecialFilter'); if (cb) cb.checked = false;
  onBondRegionChange();
}

function getRecentBonds(months = 3) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return state.bonds.filter(b => new Date((b.issueMonth || b.addedDate || '2020-01') + '-01') >= cutoff);
}

function renderBondTable() {
  const tbody = document.getElementById('bondTableBody');
  if (!tbody) return;
  const region    = document.getElementById('bondRegionFilter')?.value;
  const province  = document.getElementById('bondProvinceFilter')?.value;
  const type      = document.getElementById('bondTypeFilter')?.value;
  const special   = document.getElementById('bondSpecialFilter')?.checked;
  let bonds = getRecentBonds(3);
  if (region)  bonds = bonds.filter(b => b.region === region);
  if (province) bonds = bonds.filter(b => b.province === province);
  if (type)    bonds = bonds.filter(b => b.type === type);
  if (special) bonds = bonds.filter(b => b.isSpecial);
  bonds.sort((a, b) => (b.issueMonth || '').localeCompare(a.issueMonth || ''));

  const countEl = document.getElementById('bondTableCount');
  if (countEl) countEl.textContent = `共 ${bonds.length} 条`;

  const allRecent = getRecentBonds(3);
  const el = id => document.getElementById(id);
  if (el('bondCountRecent')) el('bondCountRecent').textContent = allRecent.length;
  if (el('bondSpecialCount')) el('bondSpecialCount').textContent = allRecent.filter(b => b.isSpecial).length;
  if (el('bondZHHAmount')) {
    const total = allRecent.filter(b => b.subtype === '置换存量隐性债务').reduce((s,b) => s+(b.actualAmount||0), 0);
    el('bondZHHAmount').textContent = total > 1000 ? (total/10000).toFixed(2)+'万' : total.toFixed(0);
  }

  if (!bonds.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gray-400)">近三个月暂无符合条件的发债记录</td></tr>`;
    return;
  }
  tbody.innerHTML = bonds.map(b => `
    <tr>
      <td><strong>${escHtml(b.province)}</strong><br><span class="tag ${REGION_COLORS[b.region]||'tag-blue'}" style="margin-top:3px;display:inline-block">${escHtml(b.region)}</span></td>
      <td style="max-width:260px">
        <div style="font-weight:600;line-height:1.4">${escHtml(b.name)}</div>
        ${b.isSpecial ? `<span class="tag tag-special" style="margin-top:4px">✦ 特殊专项债</span>` : ''}
      </td>
      <td><span class="tag ${getBondTypeTag(b.type)}">${escHtml(b.type)}</span>${b.subtype?`<br><span style="font-size:.72rem;color:var(--gray-500);margin-top:3px;display:inline-block">${escHtml(b.subtype)}</span>`:''}
      </td>
      <td class="amount">${b.plannedAmount!=null?b.plannedAmount.toFixed(2):'—'}</td>
      <td class="actual-amount">${b.actualAmount!=null?b.actualAmount.toFixed(2):'—'}</td>
      <td style="text-align:center">${b.term!=null?b.term+'年':'—'}</td>
      <td style="max-width:240px;font-size:.78rem;color:var(--gray-700)">${escHtml(b.purpose||'—')}</td>
      <td style="white-space:nowrap">${b.issueMonth||'—'}</td>
      <td>${renderBondLinks(b)}</td>
    </tr>
  `).join('');
}

function renderBondLinks(b) {
  const links = b.links || {};
  const parts = [];
  if (links.chinabond)   parts.push(`<a href="${escHtml(links.chinabond)}"   target="_blank" rel="noopener" class="link-icon">中债</a>`);
  if (links.credit)      parts.push(`<a href="${escHtml(links.credit)}"      target="_blank" rel="noopener" class="link-icon">资信</a>`);
  if (links.disclosure)  parts.push(`<a href="${escHtml(links.disclosure)}"  target="_blank" rel="noopener" class="link-icon">披露</a>`);
  if (links.bondInfo)    parts.push(`<a href="${escHtml(links.bondInfo)}"    target="_blank" rel="noopener" class="link-icon">债券</a>`);
  return parts.length ? `<div class="link-group">${parts.join('')}</div>` : '<span style="color:var(--gray-400);font-size:.75rem">—</span>';
}

function getBondTypeTag(type) {
  if (!type) return 'tag-blue';
  if (type.includes('新增专项')) return 'tag-green';
  if (type.includes('再融资专项')) return 'tag-orange';
  if (type.includes('再融资一般')) return 'tag-teal';
  return 'tag-blue';
}

// ─── All Bonds Table (两个单位年各省详情) ────────────────────
function populateAllBondFilters() {
  const regionSel = document.getElementById('allBondRegionFilter');
  if (regionSel && regionSel.options.length === 1) {
    Object.keys(REGIONS).forEach(r => {
      const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
      regionSel.appendChild(opt);
    });
  }
  const chips = document.getElementById('allBondProvinceChips');
  if (chips && !chips.children.length) {
    const provinces = [...new Set(state.bonds.map(b => b.province))].sort();
    const allBtn = document.createElement('button');
    allBtn.className = 'province-chip active'; allBtn.textContent = '全部省份';
    allBtn.onclick = () => selectAllBondProvince(null, allBtn);
    chips.appendChild(allBtn);
    provinces.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'province-chip'; btn.textContent = p;
      btn.onclick = () => selectAllBondProvince(p, btn);
      chips.appendChild(btn);
    });
  }
  onAllBondRegionChange();
}

function selectAllBondProvince(province, btn) {
  const sel = document.getElementById('allBondProvinceFilter');
  if (sel) sel.value = province || '';
  document.querySelectorAll('#allBondProvinceChips .province-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAllBondsTable();
}

function onAllBondRegionChange() {
  const region = document.getElementById('allBondRegionFilter')?.value;
  const sel = document.getElementById('allBondProvinceFilter');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  const provinces = region && REGIONS[region]
    ? REGIONS[region]
    : [...new Set(state.bonds.map(b => b.province))].sort();
  provinces.forEach(p => {
    const opt = document.createElement('option'); opt.value = p; opt.textContent = p;
    sel.appendChild(opt);
  });
  renderAllBondsTable();
}

function resetAllBondFilters() {
  ['allBondRegionFilter','allBondProvinceFilter','allBondTypeFilter'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const cb = document.getElementById('allBondSpecialFilter'); if (cb) cb.checked = false;
  document.querySelectorAll('#allBondProvinceChips .province-chip').forEach(c => c.classList.remove('active'));
  const first = document.querySelector('#allBondProvinceChips .province-chip');
  if (first) first.classList.add('active');
  onAllBondRegionChange();
}

function renderAllBondsTable() {
  const tbody = document.getElementById('allBondTableBody');
  if (!tbody) return;
  const region   = document.getElementById('allBondRegionFilter')?.value;
  const province = document.getElementById('allBondProvinceFilter')?.value;
  const type     = document.getElementById('allBondTypeFilter')?.value;
  const special  = document.getElementById('allBondSpecialFilter')?.checked;
  let bonds = [...state.bonds];
  if (region)   bonds = bonds.filter(b => b.region === region);
  if (province) bonds = bonds.filter(b => b.province === province);
  if (type)     bonds = bonds.filter(b => b.type === type);
  if (special)  bonds = bonds.filter(b => b.isSpecial);
  bonds.sort((a, b) => {
    if (a.province !== b.province) return a.province.localeCompare(b.province, 'zh');
    return (b.issueMonth||'').localeCompare(a.issueMonth||'');
  });

  const el = s => document.getElementById(s);
  if (el('allBondTotal'))         el('allBondTotal').textContent = state.bonds.length;
  if (el('allBondProvinceCount')) el('allBondProvinceCount').textContent = new Set(state.bonds.map(b => b.province)).size;
  if (el('allBondSpecialCount'))  el('allBondSpecialCount').textContent = state.bonds.filter(b => b.isSpecial).length;
  if (el('allBondTableCount'))    el('allBondTableCount').textContent = `共 ${bonds.length} 条`;

  if (!bonds.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gray-400)">暂无符合条件的发债记录</td></tr>`;
    return;
  }
  tbody.innerHTML = bonds.map(b => `
    <tr>
      <td><strong>${escHtml(b.province)}</strong><br><span class="tag ${REGION_COLORS[b.region]||'tag-blue'}" style="margin-top:3px;display:inline-block">${escHtml(b.region)}</span></td>
      <td style="max-width:280px">
        <div style="font-weight:600;line-height:1.4">${escHtml(b.name)}</div>
        ${b.batch ? `<div style="font-size:.74rem;color:var(--gray-500);margin-top:2px">${escHtml(b.batch)}</div>` : ''}
        ${b.isSpecial ? `<span class="tag tag-special" style="margin-top:4px;display:inline-block">✦ 特殊专项债</span>` : ''}
      </td>
      <td><span class="tag ${getBondTypeTag(b.type)}">${escHtml(b.type)}</span>${b.subtype?`<br><span style="font-size:.72rem;color:var(--gray-500);margin-top:3px;display:inline-block">${escHtml(b.subtype)}</span>`:''}
      </td>
      <td class="amount">${b.plannedAmount!=null?b.plannedAmount.toFixed(2):'—'}</td>
      <td class="actual-amount">${b.actualAmount!=null?b.actualAmount.toFixed(2):'—'}</td>
      <td style="text-align:center">${b.term!=null?b.term+'年':'—'}</td>
      <td style="max-width:240px;font-size:.78rem;color:var(--gray-700)">${escHtml(b.purpose||'—')}</td>
      <td style="white-space:nowrap">${b.issueMonth||'—'}</td>
      <td>${renderBondLinks(b)}</td>
    </tr>
  `).join('');
}


// ─── AI Box ──────────────────────────────────────────────────
function renderAIBox() {
  const m = state.metadata;
  if (m.latestAIAnalysis) {
    const el = document.getElementById('centralAIContent');
    if (el) el.textContent = m.latestAIAnalysis;
    const timeEl = document.getElementById('centralAITime');
    if (timeEl && m.latestAIAnalysisTime) timeEl.textContent = '更新时间: ' + m.latestAIAnalysisTime.slice(0,10);
  }
}

// ─── Utilities ───────────────────────────────────────────────
function escHtml(str) {
  if (typeof str !== 'string') return str ?? '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatAmt(n) {
  if (n == null || n === 0) return '—';
  if (n >= 10000) return (n/10000).toFixed(1) + '万';
  return n >= 1 ? Math.round(n).toString() : n.toFixed(2);
}

// ─── 中央补贴 Page ───────────────────────────────────────────
const SUBSIDY_TYPE_COLORS = { '新闻稿件': 'tag-blue', '政府文件': 'tag-orange', '研报': 'tag-special' };
const RELEVANCE_COLORS = {
  'green': 'var(--green-700)', 'blue': 'var(--blue-900)',
  'purple': '#6A1B9A', 'orange': '#E65100'
};

let subsidiesData = null;
let currentSubsidyChannel = 'ultra-bond';
let subsidiesProvFilter = null;

async function loadSubsidiesData() {
  if (subsidiesData) return subsidiesData;
  try {
    const r = await fetch('/data/subsidies.json');
    subsidiesData = await r.json();
  } catch (e) { subsidiesData = { channels: [] }; }
  return subsidiesData;
}

async function initSubsidiesPage() {
  const data = await loadSubsidiesData();
  const el = document.getElementById('subsidyDateRange');
  if (el && state.metadata.dataRangeStartLabel && state.metadata.dataRangeEndLabel) {
    el.textContent = state.metadata.dataRangeStartLabel + ' — ' + state.metadata.dataRangeEndLabel;
  }
  renderSubsidyChannel(currentSubsidyChannel);
}

function switchSubsidyChannel(channelId, btn) {
  currentSubsidyChannel = channelId;
  subsidiesProvFilter = null;
  document.querySelectorAll('#central-subsidies .sub-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderSubsidyChannel(channelId);
}

async function renderSubsidyChannel(channelId) {
  const data = await loadSubsidiesData();
  const channel = (data.channels || []).find(c => c.id === channelId);
  const container = document.getElementById('subsidyChannelDetail');
  if (!channel || !container) return;

  const provinces = Object.keys(channel.provinces || {});
  const relevColor = RELEVANCE_COLORS[channel.relevanceColor] || 'var(--blue-900)';

  container.innerHTML = `
    <div class="section-card" style="margin-bottom:16px">
      <div class="section-card-body">
        <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-start">
          <div style="flex:1; min-width:260px">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px">
              <span style="font-size:1.5rem">${channel.icon}</span>
              <div>
                <div style="font-size:1rem; font-weight:700; color:var(--gray-900)">${escHtml(channel.name)}</div>
                <span class="tag" style="background:${relevColor}1a; color:${relevColor}; border:1px solid ${relevColor}40; font-size:.7rem">${escHtml(channel.relevanceLevel)}</span>
              </div>
              ${channel.annualAmount ? `<div style="margin-left:auto; text-align:right">
                <div style="font-size:1.4rem; font-weight:800; color:${relevColor}">${channel.annualAmount.toLocaleString()}</div>
                <div style="font-size:.7rem; color:var(--gray-500)">${escHtml(channel.unit)}</div>
              </div>` : ''}
            </div>
            <div style="font-size:.8rem; color:var(--gray-700); line-height:1.7; margin-bottom:10px">${escHtml(channel.description)}</div>
            <div style="padding:10px 12px; background:#FFF8E1; border-radius:6px; border:1px solid #FFD54F; font-size:.78rem; color:#E65100; line-height:1.6">
              <strong>⚡ 与化债的关联：</strong>${escHtml(channel.relevanceNote)}
            </div>
          </div>
          <div style="min-width:240px; max-width:320px">
            <div style="font-size:.78rem; font-weight:700; color:var(--gray-700); margin-bottom:8px">📋 申报条件摘要</div>
            <ul style="margin:0; padding-left:16px; font-size:.75rem; color:var(--gray-700); line-height:1.8">
              ${(channel.applicationConditions || []).map(c => `<li>${escHtml(c)}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div style="margin-top:12px; padding:10px 14px; background:var(--green-50); border-radius:6px; border:1px solid var(--green-100); font-size:.78rem; color:var(--gray-700)">
          <strong style="color:var(--green-800)">申报路径：</strong>${escHtml(channel.applicationPath)}
        </div>
        ${(channel.keyDates || []).length ? `
        <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px">
          ${channel.keyDates.map(d => `
            <div style="padding:6px 12px; background:var(--blue-50); border-radius:6px; border:1px solid var(--blue-100); font-size:.74rem">
              <strong style="color:var(--blue-900)">${escHtml(d.label)}</strong>
              <span style="color:var(--gray-500); margin:0 4px">|</span>
              <span style="color:var(--blue-700)">${escHtml(d.date)}</span>
              <span style="color:var(--gray-500); margin-left:4px">${escHtml(d.note)}</span>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    </div>

    <div style="margin-bottom:12px">
      <div style="font-size:.8rem; font-weight:600; color:var(--gray-700); margin-bottom:8px">按省份查看政策文件：</div>
      <div class="province-selector" id="subsidyProvChips">
        <button class="province-chip ${!subsidiesProvFilter ? 'active' : ''}" onclick="filterSubsidyProv(null, this)">全部省份</button>
        ${provinces.map(p => `<button class="province-chip ${subsidiesProvFilter === p ? 'active' : ''}" onclick="filterSubsidyProv('${escHtml(p)}', this)">${escHtml(p)}</button>`).join('')}
      </div>
    </div>

    <div id="subsidyProvinceList">${renderSubsidyProvinces(channel, null)}</div>
  `;
}

// ─── 中央补贴 全局城市/地区检索 ──────────────────────────────
let subsidyCitySearchQuery = '';

function onSubsidyCitySearch(query) {
  subsidyCitySearchQuery = query.trim();
  const resultsDiv = document.getElementById('subsidySearchResults');
  const channelArea = document.getElementById('subsidyChannelArea');
  if (!resultsDiv || !channelArea) return;

  if (!subsidyCitySearchQuery) {
    resultsDiv.style.display = 'none';
    channelArea.style.display = 'block';
    return;
  }
  channelArea.style.display = 'none';
  resultsDiv.style.display = 'block';
  renderSubsidyCityResults(subsidyCitySearchQuery);
}

function clearSubsidySearch() {
  const input = document.getElementById('subsidyCitySearch');
  if (input) input.value = '';
  onSubsidyCitySearch('');
}

function renderSubsidyCityResults(query) {
  const resultsDiv = document.getElementById('subsidySearchResults');
  if (!resultsDiv || !subsidiesData) {
    if (resultsDiv) resultsDiv.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">数据加载中，请稍后再试</div></div>`;
    return;
  }

  const q = query.toLowerCase();
  const results = [];

  for (const ch of (subsidiesData.channels || [])) {
    for (const [prov, provData] of Object.entries(ch.provinces || {})) {
      // Old structure: entries[]{cities[]}
      if (provData.entries) {
        for (const e of provData.entries) {
          const cities = e.cities || [];
          const matchedCities = cities.filter(c => c.toLowerCase().includes(q));
          const titleHit   = (e.title   || '').toLowerCase().includes(q);
          const summaryHit = (e.summary || '').toLowerCase().includes(q);
          const provHit    = prov.toLowerCase().includes(q);
          if (matchedCities.length || titleHit || summaryHit || provHit) {
            results.push({ channelId: ch.id, channelName: ch.name, channelIcon: ch.icon || '',
              province: prov, region: provData.region || '', entry: e,
              matchedCities: matchedCities.length ? matchedCities : (provHit ? [prov] : []) });
          }
        }
      }
      // New city-based structure: cities{name: entries[]}
      if (provData.cities) {
        for (const [cityName, cityEntries] of Object.entries(provData.cities)) {
          const cityHit = cityName.toLowerCase().includes(q);
          for (const e of (cityEntries || [])) {
            const titleHit   = (e.title   || '').toLowerCase().includes(q);
            const summaryHit = (e.summary || '').toLowerCase().includes(q);
            const provHit    = prov.toLowerCase().includes(q);
            if (cityHit || titleHit || summaryHit || provHit) {
              results.push({ channelId: ch.id, channelName: ch.name, channelIcon: ch.icon || '',
                province: prov, region: provData.region || '', entry: e,
                matchedCities: cityHit ? [cityName] : (provHit ? [prov] : []) });
            }
          }
        }
      }
    }
  }

  if (!results.length) {
    resultsDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">未找到与"<strong>${escHtml(query)}</strong>"相关的政策记录<br>
          <span style="font-size:.75rem;color:var(--gray-400)">提示：可尝试省份名称或只输入关键词（如"宜宾"而非"宜宾市"）</span>
        </div>
      </div>`;
    return;
  }

  // Group by channel
  const byChannel = {};
  for (const r of results) {
    if (!byChannel[r.channelId]) byChannel[r.channelId] = { name: r.channelName, icon: r.channelIcon, items: [] };
    byChannel[r.channelId].items.push(r);
  }

  const CH_BORDER = { 'ultra-bond': 'var(--blue-800)', 'central-budget': 'var(--green-800)', 'policy-finance': '#6A1B9A', 'industry-subsidy': '#E65100' };

  resultsDiv.innerHTML = `
    <div style="padding:10px 14px; background:var(--green-50); border-radius:6px; border:1px solid var(--green-100); margin-bottom:14px; font-size:.8rem; color:var(--green-800)">
      共找到 <strong>${results.length}</strong> 条与"<strong>${escHtml(query)}</strong>"相关的政策记录，来自
      <strong>${Object.keys(byChannel).length}</strong> 个渠道
    </div>
    ${Object.entries(byChannel).map(([chId, chData]) => `
      <div class="section-card" style="margin-bottom:14px; border-left:4px solid ${CH_BORDER[chId]||'var(--blue-700)'}">
        <div class="section-card-header">
          <div class="section-card-title">${escHtml(chData.icon)} ${escHtml(chData.name)}</div>
          <span class="tag tag-teal">${chData.items.length} 条</span>
        </div>
        <div class="section-card-body">
          ${chData.items.map(r => `
            <div style="padding:12px 0; border-bottom:1px solid var(--gray-100)">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; flex-wrap:wrap">
                <span class="tag ${REGION_COLORS[r.region]||'tag-blue'}">${escHtml(r.province)}</span>
                ${r.matchedCities.map(c => `
                  <span class="tag" style="background:#E3F2FD;color:var(--blue-800);border:1px solid var(--blue-100);font-weight:700">
                    📍 ${escHtml(c)}
                  </span>`).join('')}
                <span class="tag ${SUBSIDY_TYPE_COLORS[r.entry.type]||'tag-blue'}">${escHtml(r.entry.type||'')}</span>
                <span style="margin-left:auto; font-size:.72rem; color:var(--gray-400); white-space:nowrap">📅 ${r.entry.date||''}</span>
              </div>
              <div style="font-weight:600; font-size:.86rem; color:var(--gray-900); margin-bottom:5px; line-height:1.4">${escHtml(r.entry.title||'')}</div>
              <div style="font-size:.78rem; color:var(--gray-700); line-height:1.6; margin-bottom:7px">${escHtml(r.entry.summary||'')}</div>
              ${r.entry.actionable ? `
                <div style="padding:6px 10px; background:var(--green-50); border-radius:4px; border-left:3px solid var(--green-400); font-size:.75rem; color:var(--green-800)">
                  <strong>⚡ 行动建议：</strong>${escHtml(r.entry.actionable)}
                </div>` : ''}
              ${r.entry.url ? `<div style="margin-top:6px"><a href="${escHtml(r.entry.url)}" target="_blank" rel="noopener" class="link-icon">🔗 查看原文</a></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

function filterSubsidyProv(prov, btn) {
  subsidiesProvFilter = prov;
  document.querySelectorAll('#subsidyProvChips .province-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const channel = (subsidiesData?.channels || []).find(c => c.id === currentSubsidyChannel);
  const container = document.getElementById('subsidyProvinceList');
  if (channel && container) container.innerHTML = renderSubsidyProvinces(channel, prov);
}

function renderSubsidyProvinces(channel, filterProv) {
  const provincesObj = channel.provinces || {};
  const toShow = filterProv ? { [filterProv]: provincesObj[filterProv] } : provincesObj;
  const entries = Object.entries(toShow).filter(([, v]) => v);
  if (!entries.length) return `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">暂无该省份数据</div></div>`;

  return entries.map(([prov, provData]) => {
    const regionColor = REGION_COLORS[provData.region] || 'tag-blue';

    // Support both old structure (entries[]{cities[]}) and new city-based structure (cities{}{entries[]})
    let entryCards = '';
    if (provData.cities) {
      // New city-based structure
      entryCards = Object.entries(provData.cities).map(([cityName, cityEntries]) => {
        const cityHtml = (cityEntries || []).map(e => renderSubsidyEntry(e)).join('');
        return `<div style="margin-bottom:14px">
          <div style="font-size:.82rem;font-weight:700;color:var(--blue-900);padding:4px 8px;background:var(--blue-50);border-radius:4px;margin-bottom:6px;border-left:3px solid var(--blue-500)">📍 ${escHtml(cityName)}</div>
          ${cityHtml}
        </div>`;
      }).join('');
    } else {
      // Old structure
      entryCards = (provData.entries || []).map(e => renderSubsidyEntry(e)).join('');
    }

    const entryCount = provData.cities
      ? Object.values(provData.cities).reduce((s, arr) => s + (arr||[]).length, 0)
      : (provData.entries || []).length;

    return `
      <div class="section-card" style="margin-bottom:12px">
        <div class="section-card-header">
          <div style="display:flex; align-items:center; gap:8px">
            <strong>${escHtml(prov)}</strong>
            <span class="tag ${regionColor}">${escHtml(provData.region)}</span>
            <span style="font-size:.74rem; color:var(--gray-400)">${entryCount} 条记录</span>
          </div>
        </div>
        <div class="section-card-body">${entryCards}</div>
      </div>
    `;
  }).join('');
}

function renderSubsidyEntry(e) {
  const typeColor = SUBSIDY_TYPE_COLORS[e.type] || 'tag-blue';
  const serviceTagHtml = e.serviceTag ? `<span class="tag" style="background:#E8F5E9;color:#2E7D32;border:1px solid #A5D6A7;font-size:.65rem">${escHtml(e.serviceTag)}</span>` : '';
  return `
    <div style="padding:12px 0; border-bottom:1px solid var(--gray-100)">
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px">
        <span class="tag ${typeColor}" style="white-space:nowrap; flex-shrink:0">${escHtml(e.type)}</span>
        ${serviceTagHtml}
        <div style="font-weight:600; font-size:.85rem; line-height:1.4">${escHtml(e.title)}</div>
        <span style="margin-left:auto; font-size:.75rem; color:var(--gray-400); white-space:nowrap; flex-shrink:0">📅 ${e.date}</span>
      </div>
      <div style="font-size:.78rem; color:var(--gray-700); line-height:1.6; margin-bottom:6px">${escHtml(e.summary)}</div>
      ${e.cities ? `<div style="font-size:.74rem; color:var(--gray-500); margin-bottom:6px">📍 覆盖城市：${escHtml((e.cities||[]).join('、'))}</div>` : ''}
      <div style="padding:6px 10px; background:var(--green-50); border-radius:4px; border-left:3px solid var(--green-400); font-size:.75rem; color:var(--green-800)">
        <strong>⚡ 行动建议：</strong>${escHtml(e.actionable || '')}
      </div>
      ${e.url ? `<div style="margin-top:6px"><a href="${escHtml(e.url)}" target="_blank" rel="noopener" class="link-icon">🔗 查看原文来源</a></div>` : ''}
    </div>
  `;
}

// ─── 全类别债券 sub-view navigation ─────────────────────────
function switchBondSubTab(tabId, btn) {
  document.querySelectorAll('.bond-sub-view').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.bond-sub-btn').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) tab.style.display = 'block';
  if (btn) btn.classList.add('active');
}

function initAllBondTypes() {
  // Show 近三月 view by default if not yet triggered
  const issuance = document.getElementById('bond-issuance');
  const allBonds = document.getElementById('all-bonds');
  if (issuance) issuance.style.display = 'block';
  if (allBonds) allBonds.style.display = 'none';
  document.querySelectorAll('.bond-sub-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  populateBondFilters();
  onBondRegionChange();
  renderBondTable();
}

// ─── 化债专项 helper functions ────────────────────────────────

// Identify 化债 bonds: Type A = 特殊新增专项债 (isSpecial + 新增专项债); Type B = 特殊再融资债 (置换存量隐性债务)
function isHuaZhaiBond(b) {
  return isTypeA(b) || isTypeB(b);
}
function isTypeA(b) {
  return b.isSpecial === true && b.type && b.type.includes('新增专项债');
}
function isTypeB(b) {
  return b.subtype && b.subtype.includes('置换存量隐性债务');
}

function getHuaZhaiThisYear() {
  const now = new Date();
  const bjYear = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000).getUTCFullYear();
  return state.bonds.filter(b => {
    const yr = parseInt((b.issueMonth || b.addedDate || '2000-01').slice(0, 4), 10);
    return yr === bjYear && isHuaZhaiBond(b);
  });
}

function getThisYearAllBonds() {
  const now = new Date();
  const bjYear = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000).getUTCFullYear();
  return state.bonds.filter(b => {
    const yr = parseInt((b.issueMonth || b.addedDate || '2000-01').slice(0, 4), 10);
    return yr === bjYear;
  });
}

// ─── 化债专项 province filter init ─────────────────────────
function populateHuaZhaiProvinceFilter() {
  const sel = document.getElementById('hzProvinceFilter');
  if (!sel || sel.options.length > 1) return;
  const hzBonds = getHuaZhaiThisYear();
  const provinces = [...new Set(hzBonds.map(b => b.province))].sort();
  provinces.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    sel.appendChild(opt);
  });
}

function resetHuaZhaiFilters() {
  ['hzTypeFilter', 'hzProvinceFilter'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const el = document.getElementById('hzPurposeSearch');
  if (el) el.value = '';
  renderHuaZhaiTable();
}

// ─── 化债专项 filter + table ──────────────────────────────────
function getFilteredHuaZhai() {
  const typeF    = document.getElementById('hzTypeFilter')?.value || '';
  const provF    = document.getElementById('hzProvinceFilter')?.value || '';
  const searchF  = (document.getElementById('hzPurposeSearch')?.value || '').toLowerCase();

  return getHuaZhaiThisYear().filter(b => {
    if (typeF === 'special_xinzeng' && !isTypeA(b)) return false;
    if (typeF === 'refi_zhihuan'   && !isTypeB(b)) return false;
    if (provF && b.province !== provF) return false;
    if (searchF && !(b.purpose || '').toLowerCase().includes(searchF) &&
        !(b.name || '').toLowerCase().includes(searchF)) return false;
    return true;
  }).sort((a, b) => (b.issueMonth || '').localeCompare(a.issueMonth || ''));
}

function renderHuaZhaiTable() {
  const tbody = document.getElementById('hzTableBody');
  if (!tbody) return;
  const bonds = getFilteredHuaZhai();

  // Update filter label
  const labelEl = document.getElementById('hzFilterLabel');
  const provF = document.getElementById('hzProvinceFilter')?.value || '';
  if (labelEl) labelEl.textContent = '当前范围：' + (provF || '全国');

  const countEl = document.getElementById('hzTableCount');
  if (countEl) countEl.textContent = `共 ${bonds.length} 条`;

  // Redraw pie charts with filtered data
  drawHuaZhaiPies(bonds);

  if (!bonds.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gray-400)">暂无符合条件的化债债券记录（本年）</td></tr>`;
    return;
  }

  tbody.innerHTML = bonds.map(b => {
    const typeLabel = isTypeA(b) ? '特殊新增专项债' : '置换再融资专项';
    const typeColor = isTypeA(b) ? 'tag-special' : 'tag-orange';
    return `
      <tr>
        <td><strong>${escHtml(b.province)}</strong><br>
          <span class="tag ${REGION_COLORS[b.region]||'tag-blue'}" style="margin-top:3px;display:inline-block;font-size:.65rem">${escHtml(b.region||'')}</span>
        </td>
        <td><span class="tag ${typeColor}">${typeLabel}</span></td>
        <td style="max-width:260px">
          <div style="font-weight:600;line-height:1.4">${escHtml(b.name)}</div>
          ${b.batch ? `<div style="font-size:.74rem;color:var(--gray-500)">${escHtml(b.batch)}</div>` : ''}
        </td>
        <td class="amount">${b.plannedAmount != null ? b.plannedAmount.toFixed(2) : '—'}</td>
        <td class="actual-amount">${b.actualAmount != null ? b.actualAmount.toFixed(2) : '—'}</td>
        <td style="text-align:center">${b.term != null ? b.term + '年' : '—'}</td>
        <td style="max-width:240px;font-size:.78rem;color:var(--gray-700)">${escHtml(b.purpose || '—')}</td>
        <td style="white-space:nowrap">${b.issueMonth || '—'}</td>
        <td>${renderBondLinks(b)}</td>
      </tr>
    `;
  }).join('');
}

// ─── Pie Charts (pure Canvas, no library) ────────────────────

// Chart.js instances (destroy before redraw)
const _hzCharts = {};

function drawPie(canvasId, data, legendId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Destroy existing chart if any
  if (_hzCharts[canvasId]) {
    _hzCharts[canvasId].destroy();
  }

  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray-400);font-size:.75rem">图表加载中...</div>';
    return;
  }

  const COLORS = ['#1565C0','#43A047','#E65100','#6A1B9A','#00838F','#C62828'];

  _hzCharts[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: COLORS.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(0)}亿 (${(ctx.parsed / data.reduce((s,d)=>s+d.value,0)*100).toFixed(1)}%)`
          }
        }
      },
      cutout: '55%'
    }
  });

  // Legend
  const legendEl = document.getElementById(legendId);
  if (legendEl) {
    const total = data.reduce((s, d) => s + d.value, 0);
    legendEl.innerHTML = data.map((d, i) => `
      <div style="display:flex;align-items:center;gap:5px;justify-content:center">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS[i]};flex-shrink:0"></span>
        <span>${escHtml(d.label)}</span>
        <strong>${d.value.toFixed(0)}亿</strong>
        <span style="color:var(--gray-400)">(${total>0?(d.value/total*100).toFixed(1)+'%':'—'})</span>
      </div>
    `).join('');
  }
}

function drawHuaZhaiPies(filteredBonds) {
  const now = new Date();
  const bjYear = new Date(now.getTime() + (8*60 - now.getTimezoneOffset())*60000).getUTCFullYear();
  const lastYear = bjYear - 1;

  const allThisYear = getThisYearAllBonds();
  const allHZ = getHuaZhaiThisYear();

  const hzActual    = filteredBonds.reduce((s, b) => s + (b.actualAmount || 0), 0);
  const typeAActual = filteredBonds.filter(isTypeA).reduce((s, b) => s + (b.actualAmount || 0), 0);
  const typeBActual = filteredBonds.filter(isTypeB).reduce((s, b) => s + (b.actualAmount || 0), 0);

  // Pie 1: 本年化债 vs 本年其他债券
  const allActual   = allThisYear.reduce((s, b) => s + (b.actualAmount || 0), 0);
  const nonHzActual = Math.max(0, allActual - allHZ.reduce((s, b) => s + (b.actualAmount || 0), 0));
  drawPie('hzPie1', [
    { label: '化债专项债', value: allHZ.reduce((s,b)=>s+(b.actualAmount||0),0) || 0.001 },
    { label: '其他类债券', value: nonHzActual || 0.001 }
  ], 'hzPie1Legend');

  // Pie 2 (NEW): 本年化债实际 / 去年化债全年实际 — 同比完成率
  const lastYearHzActual = state.bonds
    .filter(b => parseInt((b.issueMonth||b.addedDate||'2000-01').slice(0,4),10) === lastYear && isHuaZhaiBond(b))
    .reduce((s, b) => s + (b.actualAmount || 0), 0);
  const thisYearHzActual = allHZ.reduce((s, b) => s + (b.actualAmount || 0), 0);
  const remaining2 = Math.max(0, lastYearHzActual - thisYearHzActual);
  drawPie('hzPie2', [
    { label: `${bjYear}年已发化债总额`, value: thisYearHzActual || 0.001 },
    { label: `${lastYear}年剩余差距`, value: remaining2 || 0.001 }
  ], 'hzPie2Legend');

  // Pie 3: TypeA vs TypeB
  drawPie('hzPie3', [
    { label: '特殊新增专项债', value: typeAActual || 0.001 },
    { label: '特殊再融资专项债', value: typeBActual || 0.001 }
  ], 'hzPie3Legend');
}

// ─── 化债发行规划数据 & 渲染 ─────────────────────────────────

const HZ_PLAN_DATA = {
  nextMonth: {
    label: '2026年7月 化债相关债券发行展望',
    note: '基于各省已公布债券注册额度、历史发行节奏、财政部政策导向综合研判。无官方正式公告者均标注为AI预测。',
    items: [
      { province: '河北', region: '北部区域', typeA: '100~150亿(预测)', typeB: '50~100亿(预测)', note: '6月完成666亿后，7月受额度约束将明显回落', source: 'ai', basis: '基于2026年1-6月月均节奏及剩余注册额度估算' },
      { province: '广东', region: '华南区域', typeA: '200~300亿(预测)', typeB: '50~80亿(预测)', note: '新增专项债持续全国领跑；7月新增或维持高位', source: 'ai', basis: '广东2026年配额4700亿，前6月已用约2100亿，下半年仍有空间' },
      { province: '贵州', region: '贵州区域', typeA: '100~150亿(预测)', typeB: '200~300亿(预测)', note: '作为全国化债重点省份，再融资置换债持续高位', source: 'ai', basis: '贵州2026年置换债年度安排超2000亿，7月按季度节奏预测' },
      { province: '四川', region: '西南区域', typeA: '0~30亿(预测)', typeB: '200~350亿(预测)', note: '四川以再融资置换债为主，7月延续强势', source: 'ai', basis: '四川2026年1-6月已发再融资专项2490亿，下半年预计维持' },
      { province: '吉林', region: '北部区域', typeA: '50~100亿(预测)', typeB: '100~200亿(预测)', note: '退出高风险名单后新增额度扩大，7月两类均有空间', source: 'ai', basis: '吉林2026年3-6月已发873亿，下半年节奏可能放缓' },
      { province: '内蒙古', region: '北部区域', typeA: '50~80亿(预测)', typeB: '100~200亿(预测)', note: '154.5亿清欠专项资金分配落地，7月或加速', source: 'ai', basis: '内蒙古154.5亿清欠安排已纳入2026年预算' },
      { province: '河南', region: '中部区域', typeA: '30~60亿(预测)', typeB: '100~200亿(预测)', note: '171个清欠台账项目驱动补充财力类需求', source: 'ai', basis: '河南2026年前5月已发1457亿，按季度分配预测' },
      { province: '湖南', region: '华南区域', typeA: '30~80亿(预测)', typeB: '150~250亿(预测)', note: '清欠督查激励持续推进，再融资置换债高位', source: 'ai', basis: '湖南前5月置换债516亿，年化节奏预测' },
      { province: '云南', region: '西南区域', typeA: '0~20亿(预测)', typeB: '150~250亿(预测)', note: '5月末352亿置换债到账后7月新批次预期', source: 'ai', basis: '云南2026年前5月置换577亿，年内化债任务重' },
    ]
  },
  fullYear: {
    label: '2026年全年化债债券发行计划汇总',
    note: '标注"✓官方"的数据来自省级财政厅/人大预算报告等正式文件；标注"🤖预测"的数据基于国家政策文件、历史节奏、媒体报道综合研判，不代表官方公告。',
    items: [
      {
        province: '吉林', region: '北部区域',
        typeAPlanned: 75, typeBPlanned: 997.26,
        typeASource: '✓官方',
        typeBSource: '✓官方',
        basisA: '吉林2026年预算：新增专项债75亿（已全部发行），来源：吉林省财政厅2026年专项债限额文件',
        basisB: '吉林2026年再融资专项债（置换类）997.26亿，来源：中国债券信息网实际发行数据（1-3月17笔）',
        actionWindow: '吉林化债资金已基本落位（873亿已发），催款最佳窗口为7-8月资金到位核销期。重点对接吉林市、长春市财政局。'
      },
      {
        province: '贵州', region: '贵州区域',
        typeAPlanned: 600, typeBPlanned: 2000,
        typeASource: '🤖预测',
        typeBSource: '🤖预测',
        basisA: '基于贵州2026年新增专项债预算安排（约600亿），化债属性占比高，来源：贵州省政府工作报告（2026年1月）',
        basisB: '基于贵州历年再融资置换债规模（2025年实际1560亿）推算2026年2000亿',
        actionWindow: '贵州6月新增200亿达年内峰值，7-8月资金到位是关键催款窗口。建议提前3-4周锁定欠款台账录入。'
      },
      {
        province: '四川', region: '西南区域',
        typeAPlanned: 800, typeBPlanned: 3500,
        typeASource: '🤖预测',
        typeBSource: '🤖预测',
        basisA: '四川新增专项债2026年约644亿已发（补充财力类），全年预测800亿，来源：四川财政厅2026年预算草案',
        basisB: '四川2026年前6月再融资置换债约2500亿，按历史节奏全年预测3500亿',
        actionWindow: '四川6月化债力度最大（355亿），下半年维持高位。成都、资阳、自贡项目建议在7月前完成债务核销对接。'
      },
      {
        province: '河北', region: '北部区域',
        typeAPlanned: 1000, typeBPlanned: 600,
        typeASource: '✓官方',
        typeBSource: '🤖预测',
        basisA: '河北2026年特殊新增专项债（含补充财力、清欠）约610亿已公告（6月批次），全年预算1000亿，来源：河北省财政厅专项债发行公告',
        basisB: '河北前5月置换债约280亿，全年预测600亿，基于国家统一分配节奏',
        actionWindow: '河北6月单月660亿为年内峰值，7月资金下达地方后为最佳催款时机。重点关注保定、沧州、邢台地区。'
      },
      {
        province: '云南', region: '西南区域',
        typeAPlanned: 50, typeBPlanned: 2500,
        typeASource: '🤖预测',
        typeBSource: '✓官方',
        basisA: '云南2026年新增专项债以基础设施建设为主，补充财力类约4亿（已发），全年预计50亿，来源：云南省财政厅',
        basisB: '云南2026年化债专项再融资债额度2500亿，来源：云南省人民政府2026年预算报告',
        actionWindow: '云南5月27日352亿到账，8月可能有新批次置换债。昆明、楚雄、昭通项目建议跟进地方财政局债务化解进展。'
      },
      {
        province: '内蒙古', region: '北部区域',
        typeAPlanned: 350, typeBPlanned: 1200,
        typeASource: '✓官方',
        typeBSource: '🤖预测',
        basisA: '内蒙古2026年特殊专项债89亿已发行，154.5亿专项清欠资金安排，全年预计350亿，来源：内蒙古财政厅2026年债务管理报告',
        basisB: '内蒙古前5月置换债573亿，全年按1200亿预测，基于其化债压力分析',
        actionWindow: '154.5亿清欠资金7月前分配完毕，呼和浩特、包头项目需提前完成欠款入库。'
      },
      {
        province: '湖南', region: '华南区域',
        typeAPlanned: 200, typeBPlanned: 1800,
        typeASource: '🤖预测',
        typeBSource: '🤖预测',
        basisA: '湖南清欠督查激励推动特殊专项债发行，预测全年200亿，来源：湖南省政府2026年化债工作部署',
        basisB: '湖南前5月置换债516亿，全年按1800亿预测，来源：湖南财政厅半年工作总结',
        actionWindow: '湖南清欠纳入督查激励，催款成功率高于平均水平。长沙、永州项目建议主动对接省财政债务处。'
      },
    ]
  }
};

function renderHuaZhaiPlan() {
  const container = document.getElementById('hzPlanBody');
  if (!container) return;

  const nextM = HZ_PLAN_DATA.nextMonth;
  const fullY = HZ_PLAN_DATA.fullYear;

  container.innerHTML = `
    <!-- 下月展望 -->
    <div style="margin-bottom:22px">
      <div style="font-size:.88rem; font-weight:700; color:var(--blue-900); margin-bottom:6px">📅 ${escHtml(nextM.label)}</div>
      <div style="font-size:.76rem; color:var(--gray-500); margin-bottom:12px; padding:8px 12px; background:var(--orange-50); border-radius:6px; border:1px solid #FFCC80">
        ⚠️ ${escHtml(nextM.note)}
      </div>
      <div class="scrollable-table">
        <table class="plan-table">
          <thead><tr><th>省份</th><th>区域</th><th>特殊新增(亿元)</th><th>置换再融资(亿元)</th><th>预测依据</th><th>数据性质</th></tr></thead>
          <tbody>
            ${nextM.items.map(r => `
              <tr>
                <td><strong>${escHtml(r.province)}</strong></td>
                <td><span class="tag ${REGION_COLORS[r.region]||'tag-blue'}">${escHtml(r.region)}</span></td>
                <td class="plan-estimated">${escHtml(r.typeA)}</td>
                <td class="plan-estimated">${escHtml(r.typeB)}</td>
                <td style="font-size:.74rem;color:var(--gray-600);max-width:200px">${escHtml(r.basis)}</td>
                <td><span class="tag tag-orange">🤖 预测</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 全年计划 -->
    <div>
      <div style="font-size:.88rem; font-weight:700; color:var(--blue-900); margin-bottom:6px">📋 ${escHtml(fullY.label)}</div>
      <div style="font-size:.76rem; color:var(--gray-500); margin-bottom:12px; padding:8px 12px; background:var(--green-50); border-radius:6px; border:1px solid var(--green-100)">
        ✅ ${escHtml(fullY.note)}
      </div>
      <div class="scrollable-table">
        <table class="plan-table">
          <thead>
            <tr><th>省份</th><th>区域</th><th>特殊新增计划(亿元)</th><th>来源</th><th>置换再融资计划(亿元)</th><th>来源</th><th>行动时机与建议</th></tr>
          </thead>
          <tbody>
            ${fullY.items.map(r => `
              <tr>
                <td><strong>${escHtml(r.province)}</strong></td>
                <td><span class="tag ${REGION_COLORS[r.region]||'tag-blue'}">${escHtml(r.region)}</span></td>
                <td class="${r.typeASource.startsWith('✓') ? 'plan-confirmed' : 'plan-estimated'}">${r.typeAPlanned}亿</td>
                <td style="font-size:.72rem">
                  <span class="tag ${r.typeASource.startsWith('✓') ? 'tag-green' : 'tag-orange'}">${escHtml(r.typeASource)}</span>
                  <div style="color:var(--gray-500);margin-top:3px;font-size:.68rem;max-width:160px;line-height:1.4">${escHtml(r.basisA)}</div>
                </td>
                <td class="${r.typeBSource.startsWith('✓') ? 'plan-confirmed' : 'plan-estimated'}">${r.typeBPlanned}亿</td>
                <td style="font-size:.72rem">
                  <span class="tag ${r.typeBSource.startsWith('✓') ? 'tag-green' : 'tag-orange'}">${escHtml(r.typeBSource)}</span>
                  <div style="color:var(--gray-500);margin-top:3px;font-size:.68rem;max-width:160px;line-height:1.4">${escHtml(r.basisB)}</div>
                </td>
                <td style="font-size:.76rem;color:var(--green-800);max-width:220px;background:var(--green-50);line-height:1.5">${escHtml(r.actionWindow)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── 化债专项 Cabinet ──────────────────────────────────────────
function renderHuaZhaiSpecial() {
  const overview = document.getElementById('hz-cabinet-overview');
  const detail   = document.getElementById('hz-region-detail');
  if (overview) overview.style.display = 'block';
  if (detail)   detail.style.display   = 'none';
  renderHzSummary();
  renderHzRegionDrawers();
}

function renderHzSummary() {
  const wrap = document.getElementById('hz-summary-wrap');
  if (!wrap) return;
  const now = new Date();
  const bjYear = new Date(now.getTime() + (8*60 - now.getTimezoneOffset())*60000).getUTCFullYear();
  const lastYear = bjYear - 1;
  const hzBonds = getHuaZhaiThisYear();
  const typeABonds = hzBonds.filter(isTypeA);
  const typeBBonds = hzBonds.filter(isTypeB);
  const totalAmt   = hzBonds.reduce((s,b)=>s+(b.actualAmount||0),0);
  const aAmt       = typeABonds.reduce((s,b)=>s+(b.actualAmount||0),0);
  const bAmt       = typeBBonds.reduce((s,b)=>s+(b.actualAmount||0),0);
  const provinces  = [...new Set(hzBonds.map(b=>b.province))].length;
  const lastYearAmt = state.bonds
    .filter(b => parseInt((b.issueMonth||b.addedDate||'2000-01').slice(0,4),10) === lastYear && isHuaZhaiBond(b))
    .reduce((s,b)=>s+(b.actualAmount||0),0);
  const bjMonth = new Date(now.getTime() + (8*60 - now.getTimezoneOffset())*60000).getUTCMonth() + 1;

  wrap.innerHTML = `
    <div class="section-card" style="margin-bottom:22px">
      <div class="section-card-header">
        <div class="section-card-title">🎯 化债专项债券 — ${bjYear}年全国发行概况</div>
        <span class="tag tag-special">${bjYear}年1月–${bjMonth}月</span>
      </div>
      <div class="section-card-body">
        <p style="font-size:.87rem;color:var(--gray-700);line-height:1.9;margin-bottom:16px">
          ${bjYear}年1月至${bjMonth}月，全国共发行化债专项债券 <strong>${hzBonds.length}</strong> 笔，
          实际发行总额 <strong>${totalAmt.toFixed(0)}亿元</strong>，覆盖 <strong>${provinces}</strong> 个省份及直辖市。
          其中<strong>特殊新增专项债（补充财力/清欠类）</strong> ${typeABonds.length} 笔，合计 <strong>${aAmt.toFixed(0)}亿元</strong>，
          可直接用于偿付服务类欠款与化解隐性债务；
          <strong>特殊再融资专项债</strong> ${typeBBonds.length} 笔，合计 <strong>${bAmt.toFixed(0)}亿元</strong>，
          用于置换地方政府存量隐性债务，债务置换完成后财政空间释放即为催款窗口。
          ${lastYearAmt > 0
            ? `与${lastYear}年全年化债规模（${lastYearAmt.toFixed(0)}亿元）相比，本年同比已完成 <strong>${(totalAmt/lastYearAmt*100).toFixed(1)}%</strong>。`
            : ''}
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
          <div class="stat-chip"><span>化债债券笔数</span><strong>${hzBonds.length} 笔</strong></div>
          <div class="stat-chip"><span>化债总额（本年）</span><strong>${totalAmt.toFixed(0)}亿</strong></div>
          <div class="stat-chip"><span>特殊新增专项债</span><strong>${aAmt.toFixed(0)}亿</strong></div>
          <div class="stat-chip"><span>特殊再融资专项债</span><strong>${bAmt.toFixed(0)}亿</strong></div>
          <div class="stat-chip"><span>覆盖省份</span><strong>${provinces} 个</strong></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px">
          <div style="text-align:center">
            <div style="font-size:.76rem;font-weight:700;color:var(--gray-700);margin-bottom:8px">① 化债债券占本年已发行总额比例</div>
            <div style="position:relative;width:150px;margin:0 auto"><canvas id="hzPie1" width="150" height="150"></canvas></div>
            <div id="hzPie1Legend" style="margin-top:8px;font-size:.72rem;color:var(--gray-600);line-height:1.8"></div>
          </div>
          <div style="text-align:center">
            <div style="font-size:.76rem;font-weight:700;color:var(--gray-700);margin-bottom:8px">② 本年化债进度 vs 去年全年总量（同比完成率）</div>
            <div style="position:relative;width:150px;margin:0 auto"><canvas id="hzPie2" width="150" height="150"></canvas></div>
            <div id="hzPie2Legend" style="margin-top:8px;font-size:.72rem;color:var(--gray-600);line-height:1.8"></div>
          </div>
          <div style="text-align:center">
            <div style="font-size:.76rem;font-weight:700;color:var(--gray-700);margin-bottom:8px">③ 两类化债债券构成（特殊新增 vs 特殊再融资）</div>
            <div style="position:relative;width:150px;margin:0 auto"><canvas id="hzPie3" width="150" height="150"></canvas></div>
            <div id="hzPie3Legend" style="margin-top:8px;font-size:.72rem;color:var(--gray-600);line-height:1.8"></div>
          </div>
        </div>
      </div>
    </div>`;

  drawHuaZhaiPies(hzBonds);
}

function renderHzRegionDrawers() {
  const wrap = document.getElementById('hz-region-drawers-wrap');
  if (!wrap) return;

  const now = new Date();
  const bjYear = new Date(now.getTime() + (8*60 - now.getTimezoneOffset())*60000).getUTCFullYear();
  const lastYear = bjYear - 1;

  const hzBonds = getHuaZhaiThisYear();
  const lastYearHzBonds = state.bonds.filter(b =>
    parseInt((b.issueMonth||b.addedDate||'2000-01').slice(0,4),10) === lastYear && isHuaZhaiBond(b)
  );

  wrap.innerHTML = `
    <div style="font-size:.88rem;font-weight:700;color:var(--gray-700);margin-bottom:14px;display:flex;align-items:center;gap:10px">
      🗺️ 六大区域化债情况
      <span style="font-size:.75rem;font-weight:400;color:var(--gray-500)">点击区域名称查看各省详细发行数据</span>
    </div>
    <div class="region-drawer-grid">
      ${Object.entries(REGIONS).map(([region, provinces]) => {
        const regionBonds   = hzBonds.filter(b => provinces.includes(b.province));
        const totalAmt      = regionBonds.reduce((s,b)=>s+(b.actualAmount||0),0);
        const aAmt          = regionBonds.filter(isTypeA).reduce((s,b)=>s+(b.actualAmount||0),0);
        const bAmt          = regionBonds.filter(isTypeB).reduce((s,b)=>s+(b.actualAmount||0),0);
        const covProv       = [...new Set(regionBonds.map(b=>b.province))].length;

        const lyRegionAmt   = lastYearHzBonds
          .filter(b => provinces.includes(b.province))
          .reduce((s,b)=>s+(b.actualAmount||0),0);
        const pct           = lyRegionAmt > 0 ? Math.min(100, totalAmt / lyRegionAmt * 100) : null;
        const pctLabel      = pct !== null ? pct.toFixed(1) + '%' : '去年无数据';
        const fillColor     = pct !== null && pct >= 100
          ? 'linear-gradient(90deg,var(--green-800),var(--green-400))'
          : 'linear-gradient(90deg,var(--blue-700),var(--blue-500))';
        const labelColor    = pct !== null && pct >= 100 ? 'var(--green-700)' : 'var(--blue-800)';

        return `
          <div class="region-drawer-card">
            <div class="region-drawer-header" onclick="openHzRegionDetail('${region}')">
              <div class="region-drawer-title">
                <span class="region-drawer-name">${region}</span>
                <span class="region-drawer-count">${regionBonds.length} 笔 / ${totalAmt.toFixed(0)}亿</span>
              </div>
              <div class="region-drawer-provinces">
                ${provinces.map(p=>`<span class="province-mini-tag">${p}</span>`).join('')}
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
                <div style="font-size:.73rem;color:var(--gray-600)">
                  特殊新增 <strong>${aAmt.toFixed(0)}</strong>亿 &nbsp;|&nbsp; 特殊再融资 <strong>${bAmt.toFixed(0)}</strong>亿
                </div>
                <span class="region-drawer-arrow">查看详情 →</span>
              </div>
            </div>
            <div class="region-drawer-summary" style="font-size:.78rem;color:var(--gray-600)">
              已覆盖 <strong>${covProv}</strong> 个省份，共 <strong>${regionBonds.length}</strong> 笔化债债券，
              合计实际发行 <strong>${totalAmt.toFixed(0)}亿元</strong>
              ${totalAmt > 0 ? `（特殊新增${(aAmt/totalAmt*100).toFixed(0)}% / 特殊再融资${(bAmt/totalAmt*100).toFixed(0)}%）` : ''}
            </div>
            <div style="padding:8px 14px 10px;background:var(--gray-50);border-top:1px solid var(--gray-100)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                <span style="font-size:.69rem;color:var(--gray-500)">${bjYear}年发债进度（对比${lastYear}年全年）</span>
                <strong style="font-size:.78rem;color:${labelColor}">${pctLabel}</strong>
              </div>
              <div style="height:6px;background:var(--gray-200);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct||0}%;background:${fillColor};border-radius:3px;transition:width .6s ease"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:.66rem;color:var(--gray-400);margin-top:3px">
                <span>${bjYear}年已发 ${totalAmt.toFixed(0)}亿</span>
                <span>${lastYear}年全年 ${lyRegionAmt > 0 ? lyRegionAmt.toFixed(0)+'亿' : '无数据'}</span>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function openHzRegionDetail(regionName) {
  document.getElementById('hz-cabinet-overview').style.display = 'none';
  const detail = document.getElementById('hz-region-detail');
  detail.style.display = 'block';
  document.getElementById('hz-region-detail-title').textContent = regionName + ' — 化债专项债券明细';
  const provinces = REGIONS[regionName] || [];
  const hzBonds   = getHuaZhaiThisYear();

  const now = new Date();
  const bjYear = new Date(now.getTime() + (8*60 - now.getTimezoneOffset())*60000).getUTCFullYear();
  const lastYear = bjYear - 1;

  let html = '';
  for (const province of provinces) {
    const bonds = hzBonds.filter(b => b.province === province);
    if (!bonds.length) continue;
    const aAmt = bonds.filter(isTypeA).reduce((s,b)=>s+(b.actualAmount||0),0);
    const bAmt = bonds.filter(isTypeB).reduce((s,b)=>s+(b.actualAmount||0),0);
    const thisYearAmt = aAmt + bAmt;

    const lastYearAmt = state.bonds
      .filter(b => parseInt((b.issueMonth||b.addedDate||'2000-01').slice(0,4),10) === lastYear
        && isHuaZhaiBond(b) && b.province === province)
      .reduce((s,b)=>s+(b.actualAmount||0),0);
    const pct = lastYearAmt > 0 ? Math.min(100, thisYearAmt / lastYearAmt * 100) : null;
    const pctDisplay = pct !== null ? pct.toFixed(1) + '%' : '去年无数据';
    const barColor = pct !== null && pct >= 100 ? 'green' : '';

    html += `<div class="section-card" style="margin-bottom:14px">
      <div class="section-card-header">
        <div class="section-card-title">${province}</div>
        <div style="display:flex;gap:6px">
          <span class="tag tag-special">特殊新增 ${aAmt.toFixed(0)}亿</span>
          <span class="tag tag-orange">特殊再融资 ${bAmt.toFixed(0)}亿</span>
        </div>
      </div>
      <div class="section-card-body" style="padding:12px 16px 0">
        <div class="progress-wrap" style="margin-bottom:14px">
          <div class="progress-label">
            <span>同比完成率（以去年全年化债总额为基准）</span>
            <strong style="color:${pct !== null && pct >= 100 ? 'var(--green-700)' : 'var(--blue-800)'}">${pctDisplay}</strong>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${barColor}" style="width:${pct || 0}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.71rem;color:var(--gray-500);margin-top:4px">
            <span>今年已发：${thisYearAmt.toFixed(0)}亿（特殊新增${aAmt.toFixed(0)}亿 + 特殊再融资${bAmt.toFixed(0)}亿）</span>
            <span>去年全年：${lastYearAmt > 0 ? lastYearAmt.toFixed(0) + '亿' : '无数据'}</span>
          </div>
        </div>
        <div class="scrollable-table">
          <table class="data-table">
            <thead><tr><th>化债类型</th><th>债券名称</th><th>计划(亿)</th><th>实际(亿)</th><th>发行月</th><th>资金用途</th><th>链接</th></tr></thead>
            <tbody>
              ${bonds.map(b => `<tr>
                <td><span class="tag ${isTypeA(b)?'tag-special':'tag-orange'}" style="font-size:.68rem">${isTypeA(b)?'特殊新增专项债':'特殊再融资专项债'}</span></td>
                <td style="max-width:220px;font-size:.78rem;line-height:1.4">${escHtml(b.name)}${b.batch?`<div style="font-size:.68rem;color:var(--gray-500)">${escHtml(b.batch)}</div>`:''}</td>
                <td style="text-align:right">${(b.plannedAmount||0).toFixed(0)}</td>
                <td style="text-align:right;font-weight:600;color:var(--blue-800)">${(b.actualAmount||0).toFixed(0)}</td>
                <td>${escHtml(b.issueMonth||'')}</td>
                <td style="max-width:160px;font-size:.75rem">${escHtml(b.purpose||'')}</td>
                <td>${b.url?`<a href="${escHtml(b.url)}" target="_blank" rel="noopener" class="link-icon" style="font-size:.72rem">🔗</a>`:''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }
  if (!html) html = `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-text">${regionName}本年暂无化债专项债券记录</div></div>`;
  document.getElementById('hz-region-detail-content').innerHTML = html;
}

function closeHzRegionDetail() {
  document.getElementById('hz-region-detail').style.display = 'none';
  document.getElementById('hz-cabinet-overview').style.display = 'block';
}

// ─── Init ────────────────────────────────────────────────────
async function init() {
  await fetchData();
  renderHeader();
  renderOverview();
  populateBondFilters();
  onBondRegionChange();
  renderAIBox();
}

document.addEventListener('DOMContentLoaded', init);
