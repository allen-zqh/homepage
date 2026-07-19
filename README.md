# Qiuhan Zhao — Academic Homepage

Personal academic website of **Qiuhan Zhao**, Assistant Professor at the Shanghai International College of Intellectual Property, Tongji University.

The site is a lightweight static website designed for deployment with GitHub Pages.

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
├── css/                    # Layout, typography, colors, and components
├── js/navigation.js        # Loads the main profile content
├── assets/                 # Portrait and favicon
└── cv.pdf                  # Curriculum vitae
```

## Updating the site

- Edit academic content in `html/home.html`.
- Adjust the visual system in `css/colors.css` and `css/page.css`.
- Replace `assets/avatar.jpg` to update the portrait.
- Replace `cv.pdf` while keeping the filename unchanged to update the CV.

## Deployment

The repository can be published as a static site with GitHub Pages. If a custom domain is needed later, add a `CNAME` file containing that domain before deployment.
