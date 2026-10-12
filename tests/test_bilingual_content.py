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

        self.assertIn('id="news"> 近期动态', chinese)
        self.assertIn('id="edu"> 教育经历', chinese)
        self.assertIn('id="pub"> 学术成果', chinese)
        self.assertIn('id="exp"> 工作与<br class="section-title-break">项目', chinese)
        self.assertIn('id="service"> 学术服务', chinese)

    def test_chinese_editorial_service_uses_chinese_journal_names(self):
        chinese = (ROOT / "html/home-zh.html").read_text(encoding="utf-8")

        self.assertIn("《企业经济》（C扩）", chinese)
        self.assertIn("《广州大学学报（社会科学版）》（CSSCI）", chinese)
        self.assertNotIn("<em>Enterprise Economy</em>", chinese)
        self.assertNotIn("<em>Journal of Guangzhou University", chinese)

    def test_navigation_and_sections_use_the_updated_order_and_labels(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        navigation = (ROOT / "js/navigation.js").read_text(encoding="utf-8")
        english = (ROOT / "html/home.html").read_text(encoding="utf-8")
        chinese = (ROOT / "html/home-zh.html").read_text(encoding="utf-8")

        english_labels = ["Updates", "Education", "Employment &amp; Projects", "Publications", "Service"]
        for label in english_labels:
            self.assertIn(f">{label}</a>", index)
        self.assertIn("news: 'Updates'", navigation)
        self.assertIn("employment: 'Employment & Projects'", navigation)
        self.assertIn('id="news"> Updates', english)
        self.assertIn('id="exp"> Employment<br class="section-title-break">&amp; Projects', english)
        self.assertIn('id="news"> 近期动态', chinese)
        self.assertIn('id="exp"> 工作与<br class="section-title-break">项目', chinese)

        section_ids = ['id="news"', 'id="edu"', 'id="exp"', 'id="pub"', 'id="service"']
        for page in (english, chinese):
            positions = [page.index(section_id) for section_id in section_ids]
            self.assertEqual(positions, sorted(positions))

    def test_chinese_degree_thesis_titles_are_not_italicized(self):
        chinese = (ROOT / "html/home-zh.html").read_text(encoding="utf-8")

        self.assertNotIn("学位论文：<em>", chinese)

    def test_degree_thesis_lines_use_the_compact_text_style(self):
        for page in ("home.html", "home-zh.html"):
            content = (ROOT / "html" / page).read_text(encoding="utf-8")
            self.assertEqual(content.count('class="degree-thesis"'), 3)

    def test_top_navigation_does_not_duplicate_the_profile_name(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")

        self.assertNotIn('class="site-mark"', index)
        self.assertNotIn('class="site-name"', index)


if __name__ == "__main__":
    unittest.main()
