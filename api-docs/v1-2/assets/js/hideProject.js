// Hides the "Project " prefix on the landing page of the API documentation.

(function () {
    const pageTitle = document.querySelector(".tsd-page-title");
    if (pageTitle != null) {
        const header = pageTitle.querySelector("h1");
        if (header != null) {
            header.textContent = header.textContent.replace("Project ", "");
        }
    }
})();
