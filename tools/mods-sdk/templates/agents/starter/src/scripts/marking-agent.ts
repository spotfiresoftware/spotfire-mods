import { schema, schemaStr } from "../utils/schema";

const { List } = System.Collections.Generic;
const { DataTable, DataColumn } = Spotfire.Dxp.Data;
const { ActionModScriptArgumentLiteral, ActionModScriptArgumentNode } = Spotfire.Dxp.Application.Mods;
const { AiChatHistory, AiTool, CompletionSettings } = Spotfire.Dxp.Framework.Ai;
const { ActionModInsight } = Spotfire.Dxp.Application.Insights;

export function markingAgent({ context, resources, utils }: MarkingContext) {
    // Report progress to the user.
    context.UserInteraction.ReportProgress("Gathering information about the current document...");
    const model = context.AiService.GetDefaultModel();

    // Create an AI chat with enough context.
    const history = new AiChatHistory();
    history.AddSystemMessage("You are a Spotfire AI Agent helping with understanding the user's data and domain.");

    let ragBuilder = ""
    const markingTable = context.AnalyzedColumn.Context.GetAncestor(DataTable);
    if (markingTable != null) {
        ragBuilder += `The user has marked data in the table ${markingTable.Name}. The available columns are:\n`
        for (const column of markingTable.Columns) {
            if (column.Visible) {
                ragBuilder += `  ${column.Name}\n`;
            }
        }
    }

    ragBuilder += `The user has marked data in a visualization of type ${context.Visual.TypeId.DisplayName}\n`;

    const userMessage = "Write what you are interested to get help with here. Tell the AI what information it should prompt about.";

    history.AddUserMessage(ragBuilder + userMessage);

    // Add the ability for the LLM to prompt the user.
    const tools = new List(AiTool);
    for (const tool of context.UserInteraction.GetTools()) {
        tools.Add(tool);
    }
    const responseWithCalculatedColumns = model.ChatCompletion(history, tools);

    // Report progress
    context.UserInteraction.ReportProgress("Looking for insights...");

    // Get a structured response for the agent.
    const c = new AiChatHistory();
    const systemPrompt = `Your job is to create a structured response for something...`;
    c.AddSystemMessage(systemPrompt);
    c.AddUserMessage(responseWithCalculatedColumns);
    const structuredResponse = model.ChatCompletion(c, null, new CompletionSettings(schemaStr));

    // Parse it using the schema.
    const parsed = JSON.parse(structuredResponse);
    const parseResult = schema.safeParse(parsed);
    if (!parseResult.success) {
        context.ReportResult("Failed to find insights", "Invalid structured output from LLM. No insight found.");
        return;
    }

    const result = parseResult.data;
    context.UserInteraction.ReportProgress("Creating insight...");

    // Pass along whatever results are necessary to generate something from the insight.
    const insights = new List(ActionModInsight);
    insights.Add(
        new ActionModInsight(
            "Title of the insight",
            result.description,
            utils.CreateScriptInvocation("marking-insight", {
                insightInfo: new ActionModScriptArgumentLiteral(structuredResponse),
                dataTable: new ActionModScriptArgumentNode(markingTable)
            }),
        ),
    );

    context.ReportResult("Marking insights found", "An insight was found related to the marked data", insights);
}

RegisterEntryPoint(markingAgent);
