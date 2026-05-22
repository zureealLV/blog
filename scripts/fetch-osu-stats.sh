#!/bin/bash
# 获取 osu! API v2 数据并保存为 JSON
# 用法: bash scripts/fetch-osu-stats.sh
# 需要环境变量: OSU_CLIENT_ID, OSU_CLIENT_SECRET

set -e

CLIENT_ID="${OSU_CLIENT_ID:-57170}"
CLIENT_SECRET="${OSU_CLIENT_SECRET}"
USER_ID="${OSU_USER_ID:-37641269}"
OUTPUT="${1:-public/osu-stats.json}"

if [ -z "$CLIENT_SECRET" ]; then
  echo "❌ OSU_CLIENT_SECRET not set"
  exit 1
fi

# 获取 access token
TOKEN=$(curl -s -X POST "https://osu.ppy.sh/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{\"client_id\":$CLIENT_ID,\"client_secret\":\"$CLIENT_SECRET\",\"grant_type\":\"client_credentials\",\"scope\":\"public\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# 获取用户数据
curl -s "https://osu.ppy.sh/api/v2/users/$USER_ID/osu" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d.get('statistics', {})
g = s.get('grade_counts', {})
result = {
    'username': d.get('username'),
    'pp': round(s.get('pp', 0), 1),
    'global_rank': s.get('global_rank', 0),
    'country_rank': s.get('country_rank', 0),
    'accuracy': round(s.get('hit_accuracy', 0), 2),
    'play_count': s.get('play_count', 0),
    'level': s.get('level', {}).get('current', 0),
    'max_combo': s.get('maximum_combo', 0),
    'ranked_score': s.get('ranked_score', 0),
    'total_score': s.get('total_score', 0),
    'grade_ss': g.get('ss', 0),
    'grade_s': g.get('s', 0),
    'grade_a': g.get('a', 0),
}
print(json.dumps(result, ensure_ascii=False))
" > "$OUTPUT"

echo "✅ osu! stats saved to $OUTPUT"
head -c 200 "$OUTPUT"
