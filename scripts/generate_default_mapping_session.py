#!/usr/bin/env python3
"""
Generate default FieldMappingPage session JSON from current documented mapping.

Output is directly importable via "Import Session Backup" in FieldMappingPage.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List


ROOT = Path(__file__).resolve().parents[1]
MAPPING_MD = ROOT / "migration_analysis/legacy_to_new_field_mapping.md"
OUT = ROOT / "migration_analysis/loan_mapping_default_session.json"

LEGACY_FILES = [
    "AUTH_SIGNATORY.json",
    "CPV_DETAIL.json",
    "CUSTOMER_BANK.json",
    "GURANTOR.json",
    "RC_CUSTOMER_ACCOUNT.json",
    "RC_DOC_DESPATCH_MASTER.json",
    "RC_INSTRUMENT_DETAIL.json",
    "RC_RC_INV_RECEIVING_DETAIL.json",
    "RC_RC_INV_STATUS.json",
    "RC_SOURCE_REFERENCE.json",
]


def safe_key(name: str) -> str:
    base = re.sub(r"\.json$", "", name, flags=re.I)
    base = re.sub(r"[^a-zA-Z0-9]+", "_", base).strip("_").lower()
    return base or "file"


def extract_source_paths(expr: str) -> List[str]:
    files = [f.replace(".json", "") for f in LEGACY_FILES]
    file_group = "|".join(re.escape(f) for f in files)
    pattern = re.compile(rf"\b({file_group})\.([A-Za-z0-9_]+)\b")
    out = []
    for m in pattern.finditer(expr or ""):
        src = f"{safe_key(m.group(1) + '.json')}.{m.group(2)}"
        if src not in out:
            out.append(src)
    return out


def parse_mapping_md(md_path: Path):
    lines = md_path.read_text(encoding="utf-8").splitlines()
    in_table = False
    mapping: Dict[str, str] = {}
    fallbacks: Dict[str, List[str]] = {}
    for line in lines:
        s = line.strip()
        if s.startswith("| New field | Legacy source(s) | Transform / rule |"):
            in_table = True
            continue
        if in_table and s.startswith("|---|---|---|"):
            continue
        if in_table and s.startswith("|") and s.endswith("|"):
            parts = [p.strip() for p in s.split("|")[1:-1]]
            if len(parts) < 3:
                continue
            new_field = parts[0].strip().strip("`").strip()
            source_expr = parts[1]
            source_paths = extract_source_paths(source_expr)
            if not source_paths:
                continue
            mapping[new_field] = source_paths[0]
            if len(source_paths) > 1:
                fallbacks[new_field] = source_paths[1:]
            continue
        if in_table and (not s or not s.startswith("|")):
            in_table = False
    return mapping, fallbacks


def main():
    mapping, fallback_mappings = parse_mapping_md(MAPPING_MD)
    payload = {
        "version": 1,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "identifierPaths": ["cpv_detail.CPV_ACCOUNT_NO", "cpv_detail.CDB_ACCOUNT_NO", "rc_customer_account.TEMP_CUST_CODE"],
        "selectedCaseIds": [],
        "mapping": mapping,
        "fallbackMappings": fallback_mappings,
        "normalizationRules": {},
        "normalizationField": "",
        "leftSearch": "",
        "rightSearch": "",
        "hideMappedFields": True,
        "allowSourceReuse": True,
        "livePostUrl": "https://cdb-api.vercel.app/api/loans",
        "postedCaseBackendIds": {},
        "profileName": "MigrationDefaults",
        "importedFiles": [],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "ok": True,
                "out": str(OUT),
                "mappedFields": len(mapping),
                "fieldsWithFallbacks": len(fallback_mappings),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
