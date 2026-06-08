#!/usr/bin/env python3
"""
Daily data updater:
  1. Prune records older than 18 months
  2. Fetch latest policy/bond news from public sources
  3. Generate AI analysis via OpenAI
  4. Update metadata.json
"""

import os, sys, json, datetime, logging
from pathlib import Path

log = logging.getLogger(__name__)
BASE = Path(__file__).parent.parent
DATA = BASE / 'data'
PUBLIC_DATA = BASE / 'public' / 'data'
RETENTION_MONTHS = int(os.environ.get('DATA_RETENTION_MONTHS', '18'))

# ─── Helpers ───────────────────────────────────────────────────────────────

def read_json(name):
    with open(DATA / name, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(name, data):
    with open(DATA / name, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # Mirror to public/data/ so Nginx static serving also gets updates
    pub = PUBLIC_DATA / name
    if pub.parent.exists():
        with open(pub, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

def get_cutoff():
    today = datetime.date.today()
    y = today.year; m = today.month - RETENTION_MONTHS
    while m <= 0: m += 12; y -= 1
    return datetime.date(y, m, 1)

def fmt_date_cn(d: datetime.date):
    return f"{d.year}年{d.month:02d}月{d.day:02d}日"

def fmt_date_range():
    end = datetime.date.today()
    cutoff = get_cutoff()
    return {
        'start': cutoff.isoformat(), 'end': end.isoformat(),
        'startLabel': fmt_date_cn(cutoff), 'endLabel': fmt_date_cn(end)
    }

# ─── Prune old data ─────────────────────────────────────────────────────────

def prune_old_data():
    cutoff = get_cutoff()
    log.info(f'Pruning data older than {cutoff}...')

    # Bonds
    bonds_data = read_json('bonds.json')
    before = len(bonds_data['bonds'])
    bonds_data['bonds'] = [
        b for b in bonds_data['bonds']
        if _parse_bond_date(b) >= cutoff
    ]
    write_json('bonds.json', bonds_data)
    log.info(f'  Bonds: {before} → {len(bonds_data["bonds"])} (removed {before - len(bonds_data["bonds"])})')

    # Policies
    pol_data = read_json('policies.json')
    c_before = len(pol_data.get('central', []))
    pol_data['central'] = [
        p for p in pol_data.get('central', [])
        if datetime.date.fromisoformat(p['date']) >= cutoff
    ]
    for province in list(pol_data.get('local', {}).keys()):
        pol_data['local'][province] = [
            p for p in pol_data['local'][province]
            if datetime.date.fromisoformat(p['date']) >= cutoff
        ]
    write_json('policies.json', pol_data)
    log.info(f'  Central policies: {c_before} → {len(pol_data["central"])}')

    # Summaries
    sum_data = read_json('summaries.json')
    before_s = len(sum_data.get('monthly', []))
    sum_data['monthly'] = [
        s for s in sum_data.get('monthly', [])
        if datetime.date(s['year'], s['month'], 1) >= cutoff
    ]
    write_json('summaries.json', sum_data)
    log.info(f'  Monthly summaries: {before_s} → {len(sum_data["monthly"])}')

def _parse_bond_date(b):
    raw = b.get('issueMonth') or b.get('addedDate') or '2020-01'
    if len(raw) == 7:  # YYYY-MM
        return datetime.date.fromisoformat(raw + '-01')
    try:
        return datetime.date.fromisoformat(raw[:10])
    except:
        return datetime.date(2020, 1, 1)

# ─── Fetch news (lightweight scrape) ────────────────────────────────────────

def fetch_latest_news():
    try:
        import urllib.request, urllib.error
        sources = [
            ('财政部', 'http://www.mof.gov.cn/gkml/caizhengxinwen/index.htm'),
        ]
        results = []
        for name, url in sources:
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as r:
                    results.append({'source': name, 'status': 'ok', 'len': len(r.read())})
            except Exception as e:
                results.append({'source': name, 'status': 'error', 'error': str(e)})
        log.info(f'News fetch: {results}')
    except Exception as e:
        log.warning(f'News fetch error: {e}')

# ─── AI Analysis ────────────────────────────────────────────────────────────

def generate_ai_analysis():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        log.info('No OPENAI_API_KEY found, skipping AI analysis.')
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        bonds_data = read_json('bonds.json')
        recent = bonds_data['bonds'][-20:]
        bond_lines = '\n'.join(
            f"{b['province']} {b['type']} {b.get('subtype','')} {b.get('actualAmount',0)}亿 ({b.get('issueMonth','')})"
            for b in recent
        )

        prompt = f"""你是中国地方政府化债政策分析专家。基于以下最新发债数据，生成月度分析报告（不超过400字）：

近期发债情况：
{bond_lines}

请从以下四个维度分析：
1. 当前化债资金整体形势（2-3句）
2. 补充财力类专项债发行趋势（1-2句）
3. 对企业回款的影响判断（1-2句）
4. 需重点关注的省份和窗口期（2-3句）

格式：分点简洁陈述，使用专业财务语言，数据精确。"""

        resp = client.chat.completions.create(
            model='gpt-4o',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=600, temperature=0.3
        )
        return resp.choices[0].message.content
    except Exception as e:
        log.error(f'AI analysis failed: {e}')
        return None

# ─── Update metadata ────────────────────────────────────────────────────────

def update_metadata(ai_analysis=None):
    dr = fmt_date_range()
    bonds_data = read_json('bonds.json')
    pol_data = read_json('policies.json')
    local_count = sum(len(v) for v in pol_data.get('local', {}).values())

    meta = {
        'lastUpdated': datetime.date.today().isoformat(),
        'lastUpdateTime': datetime.datetime.now().isoformat(),
        'dataRangeStart': dr['start'],
        'dataRangeEnd': dr['end'],
        'dataRangeStartLabel': dr['startLabel'],
        'dataRangeEndLabel': dr['endLabel'],
        'retentionMonths': RETENTION_MONTHS,
        'totalBonds': len(bonds_data.get('bonds', [])),
        'totalPolicies': len(pol_data.get('central', [])) + local_count,
        'version': '2.0.0',
        'latestAIAnalysis': ai_analysis,
        'latestAIAnalysisTime': datetime.datetime.now().isoformat() if ai_analysis else None
    }
    write_json('metadata.json', meta)
    log.info(f'Metadata updated: {dr["start"]} → {dr["end"]}')

# ─── Main ───────────────────────────────────────────────────────────────────

def run_update():
    log.info(f'Starting daily update at {datetime.datetime.now()}...')
    prune_old_data()
    fetch_latest_news()
    ai = generate_ai_analysis()
    update_metadata(ai)
    log.info('Daily update done.')

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
    run_update()
