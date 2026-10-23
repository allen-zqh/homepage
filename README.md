# Qiuhan Zhao — Academic Homepage

Personal academic website of **Qiuhan Zhao**, Assistant Professor at the Shanghai International College of Intellectual Property, Tongji University.

The site is a lightweight bilingual static website designed for deployment with GitHub Pages or Netlify. English is the default language; visitors can switch to Chinese from the navigation bar, and the preference is saved in the browser.

## Local preview

The homepage loads its content dynamically, so it should be viewed through a local web server rather than by opening `index.html` directly.

```bash
cd /Users/zqh/Documents/homepage
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. Press `Control + C` in the terminal to stop the server.

## Project structure

```text
.
├── index.html              # Page shell and navigation
├── html/home.html          # Academic profile content
├── html/home-zh.html       # Chinese profile content
├── css/                    # Layout, typography, colors, and components
├── js/navigation.js        # Loads content and manages language switching
├── assets/                 # Portrait and favicon
└── zhao_cv.pdf             # Curriculum vitae
```

## Updating the site

The navigation bar includes a small comic-style Sesame (芝麻) companion. Click the cat to cycle through idle, run, wave, and jump. Its hover tooltip shows only its name: Sesame in English or 芝麻 in Chinese. The cat stays within its own area, and reduced-motion preferences and background tabs suspend animation. Its accessible labels follow the selected language. The tab favicon is intentionally transparent; the original icon files are retained.

The companion uses `assets/sesame/sprites.png` (four columns and four action rows), `css/sesame.css`, and `js/sesame.js`. Generation prompts are recorded in `assets/sesame/generation-prompt.txt`. These are website-only assets; the installed Sesame pet is not modified.

- Edit English academic content in `html/home.html` and its Chinese counterpart in `html/home-zh.html`.
- Keep section IDs and publication anchors identical in both content files so in-page links continue to work when switching languages.
- Keep English publication titles, venue names, author lists, and publication links identical across both files.
- Group journal papers by the year shown in their citation, newest first. The latest year (`journal-2026`) is open initially; `journal-2025` and `earlier-journals` start closed. Older papers retain year subheadings inside their shared group. Move the cutoff and default open year forward as new years are added.
- Journal Papers is a regular heading, with no category-level collapse. Working papers and conference papers start closed. Update the counts in category and year labels when adding or moving papers.
- The left Journal Papers directory starts closed and has its own independent disclosure. Opening or closing it only shows or hides the year links; it does not scroll or change the content on the right. Clicking a year link opens that year before scrolling to it. Working Papers and Conference Papers links also open their targets. Repeated clicks never close a content group, other groups are left unchanged, and folding the content does not change the directory.
- Keep content disclosure IDs identical in both languages so their open/closed state is preserved when switching languages. The independent left directory starts closed when a language is loaded. Printing includes all publications.
- Update the footer date after substantive changes, and keep the descriptions in `index.html` and `js/navigation.js` aligned with the profile.
- Adjust the visual system in `css/colors.css` and `css/page.css`.
- Replace `assets/avatar.jpg` to update the portrait.
- Replace `zhao_cv.pdf` while keeping the filename unchanged to update the CV.

The Chinese version can be shared directly with `?lang=zh`, for example:

```text
https://your-domain.example/?lang=zh
```

## Deployment

The repository can be published as a static site with GitHub Pages. If a custom domain is needed later, add a `CNAME` file containing that domain before deployment.
