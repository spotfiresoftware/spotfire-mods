import { Frame, FrameFactory } from "./index";
import { continueOnIdle } from "./interactionLock";
import { throttle } from "./modutils";

type SetupVisualization = (animationControl: AnimationControl) => RenderFrame;
type RenderFrame = (frame: Frame, animationSpeed: number) => void;

/**
 * The Animation control class is responsible for keeping track of the animation state and drive the rendering of the visualization.
 */
export class AnimationControl {
    private frames: FrameFactory[] = [];
    private renderFrame: RenderFrame = () => {};
    private throttleRender = throttle(() => this.render());

    private animationIndex = 0;
    private animationSpeed = 500;
    private defaultSpeed = 500;
    private playing = false;
    private timer: any = null;

    constructor(private speedProperty: { set(v: any): void }) {}

    update(frames: FrameFactory[], setupVisualization: SetupVisualization) {
        this.frames = frames;
        this.renderFrame = setupVisualization(this);
        this.render();
    }

    isPlaying(setter?: boolean) {
        if (setter != undefined) {
            this.animationSpeed = this.defaultSpeed;
            if (setter) {
                this.play();
            } else {
                this.pause();
            }
            this.throttleRender();
        }

        return this.playing;
    }

    currentIndex() {
        return this.animationIndex;
    }

    domain() {
        return [0, this.frames.length - 1];
    }

    speed(s?: number) {
        if (s != undefined) {
            this.speedProperty.set(s);
            this.defaultSpeed = s;
            this.animationSpeed = s;
        }

        return this.defaultSpeed;
    }

    setIndex(i: number) {
        this.pause();
        this.animationIndex = i;
        this.animationSpeed = 50;
        this.throttleRender();
    }

    visible() {
        return this.frames.length > 1;
    }

    render() {
        const emptyFrame = { name: "", bubbles: [] };

        if (this.animationIndex >= this.frames.length) {
            this.animationIndex = 0;
        }

        const frame = this.frames[this.animationIndex];
        if (!frame) {
            this.renderFrame(emptyFrame, 0);
            return;
        }

        if (!frame.bubbles) {
            frame.bubbles = frame.bubbleFactory();
        }

        this.renderFrame((frame as Frame) || emptyFrame, this.animationSpeed);
    }

    private pause() {
        this.playing = false;
        clearTimeout(this.timer);
    }

    private isAtLastFrame() {
        return this.animationIndex == this.frames.length - 1;
    }

    private play() {
        if (this.isAtLastFrame()) {
            this.animationIndex = 0;
        }

        this.playing = true;
        this.render();
        let instance = this;
        this.timer = setTimeout(async function next() {
            if (!instance.playing) {
                return;
            }

            await continueOnIdle();
            if (instance.isAtLastFrame()) {
                instance.pause();
            } else {
                instance.animationIndex++;
            }

            instance.render();
            instance.timer = setTimeout(next, instance.animationSpeed);
        }, this.animationSpeed);
    }
}
