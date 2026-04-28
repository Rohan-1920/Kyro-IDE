type ProviderMessage = { role: "system" | "user" | "assistant"; content: string };

function getProviderConfig() {
  return {
    provider: process.env.AI_PROVIDER ?? "mock",
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    apiKey: process.env.AI_API_KEY ?? "",
    baseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1/chat/completions"
  };
}

function mockReply(userMessage: string) {
  const text = userMessage.toLowerCase();
  if (text.includes("error") || text.includes("fix")) {
    return "Root cause likely undefined value ya wrong scope hai. Guard add karo, then variable initialization verify karo, aur failing line pe null-check lagao.";
  }
  if (text.includes("optimize")) {
    return "Optimization ke liye repeated computations cache karo, unnecessary re-renders avoid karo, aur expensive loops ko memoize karo.";
  }
  return "Samajh gaya. Main step-by-step explanation aur practical code suggestion dunga.";
}

export async function getAIResponse(messages: ProviderMessage[]): Promise<string> {
  const cfg = getProviderConfig();
  const latestUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (cfg.provider === "mock" || !cfg.apiKey) return mockReply(latestUser);

  const response = await fetch(cfg.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.2
    })
  });

  if (!response.ok) return mockReply(latestUser);
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || mockReply(latestUser);
}

export async function* streamAIResponse(messages: ProviderMessage[]): AsyncGenerator<string> {
  const full = await getAIResponse(messages);
  const words = full.split(/\s+/).filter(Boolean);
  for (const word of words) {
    yield `${word} `;
  }
}
