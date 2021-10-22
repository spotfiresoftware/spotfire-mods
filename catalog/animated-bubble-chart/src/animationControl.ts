import * as d3 from "d3";
import { Frame, FrameFactory } from "./index";
import { continueOnIdle } from "./interactionLock";
import { throttle } from "./modutils";

const playButtonSvg = document.querySelector("#play_button")?.lastChild!;
const pauseButtonSvg = document.querySelector("#pause_button")?.lastChild!;
const animationSpeedButtonSvg = document.querySelector(
    "#animation_speed_button g"
)!;
const speedButtonSize = 24,
    playButtonSize = 16,
    padding = 8,
    progressHeight = 6,
    progressX =
        (Math.max(speedButtonSize, playButtonSize) - progressHeight) / 2;

type Setup = (animationControl: AnimationControl) => Render;
type Render = (frame: Frame, animationSpeed: number) => void;

export interface AnimationControl {
    update(frames: FrameFactory[], onRender: Setup): void;
    setIndex(index: number): void;

    visible(): boolean;
    isPlaying(): boolean;
    isPlaying(playing: boolean): void;
    speed(): number;
    speed(s: number): void;
    domain(): [number, number];
    currentIndex(): number;
}

export function animationControl(animationSpeedProperty: {
    set: (value: number) => void;
}): AnimationControl {
    let frames: FrameFactory[] = [];
    let onRender: Render = () => {};
    let throttleRender = throttle(render);

    let animationIndex = 0;
    let speed = 500;
    let defaultSpeed = 500;
    let playing = false;
    let timer: any = null;

    let instance: AnimationControl = {
        update(_frames: FrameFactory[], setupVisualization) {
            frames = _frames;
            onRender = setupVisualization(instance);
            render();
        },
        isPlaying(setter?: boolean) {
            if (setter != undefined) {
                speed = defaultSpeed;
                if (setter) {
                    play();
                } else {
                    pause();
                }
                throttleRender();
            }

            return playing;
        },
        currentIndex() {
            return animationIndex;
        },
        domain() {
            return [0, frames.length - 1];
        },
        speed(s?: number) {
            if (s != undefined) {
                animationSpeedProperty.set(s);
                defaultSpeed = s;
                speed = s;
            }

            return defaultSpeed;
        },
        setIndex(i) {
            pause();
            animationIndex = i;
            speed = 50;
            throttleRender();
        },
        visible() {
            return frames.length > 1;
        },
    };

    function render() {
        if (animationIndex >= frames.length) {
            animationIndex = 0;
        }

        const frame = frames[animationIndex];
        if(!frame.bubbles) {
            frame.bubbles =  frame.bubbleFactory();
        }

        onRender((frame as Frame) || { name: "", bubbles: [] }, speed);
    }

    function pause() {
        playing = false;
        clearTimeout(timer);
    }

    function play() {
        playing = true;
        render();
        timer = setTimeout(async function next() {
            if (!playing) {
                return;
            }

            await continueOnIdle();
            animationIndex++;

            render();
            timer = setTimeout(next, speed);
        }, speed);
    }

    return instance;
}

function showSpeedSlider(animation: AnimationControl) {
    let times = [0.1, 0.3, 0.5, 1, 3, 5, 10].reverse();
    function toTime(index: number) {
        return (
            1000 *
            (index >= 0 ? times[index] || times[times.length - 1] : times[0])
        );
    }
    function toIndex(time: number) {
        for (var i = 0; i < times.length; i++) {
            if (time / 1000 >= times[i]) {
                return i;
            }
        }

        return 0;
    }

    let current = document.getElementById("animationSpeedSlider");
    if (current) {
        document.body.removeChild(current);
        document.body.removeChild(
            document.getElementById("animationSpeedLabel")!
        );
        return;
    }

    let input = document.createElement("input");
    input.id = "animationSpeedSlider";
    input.type = "range";
    input.style.bottom = speedButtonSize + padding + "px";
    input["max"] = "0";
    input["max"] = String(times.length - 1);
    input.value = String(toIndex(animation.speed()));
    document.body.appendChild(input);

    let label = document.createElement("label");
    label.htmlFor = "animationSpeedSlider";
    label.id = "animationSpeedLabel";
    label.style.bottom = speedButtonSize + 2 * padding + 100 + "px";
    label.textContent = `${toTime(Number(input.value)) / 1000}s`;
    document.body.appendChild(label);

    input.oninput = function () {
        label.textContent = `${toTime(Number(input.value)) / 1000}s`;
    };

    input.onchange = function () {
        document.body.removeChild(input);
        document.body.removeChild(label);
        animation.speed(toTime(Number(input.value)));
    };
}

