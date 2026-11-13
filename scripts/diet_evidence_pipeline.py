#!/usr/bin/env python3
"""maiReport diet evidence research intake and offline validation.

This tool does NOT contact OpenEvidence, ingest its answers, change the app's
operational data, or promote medical claims without a human sign-off.
Python 3.10+ standard library only.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_AUDIT = ROOT / 'files/diet-evidence-phrase-audit-v1.json'
DEFAULT_INTAKE = ROOT / 'evidence-pipeline/intake.json'
ID_PATTERN = re.compile(r'^EV-[0-9]{4}-[0-9]{4,6}$')
DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')
COUNTRY_PATTERN = re.compile(r'^(GLOBAL|[A-Z]{2})$')
DOI_PATTERN = re.compile(r'^10\.\d{4,9}/\S+$', re.I)
PHI_PATTERN = re.compile(r'(?<!\d)\d{6}[- ]?[1-8]\d{6}(?!\d)')

RECORD_FIELDS = {'record_id', 'phrase_ids', 'country_codes', 'clinical_context',
                 'discovery_tool', 'source', 'directness', 'status', 'verification',
                 'rights', 'clinical_review', 'notes'}
SOURCE_FIELDS = {'title', 'publisher', 'url', 'doi', 'pmid', 'section_locator',
                 'publication_date', 'source_type'}
CHECK_FIELDS = {'primary_source_checked', 'checked_by', 'checked_at'}
RIGHTS_FIELDS = {'public_metadata_allowed', 'checked_by', 'checked_at'}
CLINICAL_FIELDS = {'approved', 'reviewer', 'reviewed_at'}
SOURCE_TYPES = {'official_guideline', 'systematic_review', 'clinical_trial',
                'observational_study', 'government_health_info', 'other'}
STATUSES = {'candidate', 'source_verified', 'clinical_approved'}
DIRECTNESS = {'unreviewed', 'direct', 'indirect', 'not_supported'}
TOOLS = {'OpenEvidence', 'manual', 'PubMed', 'official_source'}


def load_json(path: Path):
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def load_audit(path: Path):
    document = load_json(path)
    entries = document['items']
    ids = [row['phrase_id'] for row in entries]
    if len(ids) != len(set(ids)) or len(entries) != document.get('total'):
        raise ValueError('Existing audit has inconsistent phrase IDs/count')
    return entries


def unexpected_keys(data, allowed, where, errors):
    if not isinstance(data, dict):
        errors.append(f'{where}: must be an object')
        return False
    extra = sorted(set(data) - allowed)
    if extra:
        errors.append(f'{where}: unexpected fields {extra}; do not paste AI responses, quotes, PHI, or journal text')
    missing = sorted(allowed - set(data))
    if missing:
        errors.append(f'{where}: missing required fields {missing}')
    return not (extra or missing)


def valid_date(value):
    if not isinstance(value, str) or not DATE_PATTERN.fullmatch(value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def optional_str(value, limit=500):
    return value is None or (isinstance(value, str) and len(value) <= limit)


def text_ok(value, limit=500):
    return isinstance(value, str) and bool(value.strip()) and len(value) <= limit and not PHI_PATTERN.search(value)


def verify_record(item, where, phrase_ids, errors):
    if not unexpected_keys(item, RECORD_FIELDS, where, errors):
        return
    rec_id = item['record_id']
    if not isinstance(rec_id, str) or not ID_PATTERN.fullmatch(rec_id):
        errors.append(f'{where}: record_id must be EV-YYYY-NNNN')
    codes = item['country_codes']
    if not isinstance(codes, list) or not codes or any(not isinstance(x, str) or not COUNTRY_PATTERN.fullmatch(x) for x in codes) or len(codes) != len(set(codes)):
        errors.append(f'{where}: country_codes must be unique ISO-3166 alpha-2 codes or GLOBAL')
    pids = item['phrase_ids']
    if not isinstance(pids, list) or not pids or len(pids) != len(set(pids)):
        errors.append(f'{where}: phrase_ids must be a nonempty unique list')
    elif unknown := sorted(set(pids) - phrase_ids):
        errors.append(f'{where}: unknown phrase_ids {unknown}')
    if not text_ok(item['clinical_context'], 120):
        errors.append(f'{where}: invalid clinical_context (generic populations only; no patient data)')
    if item['discovery_tool'] not in TOOLS:
        errors.append(f'{where}: discovery_tool must be one of {sorted(TOOLS)}')
    if item['status'] not in STATUSES or item['directness'] not in DIRECTNESS:
        errors.append(f'{where}: invalid status/directness')
    if not optional_str(item['notes'], 300) or (isinstance(item['notes'], str) and PHI_PATTERN.search(item['notes'])):
        errors.append(f'{where}: invalid notes or possible sensitive data')

    src = item['source']
    if unexpected_keys(src, SOURCE_FIELDS, where + '.source', errors):
        if not text_ok(src['title'], 250) or not text_ok(src['publisher'], 150):
            errors.append(f'{where}: source title and publisher are required')
        url = src['url']
        if not isinstance(url, str) or len(url) > 1000:
            errors.append(f'{where}: source.url must be a public HTTPS URL')
        else:
            parsed = urlsplit(url)
            if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
                errors.append(f'{where}: source.url must be an HTTPS primary-source URL without credentials/fragments')
        doi = src['doi']
        if doi is not None and (not isinstance(doi, str) or not DOI_PATTERN.fullmatch(doi)):
            errors.append(f'{where}: invalid DOI syntax')
        pmid = src['pmid']
        if pmid is not None and (not isinstance(pmid, str) or not re.fullmatch(r'\d{1,10}', pmid)):
            errors.append(f'{where}: invalid PMID')
        if src['source_type'] not in SOURCE_TYPES:
            errors.append(f'{where}: unknown source_type')
        if not optional_str(src['section_locator'], 150) or (isinstance(src['section_locator'], str) and PHI_PATTERN.search(src['section_locator'])):
            errors.append(f'{where}: invalid section_locator; use section/page reference, not a quotation')
        if src['publication_date'] is not None and not valid_date(src['publication_date']):
            errors.append(f'{where}: publication_date must be YYYY-MM-DD or null')

    verification = item['verification']
    rights = item['rights']
    clinical = item['clinical_review']
    if not unexpected_keys(verification, CHECK_FIELDS, where + '.verification', errors):
        return
    if not unexpected_keys(rights, RIGHTS_FIELDS, where + '.rights', errors):
        return
    if not unexpected_keys(clinical, CLINICAL_FIELDS, where + '.clinical_review', errors):
        return
    if not isinstance(verification['primary_source_checked'], bool) or not isinstance(rights['public_metadata_allowed'], bool) or not isinstance(clinical['approved'], bool):
        errors.append(f'{where}: check flags must be boolean')
    for ob, field_name, date_name in ((verification, 'checked_by', 'checked_at'),
                                      (rights, 'checked_by', 'checked_at'),
                                      (clinical, 'reviewer', 'reviewed_at')):
        if not optional_str(ob[field_name], 80) or (ob[field_name] and not text_ok(ob[field_name], 80)):
            errors.append(f'{where}: invalid reviewer identifier in {field_name}')
        if ob[date_name] is not None and not valid_date(ob[date_name]):
            errors.append(f'{where}: invalid date in {date_name}')
    if item['status'] in {'source_verified', 'clinical_approved'}:
        if not (verification['primary_source_checked'] is True and
                verification['checked_by'] and verification['checked_at'] and
                rights['public_metadata_allowed'] is True and
                rights['checked_by'] and rights['checked_at']):
            errors.append(f'{where}: source_verified requires independent primary-source and publication-rights attestations')
    if item['status'] == 'clinical_approved':
        if item['directness'] != 'direct' or clinical['approved'] is not True or not clinical['reviewer'] or not clinical['reviewed_at']:
            errors.append(f'{where}: clinical_approved requires direct support and a named clinical sign-off')
    elif clinical['approved'] is True:
        errors.append(f'{where}: clinical approval cannot be set with status={item["status"]}')


def validate(intake, audit):
    errors = []
    if not isinstance(intake, dict) or set(intake) != {'schema_version', 'items'}:
        return {'ok': False, 'errors': ['intake root must contain exactly schema_version and items']}
    if intake['schema_version'] != '1.0':
        errors.append('schema_version must be 1.0')
    items = intake['items']
    if not isinstance(items, list):
        return {'ok': False, 'errors': ['items must be a list']}
    identifiers = {x['phrase_id'] for x in audit}
    record_ids = set()
    pairs = set()
    for idx, item in enumerate(items):
        where = f'items[{idx}]'
        verify_record(item, where, identifiers, errors)
        if isinstance(item, dict):
            rec_id = item.get('record_id')
            if rec_id in record_ids:
                errors.append(f'{where}: duplicate record_id {rec_id}')
            record_ids.add(rec_id)
            if isinstance(item.get('phrase_ids'), list) and isinstance(item.get('country_codes'), list):
                for pid in item['phrase_ids']:
                    for country in item['country_codes']:
                        src = item.get('source') or {}
                        fingerprint = src.get('doi') or src.get('url')
                        if fingerprint is None:
                            continue
                        key = (pid, country, fingerprint)
                        if key in pairs:
                            errors.append(f'{where}: duplicate primary source for phrase/country {pid}/{country}')
                        pairs.add(key)
    status_counts = Counter(item.get('status', 'invalid') for item in items if isinstance(item, dict))
    gap_count = sum(not item.get('related_evidence_ids') for item in audit)
    return {
        'ok': not errors, 'errors': errors,
        'audit_phrase_count': len(audit), 'audit_no_candidate_count': gap_count,
        'audit_candidate_only_count': len(audit) - gap_count,
        'intake_count': len(items), 'intake_status_counts': dict(status_counts),
        'note': 'Metadata review only; no clinical claims or operational DB records were published.'
    }


def prompt_for_phrase(phrase, country):
    return (
        f"[{country}] maiReport 목표 문구 '{phrase['phrase']}' (ID {phrase['phrase_id']})의 임상적 타당성을 검토해 주세요. "
        '이 문구를 직접 뒷받침하는 권고가 실제로 존재하는지 먼저 판단하고, 없거나 과장된 표현이면 반례와 한계를 명시해 주세요. '
        '해당 국가의 정부·학회 최신 가이드라인을 우선하고 WHO 등 국제 근거 및 체계적 문헌고찰을 보조로 비교해 주세요. '
        '각 1차 출처의 정확한 제목, 발행기관, 연도, DOI/PMID(있다면), 공식 URL, 장·절·페이지, 대상 인구 및 예외·금기, '
        '근거 강도(출처에 명시된 경우만), 개정/대체 여부를 구분해 주세요. '
        '직접 지지/간접 관련/근거 없음으로 구분하고 추정 정보를 사실처럼 제시하지 마세요. '
        '원문과 권리 여부는 별도 확인하며 OpenEvidence 응답 자체는 공개 DB에 옮기지 않습니다.'
    )


def make_queue(audit, country, limit):
    remaining = [x for x in audit if not x.get('clinical_approval')]
    remaining.sort(key=lambda x: (bool(x.get('related_evidence_ids')), x['phrase_id']))
    return [{
        'phrase_id': item['phrase_id'], 'phrase': item['phrase'],
        'priority': 'P0_NO_CANDIDATE' if not item.get('related_evidence_ids') else 'P1_UNAPPROVED_CANDIDATE',
        'related_evidence_ids': item.get('related_evidence_ids', []),
        'target_country_for_research': country,
        'research_prompt': prompt_for_phrase(item, country),
    } for item in remaining[:limit]]


def queue_markdown(audit, country, queue):
    missing = sum(not x.get('related_evidence_ids') for x in audit)
    heading = [f'## 식이 근거 조사 우선순위 ({country})',
               f'대상 {len(audit)}건 · 근거 후보 없음 {missing}건 · 검토 대기 {len(audit)-missing}건',
               '', '> 조사 프롬프트는 OpenEvidence에서 사람이 사용하며, 자동 접속·응답 수집을 하지 않습니다.', '']
    for item in queue:
        heading.extend([f"### {item['phrase_id']} · {item['phrase']}",
                        f"우선순위: {item['priority']}", '',
                        f"{item['research_prompt']}", ''])
    return '\n'.join(heading) + '\n'


def write_output(text, filename):
    if filename:
        dest = Path(filename)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text, encoding='utf-8')
    else:
        print(text, end='')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    validate_parser = sub.add_parser('validate', help='Validate manually curated primary-source metadata')
    validate_parser.add_argument('--audit', type=Path, default=DEFAULT_AUDIT)
    validate_parser.add_argument('--input', type=Path, default=DEFAULT_INTAKE)
    validate_parser.add_argument('--report', type=Path)
    queue_parser = sub.add_parser('queue', help='Prioritize current evidence gaps and generate manual prompts')
    queue_parser.add_argument('--audit', type=Path, default=DEFAULT_AUDIT)
    queue_parser.add_argument('--country', default='KR', help='Research target only; not clinical applicability approval')
    queue_parser.add_argument('--limit', type=int, default=5)
    queue_parser.add_argument('--format', choices=('markdown', 'json'), default='markdown')
    queue_parser.add_argument('--output')
    args = parser.parse_args(argv)
    try:
        audit = load_audit(args.audit)
        if args.command == 'validate':
            result = validate(load_json(args.input), audit)
            formatted = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
            write_output(formatted, args.report)
            if args.report:
                print(formatted, end='')
            return 0 if result['ok'] else 1
        if not COUNTRY_PATTERN.fullmatch(args.country) or not 1 <= args.limit <= 403:
            parser.error('country must be GLOBAL/ISO alpha-2, and limit must be 1..403')
        queue = make_queue(audit, args.country, args.limit)
        if args.format == 'markdown':
            formatted = queue_markdown(audit, args.country, queue)
        else:
            formatted = json.dumps({'target_country_for_research': args.country, 'items': queue}, ensure_ascii=False, indent=2) + '\n'
        write_output(formatted, args.output)
        return 0
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f'Input/error: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())