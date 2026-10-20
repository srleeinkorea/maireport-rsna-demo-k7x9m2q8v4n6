#!/usr/bin/env python3
"""Build the read-only applied diet phrase catalogue from existing repository data.

Run from any directory with Python and openpyxl installed. No network requests are
made and no source workbook, wording, selection rule or source link is changed.
Use --check to confirm the committed JSON exactly matches the current inputs.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from collections import Counter
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = "files/diet-data-contract-v1.0.1.xlsx"
REFERENCE = "files/diet-reference-config-v1.0.0.xlsx"
ENGINE = "diet-sim-engine.js"
KB = "diet-guideline-kb-summary.html"
OUTPUT = "files/diet-applied-data.json"


def sheet_rows(book, name):
    values = list(book[name].values)
    headers = values[0]
    return [dict(zip(headers, values)) for values in values[1:] if any(v is not None for v in values)]


def keyed(rows, field):
    result = {}
    for row in rows:
        key = row[field]
        if key in result:
            raise ValueError(f"Duplicate {field}: {key}")
        result[key] = row
    return result


def plain(fragment):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def source_catalogue(document):
    """Read only explicitly named IDs and links from the existing KB source table."""
    start = document.index("<h2>3.")
    stop = document.index("<h2>4.", start)
    records = []
    for row in re.findall(r"<tr\b[^>]*>(.*?)</tr>", document[start:stop], flags=re.S):
        cells = re.findall(r"<td\b[^>]*>(.*?)</td>", row, flags=re.S)
        for index, cell in enumerate(cells):
            code = re.search(r"<code>([A-Za-z0-9-]+)</code>", cell)
            if not code:
                continue
            source_id = code.group(1)
            links = [
                {"label": plain(label), "url": html.unescape(url)}
                for url, label in re.findall(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', cells[-1], flags=re.S)
            ]
            records.append({
                "id": source_id,
                "name": plain(re.sub(r"<code>.*?</code>", "", cell)),
                "url": links[0]["url"] if links else None,
                "links": links,
                "status": plain(cells[index + 2]),
                "usage": plain(cells[index + 1]),
                "provenance": {"file": KB, "section": "3. 현재 준용 중인 가이드라인"},
            })
    if not records:
        raise ValueError("No explicit source IDs found in the knowledge DB source table")
    keyed(records, "id")
    return records


def extract_engine(source):
    data_match = re.search(r"var DATA = (\{.*?\});\s*\n", source, flags=re.S)
    if not data_match:
        raise ValueError("Expected static DATA object was not found in diet-sim-engine.js")
    data = json.loads(data_match.group(1))
    questions = {q["id"]: q for q in data["questions"]}
    followup = re.search(r"var MEAL_TIME_Q = (.*?);\s*\n", source, flags=re.S)
    if not followup:
        raise ValueError("Expected follow-up question definitions were not found")
    pattern = r"'(DIET-Q-\d+)':\s*\{\s*id:\s*'[^']+',\s*axis:\s*'([^']+)',\s*role:\s*'([^']+)',\s*tpl:\s*'([^']+)'"
    for qid, axis, role, template in re.findall(pattern, followup.group(1)):
        questions[qid] = {"id": qid, "axis": axis, "role": role, "tpl": template}
    # Limit this status to the deployed simulator selection function. Merely
    # appearing in DATA does not establish an executable selection path.
    selection_start = source.index("function axisCandidates(")
    selection_stop = source.index("function finish(", selection_start)
    selection_source = source[selection_start:selection_stop]
    selected_pools = set(re.findall(r"p\.pool === '([^']+)'", selection_source))
    if selected_pools != {"AXIS_STAGE", "RECOVERY"}:
        raise ValueError("Simulator pool selection changed; review catalogue linkage semantics before rebuilding")
    if "if (f.score !== null && f.score <= 0)" not in selection_source:
        raise ValueError("Recovery selection changed; review recovery question linkage before rebuilding")
    generation_slots = set(re.findall(r"makeQ\(u,\s*day,\s*'([^']+)'", source))
    if generation_slots != {"FIXED", "ROTATING", "MEAL_TIME"}:
        raise ValueError("Simulator question generation changed; review template generation statuses before rebuilding")
    generated_roles = {"FIXED", "ROTATING", "FOLLOW_UP"}
    return data, questions, selected_pools, generated_roles


def build():
    engine_source = (ROOT / ENGINE).read_text(encoding="utf-8")
    engine, runtime_questions, selected_pools, generated_question_roles = extract_engine(engine_source)
    contract = openpyxl.load_workbook(ROOT / CONTRACT, read_only=True, data_only=True)
    reference = openpyxl.load_workbook(ROOT / REFERENCE, read_only=True, data_only=True)
    contract_phrases = keyed(sheet_rows(contract, "목표문구"), "phrase_id")
    exposures = keyed(sheet_rows(contract, "노출조건"), "phrase_id")
    contract_questions = keyed(sheet_rows(contract, "질문"), "question_id")
    options = sheet_rows(contract, "선택지")
    sources = source_catalogue((ROOT / KB).read_text(encoding="utf-8"))
    source_ids = {source["id"] for source in sources}
    engine_ids = {phrase["id"] for phrase in engine["phrases"]}
    if engine_ids != set(contract_phrases) or len(engine_ids) != len(engine["phrases"]):
        raise ValueError("Phrase IDs differ between runtime and contract, or runtime has duplicate IDs")
    if set(runtime_questions) != set(contract_questions):
        raise ValueError("Question IDs differ between runtime and contract")

    disease_axis = sheet_rows(contract, "질환연결축")
    disease_nature = sheet_rows(contract, "질환금지성격")
    reference_disease = keyed(sheet_rows(reference, "질환규칙"), "규칙 ID")
    self_conditions = sheet_rows(contract, "내정보질환매핑")
    runtime_disease_ids = {row["rule"] for row in engine["conditions"]}
    disease_rules = []
    for row in sheet_rows(contract, "질환규칙"):
        rule_id = row["rule_id"]
        disease_rules.append({
            "id": rule_id, "name": row["disease_name"], "release_phase": row["release_phase"],
            "link_enabled": row["link_enabled"], "ban_enabled": row["ban_enabled"],
            "confirmation_enabled": row["confirmation_enabled"], "confirmation_label": row["confirmation_label"],
            "ban_reason": row["ban_reason"], "action": row["recommendation_action"],
            "action_basis": row["action_basis"], "evidence_raw": reference_disease[rule_id]["근거"],
            "note": reference_disease[rule_id]["비고"],
            "axis_ids": [item["question_id"] for item in disease_axis if item["rule_id"] == rule_id],
            "banned_natures": [item["nature_code"] for item in disease_nature if item["rule_id"] == rule_id],
            "in_simulator": rule_id in runtime_disease_ids,
            "condition_codes": [item["condition_code"] for item in self_conditions if item["rule_id"] == rule_id],
            "source_scope": "CONTRACT", "source_row": row["source_row"],
        })

    metrics = keyed(sheet_rows(contract, "검진항목"), "metric_id")
    screening_links = []
    for row in sheet_rows(contract, "검진식이연결"):
        screening_links.append({
            "id": row["metric_id"], "name": metrics[row["metric_id"]]["metric_name"],
            "priority": row["priority_group"], "eligible_bands": row["eligible_band"].split(","),
            "axis": row["axis_question_id"], "selection_policy": row["selection_policy"],
            "note": row["source_note"], "minimum_value_inclusive": row["minimum_value_inclusive"],
            "source_scope": "CONTRACT",
        })

    questions = []
    question_differences = []
    for row in contract_questions.values():
        qid = row["question_id"]
        runtime = runtime_questions[qid]
        for field, runtime_key, contract_key in [("text", "tpl", "question_template"), ("axis", "axis", "axis_name"), ("role", "role", "question_role")]:
            if runtime[runtime_key] != row[contract_key]:
                question_differences.append({"id": qid, "field": field, "runtime_value": runtime[runtime_key], "contract_value": row[contract_key]})
        question_options = []
        for option in sorted([item for item in options if item["question_id"] == qid], key=lambda item: item["option_order"]):
            value = {"code": option["option_code"], "label": option["option_label"], "score": option["score_value"], "order": option["option_order"], "note": option["설명"]}
            if qid in engine["options"]:
                runtime_option = next(item for item in engine["options"][qid] if item[0] == value["code"])
                if runtime_option[1:3] != [value["label"], value["score"]]:
                    question_differences.append({"id": qid, "field": "option", "code": value["code"], "runtime_value": runtime_option[1:3], "contract_value": [value["label"], value["score"]]})
                value["label"], value["score"] = runtime_option[1:3]
            question_options.append(value)
        questions.append({
            "id": qid, "version": row["question_version"], "axis": runtime["axis"], "role": runtime["role"],
            "text": runtime["tpl"], "options": question_options,
            "options_kind": "DYNAMIC_BY_MEAL_TIME" if qid == "DIET-Q-08" else "FIXED",
            "runtime_generation_status": "GENERATED_BY_SIMULATOR" if runtime["role"] in generated_question_roles else "REGISTERED_NOT_GENERATED",
            "runtime_note": (
                "질환 확인 템플릿과 선택지는 등록되어 있으나 현재 시뮬레이터의 질문 생성 경로에는 연결되어 있지 않습니다."
                if runtime["role"] not in generated_question_roles else
                "표에 보이는 것은 기본 선택지 문구입니다. 답한 시각과 끼니에 따라 표시 시각 구간을 계산하며 상한·하한에 걸리면 시각 문구로 바뀝니다."
                if qid == "DIET-Q-08" else None
            ),
            "meal_scope": row["meal_scope_raw"], "observation_scope": row["observation_scope"],
            "interpretation_limit": row["interpretation_limit"],
            "contract_row": list(contract_questions).index(qid) + 2,
        })

    phrases = []
    unknown_evidence_tokens = []
    for runtime in engine["phrases"]:
        row = contract_phrases[runtime["id"]]
        exposure = exposures[runtime["id"]]
        differences = []
        for runtime_field, contract_field in [("text", "tile_text"), ("reason", "reason_text"), ("pool", "pool_type"), ("axis", "axis_question_id"), ("stage", "stage_code"), ("nature", "nature_code")]:
            if runtime[runtime_field] != row[contract_field]:
                differences.append({"field": runtime_field, "runtime_value": runtime[runtime_field], "contract_value": row[contract_field], "contract_file": CONTRACT, "sheet": "목표문구", "row": list(contract_phrases).index(runtime["id"]) + 2})
        for runtime_field, contract_field in [("time", "time_code"), ("cal", "calendar_code"), ("ad", "after_dinner_eligible")]:
            if runtime[runtime_field] != exposure[contract_field]:
                differences.append({"field": runtime_field, "runtime_value": runtime[runtime_field], "contract_value": exposure[contract_field], "contract_file": CONTRACT, "sheet": "노출조건", "row": list(exposures).index(runtime["id"]) + 2})

        raw = row["evidence_raw"]
        tokens = re.split(r"\s*[;/]\s*", raw) if raw else []
        linked_sources = list(dict.fromkeys(token for token in tokens if token in source_ids))
        unknown_tokens = [token for token in tokens if token not in source_ids]
        status = "MISSING" if not raw else "LINKED" if not unknown_tokens else "FREE_TEXT"
        if unknown_tokens:
            unknown_evidence_tokens.append({"phrase_id": runtime["id"], "tokens": unknown_tokens})
        link_type = "AXIS_CANDIDATE" if runtime["axis"] else "RECOVERY_BRANCH" if runtime["pool"] == "RECOVERY" else "NONE"
        question_ids = [runtime["axis"]] if runtime["axis"] else ["DIET-Q-00"] if link_type == "RECOVERY_BRANCH" else []
        phrases.append({
            "id": runtime["id"], "version": row["phrase_version"], "status": row["source_status"],
            "pool": runtime["pool"], "axis": runtime["axis"], "stage": runtime["stage"],
            "text": runtime["text"], "full_text": row["full_text"], "reason": runtime["reason"],
            "nature": runtime["nature"], "screening_only": row["screening_only"],
            "evidence_raw": raw, "source_ids": linked_sources, "evidence_status": status,
            "source_note": row["source_note_raw"],
            "exposure": {
                "raw_tag": exposure["raw_tag"], "time": runtime["time"], "calendar": runtime["cal"],
                "context": exposure["context_code"], "after_dinner": runtime["ad"],
                "parse_status": exposure["parse_status"], "context_match_mode": exposure["context_match_mode"],
                "context_codes": exposure["context_codes"],
            },
            "question_ids": question_ids, "question_link_type": link_type,
            "trigger_option_codes": ["less", "very_little_or_skipped"] if link_type == "RECOVERY_BRANCH" else [],
            "runtime_selection_status": "CANDIDATE" if runtime["pool"] in selected_pools else "REGISTERED_NOT_SELECTED",
            "disease_rule_ids": [rule["id"] for rule in disease_rules if rule["link_enabled"] and runtime["axis"] in rule["axis_ids"]],
            "screening_metric_ids": [link["id"] for link in screening_links if runtime["axis"] == link["axis"]],
            "restriction_rule_ids": [rule["id"] for rule in disease_rules if rule["ban_enabled"] and runtime["nature"] in rule["banned_natures"]],
            "discrepancies": differences,
            "contract_row": list(contract_phrases).index(runtime["id"]) + 2,
            "source_row": row["source_row"],
        })

    for source in sources:
        source["phrase_count"] = sum(source["id"] in phrase["source_ids"] for phrase in phrases)
    counts = {
        "phrases": len(phrases), "questions": len(questions),
        "axes": len([q for q in questions if q["role"] in ("FIXED", "ROTATING")]),
        "sources": len(sources), "disease_rules": len(disease_rules), "screening_links": len(screening_links),
        "evidence_linked": sum(p["evidence_status"] == "LINKED" for p in phrases),
        "evidence_free_text": sum(p["evidence_status"] == "FREE_TEXT" for p in phrases),
        "evidence_missing": sum(p["evidence_status"] == "MISSING" for p in phrases),
        "wording_discrepancies": sum(bool(p["discrepancies"]) for p in phrases),
        "candidates": sum(p["runtime_selection_status"] == "CANDIDATE" for p in phrases),
        "registered_not_selected": sum(p["runtime_selection_status"] == "REGISTERED_NOT_SELECTED" for p in phrases),
        "questions_generated": sum(q["runtime_generation_status"] == "GENERATED_BY_SIMULATOR" for q in questions),
        "questions_registered_not_generated": sum(q["runtime_generation_status"] == "REGISTERED_NOT_GENERATED" for q in questions),
    }
    labels = {
        "pool": {"AXIS_STAGE": "축 × 단계", "RECOVERY": "회복 목표", "LOW_BURDEN": "낮은 부담"},
        "stage": {"INTRO": "입문", "BASE": "기본", "CHALLENGE": "도전"},
        "role": {"FIXED": "고정 질문", "ROTATING": "회전 질문", "CONFIRMATION": "질환 확인", "FOLLOW_UP": "식사 시각 후속 질문"},
        "time": {"ANY": "시간대 지정 없음", "MORNING_ENTRY": "오전 진입", "AFTERNOON_ENTRY": "오후 진입", "EVENING": "저녁·식후", "PRE_MIDNIGHT": "자정 전"},
        "calendar": {"ANY": "달력 제한 없음", "WEEKDAY": "평일", "WEEKEND": "주말", "HOLIDAY": "명절", "HOLIDAY_OR_EXTENDED": "명절·연휴"},
        "nature": {"INCREASE": "증량", "REDUCE": "감량", "FLUID": "수분", "FAST": "공복", "TEXTURE": "질감"},
        "evidence_status": {"LINKED": "출처 ID 연결", "FREE_TEXT": "출처 정규화 필요", "MISSING": "근거 미기재"},
        "runtime_selection_status": {"CANDIDATE": "시뮬레이터 선정 후보", "REGISTERED_NOT_SELECTED": "문구 등록 · 선정 경로 없음"},
        "question_link_type": {"AXIS_CANDIDATE": "질문 축의 목표 후보", "RECOVERY_BRANCH": "고정 질문 응답에 따른 회복 분기", "NONE": "특정 질문 연결 없음"},
        "runtime_generation_status": {"GENERATED_BY_SIMULATOR": "시뮬레이터 생성 경로 연결", "REGISTERED_NOT_GENERATED": "템플릿 등록 · 생성 경로 없음"},
    }
    result = {
        "meta": {
            "schema_version": "1.0.0", "counts": counts, "labels": labels,
            "runtime_source": engine["source"],
            "source_files": [{"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for path in (ENGINE, CONTRACT, REFERENCE, KB)],
            "mapping_scope": "문구·이유는 현재 시뮬레이터, 상세문구·근거 원문·연동 규칙은 데이터계약, 출처명·URL은 기존 지식 DB에서 읽습니다. 출처 연결은 권고문 단위 검증 완료를 뜻하지 않습니다.",
            "selection_scope": "선정 상태는 diet-sim-engine.js의 선택 경로 기준입니다. 계약의 사용 상태 및 실제 서비스 운영 노출 이력과 구분합니다.",
            "refresh_command": "python scripts/build-diet-applied-data.py",
        },
        "sources": sources, "questions": questions, "phrases": phrases,
        "disease_rules": disease_rules, "screening_links": screening_links,
        "audits": {
            "phrase_id_match": True, "question_id_match": True,
            "phrase_discrepancy_ids": [p["id"] for p in phrases if p["discrepancies"]],
            "question_discrepancies": question_differences,
            "evidence_unresolved": unknown_evidence_tokens,
            "evidence_missing_ids": [p["id"] for p in phrases if p["evidence_status"] == "MISSING"],
            "registered_not_selected_ids": [p["id"] for p in phrases if p["runtime_selection_status"] == "REGISTERED_NOT_SELECTED"],
            "questions_registered_not_generated_ids": [q["id"] for q in questions if q["runtime_generation_status"] == "REGISTERED_NOT_GENERATED"],
            "counts_by_pool": dict(Counter(p["pool"] for p in phrases)),
            "counts_by_axis": dict(Counter(p["axis"] or "NONE" for p in phrases)),
            "scope_notes": [
                "AXIS_CANDIDATE는 질문 축과 목표 후보의 연결이며 응답 하나와 문구 하나의 고정 매핑이 아닙니다.",
                "RECOVERY는 고정 질문의 less / very_little_or_skipped 응답 분기이며 축 ID는 없습니다.",
                "LOW_BURDEN은 현재 DATA에는 등록되어 있으나 시뮬레이터 selectGoal의 선정 분기가 없습니다.",
                "질문 13종 중 DIET-Q-90은 템플릿 등록 상태이며 현재 시뮬레이터의 질문 생성 경로에는 없습니다. 나머지 12종은 조건에 따라 생성됩니다.",
                "질환·검진 연동은 데이터계약의 연결표 기준입니다. in_simulator는 현재 시뮬레이터에 있는 네 가지 내정보 질환 규칙만 표시합니다.",
                "자유문장 근거를 출처 ID로 추정 변환하지 않았으며 권고문·장절·페이지 연결은 새로 만들지 않았습니다.",
            ],
        },
    }
    contract.close()
    reference.close()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if generated JSON differs from the checked-in catalogue")
    args = parser.parse_args()
    result = build()
    payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    target = ROOT / OUTPUT
    if args.check:
        if not target.exists() or target.read_text(encoding="utf-8") != payload:
            raise SystemExit("Catalogue is out of date. Run python scripts/build-diet-applied-data.py")
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(payload, encoding="utf-8")
    print(json.dumps({"file": OUTPUT, "checked": args.check, "counts": result["meta"]["counts"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
