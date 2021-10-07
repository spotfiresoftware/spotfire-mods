(function () {
    var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M10 2v2H6V2h4m1-1H5v4h6zM4 12v2H2v-2h2m1-1H1v4h4zm9 1v2h-2v-2h2m1-1h-4v4h4zm-6 1v2H7v-2h2m1-1H6v4h4zM1 7h14v1H1zm0 1h1v1H1zm13 0h1v1h-1zM7 6h2v1H7z"></path></svg>';

    var titleElem = document.querySelector("h1");
    var title = titleElem.textContent;

    if (title.indexOf("Interface") != 0) {
        return;
    }

    var interfaceName = title.split("Interface ")[1];

    let div = document.createElement("div");

    let span = document.createElement("span");
    span.innerHTML = "Display in ";

    let link = document.createElement("a");
    link.classList.add("overview-link");
    link.innerHTML = "API overview";
    link.title = "Display " + interfaceName + " in the API overview."
    link.href = "/spotfire-mods/overview/#" + interfaceName.split("<")[0];

    div.appendChild(span);
    insertAfter(link, span);
    insertAfter(div,titleElem);

    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }


})();
