#!/usr/bin/env python3
"""
每日自动更新脚本 — 在 GitHub Actions 中运行
功能：
  1. 清理超过18个月的旧数据
  2. 从财政部网站抓取最新化债政策
  3. 更新 metadata（日期范围、统计数）
  4. 可选：调用 OpenAI 生成 AI 分析
"""

import json, os, datetime, requests
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA = ROOT / 'public' / 'data'

RETENTION_MONTHS = 18

def load(name):
    with open(DATA / name, 'r', encoding='utf-8') as f:
        return json.load(f)

def save(name, data):
    with open(DATA / name, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  已保存 {name}')

# ──────────────────────────────────────────────────────────────────────────────
# 步骤1：删除超过18个月的旧数据
# ──────────────────────────────────────────────────────────────────────────────

def prune_old_data():
    today = datetime.date.today()
    cutoff = today - datetime.timedelta(days=RETENTION_MONTHS * 30)
    cutoff_str = cutoff.isoformat()[:7]  # 'YYYY-MM'
    print(f'[清理] 删除 {cutoff_str} 之前的数据...')

    # 清理债券
    bonds_data = load('bonds.json')
    before = len(bonds_data.get('bonds', []))
    bonds_data['bonds'] = [
        b for b in bonds_data.get('bonds', [])
        if (b.get('issueMonth') or b.get('addedDate', '')[:7] or '9999-99') >= cutoff_str
    ]
    after = len(bonds_data['bonds'])
    if before != after:
        print(f'  债券：删除 {before - after} 条旧记录（剩余 {after} 条）')
        save('bonds.json', bonds_data)

    # 清理政策
    policies_data = load('policies.json')
    central_before = len(policies_data.get('central', []))
    policies_data['central'] = [
        p for p in policies_data.get('central', [])
        if p.get('date', '9999-99')[:7] >= cutoff_str
    ]
    local_pruned = 0
    for prov, plist in policies_data.get('local', {}).items():
        filtered = [p for p in plist if p.get('date', '9999-99')[:7] >= cutoff_str]
        local_pruned += len(plist) - len(filtered)
        policies_data['local'][prov] = filtered
    if central_before != len(policies_data['central']) or local_pruned:
        print(f'  政策：删除 {central_before - len(policies_data["central"])} 条中央 + {local_pruned} 条地方旧记录')
        save('policies.json', policies_data)

    # 清理月度/季度总结
    summaries_data = load('summaries.json')
    cutoff_year, cutoff_month = int(cutoff_str[:4]), int(cutoff_str[5:7])
    def is_recent(s):
        y, m = int(s.get('year', 0)), int(s.get('month', 1))
        return (y, m) >= (cutoff_year, cutoff_month)
    monthly_before = len(summaries_data.get('monthly', []))
    summaries_data['monthly'] = [s for s in summaries_data.get('monthly', []) if is_recent(s)]
    if monthly_before != len(summaries_data['monthly']):
        save('summaries.json', summaries_data)

    print('[清理] 完成')

# ──────────────────────────────────────────────────────────────────────────────
# 步骤2：抓取财政部最新化债相关公告
# ──────────────────────────────────────────────────────────────────────────────

def fetch_mof_news():
    """
    抓取财政部网站最新新闻标题，判断是否有新化债政策。
    这里只做标题抓取和关键词判断——如果发现相关内容，
    管理员可以手动添加完整政策条目到 policies.json。
    """
    print('[抓取] 尝试获取财政部最新公告...')
    keywords = ['化债', '置换债', '专项债', '再融资', '隐性债务', '地方债']
    found = []
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; PolicyBot/1.0)'}
        # 财政部新闻列表页
        resp = requests.get(
            'https://www.mof.gov.cn/zhengwuxinxi/caijingshidian/index.htm',
            headers=headers, timeout=15
        )
        resp.encoding = 'utf-8'
        text = resp.text
        # 简单关键词匹配
        for kw in keywords:
            if kw in text:
                found.append(kw)
        if found:
            print(f'  发现相关关键词: {", ".join(set(found))}')
            print('  提示：请人工核查财政部网站并手动添加新政策条目')
        else:
            print('  未发现新化债相关公告')
    except Exception as e:
        print(f'  抓取失败（网络问题）: {e}')
    return found

# ──────────────────────────────────────────────────────────────────────────────
# 步骤3：可选 AI 分析（需配置 OPENAI_API_KEY）
# ──────────────────────────────────────────────────────────────────────────────

def generate_ai_analysis():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('[AI分析] 未配置 OPENAI_API_KEY，跳过')
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        bonds_data = load('bonds.json')
        policies_data = load('policies.json')
        total_bonds = len(bonds_data.get('bonds', []))
        total_central = len(policies_data.get('central', []))
        total_local = sum(len(v) for v in policies_data.get('local', {}).values())
        today = datetime.date.today().strftime('%Y年%m月%d日')

        prompt = f"""今天是{today}，请根据以下数据生成一段简洁的化债政策动态分析（200字以内，中文）：
- 数据库共收录债券记录：{total_bonds}条
- 中央政策：{total_central}条
- 地方政策：{total_local}条
重点分析近期化债进展、主要省份动态，以及对企业应收账款清收的影响。"""

        resp = client.chat.completions.create(
            model='gpt-4o',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=400
        )
        analysis = resp.choices[0].message.content
        print(f'[AI分析] 生成完成（{len(analysis)}字）')
        return analysis
    except Exception as e:
        print(f'[AI分析] 生成失败: {e}')
        return None

# ──────────────────────────────────────────────────────────────────────────────
# 步骤4：更新 metadata
# ──────────────────────────────────────────────────────────────────────────────

def update_metadata(ai_analysis=None):
    bonds_data = load('bonds.json')
    policies_data = load('policies.json')

    all_bonds = bonds_data.get('bonds', [])
    all_months = [b.get('issueMonth') or b.get('addedDate', '')[:7] for b in all_bonds]
    all_months = sorted([m for m in all_months if m])

    today = datetime.date.today()
    cutoff = today - datetime.timedelta(days=RETENTION_MONTHS * 30)

    meta = load('metadata.json')
    meta['lastUpdated'] = today.isoformat()
    meta['lastUpdateTime'] = datetime.datetime.utcnow().isoformat()
    meta['dataRangeStart'] = cutoff.isoformat()
    meta['dataRangeEnd'] = today.isoformat()
    meta['dataRangeStartLabel'] = cutoff.strftime('%Y年%m月%d日')
    meta['dataRangeEndLabel'] = today.strftime('%Y年%m月%d日')
    meta['totalBonds'] = len(all_bonds)
    meta['totalPolicies'] = len(policies_data.get('central', [])) + sum(
        len(v) for v in policies_data.get('local', {}).values()
    )
    if ai_analysis:
        meta['latestAIAnalysis'] = ai_analysis
        meta['latestAIAnalysisTime'] = datetime.datetime.utcnow().isoformat()

    save('metadata.json', meta)
    print(f'[元数据] 已更新：债券{meta["totalBonds"]}条，政策{meta["totalPolicies"]}条')

# ──────────────────────────────────────────────────────────────────────────────
# 主流程
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('=' * 60)
    print(f'  政策化债追踪工作台 — 每日更新')
    print(f'  {datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}')
    print('=' * 60)

    prune_old_data()
    fetch_mof_news()
    ai_analysis = generate_ai_analysis()
    update_metadata(ai_analysis)

    print('=' * 60)
    print('  更新完成')
    print('=' * 60)
