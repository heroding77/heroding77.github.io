"""Read the public Scholar profile once; never loop on a blocked response."""
from datetime import datetime
from html.parser import HTMLParser
import json
import logging
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


class ProfileUnavailable(ValueError):
    pass


class Element:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def text(self):
        return ''.join(c.text() if isinstance(c, Element) else c for c in self.children).strip()

    def find_all(self, *, tag=None, id=None, cls=None):
        result = []
        for child in self.children:
            if not isinstance(child, Element):
                continue
            if (tag is None or child.tag == tag) and (id is None or child.attrs.get('id') == id) and (cls is None or cls in child.attrs.get('class', '').split()):
                result.append(child)
            result.extend(child.find_all(tag=tag, id=id, cls=cls))
        return result


class ProfileHTML(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Element()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs)
        self.stack[-1].children.append(element)
        if tag not in self.VOID:
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def integer(text):
    normalized = text.replace(',', '').replace(' ', '').replace('\xa0', '')
    if not normalized.isascii() or not normalized.isdigit():
        raise ProfileUnavailable('Scholar returned a missing or invalid citation count.')
    return int(normalized)


def parse_profile(html, scholar_id):
    parser = ProfileHTML()
    parser.feed(html)
    root = parser.root
    names, tables = root.find_all(id='gsc_prf_in'), root.find_all(id='gsc_rsb_st')
    if not names or not names[0].text() or not tables:
        raise ProfileUnavailable('Scholar profile is unavailable or blocked; previous data is retained.')
    metrics = {}
    for row in tables[0].find_all(tag='tr'):
        cells = row.find_all(tag='td')
        if len(cells) >= 3:
            label = cells[0].text().lower()
            if label in {'citations', 'h-index', 'i10-index'}:
                key = {'citations': 'citedby', 'h-index': 'hindex', 'i10-index': 'i10index'}[label]
                metrics[key] = integer(cells[1].text())
                metrics[key + '5y'] = integer(cells[2].text())
    if 'citedby' not in metrics:
        raise ProfileUnavailable('Scholar citation totals are missing; previous data is retained.')
    publications = {}
    for row in root.find_all(cls='gsc_a_tr'):
        links = row.find_all(cls='gsc_a_at')
        if not links:
            continue
        link = links[0]
        pub_id = parse_qs(urlparse(link.attrs.get('href', '')).query).get('citation_for_view', [''])[0]
        if not pub_id.startswith(scholar_id + ':'):
            raise ProfileUnavailable('Scholar returned a different author; previous data is retained.')
        counts, years = row.find_all(cls='gsc_a_ac'), row.find_all(cls='gsc_a_y')
        pub = {'author_pub_id': pub_id, 'bib': {'title': link.text()}, 'filled': False}
        if years:
            pub['bib']['pub_year'] = years[0].text()
        if counts and counts[0].text():
            pub['num_citations'] = integer(counts[0].text())
        else:
            pub['num_citations'] = 0
        publications[pub_id] = pub
    # Public profile links identify the account even if it currently has no papers.
    ids = {parse_qs(urlparse(e.attrs.get('src', '')).query).get('user', [''])[0] for e in root.find_all(tag='img')}
    if not publications and scholar_id not in ids:
        raise ProfileUnavailable('Could not verify Scholar profile identity; previous data is retained.')
    more = root.find_all(id='gsc_bpf_more')
    affiliation = root.find_all(cls='gsc_prf_il')
    return {
        'scholar_id': scholar_id, 'name': names[0].text(),
        'affiliation': affiliation[0].text() if affiliation else '',
        **metrics, 'publications': publications,
        'publications_complete': not more or 'disabled' in more[0].attrs,
        'source': 'Google Scholar',
        'source_url': 'https://scholar.google.com/citations?' + urlencode({'user': scholar_id, 'hl': 'en'}),
    }


def fetch_profile(scholar_id):
    url = 'https://scholar.google.com/citations?' + urlencode({'hl': 'en', 'user': scholar_id, 'pagesize': 100})
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9'})
    try:
        with urlopen(request, timeout=25) as response:
            html = response.read(4_000_001)
        if len(html) > 4_000_000:
            raise ProfileUnavailable('Scholar response exceeded the expected profile size.')
    except HTTPError as error:
        if error.code in (403, 429):
            raise ProfileUnavailable(f'Google Scholar denied this request (HTTP {error.code}). No repeated requests were sent; previous data is retained.') from error
        raise
    author = parse_profile(html.decode('utf-8'), scholar_id)
    author['updated'] = datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds')
    return author


def main():
    scholar_id = os.environ['GOOGLE_SCHOLAR_ID'].strip()
    if not scholar_id or not all(c.isalnum() or c in '_-' for c in scholar_id):
        raise ValueError('Invalid Google Scholar profile ID.')
    author = fetch_profile(scholar_id)
    results = Path('results')
    results.mkdir(exist_ok=True)
    (results / 'gs_data.json').write_text(json.dumps(author, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    badge = {'schemaVersion': 1, 'label': 'citations', 'message': str(author['citedby'])}
    (results / 'gs_data_shieldsio.json').write_text(json.dumps(badge) + '\n', encoding='utf-8')
    logging.info('Verified Google Scholar count: %s (%s); %s paper entries.', author['citedby'], author['updated'], len(author['publications']))


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    main()
