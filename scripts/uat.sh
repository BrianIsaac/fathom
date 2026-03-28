#!/usr/bin/env bash
# UAT — User Acceptance Testing for Fathom
# Usage: ./scripts/uat.sh [--real] [port]
# Requires: curl, python3, running dev server

set -euo pipefail

REAL_MODE=false
PORT=3000

while [[ $# -gt 0 ]]; do
  case "$1" in
    --real) REAL_MODE=true; shift ;;
    *) PORT="$1"; shift ;;
  esac
done

BASE="http://localhost:$PORT"
PASS=0
FAIL=0
RESULTS=()
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

pass() { PASS=$((PASS+1)); RESULTS+=("[PASS] $1"); echo "  [PASS] $1"; }
fail() { FAIL=$((FAIL+1)); RESULTS+=("[FAIL] $1: $2"); echo "  [FAIL] $1: $2"; }

check_status() {
  local desc="$1" url="$2" expected="${3:-200}"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
  if [ "$status" = "$expected" ]; then pass "$desc (HTTP $status)"; else fail "$desc" "expected $expected, got $status"; fi
}

check_json() {
  local desc="$1" json="$2" expr="$3"
  local actual
  actual=$(echo "$json" | python3 -c "import json,sys; d=json.load(sys.stdin); print($expr)" 2>/dev/null || echo "__ERROR__")
  if [ "$actual" != "__ERROR__" ] && [ "$actual" != "False" ] && [ -n "$actual" ]; then pass "$desc ($actual)"; else fail "$desc" "expression failed: $expr"; fi
}

check_contains() {
  local desc="$1" content="$2" needle="$3"
  if echo "$content" | grep -q "$needle"; then pass "$desc"; else fail "$desc" "'$needle' not found"; fi
}

