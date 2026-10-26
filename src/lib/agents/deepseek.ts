import { callAiGateway } from "./ai-gateway";

export type DeepSeekResponse = {
  ok: boolean;
  content?: string;
  error?: string;
  tool_calls?: any[];
  message?: any;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

/**
 * Merkezi AI ajan çağrısı — artık dayanıklı AI Gateway üzerinden çalışır.
 * API anahtarları veritabanındaki AiProvider kayıtlarından (aktif + varsayılan önce)
 * alınır; hiçbiri yoksa process.env.GEMINI_API_KEY / DEEPSEEK_API_KEY'e düşer.
 * Gateway; geçici hatalarda (429/5xx/503 "high demand") retry, anahtar rotasyonu,
 * güncel model zinciri ve sağlayıcı fallback'i otomatik uygular.
 * (Fonksiyon adı eski DeepSeek-only döneminden kalmıştır; artık tüm sağlayıcıları kapsar.)
 */
export async function callDeepSeekAgent({
  systemPrompt,
  userPrompt,
  messages,
  jsonMode = false,
  temperature = 0.3,
  maxTokens = 2000,
  tools,
}: {
  systemPrompt?: string;
  userPrompt?: string;
  messages?: any[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}): Promise<DeepSeekResponse> {
  const res = await callAiGateway({
    systemPrompt,
    userPrompt,
    messages,
    jsonMode,
    temperature,
    maxTokens,
    tools,
  });

  if (!res.ok) {
    console.error(`[AI Agent Gateway] ${res.error}\nDenemeler:\n${(res.attempts || []).map((a) => `  ${a}`).join("\n")}`);
    return { ok: false, error: res.error };
  }

  return {
    ok: true,
    content: res.content,
    tool_calls: res.tool_calls,
    usage: res.usage,
    message: res.message,
  };
}
