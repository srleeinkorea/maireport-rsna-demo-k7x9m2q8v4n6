# maiReport: OpenEvidence-assisted primary-source review pipeline

**Scope:** research intake and QA only. The current 403 diet phrases, phrase selection logic, workbook contracts, and production DB remain unchanged. This is not a live OpenEvidence API integration.

## Why there is a human boundary

OpenEvidence does not currently publish a self-service developer API, and its Acceptable Use Policy (updated September 17, 2026) limits unauthorized automated extraction and commercial redistribution. **Do not scrape OpenEvidence or use browser cookies, reverse-engineered endpoints, unofficial MCP bridges, automated question submission, or copy its answer/article text into the public GitHub repository.** Do not submit patient-identifiable information or licensed article content. Obtain written vendor permission and a legally reviewed integration contract before any direct automated connection.

Use OpenEvidence only as a *human-operated research discovery aid*. In the public repository, store only independently verified **primary-source bibliographic metadata and section locators** when publishing that metadata is permitted. A link to a primary source is not evidence that a particular coaching phrase is clinically justified.

## Existing sources of truth

- `files/diet-evidence-phrase-audit-v1.json`: 403 phrase IDs, candidate matches, clinical approval flags. As of October 20, 2026: 105 phrases without candidates, 298 with topic-related candidates, zero clinical approvals.
- `files/diet-evidence-verified-library-v1.json`: officially checked excerpts; individual phrase relevance is not approved.
- `files/diet-applied-data.json`, `scripts/build-diet-applied-data.py`, and the two Excel contract workbooks remain **unchanged**.
- `evidence-pipeline/intake.json`: new isolated staging source for independent primary-source metadata; *never consumed by the app*.

## End-to-end process

1. **Create a research queue** (no network requests):

   ```bash
   python scripts/diet_evidence_pipeline.py queue --country KR --limit 15 --format markdown --output /tmp/kr-queue.md
   ```

   The queue prioritizes phrases with no current candidate. `--country KR` is a *research target*, not a patient-geography rule. Repeat with `US`, `JP`, `CA`, etc. for independent national evidence review.

2. **Research manually in OpenEvidence.** Copy one standardized question at a time; identify the correct official guideline or study. Treat results as leads, not authoritative clinical approval.
3. **Verify at the original publisher.** Check institution, revision/version, publication date, exact section/page, actual population, exclusions, evidence strength as stated by the source, and whether the original source *directly* supports the behavior. Record DOI/PMID where available. Look for contradictory/withdrawn/replaced guidance. If a publisher restricts the public metadata or usage, do not publish it in this repository.
4. **Curate intake metadata.** Copy the *structure*, not the sample's facts, from `intake-example.json` into `intake.json`. No OpenEvidence text, answer transcripts, screenshots, journal full text, patient data, private hyperlinks, API keys, or substantial quotations. `source_verified` requires completed source/rights attestations, and `clinical_approved` also requires a named medical professional's explicit review and `directness=direct`.
5. **Run QA locally, then open a PR.** Do not edit existing contract workbooks or live program data:

   ```bash
   python scripts/diet_evidence_pipeline.py validate
   python -m unittest discover -s scripts -p 'test_diet_evidence_pipeline.py' -v
   ```

   A pull request touching the pipeline automatically runs the same checks and generates a Korea-targeted top-priority research queue in the GitHub Actions summary. Failed checks block QA success; they do **not** automatically publish records.
6. **Review and merge staging metadata (human approval).** Source verification, clinical appropriateness, license review, country applicability and safety exceptions must all be evaluated by authorized reviewers. This workflow intentionally contains no write access, no auto-merge, and no production deployment.
7. **Future integration:** Only after medical/product/legal sign-off, implement separately reviewed mappings into `guideline_document` → `recommendation` → `goal_phrase_recommendation_map`, then update the actual Excel contract and operations export. Country conflicts must remain distinct; never blindly overwrite an international guideline with a country-specific rule.

## Lifecycle / governance rules

| State | Meaning | User app exposure |
| --- | --- | --- |
| `candidate` | Independent bibliographic lead; relevance unreviewed | Never |
| `source_verified` | Publisher, URL/section, rights verified by a named reviewer | Never |
| `clinical_approved` | Direct support and named clinical sign-off documented | Not automatically; requires a separate controlled DB release |

Keep copyright/source rights separate from clinical relevance. A GitHub QA success means only *metadata structural validity*, not that a clinical recommendation is correct. The repository is **public**, so use synthetic examples and public-source metadata only. The `intake-example.json` is documentation, not an approved evidence record.

## Useful policy references

- [OpenEvidence Acceptable Use Policy (Sept 17, 2026)](https://www.openevidence.foundation/policies/acceptable-use)
- [OpenEvidence Enterprise](https://portal.openevidence.com/) — negotiated organizational integrations are not a public self-service API.
- [Current maiReport KB design](../diet-guideline-kb-summary.html)