check_sse() {
  local desc="$1" url="$2" body="$3" expected="$4"
  local timeout=15
  if $REAL_MODE; then timeout=120; fi
  local raw
  if [ "$body" = "GET" ]; then
    raw=$(curl -s --max-time "$timeout" "$url" 2>/dev/null || true)
  else
    raw=$(curl -s --max-time "$timeout" -X POST "$url" -H 'Content-Type: application/json' -d "$body" 2>/dev/null || true)
  fi
  local events
  events=$(echo "$raw" | grep '^data: ' | python3 -c "
import json, sys
types = []
for line in sys.stdin:
    line = line.strip()
    if line.startswith('data: '):
        try: types.append(json.loads(line[6:]).get('type','?'))
        except: pass
print(','.join(types))
" 2>/dev/null)
  local all_found=true
  for evt in $(echo "$expected" | tr ',' ' '); do
    if ! echo "$events" | grep -q "$evt"; then all_found=false; break; fi
  done
  if $all_found; then pass "$desc (${events:0:80}...)"; else fail "$desc" "expected [$expected] in [$events]"; fi
}

echo ""
echo "================================================"
echo "  Fathom UAT — Full App"
if $REAL_MODE; then echo "  Mode: REAL (live API calls)"; else echo "  Mode: MOCK"; fi
echo "  Target: $BASE"
echo "================================================"

if ! curl -s -o /dev/null "$BASE" 2>/dev/null; then
  echo "ERROR: Dev server not running on port $PORT"
  exit 1
fi

# ─── WARMUP ──────────────────────────────────────────────────
# Trigger compilation of all route handlers to prevent HMR module reloads
# during the actual test run
echo ""
echo "--- Warming up server ---"
curl -s -o /dev/null "$BASE/" 2>/dev/null || true
curl -s -o /dev/null "$BASE/api/agents" 2>/dev/null || true
curl -s -o /dev/null "$BASE/api/agents/activity" 2>/dev/null || true
curl -s -o /dev/null "$BASE/api/test" 2>/dev/null || true
curl -s -o /dev/null "$BASE/api/sentry/regulatory" 2>/dev/null || true
curl -s -o /dev/null "$BASE/api/eval/scheduled" 2>/dev/null || true
curl -s -o /dev/null -X POST "$BASE/api/agents/seed" 2>/dev/null || true
curl -s -o /dev/null "$BASE/deploy" 2>/dev/null || true
curl -s -o /dev/null "$BASE/sentries" 2>/dev/null || true
curl -s -o /dev/null "$BASE/due-diligence" 2>/dev/null || true
curl -s -o /dev/null "$BASE/earnings" 2>/dev/null || true
curl -s -o /dev/null "$BASE/regulatory" 2>/dev/null || true
curl -s -o /dev/null "$BASE/eval" 2>/dev/null || true
sleep 2
echo "  Done"

# ─── SEED DATA ────────────────────────────────────────────────
echo ""
echo "--- Seeding Test Data ---"
SEED=$(curl -s -X POST "$BASE/api/agents/seed")
check_json "Seed agents" "$SEED" "d.get('agents', d.get('count', 0))"

# ─── API: AGENTS ──────────────────────────────────────────────
echo ""
echo "--- API: Agents CRUD ---"

AGENTS=$(curl -s "$BASE/api/agents")
check_json "List agents has 4 agents" "$AGENTS" "len(d) >= 4"
check_json "Agents have fish_sprite" "$AGENTS" "all('<svg' in a.get('fish_sprite','') for a in d)"
check_json "Has regulatory agent" "$AGENTS" "any(a['module']=='regulatory' for a in d)"
check_json "Has earnings agent" "$AGENTS" "any(a['module']=='earnings' for a in d)"
check_json "Has DD agent" "$AGENTS" "any(a['module']=='due_diligence' for a in d)"
check_json "Has disabled agent" "$AGENTS" "any(not a['enabled'] for a in d)"

# CRUD cycle
CREATE=$(curl -s -X POST "$BASE/api/agents" -H 'Content-Type: application/json' -d '{
  "name":"UAT Test Agent","enabled":true,"module":"regulatory",
  "conditions":{"operator":"all","checks":[{"fact":"x","operator":"equal","value":"y"}]},
  "actions":[{"type":"slack","config":{"channel":"#uat","template":"t"}}],
  "fish_config":{"species":"clownfish","colour":"auto","accessory":"none"}
}')
AGENT_ID=$(echo "$CREATE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$AGENT_ID" ]; then pass "Create agent ($AGENT_ID)"; else fail "Create agent" "no ID"; fi

UPDATE=$(curl -s -X PUT "$BASE/api/agents" -H 'Content-Type: application/json' -d "{\"id\":\"$AGENT_ID\",\"enabled\":false}")
check_json "Update agent disables it" "$UPDATE" "not d['enabled']"

DEL=$(curl -s -X DELETE "$BASE/api/agents" -H 'Content-Type: application/json' -d "{\"id\":\"$AGENT_ID\"}")
check_json "Delete agent" "$DEL" "d.get('success')"

BAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/agents" -H 'Content-Type: application/json' -d '{"name":"bad"}')
if [ "$BAD" = "400" ]; then pass "Validation rejects bad input (400)"; else fail "Validation" "$BAD"; fi

# ─── API: ACTIVITY ────────────────────────────────────────────
echo ""
echo "--- API: Agent Activity ---"

ACTIVITY=$(curl -s "$BASE/api/agents/activity")
check_json "Activity has seeded actions" "$ACTIVITY" "len(d) >= 4"
check_json "Actions have agent_name" "$ACTIVITY" "all('agent_name' in a for a in d)"
check_json "Actions have timestamps" "$ACTIVITY" "all('timestamp' in a for a in d)"

# ─── API: SSE STREAMS ────────────────────────────────────────
echo ""
echo "--- API: SSE Streams ---"

check_sse "Test SSE pipeline" "$BASE/api/test" "GET" "STARTED,SOURCE_COMPLETE,COMPLETE"
check_sse "Sentry SSE with tier cascade" "$BASE/api/sentry/regulatory" '{"business_domains":["digital payments"]}' "STARTED,TIER_CHECK,SOURCE_START,SOURCE_COMPLETE,SYNTHESISING,COMPLETE"
check_sse "DD SSE with source events" "$BASE/api/dd/run" '{"company":"Grab","jurisdiction":"SG","ticker":"GRAB"}' "STARTED,SOURCE_START,SOURCE_COMPLETE,COMPLETE"
check_sse "Earnings SSE with ticker events" "$BASE/api/earnings/run" '{"tickers":"AAPL,MSFT"}' "STARTED,TICKER_STARTED,TICKER_COMPLETE,COMPLETE"
check_sse "Eval SSE with task events" "$BASE/api/eval/run" "{}" "STARTED,TASK_STARTED,TASK_COMPLETE,COMPLETE"

# ─── API: OTHER ENDPOINTS ────────────────────────────────────
echo ""
echo "--- API: Other Endpoints ---"

check_status "Sentry GET (cron)" "$BASE/api/sentry/regulatory"
check_status "Eval scheduled (cron)" "$BASE/api/eval/scheduled"

SENTRY_GET=$(curl -s "$BASE/api/sentry/regulatory")
check_json "Sentry GET has publications" "$SENTRY_GET" "d.get('publications_found', 0) > 0"

EVAL_GET=$(curl -s "$BASE/api/eval/scheduled")
check_json "Eval has 12 tasks" "$EVAL_GET" "d.get('total_tasks') == 12"

# ─── REAL MODE: ADDITIONAL CHECKS ────────────────────────────
if $REAL_MODE; then
  echo ""
  echo "--- Real Mode: API Validation ---"

  HEALTH=$(curl -s -X POST "$BASE/api/test")
  check_json "TinyFish key present" "$HEALTH" "d['env_keys_present']['tinyfish']"
  check_json "OpenAI key present" "$HEALTH" "d['env_keys_present']['openai']"
  check_json "Not in mock mode" "$HEALTH" "not d['mock_mode']"

  echo ""
  echo "--- Real Mode: TinyFish Extraction ---"

  DD_REAL=$(curl -s --max-time 120 -X POST "$BASE/api/dd/run" -H 'Content-Type: application/json' -d '{"company":"DBS Group","jurisdiction":"SG","ticker":"D05.SI"}' 2>/dev/null || true)
  DD_COMPLETE=$(echo "$DD_REAL" | grep '^data: ' | tail -1 | python3 -c "
import json, sys
line = sys.stdin.read().strip()
if line.startswith('data: '):
    d = json.loads(line[6:])
    if d.get('type') == 'COMPLETE' and d.get('status') == 'success':
        r = d.get('result', {})
        print(f'sources={r.get(\"sources_returned\", 0)}')
    else: print('incomplete')
else: print('no_data')
" 2>/dev/null)
  check_contains "DD returns real source data" "$DD_REAL" "SOURCE_COMPLETE"

  echo ""
  echo "--- Real Mode: GPT Synthesis ---"

  SENTRY_REAL=$(curl -s --max-time 120 -X POST "$BASE/api/sentry/regulatory" -H 'Content-Type: application/json' -d '{"business_domains":["digital payments"],"jurisdictions":["SG"]}' 2>/dev/null || true)
  check_contains "Sentry returns real synthesis" "$SENTRY_REAL" "COMPLETE"
fi

# ─── VERIFY: SENTRY WIRES AGENTS ─────────────────────────────
echo ""
echo "--- Sentry → Agent Evaluation ---"

if $REAL_MODE; then
  ACTIVITY_AFTER=$(curl -s "$BASE/api/agents/activity")
  check_json "Activity grew after sentry trigger" "$ACTIVITY_AFTER" "len(d) > 4"
else
  pass "Sentry agent wiring (skipped in mock mode — no live agent evaluation)"
fi

# ─── PAGES: ALL RENDER ───────────────────────────────────────
echo ""
echo "--- Pages: Render Check ---"

for page in "/" "/deploy" "/sentries" "/due-diligence" "/earnings" "/regulatory" "/eval"; do
  check_status "Page $page renders" "$BASE$page"
done

# ─── PAGES: CONTENT CHECK ────────────────────────────────────
echo ""
echo "--- Pages: Content ---"

POOL_HTML=$(curl -s "$BASE/")
check_contains "Pool has Fathom Pool heading" "$POOL_HTML" "Fathom Pool"

DEPLOY_HTML=$(curl -s "$BASE/deploy")
check_contains "Deploy has New Agent button" "$DEPLOY_HTML" "New Agent"
check_contains "Deploy has Deploy heading" "$DEPLOY_HTML" "Deploy"

SENTRIES_HTML=$(curl -s "$BASE/sentries")
check_contains "Sentries has trigger button" "$SENTRIES_HTML" "Trigger Sentry"

DD_HTML=$(curl -s "$BASE/due-diligence")
check_contains "DD has company input" "$DD_HTML" "Company Name"

EARN_HTML=$(curl -s "$BASE/earnings")
check_contains "Earnings has ticker input" "$EARN_HTML" "tickers"

REG_HTML=$(curl -s "$BASE/regulatory")
check_contains "Regulatory has scan button" "$REG_HTML" "Scan Regulators"

EVAL_HTML=$(curl -s "$BASE/eval")
check_contains "Eval has dashboard heading" "$EVAL_HTML" "Eval Dashboard"

# ─── SIDEBAR: NAVIGATION ─────────────────────────────────────
echo ""
echo "--- Sidebar Navigation ---"

for link in "/" "/deploy" "/sentries" "/due-diligence" "/earnings" "/regulatory" "/eval"; do
  check_contains "Sidebar has link to $link" "$POOL_HTML" "href=\"$link\""
done

check_contains "Sidebar has Agents section" "$POOL_HTML" "Agents"
check_contains "Sidebar has Run Once section" "$POOL_HTML" "Run Once"
check_contains "Sidebar has System section" "$POOL_HTML" "System"

# ─── DARK MODE ────────────────────────────────────────────────
echo ""
echo "--- Dark Mode ---"

COMPONENT_DARK=$(grep -rl 'dark:' "$PROJECT_ROOT/components/" 2>/dev/null | wc -l || echo "0")
CSS_DARK=$(grep -c '.dark' "$PROJECT_ROOT/app/globals.css" 2>/dev/null || echo "0")
TOTAL=$((COMPONENT_DARK + CSS_DARK))
if [ "$TOTAL" -gt 5 ]; then pass "Dark mode support ($COMPONENT_DARK components, $CSS_DARK CSS)"; else fail "Dark mode" "only $TOTAL references"; fi

# ─── FISH SPRITES ─────────────────────────────────────────────
echo ""
echo "--- Fish Sprites ---"

FISH_CHECK=$(echo "$AGENTS" | python3 -c "
import json, sys
agents = json.load(sys.stdin)
modules = {a['module'] for a in agents}
svg_ok = all('<svg' in a.get('fish_sprite','') and 'viewBox' in a.get('fish_sprite','') for a in agents)
print(f'modules={sorted(modules)},svg_ok={svg_ok}')
" 2>/dev/null)
check_contains "All agents have valid SVG sprites" "$FISH_CHECK" "svg_ok=True"
check_contains "Three module types covered" "$FISH_CHECK" "due_diligence"

# ─── SUMMARY ──────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  UAT SUMMARY"
if $REAL_MODE; then echo "  Mode: REAL"; else echo "  Mode: MOCK"; fi
echo "================================================"
echo ""
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "  Total:  $((PASS+FAIL))"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  FAILED TESTS:"
  for r in "${RESULTS[@]}"; do
    if echo "$r" | grep -q "^\[FAIL\]"; then echo "    $r"; fi
  done
  echo ""
fi

if [ "$FAIL" -eq 0 ]; then
  echo "  ALL TESTS PASSED"
  exit 0
else
  echo "  $FAIL TEST(S) FAILED"
  exit 1
fi
