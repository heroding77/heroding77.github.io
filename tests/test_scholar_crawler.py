"""Exercise crawler output and reject invalid data without making network requests."""
import copy
from datetime import datetime
import io
import json
import os
from pathlib import Path
import runpy
import tempfile
import types
import unittest
from contextlib import redirect_stdout
from unittest.mock import Mock, patch

SCRIPT = Path(__file__).resolve().parents[1] / 'google_scholar_crawler' / 'main.py'


class ScholarCrawlerTest(unittest.TestCase):
    def run_crawler(self, author, folder):
        api = types.SimpleNamespace(
            set_timeout=Mock(), set_retries=Mock(),
            search_author_id=Mock(return_value=copy.deepcopy(author)), fill=Mock(),
        )
        module = types.ModuleType('scholarly')
        module.scholarly = api
        previous = os.getcwd()
        try:
            os.chdir(folder)
            with patch.dict('sys.modules', scholarly=module), patch.dict(os.environ, GOOGLE_SCHOLAR_ID='test-scholar'), redirect_stdout(io.StringIO()):
                runpy.run_path(str(SCRIPT), run_name='__main__')
        finally:
            os.chdir(previous)
        return api

    def test_verified_results_keep_the_existing_frontend_contract(self):
        author = {'scholar_id': 'test-scholar', 'name': 'Test Author', 'citedby': 1234, 'publications': [{'author_pub_id': 'test-scholar:one', 'num_citations': 7}]}
        with tempfile.TemporaryDirectory() as folder:
            api = self.run_crawler(author, folder)
            data = json.loads((Path(folder) / 'results/gs_data.json').read_text())
            badge = json.loads((Path(folder) / 'results/gs_data_shieldsio.json').read_text())
        self.assertEqual(data['citedby'], 1234)
        self.assertEqual(data['publications']['test-scholar:one']['num_citations'], 7)
        self.assertEqual(badge['message'], '1234')
        self.assertEqual(datetime.fromisoformat(data['updated']).strftime('%z'), '+0800')
        api.set_timeout.assert_called_once_with(15)
        api.set_retries.assert_called_once_with(2)

    def test_invalid_author_or_count_never_writes_a_snapshot(self):
        for extra in ({'scholar_id': 'someone-else'}, {'citedby': -1}, {'citedby': None}, {'citedby': True}):
            with self.subTest(extra=extra), tempfile.TemporaryDirectory() as folder:
                author = {'scholar_id': 'test-scholar', 'name': 'Test Author', 'citedby': 1234, 'publications': [], **extra}
                with self.assertRaises(ValueError):
                    self.run_crawler(author, folder)
                self.assertFalse((Path(folder) / 'results').exists())


if __name__ == '__main__':
    unittest.main()
