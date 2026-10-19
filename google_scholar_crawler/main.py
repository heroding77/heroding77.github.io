from scholarly import scholarly
import json
from datetime import datetime
from zoneinfo import ZoneInfo
import os
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
scholarly.set_timeout(15)
scholarly.set_retries(2)
scholar_id = os.environ['GOOGLE_SCHOLAR_ID'].strip()
author: dict = scholarly.search_author_id(scholar_id)
scholarly.fill(author, sections=['basics', 'indices', 'counts', 'publications'])
if author.get('scholar_id') != scholar_id:
    raise ValueError('Google Scholar returned a different author; retaining the previous snapshot.')
count = author.get('citedby')
if type(count) is not int or count < 0:
    raise ValueError('Google Scholar returned an invalid citation count; retaining the previous snapshot.')
author['updated'] = datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds')
author['publications'] = {v['author_pub_id']:v for v in author['publications']}
print(json.dumps(author, indent=2))
os.makedirs('results', exist_ok=True)
with open(f'results/gs_data.json', 'w') as outfile:
    json.dump(author, outfile, ensure_ascii=False)

shieldio_data = {
  "schemaVersion": 1,
  "label": "citations",
  "message": f"{author['citedby']}",
}
with open(f'results/gs_data_shieldsio.json', 'w') as outfile:
    json.dump(shieldio_data, outfile, ensure_ascii=False) 
