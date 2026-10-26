import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    aiProvider: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

import { callAiGateway } from "./ai-gateway";

const okResponse = (content = "merhaba") => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { role: "assistant", content } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }),
  text: async () => "",
});

const statusResponse = (status: number, body = "err") => ({
  ok: false,
  status,
  json: async () => ({}),
  text: async () => body,
});

describe("callAiGateway", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("geçici 503 hatalarında retry yapıp başarılı yanıtı döndürür", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "p1",
        name: "Gemini",
        slug: "gemini",
        model: "gemini-3.8-flash",
        apiKeys: ["key-a"],
        enabled: true,
        isDefault: true,
      },
    ]);
    const fetchMock = vi.fn().mockResolvedValueOnce(statusResponse(503, "high demand")).mockResolvedValueOnce(okResponse("tamam"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await callAiGateway({ systemPrompt: "s", userPrompt: "u", triesPerModel: 3 });

    expect(res.ok).toBe(true);
    expect(res.content).toBe("tamam");
    expect(res.model).toBe("gemini-3.8-flash");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sağlayıcı tükenirse sıradaki sağlayıcıya fallback yapar", async () => {
    findManyMock.mockResolvedValue([
      { id: "p1", name: "Gemini", slug: "gemini", model: "gemini-3.8-flash", apiKeys: ["key-a"], enabled: true, isDefault: true },
      { id: "p2", name: "DeepSeek", slug: "deepseek", model: "deepseek-flash", apiKeys: ["key-b"], enabled: true, isDefault: false },
    ]);
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes("deepseek")) return Promise.resolve(okResponse("deepseek yanıtı"));
      return Promise.resolve(statusResponse(503));
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await callAiGateway({ systemPrompt: "s", userPrompt: "u", triesPerModel: 1, maxNetworkCalls: 12 });

    expect(res.ok).toBe(true);
    expect(res.provider).toBe("DeepSeek");
    expect(res.content).toBe("deepseek yanıtı");
  });

  it("kullanımdan kalkmış model kaydını hiç çağrı yapmadan atlar", async () => {
    findManyMock.mockResolvedValue([
      { id: "p1", name: "Gemini", slug: "gemini", model: "gemini-2.0-flash", apiKeys: ["key-a"], enabled: true, isDefault: true },
    ]);
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const res = await callAiGateway({ systemPrompt: "s", userPrompt: "u", triesPerModel: 2 });

    expect(res.ok).toBe(true);
    expect(res.model).toBe("gemini-3.8-flash");
    // İlk çağrı emekli model için değil, fallback model için yapılmış olmalı
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as { body: string };
    expect(JSON.parse(init.body).model).toBe("gemini-3.8-flash");
  });

  it("hiç sağlayıcı yoksa hatayla döner", async () => {
    findManyMock.mockResolvedValue([]);

    const res = await callAiGateway({ systemPrompt: "s", userPrompt: "u" });

    expect(res.ok).toBe(false);
    expect(res.error).toContain("sağlayıcı");
  });
});
