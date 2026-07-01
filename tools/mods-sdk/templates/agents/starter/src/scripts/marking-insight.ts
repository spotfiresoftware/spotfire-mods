import { schema } from "../utils/schema";

export function markingInsight({ document, application, resources, insightInfo, dataTable }: MarkingInsightParameters) {
    const insight = schema.parse(JSON.parse(insightInfo));
    // Do something with the insight.
}

RegisterEntryPoint(markingInsight);
