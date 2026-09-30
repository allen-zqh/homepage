import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.publication_text = []
        self._capture_publication = False
        self._buffer = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            self.ids.add(attributes["id"])
        if tag == "span" and "pub-title" in attributes.get("class", "").split():
            self._capture_publication = True
            self._buffer = []

    def handle_data(self, data):
        if self._capture_publication:
            self._buffer.append(data)

    def handle_endtag(self, tag):
        if tag == "span" and self._capture_publication:
            self.publication_text.append(" ".join("".join(self._buffer).split()))
            self._capture_publication = False


def parse_page(path):
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


class BilingualContentTests(unittest.TestCase):
    def test_chinese_page_has_same_anchors_and_publication_titles(self):
        english = parse_page(ROOT / "html/home.html")
        chinese = parse_page(ROOT / "html/home-zh.html")

        self.assertEqual(english.ids, chinese.ids)
        self.assertEqual(english.publication_text, chinese.publication_text)

    def test_chinese_page_translates_navigation_sections(self):
        chinese = (ROOT / "html/home-zh.html").read_text(encoding="utf-8")

        self.assertIn('id="news"> 近期更新', chinese)
        self.assertIn('id="edu"> 教育经历', chinese)
        self.assertIn('id="pub"> 学术成果', chinese)
        self.assertIn('id="exp"> 工作经历', chinese)
        self.assertIn('id="service"> 学术服务', chinese)

    def test_chinese_editorial_service_uses_chinese_journal_names(self):
        chinese = (ROOT / "html/home-zh.html").read_text(encoding="utf-8")

        self.assertIn("《企业经济》（C扩）", chinese)
        self.assertIn("《广州大学学报（社会科学版）》（CSSCI）", chinese)
        self.assertNotIn("<em>Enterprise Economy</em>", chinese)
        self.assertNotIn("<em>Journal of Guangzhou University", chinese)


if __name__ == "__main__":
    unittest.main()
