import { colorForSerie } from "../src/render";
import { Serie, Point } from "../src/series";

describe("Render functions", () => {
    let points: Point[];
    let emptySerie: Serie;

    const tooltip = () => "";
    const mark = () => {};
    beforeAll(() => {
        points = [
            {
                tooltip: tooltip,
                mark: mark,
                xIndex: 0,
                Y: 0,
                Y_Formatted: "0",
                marked: false,
                color: "#000000",
                index: 0,
                virtual: false
            },
            {
                tooltip: tooltip,
                mark: mark,
                xIndex: 0,
                Y: 0,
                Y_Formatted: "0",
                marked: false,
                color: "#cccccc",
                index: 0,
                virtual: false
            },
            {
                tooltip: tooltip,
                mark: mark,
                xIndex: 0,
                Y: 0,
                Y_Formatted: "0",
                marked: false,
                color: "#dddddd",
                index: 0,
                virtual: true
            },
            {
                tooltip: tooltip,
                mark: mark,
                xIndex: 0,
                Y: 0,
                Y_Formatted: "0",
                marked: true,
                color: "#bbbbbb",
                index: 0,
                virtual: false
            },
            {
                tooltip: tooltip,
                mark: mark,
                xIndex: 0,
                Y: 0,
                Y_Formatted: "0",
                marked: true,
                color: "#444444",
                index: 0,
                virtual: false
            },
            {
                tooltip: tooltip,
                mark: mark,
                xIndex: 0,
                Y: 0,
                Y_Formatted: "0",
                marked: false,
                color: "#111111",
                index: 0,
                virtual: true
            }
        ];

        emptySerie = {
            mark: () => {},
            index: 0,
            sum: 0,
            points: []
        };
    });

    it("Should verify if an empty serie color is transparent", () => {
        let testSerie = emptySerie;
        testSerie.points = [];
        expect(colorForSerie(testSerie)).toBe("transparent");
    });

    it("Should verify if a serie will take the color of a marked point", () => {
        let testSerie = emptySerie;
        testSerie.points = [points[0], points[3]];
        expect(colorForSerie(testSerie)).toBe("#bbbbbb");
    });

    it("Should verify if a serie will take the color of the first non virtual point when there are no marked points", () => {
        let testSerie = emptySerie;
        testSerie.points = [points[1], points[0]];
        expect(colorForSerie(testSerie)).toBe("#cccccc");
    });

    it("Should verify if the color will be transparent if the serie has no marked or real points", () => {
        let testSerie = emptySerie;
        testSerie.points = [points[2], points[5]];
        expect(colorForSerie(testSerie)).toBe("transparent");
    });
});
