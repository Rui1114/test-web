#!/usr/bin/env python3
"""
Policy Debt Intelligence — 政策化债追踪工作台
Flask backend server with daily scheduled updates (8:30 AM Beijing time)
"""

import os, json, threading, time, datetime, logging
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger(__name__)

BASE = Path(__file__).parent
DATA = BASE / 'data'
PUBLIC = BASE / 'public'

app = Flask(__name__, static_folder=str(PUBLIC), static_url_path='')

# ─── Helpers ────────────────────────────────────────────────────────────────

def read_json(name):
    try:
        with open(DATA / name, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        log.error(f'Error reading {name}: {e}')
        return {}

def write_json(name, data):
    with open(DATA / name, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ─── API Routes ─────────────────────────────────────────────────────────────

@app.route('/api/metadata')
def api_metadata():
    return jsonify(read_json('metadata.json'))

@app.route('/api/bonds')
def api_bonds():
    data = read_json('bonds.json')
    bonds = data.get('bonds', [])

    # Apply query filters
    province = request.args.get('province')
    region = request.args.get('region')
    bond_type = request.args.get('type')
    is_special = request.args.get('isSpecial')
    months = request.args.get('months')

    if province:
        bonds = [b for b in bonds if b.get('province') == province]
    if region:
        bonds = [b for b in bonds if b.get('region') == region]
    if bond_type:
        bonds = [b for b in bonds if b.get('type') == bond_type]
    if is_special is not None:
        special_bool = is_special.lower() == 'true'
        bonds = [b for b in bonds if b.get('isSpecial') == special_bool]
    if months:
        cutoff = datetime.date.today() - datetime.timedelta(days=int(months) * 30)
        def in_range(b):
            m = b.get('issueMonth') or b.get('addedDate') or '2020-01'
            try:
                d = datetime.date.fromisoformat(m + '-01' if len(m) == 7 else m)
                return d >= cutoff
            except:
                return True
        bonds = [b for b in bonds if in_range(b)]

    return jsonify({'bonds': bonds, 'total': len(bonds)})

@app.route('/api/policies')
def api_policies():
    data = read_json('policies.json')
    level = request.args.get('level')
    province = request.args.get('province')

    if level == 'central':
        return jsonify({'central': data.get('central', []), 'local': {}})
    if level == 'local' and province:
        local = data.get('local', {})
        return jsonify({'central': [], 'local': {province: local.get(province, [])}})
    return jsonify(data)

@app.route('/api/summaries')
def api_summaries():
    return jsonify(read_json('summaries.json'))

@app.route('/api/regions')
def api_regions():
    return jsonify({
        '北部区域': ['河北', '辽宁', '吉林', '黑龙江', '内蒙古'],
        '中部区域': ['河南', '山西', '陕西'],
        '西南区域': ['四川', '云南', '重庆'],
        '贵州区域': ['贵州'],
        '华南区域': ['广东', '福建', '江西', '广西', '湖南', '湖北'],
        '东部区域': ['山东', '江苏', '浙江', '上海', '安徽'],
        '华北区域': ['北京', '天津'],
        '西北区域': ['甘肃', '青海', '宁夏', '新疆', '西藏', '海南']
    })

@app.route('/api/update', methods=['POST'])
def api_update():
    def run():
        from scripts.updater import run_update
        run_update()
    threading.Thread(target=run, daemon=True).start()
    return jsonify({'message': 'Update started', 'timestamp': datetime.datetime.now().isoformat()})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path and (PUBLIC / path).exists():
        return send_from_directory(str(PUBLIC), path)
    return send_from_directory(str(PUBLIC), 'index.html')

# ─── Daily Scheduler (8:30 AM Beijing Time = 00:30 UTC) ─────────────────────

def schedule_loop():
    """Run in background thread; fires daily at 8:30 AM Beijing (00:30 UTC)."""
    log.info('Scheduler thread started. Will update at 00:30 UTC (08:30 Beijing) daily.')
    while True:
        now_utc = datetime.datetime.utcnow()
        # Next target: today or tomorrow at 00:30 UTC
        target = now_utc.replace(hour=0, minute=30, second=0, microsecond=0)
        if now_utc >= target:
            target += datetime.timedelta(days=1)
        wait_secs = (target - now_utc).total_seconds()
        log.info(f'Next update scheduled in {wait_secs/3600:.1f}h at {target} UTC')
        time.sleep(wait_secs)
        log.info('Running daily scheduled update...')
        try:
            from scripts.updater import run_update
            run_update()
            log.info('Daily update completed.')
        except Exception as e:
            log.error(f'Daily update failed: {e}')

# ─── Main ────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))

    # Start scheduler in background
    t = threading.Thread(target=schedule_loop, daemon=True)
    t.start()

    print(f"""
=================================================
  Policy Debt Intelligence v2.0
  政策化债追踪工作台
  http://localhost:{port}
  Auto-update: Daily at 08:30 AM Beijing Time
=================================================
""")
    app.run(host='0.0.0.0', port=port, debug=False)
