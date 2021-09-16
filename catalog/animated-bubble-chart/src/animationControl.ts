import * as d3 from "d3";
import { continueOnIdle } from "./interactionLock";

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

export function animationControl(animationSpeedProperty: {
    set: (value: number) => void;
}) {
    let animationScale: d3.ScaleLinear<number, number>;
    let valueChanged: (value: number, changedByUser: boolean) => void;
    let animationSpeed: number;

    let animationIndex = 0;
    let range: number[];
    let playing = false;
    let animationMax: number;

    return {
        render,
        update(
            _animationScale: d3.ScaleLinear<number, number>,
            _valueChanged: (value: number, changedByUser: boolean) => void,
            _animationSpeed: number
        ) {
            animationScale = _animationScale;
            valueChanged = _valueChanged;
            animationSpeed = _animationSpeed;

            range = animationScale.range();
            animationMax = animationScale.domain()[1];
            if (animationIndex != 0) {
                animationIndex = Math.min(animationIndex, animationMax);
            }
        },
        getIndex() {
            return animationIndex;
        },
        isPlaying() {
            return playing;
        },
    };

    function showSpeedSlider() {
        let times = [0.1, 0.3, 0.5, 1, 3, 5, 10].reverse();
        function toTime(index: number) {
            return (
                1000 *
                (index >= 0
                    ? times[index] || times[times.length - 1]
                    : times[0])
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
        input.value = String(toIndex(animationSpeed));
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
            animationSpeedProperty.set(toTime(Number(input.value)));
        };
    }

    function render(
        context: d3.Selection<SVGGElement, unknown, HTMLElement, any>
    ) {
        animationScale.range([
            range[0] + playButtonSize + padding,
            range[1] - speedButtonSize - padding,
        ]);

        let playButton: any = context.select("svg");
        setPlaying(playing);

        var dispatch = d3.dispatch("sliderChange");

        let animationSpeedButton = context.select<SVGGElement>(
            "#animationSpeed"
        );
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
            .on("click", showSpeedSlider);

        let animationSlider = context.select<SVGRectElement>(
            "#animationSlider"
        );

        if (animationSlider.empty()) {
            animationSlider = context
                .append("rect")
                .attr("id", "animationSlider");
        }
        animationSlider
            .attr("x", animationScale(0) || 0)
            .attr("y", progressX)
            .attr(
                "width",
                Math.max(
                    0,
                    animationScale.range()[1] - animationScale.range()[0]
                )
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
            animationIndex = value;
            valueChanged(value, true);
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
                    animationScale(animationIndex)! - animationScale(0)!
                )
            )
            .attr("height", 8)
            .attr("class", "animation-indicator");

        let animationHandle = context.select<SVGCircleElement>(
            "#animationHandle"
        );
        if (animationHandle.empty()) {
            animationHandle = context
                .append("circle")
                .attr("id", "animationHandle");
        }

        animationHandle
            .attr("cy", progressX + 4)
            .attr("cx", animationScale(animationIndex) || 0)
            .attr("r", 6)
            .attr("class", "animation-handle");

        function sliderclick() {
            setPlaying(false);
            animationIndex = Math.round(
                animationScale.invert(d3.mouse(animationSlider.node()!)[0])
            );
            setSliderValue(animationIndex);
            valueChanged(animationIndex, true);
        }

        function setPlaying(isPlaying: boolean) {
            playing = isPlaying;
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
            if (!playing) {
                // Reset to start when clicking play if the animation has reached the end.
                if (animationIndex >= animationMax) {
                    animationIndex = 0;
                }

                setPlaying(true);
                d3.timeout(play, 100);
            } else {
                setPlaying(false);
            }
        }

        async function play() {
            if (!playing) {
                return;
            }

            if (animationIndex <= animationMax) {
                await continueOnIdle();

                setSliderValue(animationIndex, animationSpeed);
                valueChanged(animationIndex, false);

                animationIndex += 1;
                d3.timeout(play, animationSpeed);
            } else {
                setPlaying(false);
            }
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
}
