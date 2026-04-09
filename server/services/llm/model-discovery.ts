interface ModelInfo {
  value: string;
  label: string;
  tier: 'premium' | 'standard' | 'economy';
}

interface CacheEntry {
  models: ModelInfo[];
  timestamp: number;
}

const CACHE_TTL = 60 * 60 * 1000;
const cache: Record<string, CacheEntry> = {};

const OPENAI_FALLBACK: ModelInfo[] = [
  { value: 'gpt-5.1', label: 'GPT-5.1', tier: 'premium' },
  { value: 'gpt-5', label: 'GPT-5', tier: 'premium' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini', tier: 'standard' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano', tier: 'economy' },
  { value: 'gpt-4.1', label: 'GPT-4.1', tier: 'standard' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', tier: 'economy' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', tier: 'economy' },
  { value: 'gpt-4o', label: 'GPT-4o', tier: 'standard' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'economy' },
  { value: 'o4-mini', label: 'O4 Mini', tier: 'standard' },
  { value: 'o3', label: 'O3', tier: 'premium' },
  { value: 'o3-mini', label: 'O3 Mini', tier: 'standard' },
];

const GEMINI_FALLBACK: ModelInfo[] = [
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', tier: 'premium' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'standard' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'economy' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'economy' },
];

export function getFallbackModels(provider: string): ModelInfo[] {
  return provider === 'openai' ? OPENAI_FALLBACK : GEMINI_FALLBACK;
}

const OPENAI_CHAT_PREFIXES = ['gpt-', 'o1', 'o3', 'o4', 'chatgpt-'];
const OPENAI_EXCLUDE_CONTAINS = [
  'embedding', 'tts', 'whisper', 'dall-e', 'moderation', 'davinci', 'babbage', 'curie',
  'image', 'vision', 'realtime', 'audio', 'search', 'transcribe',
];

function isOpenAIChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (!OPENAI_CHAT_PREFIXES.some(p => lower.startsWith(p))) return false;
  if (OPENAI_EXCLUDE_CONTAINS.some(c => lower.includes(c))) return false;
  return true;
}

function isGeminiChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (!lower.includes('gemini')) return false;
  if (lower.includes('embedding') || lower.includes('aqa') || lower.includes('imagen')) return false;
  return true;
}

function formatModelLabel(id: string): string {
  let label = id;
  label = label.replace(/^models\//, '');

  if (label.startsWith('chatgpt-')) {
    label = label.replace('chatgpt-', 'ChatGPT-');
  } else if (label.startsWith('gpt-')) {
    label = 'GPT-' + label.slice(4);
  } else if (label.startsWith('o1')) {
    label = 'O1' + label.slice(2);
  } else if (label.startsWith('o3')) {
    label = 'O3' + label.slice(2);
  } else if (label.startsWith('o4')) {
    label = 'O4' + label.slice(2);
  } else if (label.startsWith('gemini-')) {
    label = 'Gemini ' + label.slice(7);
  }

  label = label
    .split('-')
    .map(part => {
      if (/^\d/.test(part)) return part;
      if (part.toLowerCase() === 'mini') return 'Mini';
      if (part.toLowerCase() === 'nano') return 'Nano';
      if (part.toLowerCase() === 'pro') return 'Pro';
      if (part.toLowerCase() === 'flash') return 'Flash';
      if (part.toLowerCase() === 'lite') return 'Lite';
      if (part.toLowerCase() === 'turbo') return 'Turbo';
      if (part.toLowerCase() === 'preview') return 'Preview';
      if (part.toLowerCase() === 'latest') return 'Latest';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');

  label = label.replace(/\s+/g, ' ').trim();
  return label;
}

function classifyTier(id: string): 'premium' | 'standard' | 'economy' {
  const lower = id.toLowerCase();
  if (lower.includes('nano') || lower.includes('lite') || lower.includes('flash') || lower.includes('4o-mini') || lower.includes('4.1-mini') || lower.includes('3.5')) {
    return 'economy';
  }
  if (lower.includes('5.1') || lower.includes('5.2') || lower.match(/^o[1-9](?!.*mini)/) || lower.includes('pro') || lower.includes('3-pro')) {
    return 'premium';
  }
  return 'standard';
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API returned ${response.status}`);
  }

  const data = await response.json() as { data: Array<{ id: string }> };
  const chatModels = data.data
    .filter(m => isOpenAIChatModel(m.id))
    .map(m => ({
      value: m.id,
      label: formatModelLabel(m.id),
      tier: classifyTier(m.id),
    }))
    .sort((a, b) => {
      const tierOrder = { premium: 0, standard: 1, economy: 2 };
      return tierOrder[a.tier] - tierOrder[b.tier] || a.label.localeCompare(b.label);
    });

  return chatModels;
}

async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned ${response.status}`);
  }

  const data = await response.json() as { models: Array<{ name: string; supportedGenerationMethods?: string[] }> };
  const chatModels = data.models
    .filter(m => {
      const id = m.name.replace('models/', '');
      if (!isGeminiChatModel(id)) return false;
      if (m.supportedGenerationMethods && !m.supportedGenerationMethods.includes('generateContent')) return false;
      return true;
    })
    .map(m => {
      const id = m.name.replace('models/', '');
      return {
        value: id,
        label: formatModelLabel(id),
        tier: classifyTier(id),
      };
    })
    .sort((a, b) => {
      const tierOrder = { premium: 0, standard: 1, economy: 2 };
      return tierOrder[a.tier] - tierOrder[b.tier] || a.label.localeCompare(b.label);
    });

  return chatModels;
}

export async function getModelsForProvider(
  provider: string,
  forceRefresh: boolean = false,
): Promise<ModelInfo[]> {
  const cacheKey = provider;

  if (!forceRefresh && cache[cacheKey]) {
    const entry = cache[cacheKey];
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.models;
    }
  }

  try {
    let models: ModelInfo[];

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('[ModelDiscovery] No OPENAI_API_KEY set, using fallback models');
        return getFallbackModels(provider);
      }
      models = await fetchOpenAIModels(apiKey);
    } else if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('[ModelDiscovery] No GEMINI_API_KEY set, using fallback models');
        return getFallbackModels(provider);
      }
      models = await fetchGeminiModels(apiKey);
    } else {
      return [];
    }

    if (models.length === 0) {
      console.warn(`[ModelDiscovery] No models found for ${provider}, using fallback`);
      return getFallbackModels(provider);
    }

    cache[cacheKey] = { models, timestamp: Date.now() };
    return models;
  } catch (error) {
    console.error(`[ModelDiscovery] Error fetching models for ${provider}:`, error);
    if (cache[cacheKey]) {
      return cache[cacheKey].models;
    }
    return getFallbackModels(provider);
  }
}
