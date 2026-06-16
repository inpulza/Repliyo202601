import type { AiAgent } from "@shared/schema";
import type { LLMProvider, AgentSecrets } from "./types";
import { LLMError } from "./types";
import { OpenAIAdapter } from "./openai-adapter";
import { GeminiAdapter } from "./gemini-adapter";
import { getFallbackModels } from "./model-discovery";

export function createLLMProvider(
  agent: AiAgent,
  secrets: AgentSecrets
): LLMProvider {
  const provider = agent.provider || "openai";
  
  // Resolve API key: per-brand setting (from platformSettings) → global secret
  const platformSettings = (agent.platformSettings as Record<string, unknown>) || {};

  switch (provider) {
    case "openai": {
      const apiKey = 
        (platformSettings.openaiApiKey as string) ||
        secrets.openaiApiKey ||
        process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new LLMError(
          "No se encontró API key de OpenAI. Configure la clave en la configuración del agente o en las variables de entorno.",
          "AUTH_ERROR",
          "openai"
        );
      }
      
      return new OpenAIAdapter(apiKey);
    }
    
    case "gemini": {
      const apiKey = 
        (platformSettings.geminiApiKey as string) ||
        secrets.geminiApiKey ||
        process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new LLMError(
          "No se encontró API key de Gemini. Configure la clave en la configuración del agente o en las variables de entorno.",
          "AUTH_ERROR",
          "gemini"
        );
      }
      
      return new GeminiAdapter(apiKey);
    }
    
    default:
      throw new LLMError(
        `Proveedor de LLM no soportado: ${provider}`,
        "MODEL_UNSUPPORTED",
        "openai"
      );
  }
}

export function getAvailableModels(provider: "openai" | "gemini"): string[] {
  return getFallbackModels(provider).map((m) => m.value);
}

export function getDefaultModel(provider: "openai" | "gemini"): string {
  return provider === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash";
}
