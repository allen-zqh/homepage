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

- Edit English academic content in `html/home.html` and its Chinese counterpart in `html/home-zh.html`.
- Keep section IDs and publication anchors identical in both content files so in-page links continue to work when switching languages.
- Keep English publication titles, venue names, author lists, and publication links identical across both files.
- Adjust the visual system in `css/colors.css` and `css/page.css`.
- Replace `assets/avatar.jpg` to update the portrait.
- Replace `zhao_cv.pdf` while keeping the filename unchanged to update the CV.

The Chinese version can be shared directly with `?lang=zh`, for example:

```text
https://your-domain.example/?lang=zh
```

## Deployment

The repository can be published as a static site with GitHub Pages. If a custom domain is needed later, add a `CNAME` file containing that domain before deployment.
