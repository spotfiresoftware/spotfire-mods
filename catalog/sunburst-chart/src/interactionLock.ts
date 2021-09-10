export type InteractionLock = ReturnType<typeof interactionLock>;

export function interactionLock() {
    let resolveLastPromise: null | (() => void) = null;
    let currentRenderingPromise: Promise<void> | null;

    document.body.addEventListener("mousedown", blockRendering, true);
    window.addEventListener("mouseup", releaseRendering, true);

    return {
        /**
         * Await further code execution if a mouse operation is in progress.
         * @returns A promise that is resolved when no mouse interaction is active.
         */
        async interactionInProgress() {
            if (currentRenderingPromise) {
                return currentRenderingPromise;
            }

            return;
        }
    };

    function blockRendering() {
        if (currentRenderingPromise) {
            return;
        }

        currentRenderingPromise = new Promise((res) => {
            resolveLastPromise = res;
        });
    }

    function releaseRendering() {
        resolveLastPromise?.();
        currentRenderingPromise = null;
    }
}