export function renderAnimationControl(
    animation: AnimationControl,
    animationControlArea: { width: number },
    context: d3.Selection<SVGGElement, unknown, HTMLElement, any>
) {
    // render animation scale
    let animationScale = d3
        .scaleLinear()
        .domain(animation.domain())
        .range([0, animationControlArea.width])
        .clamp(true);

    animationScale.range([
        0 + playButtonSize + padding,
        animationControlArea.width - speedButtonSize - padding,
    ]);

    let playButton: any = context.select("svg");
    setPlaying(animation.isPlaying());

    var dispatch = d3.dispatch("sliderChange");

    let animationSpeedButton = context.select<SVGGElement>("#animationSpeed");
    if (animationSpeedButton.empty()) {
        animationSpeedButton = context.append("g");
        animationSpeedButton
            .attr("id", "animationSpeed")
            .node()!
            .append(animationSpeedButtonSvg);
    }

    animationSpeedButton
        .attr(
            "transform",
            `translate(${animationScale.range()[1] + padding} 0)`
        )
        .attr("width", speedButtonSize)
        .attr("height", speedButtonSize)
        .attr("class", "animationSpeed")
        .on("click", () => showSpeedSlider(animation));

    let animationSlider = context.select<SVGRectElement>("#animationSlider");

    if (animationSlider.empty()) {
        animationSlider = context.append("rect").attr("id", "animationSlider");
    }
    animationSlider
        .attr("x", animationScale(0) || 0)
        .attr("y", progressX)
        .attr(
            "width",
            Math.max(0, animationScale.range()[1] - animationScale.range()[0])
        )
        .attr("height", 8)
        .attr("class", "animation-tray")
        .on("click", sliderclick)
        .call(
            d3
                .drag<SVGRectElement, any>()
                .on("start", function () {
                    dispatch.call(
                        "sliderChange",
                        this,
                        Math.round(
                            animationScale.invert(
                                d3.mouse(animationSlider.node()!)[0]
                            )
                        )
                    );

                    d3.event.sourceEvent.preventDefault();
                })
                .on("drag", function () {
                    dispatch.call(
                        "sliderChange",
                        this,
                        Math.round(
                            animationScale.invert(
                                d3.mouse(animationSlider.node()!)[0]
                            )
                        )
                    );
                })
        );

    dispatch.on("sliderChange.slider", function (value) {
        setSliderValue(value);
        animation.setIndex(value);
    });

    let animationIndicator = context.select<SVGRectElement>(
        "#animationIndicator"
    );
    if (animationIndicator.empty()) {
        animationIndicator = context
            .append("rect")
            .attr("id", "animationIndicator");
    }

    animationIndicator
        .attr("x", animationScale(0) || 0)
        .attr("y", progressX)
        .attr(
            "width",
            Math.max(
                0,
                animationScale(animation.currentIndex())! - animationScale(0)!
            )
        )
        .attr("height", 8)
        .attr("class", "animation-indicator");

    let animationHandle = context.select<SVGCircleElement>("#animationHandle");
    if (animationHandle.empty()) {
        animationHandle = context
            .append("circle")
            .attr("id", "animationHandle");
    }

    animationHandle
        .attr("cy", progressX + 4)
        .attr("cx", animationScale(animation.currentIndex()) || 0)
        .attr("r", 6)
        .attr("class", "animation-handle");

    function sliderclick() {
        let animationIndex = Math.round(
            animationScale.invert(d3.mouse(animationSlider.node()!)[0])
        );

        animation.setIndex(animationIndex);
    }

    function setPlaying(isPlaying: boolean) {
        let svg = (!isPlaying ? playButtonSvg : pauseButtonSvg)?.cloneNode(
            true
        );

        if (playButton.empty()) {
            context.attr("id", "playButton").node()!.append(svg);
        } else {
            context.select<SVGElement>("svg").node()!.replaceWith(svg);
        }

        playButton = context.select("svg");
        playButton
            .attr("x", 0)
            .attr("y", (speedButtonSize - playButtonSize) / 2)
            .attr("height", playButtonSize)
            .attr("width", playButtonSize)
            .attr("class", "playbutton")
            .on("click", playClicked);
    }

    function playClicked() {
        animation.isPlaying(!animation.isPlaying());
    }

    function setSliderValue(value: number, transitionduration = 0) {
        animationIndicator
            .attr("aria-labelledby", value)
            .transition()
            .ease(d3.easeLinear)
            .duration(transitionduration)
            .attr(
                "width",
                Math.max(
                    0,
                    (animationScale(value) || 0) - (animationScale(0) || 0)
                )
            );
        animationHandle
            .attr("aria-labelledby", value)
            .transition()
            .ease(d3.easeLinear)
            .duration(transitionduration)
            .attr("cx", animationScale(value) || 0);
    }
}
