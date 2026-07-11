#!/usr/bin/env python3
# Fixes js/crm.js — run from the repo root:  python3 fix-crm.py
# 1. Client Profile: order rows now clickable -> opens Order Summary (photos, email, requests)
# 2. Projects tab: fixes broken onclick quoting on Create Invoice / Update Invoice / Add Garment / View
# 3. Sales KPI cards: fixes malformed style="class="kpi-value"" HTML

import sys, subprocess, pathlib

path = pathlib.Path("js/crm.js")
if not path.exists():
    sys.exit("ERROR: js/crm.js not found. Run this from the repo root folder.")

src = path.read_text(encoding="utf-8")
orig = src

def replace_exact(s, old, new, expected):
    count = s.count(old)
    if count != expected:
        sys.exit(f"ERROR: expected {expected} occurrence(s) of a patch anchor, found {count}.\nAnchor starts: {old[:80]!r}\nFile may differ from the reviewed version — aborting, nothing written.")
    return s.replace(old, new)

# ---- Fix 1: client profile orders table -> clickable rows ----
old1 = '<tbody>${orders.map(o=>`<tr>'
new1 = ('<tbody>${orders.map(o=>`<tr style="cursor:pointer" '
        'onclick="App.closeModal();setTimeout(()=>CRM.showOrderDetails(' + chr(39) + '${o.id}' + chr(39) + '),200)" '
        'title="Click to view photos, details and photo requests">')
src = replace_exact(src, old1, new1, 1)

# ---- Fix 2: Projects tab broken onclick quoting (4 buttons) ----
pairs = [
    ("""onclick="CRM.createProjectInvoice(\\' + proj.id + \\')\"""",
     """onclick="CRM.createProjectInvoice(\\'' + proj.id + '\\')\""""),
    ("""onclick="CRM.updateProjectInvoice(\\' + proj.id + \\')\"""",
     """onclick="CRM.updateProjectInvoice(\\'' + proj.id + '\\')\""""),
    ("""onclick="CRM.addSubOrder(\\' + proj.id + \\')\"""",
     """onclick="CRM.addSubOrder(\\'' + proj.id + '\\')\""""),
    ("""onclick="CRM.viewProject(\\' + proj.id + \\')\"""",
     """onclick="CRM.viewProject(\\'' + proj.id + '\\')\""""),
]
for old, new in pairs:
    src = replace_exact(src, old, new, 1)

# ---- Fix 3: malformed KPI value divs ----
old3 = '<div style="class="kpi-value""'
new3 = '<div class="kpi-value"'
n = src.count(old3)
if n == 0:
    sys.exit("ERROR: KPI anchor not found — file may differ from the reviewed version. Aborting, nothing written.")
src = src.replace(old3, new3)
print(f"KPI fix applied to {n} card(s).")

path.write_text(src, encoding="utf-8")
print("All patches applied and written to js/crm.js")

# ---- Validate: mirror browser parsing ----
r = subprocess.run(["node", "-e",
    "new Function(require('fs').readFileSync('js/crm.js','utf8')); console.log('SYNTAX_OK')"],
    capture_output=True, text=True)
if "SYNTAX_OK" in r.stdout:
    print("Node validation passed: SYNTAX_OK")
else:
    # restore original on failure
    path.write_text(orig, encoding="utf-8")
    sys.exit("VALIDATION FAILED — original file restored untouched.\n" + r.stderr)