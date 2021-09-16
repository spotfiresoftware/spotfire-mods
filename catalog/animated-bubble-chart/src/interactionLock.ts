let mousePromise: Promise<void> | null;
let mousePromiseResolve: null | (() => void);

let manualPromise: Promise<void> | null;
let manualPromiseResolve: null | (() => void);

window.addEventListener("mousedown", down, true);
window.addEventListener("mouseup", up, true);

function up() {
    if (mousePromiseResolve) {
        mousePromiseResolve();
    }

    mousePromise = null;
    mousePromiseResolve = null;
}

function down() {
    // Happens if mouse was released outside of the window
    if (mousePromise && mousePromiseResolve) {
        mousePromiseResolve();
    }

    mousePromise = new Promise((res) => {
        mousePromiseResolve = res;
    });
}

export function continueOnIdle() {
    return Promise.all([
        mousePromise || Promise.resolve(),
        manualPromise || Promise.resolve(),
    ]);
}

export function setBusy() {
    // Busy already set manually.
    if (manualPromise) {
        return;
    }

    manualPromise = new Promise((res) => {
        manualPromiseResolve = res;
    });
}

export function setIdle() {
    manualPromiseResolve && manualPromiseResolve();
    manualPromise = null;
}
