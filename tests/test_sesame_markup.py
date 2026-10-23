import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class Markup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = []

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))


class SesameMarkupTests(unittest.TestCase):
    def setUp(self):
        self.page = Markup()
        self.page.feed((ROOT / 'index.html').read_text())

    def test_cat_is_the_only_companion_button_and_tooltip_is_just_its_name(self):
        controls = [(tag, attrs) for tag, attrs in self.page.elements if 'data-sesame-cat' in attrs]
        self.assertEqual(len(controls), 1)
        tag, attrs = controls[0]
        self.assertEqual(tag, 'button')
        self.assertEqual(attrs.get('type'), 'button')
        self.assertTrue(attrs.get('aria-label'))
        self.assertEqual(attrs.get('title'), 'Sesame')
        self.assertFalse(any('data-sesame-pause' in attrs for _, attrs in self.page.elements))

    def test_sprite_and_controller_are_locally_available(self):
        stages = [attrs for _, attrs in self.page.elements if 'data-sesame-stage' in attrs]
        self.assertEqual(len(stages), 1)
        self.assertTrue((ROOT / stages[0]['data-sesame-image']).is_file())
        scripts = [attrs for tag, attrs in self.page.elements if tag == 'script' and attrs.get('src', '').split('?')[0] == 'js/sesame.js']
        self.assertEqual(len(scripts), 1)
        self.assertIn('defer', scripts[0])

    def test_tab_icon_is_explicitly_empty_not_the_cat_asset(self):
        icons = [attrs for tag, attrs in self.page.elements if tag == 'link' and attrs.get('rel') == 'icon']
        self.assertEqual(len(icons), 1)
        self.assertTrue(icons[0].get('href', '').startswith('data:image/svg+xml,'))
        self.assertNotIn('favicon.ico', icons[0]['href'])


if __name__ == '__main__':
    unittest.main()
