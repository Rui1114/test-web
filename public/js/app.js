/* ═══════════════════════════════════════════════════════════
   Policy Debt Intelligence — App Logic
   ═══════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────
const state = {
  bonds: [],
  policies: { central: [], local: {} },
  summaries: {},
  metadata: {},
  regions: {},
  selectedLocalProvince: null,
  selectedSummaryRegion: null,
  currentPage: 'policy-tracking',
  currentTabs: { 'policy-tracking': 'central-policy', 'monthly-summary': 'central-summary' }
};

// ─── Region definitions (from reports) ──────────────────────
const REGIONS = {
  '北部区域': ['河北', '辽宁', '吉林', '黑龙江', '内蒙古'],
  '中部区域': ['河南', '山西', '陕西'],
  '西南区域': ['四川', '云南', '重庆'],
  '贵州区域': ['贵州'],
  '华南区域': ['广东', '福建', '江西', '广西', '湖南', '湖北'],
  '东部区域': ['山东', '江苏', '浙江', '上海', '安徽'],
  '华北区域': ['北京', '天津'],
  '西北区域': ['甘肃', '青海', '宁夏', '新疆', '西藏', '海南']
};

const REGION_COLORS = {
  '北部区域': 'tag-blue', '中部区域': 'tag-orange',
  '西南区域': 'tag-orange', '贵州区域': 'tag-red',
  '华南区域': 'tag-blue', '东部区域': 'tag-teal',
  '华北区域': 'tag-teal', '西北区域': 'tag-teal'
};

// Local summary data enriched
const LOCAL_SUMMARY_DATA = {
  '北部区域': {
    provinces: ['河北', '辽宁', '吉林', '内蒙古'],
    totalIssued1to5: 5193,
    keyInfo: {
      '河北': { issued: 2261, zhhAmount: 280, specAmount: 149.5, jun: '666亿(新增610亿，年内最高)', strategy: '化债与新增并行', selfReview: true, note: '4月纳入自审自发，6月单月最高' },
      '辽宁': { issued: 516, zhhAmount: 71.66, specAmount: 73.88, jun: '100-200亿(预测)', strategy: '再融资/化债主导', selfReview: false, note: '特殊专项债61.37%占比，清偿拖欠账款' },
      '吉林': { issued: 1186, zhhAmount: 482.21, specAmount: 75, jun: '200-300亿(预测)', strategy: '再融资/化债主导', selfReview: false, note: '正式退出高风险名单，新增额度空间打开' },
      '内蒙古': { issued: 1230, zhhAmount: 573, specAmount: 89, jun: '200-300亿(预测)', strategy: '再融资/化债主导', selfReview: false, note: '154.5亿专项清欠资金分配在即' }
    },
    windowAdvice: '所有逾期项目持续对接区县财政局债务科，确认欠款是否录入"全口径债务监测平台"。重点跟进河北6月610亿中补充财力类资金分配；辽宁重点跟进特殊专项债后续批次；吉林利用退出高风险名单的政策红利争取新增额度；内蒙古重点关注154.5亿清欠资金分配方案。'
  },
  '中部区域': {
    provinces: ['河南', '山西', '陕西'],
    totalIssued1to5: 3547,
    keyInfo: {
      '河南': { issued: 1457, zhhAmount: 543.47, specAmount: 16.44, jun: '200-400亿(预测)', strategy: '化债与新增并行', selfReview: false, note: '清欠台账171个项目，省委部署补充财力类资金' },
      '山西': { issued: 840, zhhAmount: 7.24, specAmount: 30, jun: '约230亿', strategy: '再融资主导', selfReview: false, note: '6月为二季度单月最高，重点关注服务类欠款清理' },
      '陕西': { issued: 1250, zhhAmount: 209.72, specAmount: 25, jun: '200-300亿(预测)', strategy: '再融资主导', selfReview: false, note: '省政府明确力争隐性债务清零，省委召开专题部署' }
    },
    windowAdvice: '陕西省委已召开专题会议部署"加力清理拖欠企业账款"，6月起新增专项债发行将加速。推进已入库项目匹配补充财力类专项债资金，从而实现清欠落地。河南补充财力类项目已涉及171个，建议对接具体资金分配方案。'
  },
  '西南区域': {
    provinces: ['四川', '云南', '重庆'],
    totalIssued1to5: 5908,
    keyInfo: {
      '四川': { issued: 2500, zhhAmount: 802.39, specAmount: 644.2, jun: '355亿(再融资为主)', strategy: '化债与新增并行', selfReview: true, note: '省级承担5%地方配套，减轻市县压力；6月为二季度化债力度最大月份' },
      '云南': { issued: 1743, zhhAmount: 577.01, specAmount: 4.08, jun: '200-400亿(预测)', strategy: '再融资/化债主导', selfReview: false, note: '5月27日352.1亿置换债到账，建议抓紧对接使用' },
      '重庆': { issued: 1665, zhhAmount: 800, specAmount: 50, jun: '100亿(再融资)', strategy: '再融资/化债主导', selfReview: true, note: '4月纳入自审自发，再融资持续释放财政现金流' }
    },
    windowAdvice: '四川6月再融资345.61亿为二季度最高，是化债资金争取的关键窗口。云南5月27日352.1亿置换债资金到账，建议抓紧对接项目欠款可否应用已到账化债资金。重庆6月再融资持续释放现金流，虽不直接用于清欠，但可争取财政统筹调拨。'
  },
  '贵州区域': {
    provinces: ['贵州'],
    totalIssued1to5: 1343,
    keyInfo: {
      '贵州': { issued: 1343, zhhAmount: 558.19, specAmount: 50, jun: '230亿(新增200亿)', strategy: '再融资/化债主导', selfReview: false, note: '全国化债重点省份，6月新增200亿创年内单月最高，化债资金向清欠倾斜' }
    },
    windowAdvice: '贵州作为全国化债重点省份，6月新增专项债200亿为年内最高。建议加快确认欠款纳入全口径债务平台，提前布局与省财政局债务处的对接工作。'
  },
  '华南区域': {
    provinces: ['广东', '福建', '江西', '广西', '湖南', '湖北'],
    totalIssued1to5: 9344,
    keyInfo: {
      '广东': { issued: 2640, zhhAmount: 0, specAmount: 151, jun: '654亿(新增417亿)', strategy: '自审自发先行省', selfReview: true, note: '新增专项债全国占比最高；6月新增417亿全国单月最高' },
      '福建': { issued: 1373, zhhAmount: 445, specAmount: 40, jun: '100-200亿(预测)', strategy: '自审自发先行省', selfReview: true, note: '全年置换进度89%，剩余额度6月可能完成' },
      '江西': { issued: 1127, zhhAmount: 450.94, specAmount: 229, jun: '100-300亿(预测)', strategy: '自审自发扩围', selfReview: true, note: '5月新纳入自审自发，审批加速；上报62个环资领域国债项目' },
      '广西': { issued: 1620, zhhAmount: 150, specAmount: 80, jun: '245亿(全部新增)', strategy: '再融资/化债主导', selfReview: false, note: '6月225亿新增专项债为年内最高，项目回款与投标双重窗口' },
      '湖南': { issued: 1354, zhhAmount: 516, specAmount: 34.12, jun: '200-400亿(预测)', strategy: '自审自发先行省', selfReview: true, note: '清欠纳入督查激励重点，存量欠款清偿概率高' },
      '湖北': { issued: 1850, zhhAmount: 620, specAmount: 33.3, jun: '612亿(二季度)', strategy: '自审自发扩围', selfReview: true, note: '4月纳入自审自发，5-6月集中发债；审批效率大幅提升' }
    },
    windowAdvice: '广东6月417亿新增专项债为全国单月最高，建议重点逾期项目主动对接地方财政局，探讨纳入化债可行性。福建全年置换进度89%，6月最后窗口，抓紧对接资金用途。湖南"清欠督查激励"叠加化债资金，存量欠款清偿概率高。湖北自审自发扩围后审批效率提升，6月资金拨付加速。'
  },
  '东部区域': {
    provinces: ['山东'],
    totalIssued1to5: 2011,
    keyInfo: {
      '山东': { issued: 2011, zhhAmount: 347, specAmount: 100, jun: '437亿(新增220亿)', strategy: '化债与新增并行', selfReview: true, note: '发行规模大，但化债资金占比偏低；主要用于市政、产业园区、棚改' }
    },
    windowAdvice: '山东发债批次密集，但化债资金整体占比偏低，新增专项债以建设类为主。建议重点关注补充财力类资金的专项申请，并利用山东自审自发试点审批效率优势。'
  }
};

// ─── Navigation ──────────────────────────────────────────────
function switchPage(pageId, btn) {
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) { page.style.display = 'block'; page.classList.add('active'); }
  if (btn) btn.classList.add('active');
  state.currentPage = pageId;

  // Restore sub-tab
  const savedTab = state.currentTabs[pageId];
  if (savedTab) {
    document.querySelectorAll(`#${pageId} .tab-content`).forEach(t => { t.style.display = 'none'; t.classList.remove('active'); });
    document.querySelectorAll(`#${pageId} .sub-tab`).forEach(t => t.classList.remove('active'));
    const tab = document.getElementById(savedTab);
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
  }
}

function switchTab(tabId, btn) {
  const page = document.getElementById(state.currentPage);
  if (!page) return;
  page.querySelectorAll('.tab-content').forEach(t => { t.style.display = 'none'; t.classList.remove('active'); });
  page.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
  if (btn) btn.classList.add('active');
  state.currentTabs[state.currentPage] = tabId;
}

// ─── Fetch data ──────────────────────────────────────────────
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
  const end = m.dataRangeEndLabel || m.dataRangeEnd || '—';
  const el = document.getElementById('dbValidity');
  if (el) el.textContent = `数据库有效期: ${start} — ${end}`;
  const lu = document.getElementById('lastUpdateLabel');
  if (lu) lu.textContent = `最后更新: ${m.lastUpdated || '—'}`;
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

// ─── Render Province Selectors ───────────────────────────────
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
  // Select all chips for that region (visual)
  document.querySelectorAll('#provinceSelectorLocal .province-chip').forEach(chip => {
    chip.classList.toggle('active', provinces.includes(chip.textContent));
  });
}

function filterLocalByProvince(province, btn) {
  state.selectedLocalProvince = province;
  document.querySelectorAll('#provinceSelectorLocal .province-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    document.querySelectorAll('#provinceSelectorLocal .province-chip').forEach(c => {
      if (c.textContent === province) c.classList.add('active');
    });
  }
  renderLocalPolicies();
}

function renderLocalPolicies() {
  const list = document.getElementById('localPolicyList');
  if (!list) return;

  const local = state.policies.local || {};
  let provincesToShow = [];

  if (state.selectedLocalProvince) {
    provincesToShow = [state.selectedLocalProvince];
  } else {
    provincesToShow = Object.keys(local);
  }

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
            ${p.keyPoints && p.keyPoints.length ? `
              <ul class="key-points" style="margin-top:10px">
                ${p.keyPoints.map(k => `<li>${escHtml(k)}</li>`).join('')}
              </ul>` : ''}
            <div class="policy-footer">
              ${p.url ? `<a href="${escHtml(p.url)}" target="_blank" rel="noopener" class="link-icon">🔗 原文</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  if (!html) {
    html = `<div class="empty-state"><div class="empty-icon">🗺️</div><div class="empty-text">请选择省份查看地方政策</div></div>`;
  }
  list.innerHTML = html;
}

// ─── Bond Table ──────────────────────────────────────────────
function populateBondFilters() {
  const regionSel = document.getElementById('bondRegionFilter');
  if (regionSel && regionSel.options.length === 1) {
    Object.keys(REGIONS).forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r;
      regionSel.appendChild(opt);
    });
  }
}

function onBondRegionChange() {
  const region = document.getElementById('bondRegionFilter')?.value;
  const provinceSel = document.getElementById('bondProvinceFilter');
  if (!provinceSel) return;
  // Clear province options except first
  while (provinceSel.options.length > 1) provinceSel.remove(1);
  if (region && REGIONS[region]) {
    REGIONS[region].forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      provinceSel.appendChild(opt);
    });
  } else {
    // All provinces
    const allProvinces = [...new Set(state.bonds.map(b => b.province))].sort();
    allProvinces.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      provinceSel.appendChild(opt);
    });
  }
  renderBondTable();
}

function resetBondFilters() {
  document.getElementById('bondRegionFilter').value = '';
  document.getElementById('bondProvinceFilter').value = '';
  document.getElementById('bondTypeFilter').value = '';
  document.getElementById('bondSpecialFilter').checked = false;
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

  const region = document.getElementById('bondRegionFilter')?.value;
  const province = document.getElementById('bondProvinceFilter')?.value;
  const type = document.getElementById('bondTypeFilter')?.value;
  const specialOnly = document.getElementById('bondSpecialFilter')?.checked;

  let bonds = getRecentBonds(3);
  if (region) bonds = bonds.filter(b => b.region === region);
  if (province) bonds = bonds.filter(b => b.province === province);
  if (type) bonds = bonds.filter(b => b.type === type);
  if (specialOnly) bonds = bonds.filter(b => b.isSpecial);

  // Sort by issueMonth desc
  bonds.sort((a, b) => (b.issueMonth || '').localeCompare(a.issueMonth || ''));

  const countEl = document.getElementById('bondTableCount');
  if (countEl) countEl.textContent = `共 ${bonds.length} 条`;

  // Update stats
  const allRecent = getRecentBonds(3);
  const el = id => document.getElementById(id);
  if (el('bondCountRecent')) el('bondCountRecent').textContent = allRecent.length;
  if (el('bondSpecialCount')) el('bondSpecialCount').textContent = allRecent.filter(b => b.isSpecial).length;
  if (el('bondZHHAmount')) {
    const total = allRecent.filter(b => b.subtype === '置换存量隐性债务').reduce((s, b) => s + (b.actualAmount || 0), 0);
    el('bondZHHAmount').textContent = total > 1000 ? (total/10000).toFixed(2)+'万' : total.toFixed(0);
  }

  if (!bonds.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gray-400)">近三个月暂无符合条件的发债记录</td></tr>`;
    return;
  }

  tbody.innerHTML = bonds.map(b => `
    <tr>
      <td><strong>${escHtml(b.province)}</strong><br><span class="tag ${REGION_COLORS[b.region] || 'tag-blue'}" style="margin-top:3px;display:inline-block">${escHtml(b.region)}</span></td>
      <td style="max-width:260px">
        <div style="font-weight:600;line-height:1.4">${escHtml(b.name)}</div>
        ${b.isSpecial ? `<span class="tag tag-special" style="margin-top:4px">✦ 特殊专项债</span>` : ''}
      </td>
      <td>
        <span class="tag ${getBondTypeTag(b.type)}">${escHtml(b.type)}</span>
        ${b.subtype ? `<br><span style="font-size:.72rem;color:var(--gray-500);margin-top:3px;display:inline-block">${escHtml(b.subtype)}</span>` : ''}
      </td>
      <td class="amount">${b.plannedAmount != null ? b.plannedAmount.toFixed(2) : '—'}</td>
      <td class="actual-amount">${b.actualAmount != null ? b.actualAmount.toFixed(2) : '—'}</td>
      <td style="text-align:center">${b.term != null ? b.term + '年' : '—'}</td>
      <td style="max-width:240px;font-size:.78rem;color:var(--gray-700)">${escHtml(b.purpose || '—')}</td>
      <td style="white-space:nowrap">${b.issueMonth || '—'}</td>
      <td>
        <div class="link-group">
          ${b.links?.credit ? `<a href="${escHtml(b.links.credit)}" target="_blank" rel="noopener" class="link-icon">资信</a>` : ''}
          ${b.links?.disclosure ? `<a href="${escHtml(b.links.disclosure)}" target="_blank" rel="noopener" class="link-icon">披露</a>` : ''}
          ${b.links?.bondInfo ? `<a href="${escHtml(b.links.bondInfo)}" target="_blank" rel="noopener" class="link-icon">债券</a>` : ''}
          ${!b.links?.credit && !b.links?.disclosure && !b.links?.bondInfo ? '<span style="color:var(--gray-400);font-size:.75rem">—</span>' : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function getBondTypeTag(type) {
  if (!type) return 'tag-blue';
  if (type.includes('新增专项')) return 'tag-green';
  if (type.includes('再融资专项')) return 'tag-orange';
  if (type.includes('再融资一般')) return 'tag-teal';
  return 'tag-blue';
}

// ─── Local Summary Grid ───────────────────────────────────────
function buildSummaryRegionSelector() {
  const container = document.getElementById('provinceSelectorSummary');
  if (!container) return;
  const allBtn = `<button class="province-chip active" onclick="filterSummaryRegion(null, this)" id="sumAllBtn">全部区域</button>`;
  const regionBtns = Object.keys(LOCAL_SUMMARY_DATA).map(r =>
    `<button class="province-chip" onclick="filterSummaryRegion('${r}', this)">${r}</button>`
  ).join('');
  container.innerHTML = allBtn + regionBtns;
}

function filterSummaryRegion(region, btn) {
  state.selectedSummaryRegion = region;
  document.querySelectorAll('#provinceSelectorSummary .province-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLocalSummaryGrid();
}

function renderLocalSummaryGrid() {
  const grid = document.getElementById('localSummaryGrid');
  if (!grid) return;

  const toShow = state.selectedSummaryRegion
    ? { [state.selectedSummaryRegion]: LOCAL_SUMMARY_DATA[state.selectedSummaryRegion] }
    : LOCAL_SUMMARY_DATA;

  grid.innerHTML = Object.entries(toShow).map(([region, data]) => {
    const provinces = data.provinces.join('、');
    const provinceCards = Object.entries(data.keyInfo).map(([prov, info]) => `
      <div style="padding:10px 0; border-bottom:1px solid var(--gray-100)">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px">
          <strong style="font-size:.88rem">${prov}</strong>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <span class="tag ${info.selfReview ? 'tag-green' : 'tag-blue'}" style="font-size:.65rem">${info.strategy}</span>
            ${info.selfReview ? '<span class="tag tag-special" style="font-size:.65rem">自审自发</span>' : ''}
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:6px">
          <div class="region-stat">
            <div class="region-stat-label">1-5月累计</div>
            <div class="region-stat-value">${formatAmt(info.issued)}<span>亿</span></div>
          </div>
          <div class="region-stat">
            <div class="region-stat-label">置换债</div>
            <div class="region-stat-value">${formatAmt(info.zhhAmount)}<span>亿</span></div>
          </div>
          <div class="region-stat">
            <div class="region-stat-label">特殊/补充财力</div>
            <div class="region-stat-value">${formatAmt(info.specAmount)}<span>亿</span></div>
          </div>
        </div>
        <div class="region-next">
          <div class="region-next-label">📅 6月计划：${info.jun}</div>
        </div>
        <div style="font-size:.76rem; color:var(--gray-600); margin-top:6px; line-height:1.5">${info.note}</div>
      </div>
    `).join('');

    return `
      <div class="region-card">
        <div class="region-card-header">
          <div>
            <div class="region-card-name">${region}</div>
            <div class="region-card-provinces" style="margin-top:2px">${provinces}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:.72rem;color:var(--gray-500)">1-5月累计</div>
            <div style="font-size:1rem;font-weight:700;color:var(--blue-900)">${formatAmt(data.totalIssued1to5)}<span style="font-size:.65rem;font-weight:400;color:var(--gray-500)">亿</span></div>
          </div>
        </div>
        <div class="region-card-body">
          ${provinceCards}
          <div style="margin-top:12px; padding:10px 12px; background:var(--blue-50); border-radius:6px; border:1px solid var(--blue-100)">
            <div style="font-size:.72rem;font-weight:700;color:var(--blue-900);margin-bottom:4px">💡 6月窗口期行动建议</div>
            <div style="font-size:.75rem;color:var(--gray-700);line-height:1.55">${data.windowAdvice}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── AI Box ──────────────────────────────────────────────────
function renderAIBox() {
  const m = state.metadata;
  if (m.latestAIAnalysis) {
    const el = document.getElementById('centralAIContent');
    if (el) el.textContent = m.latestAIAnalysis;
    const timeEl = document.getElementById('centralAITime');
    if (timeEl && m.latestAIAnalysisTime) {
      timeEl.textContent = '更新时间: ' + m.latestAIAnalysisTime.slice(0,10);
    }
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

function id(s) { return document.getElementById(s); }

// ─── Init ────────────────────────────────────────────────────
async function init() {
  await fetchData();
  renderHeader();
  renderCentralPolicies();
  renderProvinceSelectorLocal();
  renderLocalPolicies();
  populateBondFilters();
  onBondRegionChange();
  renderBondTable();
  buildSummaryRegionSelector();
  renderLocalSummaryGrid();
  renderAIBox();
}

document.addEventListener('DOMContentLoaded', init);
