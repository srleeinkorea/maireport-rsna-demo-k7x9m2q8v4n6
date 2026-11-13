import copy
import json
import unittest
from pathlib import Path
import diet_evidence_pipeline as mod

ROOT = Path(__file__).resolve().parents[1]

class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.audit = [
            {'phrase_id': 'DIET-P-0001', 'phrase': 'A', 'related_evidence_ids': [], 'clinical_approval': False},
            {'phrase_id': 'DIET-P-0005', 'phrase': 'B', 'related_evidence_ids': ['WHO-2026-VEG'], 'clinical_approval': False}
        ]
        self.template = json.loads((ROOT / 'evidence-pipeline/intake-example.json').read_text(encoding='utf-8'))

    def test_empty_intake_is_safe(self):
        result = mod.validate({'schema_version':'1.0','items':[]},self.audit)
        self.assertTrue(result['ok'])
        self.assertEqual(result['audit_no_candidate_count'],1)

    def test_valid_candidate_example(self):
        self.assertTrue(mod.validate(self.template,self.audit)['ok'])

    def test_rejects_unknown_phrase_id(self):
        data=copy.deepcopy(self.template)
        data['items'][0]['phrase_ids']=['DIET-P-9999']
        self.assertFalse(mod.validate(data,self.audit)['ok'])

    def test_rejects_unapproved_signoff(self):
        data=copy.deepcopy(self.template)
        data['items'][0]['status']='clinical_approved'
        data['items'][0]['directness']='direct'
        self.assertFalse(mod.validate(data,self.audit)['ok'])

    def test_verified_requires_attestations(self):
        data=copy.deepcopy(self.template)
        item=data['items'][0]
        item['status']='source_verified'
        item['verification'].update(primary_source_checked=True,checked_by='reviewer1',checked_at='2026-10-20')
        self.assertFalse(mod.validate(data,self.audit)['ok'])
        item['rights'].update(public_metadata_allowed=True,checked_by='reviewer2',checked_at='2026-10-20')
        self.assertTrue(mod.validate(data,self.audit)['ok'])

    def test_rejects_duplicate_records(self):
        data=copy.deepcopy(self.template)
        data['items'].append(copy.deepcopy(data['items'][0]))
        self.assertFalse(mod.validate(data,self.audit)['ok'])

    def test_rejects_raw_answer(self):
        data=copy.deepcopy(self.template)
        data['items'][0]['openevidence_answer']='not allowed'
        self.assertFalse(mod.validate(data,self.audit)['ok'])

    def test_queue_prioritizes_missing(self):
        queue=mod.make_queue(self.audit,'KR',2)
        self.assertEqual(queue[0]['phrase_id'],'DIET-P-0001')

    def test_sensitive_data_and_url_rejected(self):
        data=copy.deepcopy(self.template)
        data['items'][0]['notes']='900101-1234567'
        data['items'][0]['source']['url']='http://internal.invalid'
        self.assertFalse(mod.validate(data,self.audit)['ok'])

if __name__ == '__main__':
    unittest.main()
