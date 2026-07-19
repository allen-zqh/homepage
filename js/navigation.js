
function loadContent(file) {
    if (file === '#') return;

    fetch(`html/${file}.html`)
        .then(response => {
            if (!response.ok) throw new Error(`Unable to load ${file}`);
            return response.text();
        })
        .then(data => {
            const content = document.getElementById('content-main');
            content.innerHTML = data;
            if (window.location.hash) {
                requestAnimationFrame(() => {
                    document.querySelector(window.location.hash)?.scrollIntoView();
                });
            }
        })
        .catch(() => {
            document.getElementById('content-main').innerHTML =
                '<p class="loading-state">The page could not be loaded. Please refresh and try again.</p>';
        });
}
