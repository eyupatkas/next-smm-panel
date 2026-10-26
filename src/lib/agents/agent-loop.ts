import { callAiGateway, type GatewayMessage } from "./ai-gateway";

/**
 * AI ajanları için araç (function calling) döngüsü.
 * Model bir yanıt üretene veya tur sınırına ulaşana dek araç çağrılarını yürütür;
 * tur sınırında araçları kaldırıp zorunlu bir metin yanıtı alır.
 */

export type ToolSpec = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
};

export type ToolLoopResult = {
  ok: boolean;
  reply: string;
  error?: string;
  provider?: string;
  model?: string;
  toolTrace: string[];
};

export async function runToolLoop({
  systemPrompt,
  userPrompt,
  tools,
  executeTool,
  maxIterations = 4,
  temperature = 0.4,
  maxTokens = 1600,
  triesPerModel,
  maxNetworkCalls,
  extraKeysBySlug,
}: {
  systemPrompt: string;
  userPrompt: string;
  tools: ToolSpec[];
  executeTool: (name: string, args: Record<string, any>) => Promise<any> | any;
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
  triesPerModel?: number;
  maxNetworkCalls?: number;
  extraKeysBySlug?: Record<string, string[]>;
}): Promise<ToolLoopResult> {
  const messages: GatewayMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const toolTrace: string[] = [];

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const isLastIteration = iteration === maxIterations;
    const res = await callAiGateway({
      messages,
      tools: isLastIteration ? undefined : tools,
      temperature,
      maxTokens,
      triesPerModel,
      maxNetworkCalls,
      extraKeysBySlug,
    });

    if (!res.ok) {
      return { ok: false, reply: "", error: res.error, toolTrace };
    }

    messages.push({
      role: "assistant",
      content: res.content || "",
      tool_calls: res.tool_calls,
    });

    // Araç çağrısı yoksa nihai yanıt üretildi
    if (!res.tool_calls || res.tool_calls.length === 0) {
      return { ok: true, reply: (res.content || "").trim(), provider: res.provider, model: res.model, toolTrace };
    }

    for (const call of res.tool_calls) {
      const functionName = call?.function?.name;
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }

      let result: any;
      try {
        result = await executeTool(functionName, args);
      } catch (err) {
        result = { error: `Araç hatası: ${err instanceof Error ? err.message : String(err)}` };
      }

      toolTrace.push(`${functionName}(${JSON.stringify(args).slice(0, 120)})`);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: functionName,
        content: JSON.stringify(result).slice(0, 6000),
      });
    }
  }

  return { ok: false, reply: "", error: "Araç döngüsü tur sınırında nihai yanıt üretemedi.", toolTrace };
}
