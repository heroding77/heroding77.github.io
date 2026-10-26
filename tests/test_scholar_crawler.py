"""Verify genuine profile parsing and blocked-response behavior without live requests."""
from datetime import datetime
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

SCRIPT = Path(__file__).resolve().parents[1] / 'google_scholar_crawler' / 'main.py'
spec = importlib.util.spec_from_file_location('scholar_collector', SCRIPT)
crawler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(crawler)
PROFILE = '''<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="gsc_prf_in">Zichen Ding</div><div class="gsc_prf_il">NaiveAI</div>
<img src="/citations?view_op=view_photo&amp;user=test-scholar">
<table id="gsc_rsb_st"><tr><th></th><th>All</th><th>Since 2021</th></tr>
<tr><td><a>Citations</a></td><td class="gsc_rsb_std">3,306</td><td class="gsc_rsb_std">3,300</td></tr>
<tr><td>h-index</td><td>18</td><td>18</td></tr><tr><td>i10-index</td><td>22</td><td>22</td></tr></table>
<table><tr class="gsc_a_tr"><td><a class="gsc_a_at" href="/citations?view_op=view_citation&amp;citation_for_view=test-scholar:one">Test &amp; Research</a></td><td><a class="gsc_a_ac">1,891</a></td><td class="gsc_a_y"><span>2025</span></td></tr>
<tr class="gsc_a_tr"><td><a class="gsc_a_at" href="/citations?citation_for_view=test-scholar:two">New paper</a></td><td><a class="gsc_a_ac"></a></td><td class="gsc_a_y">2026</td></tr></table>
<button id="gsc_bpf_more" disabled>Show more</button></body></html>'''


class ScholarCrawlerTest(unittest.TestCase):
    def test_one_profile_contains_total_indices_and_paper_citations(self):
        data = crawler.parse_profile(PROFILE, 'test-scholar')
        self.assertEqual(data['name'], 'Zichen Ding')
        self.assertEqual(data['citedby'], 3306)
        self.assertEqual(data['hindex'], 18)
        self.assertEqual(data['citedby5y'], 3300)
        self.assertEqual(data['publications']['test-scholar:one']['num_citations'], 1891)
        self.assertEqual(data['publications']['test-scholar:one']['bib']['title'], 'Test & Research')
        self.assertEqual(data['publications']['test-scholar:two']['num_citations'], 0)
        self.assertTrue(data['publications_complete'])

    def test_blocked_missing_or_invalid_data_is_never_accepted(self):
        for html in ['<html>Sorry, automated queries</html>', PROFILE.replace('3,306', 'unknown'), PROFILE.replace('test-scholar:one', 'other-person:one'), PROFILE.replace('Citations', 'Missing')]:
            with self.subTest(html=html[:30]), self.assertRaises(crawler.ProfileUnavailable):
                crawler.parse_profile(html, 'test-scholar')

    def test_partial_publication_page_keeps_the_verified_global_total(self):
        data = crawler.parse_profile(PROFILE.replace(' disabled', ''), 'test-scholar')
        self.assertEqual(data['citedby'], 3306)
        self.assertFalse(data['publications_complete'])

    def test_success_uses_one_request_and_dates_the_actual_retrieval(self):
        from io import BytesIO
        with patch.object(crawler, 'urlopen', return_value=BytesIO(PROFILE.encode())) as fetch:
            data = crawler.fetch_profile('test-scholar')
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(fetch.call_args.kwargs['timeout'], 25)
        self.assertEqual(datetime.fromisoformat(data['updated']).strftime('%z'), '+0800')

    def test_http_block_stops_without_retrying_or_overwriting_last_success(self):
        for code in [403, 429]:
            with self.subTest(code=code), tempfile.TemporaryDirectory() as folder:
                previous = os.getcwd()
                try:
                    os.chdir(folder)
                    Path('results').mkdir()
                    Path('results/gs_data.json').write_text('{"citedby":3306}')
                    with patch.dict(os.environ, GOOGLE_SCHOLAR_ID='test-scholar'), patch.object(crawler, 'urlopen', side_effect=HTTPError('https://scholar.google.com', code, 'Blocked', None, None)) as fetch:
                        with self.assertRaises(crawler.ProfileUnavailable):
                            crawler.main()
                        self.assertEqual(fetch.call_count, 1)
                    self.assertEqual(json.loads(Path('results/gs_data.json').read_text())['citedby'], 3306)
                finally:
                    os.chdir(previous)


if __name__ == '__main__':
    unittest.main()
