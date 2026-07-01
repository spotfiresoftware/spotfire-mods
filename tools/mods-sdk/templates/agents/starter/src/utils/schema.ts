import { z } from "zod";

export const schema = z.object({
    title: z.string(),
    description: z.string(),
    xExpression: z.string(),
    yExpression: z.string(),
    colorByExpression: z.string()
});

export const schemaStr = JSON.stringify(z.toJSONSchema(schema), null, 2);
