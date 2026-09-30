import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

EXPECTED_JOURNAL_DETAILS = [
    "Urban Climate, 67, 102941 (2026)",
    "Technological Forecasting and Social Change, 227, 124611 (2026)",
    "The Journal of Technology Transfer, 51(4), 3003–3044 (2026)",
    "Applied Economics, 58(39), 8324–8342 (2026)",
    "Kybernetes, 55(8), 3353–3377 (2026)",
    "International Review of Financial Analysis, 103, 104163 (2025)",
    "Applied Economics Letters, 33(14), 2608–2613 (2026)",
    "International Review of Financial Analysis, 101, 103997 (2025)",
    "Journal of Quality Assurance in Hospitality & Tourism. Advance online publication (2025)",
    "E&M Economics and Management, 28(2), 208–228 (2025)",
    "International Review of Financial Analysis, 94, 103248 (2024)",
    "Resources Policy, 85, 103959 (2023)",
    "International Journal of Web and Grid Services, 17(3), 268–291 (2021)",
]


class PublicationParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.entries = []
        self.italic_fragments = []
        self._capture = False
        self._buffer = []
        self._italic_buffer = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "td" and "pub-desc-wrapper" in attributes.get("class", "").split():
            self._capture = True
            self._buffer = []
        elif tag == "i" and self._capture:
            self._italic_buffer = []

    def handle_data(self, data):
        if self._capture:
            self._buffer.append(data)
        if self._italic_buffer is not None:
            self._italic_buffer.append(data)

    def handle_endtag(self, tag):
        if tag == "i" and self._italic_buffer is not None:
            self.italic_fragments.append(" ".join("".join(self._italic_buffer).split()))
            self._italic_buffer = None
        if tag == "td" and self._capture:
            self.entries.append(" ".join("".join(self._buffer).split()))
            self._capture = False


def journal_entries(path):
    parser = PublicationParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser.entries[:13]


def journal_italic_metadata(path):
    parser = PublicationParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser.italic_fragments[:13]


class PublicationMetadataTests(unittest.TestCase):
    def test_journal_entries_include_verified_metadata_or_online_first_status(self):
        entries = journal_entries(ROOT / "html/home.html")

        self.assertEqual(len(entries), len(EXPECTED_JOURNAL_DETAILS))
        for entry, expected in zip(entries, EXPECTED_JOURNAL_DETAILS):
            self.assertIn(expected, entry)

    def test_chinese_and_english_pages_use_identical_journal_metadata(self):
        english = journal_entries(ROOT / "html/home.html")
        chinese = journal_entries(ROOT / "html/home-zh.html")

        self.assertEqual(english, chinese)

    def test_article_numbers_do_not_include_an_article_label(self):
        entries = " ".join(journal_entries(ROOT / "html/home.html"))

        self.assertNotRegex(entries, r"\bArticle\s+\d+")

    def test_complete_journal_metadata_uses_one_consistent_italic_style(self):
        for page in ("home.html", "home-zh.html"):
            metadata = journal_italic_metadata(ROOT / "html" / page)
            self.assertEqual(metadata, EXPECTED_JOURNAL_DETAILS)


if __name__ == "__main__":
    unittest.main()
