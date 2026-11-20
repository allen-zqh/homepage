import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

EXPECTED_JOURNAL_DETAILS = [
    "Agricultural and Forest Meteorology, 393, 111617 (2027)",
    "Urban Climate, 67, 102941 (2026)",
    "Technological Forecasting and Social Change, 227, 124611 (2026)",
    "The Journal of Technology Transfer, 51(4), 3003–3044 (2026)",
    "Applied Economics, 58(39), 8324–8342 (2026)",
    "Kybernetes, 55(8), 3353–3377 (2026)",
    "Applied Economics Letters, 33(14), 2608–2613 (2026)",
    "International Review of Financial Analysis, 103, 104163 (2025)",
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
        self.disclosures = {}
        self.display_counts = {}
        self._count_group = None
        self.anchor_links = []
        self.update_links = []
        self._in_updates = False
        self.heading_ids = set()
        self.year_navigation = []
        self._disclosure_stack = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "details":
            disclosure = {"attrs": attributes, "entries": [], "links": [], "headings": []}
            self.disclosures[attributes.get("id")] = disclosure
            self._disclosure_stack.append(disclosure)
        if tag == "ul" and "updates-list" in attributes.get("class", "").split():
            self._in_updates = True
        if tag == "a":
            self.anchor_links.append(attributes.get("href"))
            if self._in_updates:
                self.update_links.append(attributes.get("href"))
            if self._disclosure_stack:
                self._disclosure_stack[-1]["links"].append(attributes.get("href"))
        if tag in ("h3", "h4", "h5") and "id" in attributes:
            self.heading_ids.add(attributes["id"])
            if self._disclosure_stack:
                self._disclosure_stack[-1]["headings"].append(attributes["id"])
        if "publication-year-nav" in attributes.get("class", "").split():
            self.year_navigation.append({
                "attrs": attributes,
                "inside_disclosure": bool(self._disclosure_stack),
            })
        if tag == "span" and "publication-count" in attributes.get("class", "").split():
            self._count_group = (
                self._disclosure_stack[-1]["attrs"]["id"] if self._disclosure_stack else "journal-papers"
            )
        if tag == "td" and "pub-desc-wrapper" in attributes.get("class", "").split():
            self._capture = True
            self._buffer = []
        elif tag == "i" and self._capture:
            self._italic_buffer = []

    def handle_data(self, data):
        if self._count_group and data.strip():
            self.display_counts[self._count_group] = data.strip()
        if self._capture:
            self._buffer.append(data)
        if self._italic_buffer is not None:
            self._italic_buffer.append(data)

    def handle_endtag(self, tag):
        if tag == "span":
            self._count_group = None
        if tag == "ul":
            self._in_updates = False
        if tag == "i" and self._italic_buffer is not None:
            self.italic_fragments.append(" ".join("".join(self._italic_buffer).split()))
            self._italic_buffer = None
        if tag == "td" and self._capture:
            entry = " ".join("".join(self._buffer).split())
            self.entries.append(entry)
            for disclosure in self._disclosure_stack:
                disclosure["entries"].append(entry)
            self._capture = False
        if tag == "details":
            self._disclosure_stack.pop()


def journal_entries(path):
    parser = PublicationParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser.entries[:len(EXPECTED_JOURNAL_DETAILS)]


def journal_italic_metadata(path):
    parser = PublicationParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser.italic_fragments[:len(EXPECTED_JOURNAL_DETAILS)]


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

    def test_new_paper_is_linked_once_in_updates_and_its_citation_year(self):
        url = "https://doi.org/10.1016/j.agrformet.2026.111617"
        for page in ("home.html", "home-zh.html"):
            with self.subTest(page=page):
                parser = PublicationParser()
                parser.feed((ROOT / "html" / page).read_text(encoding="utf-8"))
                self.assertEqual(parser.update_links.count(url), 1)
                self.assertEqual(parser.disclosures["journal-2027"]["links"].count(url), 1)
                self.assertEqual(parser.anchor_links.count(url), 2)

    def test_journal_groups_are_complete_reachable_and_only_2027_starts_open(self):
        for page in ("home.html", "home-zh.html"):
            parser = PublicationParser()
            parser.feed((ROOT / "html" / page).read_text(encoding="utf-8"))
            self.assertEqual(parser.display_counts.get("journal-papers"), f"({len(EXPECTED_JOURNAL_DETAILS)})")
            for anchor, years in (
                ("journal-2027", [2027]),
                ("journal-2026", [2026] * 6),
                ("earlier-journals", [2025] * 4 + [2024, 2023, 2021]),
            ):
                with self.subTest(page=page, anchor=anchor):
                    self.assertIn(anchor, parser.disclosures)
                    group = parser.disclosures[anchor]
                    self.assertEqual("open" in group["attrs"], anchor == "journal-2027")
                    self.assertIn("data-publication-disclosure", group["attrs"])
                    self.assertEqual(len(group["entries"]), len(years))
                    self.assertEqual(parser.display_counts.get(anchor), f"({len(years)})")
                    for entry, year in zip(group["entries"], years):
                        self.assertTrue(entry.endswith(f"({year})"))
                    self.assertIn(f"#{anchor}", parser.anchor_links)
            self.assertIn("journal-2025", parser.disclosures["earlier-journals"]["headings"])

    def test_working_and_conference_papers_are_complete_collapsed_groups(self):
        for page in ("home.html", "home-zh.html"):
            parser = PublicationParser()
            parser.feed((ROOT / "html" / page).read_text(encoding="utf-8"))
            for anchor, count in (("working-papers", 7), ("conference-papers", 5)):
                with self.subTest(page=page, anchor=anchor):
                    self.assertIn(anchor, parser.disclosures)
                    group = parser.disclosures[anchor]
                    self.assertNotIn("open", group["attrs"])
                    self.assertIn("data-publication-disclosure", group["attrs"])
                    self.assertEqual(len(group["entries"]), count)

    def test_year_navigation_starts_closed_and_is_not_a_content_disclosure(self):
        for page in ("home.html", "home-zh.html"):
            with self.subTest(page=page):
                parser = PublicationParser()
                parser.feed((ROOT / "html" / page).read_text(encoding="utf-8"))
                self.assertIn("journal-papers", parser.heading_ids)
                self.assertNotIn("journal-papers", parser.disclosures)
                self.assertIn("journal-navigation", parser.disclosures)
                directory = parser.disclosures["journal-navigation"]
                self.assertNotIn("open", directory["attrs"])
                self.assertNotIn("data-publication-disclosure", directory["attrs"])
                self.assertEqual(directory["entries"], [])
                self.assertEqual(len(parser.year_navigation), 1)
                self.assertNotIn("hidden", parser.year_navigation[0]["attrs"])
                self.assertTrue(parser.year_navigation[0]["inside_disclosure"])

    def test_rieti_years_share_the_publication_metadata_style(self):
        for page in ("home.html", "home-zh.html"):
            parser = PublicationParser()
            parser.feed((ROOT / "html" / page).read_text(encoding="utf-8"))
            metadata = [text for text in parser.italic_fragments if text.startswith("RIETI Discussion Paper")]
            self.assertEqual(metadata, ["RIETI Discussion Paper, 2023", "RIETI Discussion Paper, 2025"])


if __name__ == "__main__":
    unittest.main()
