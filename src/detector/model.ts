export interface ModelDetection {
  model: string | null;
  confidence: number;
  source: string;
}

const ENV_MODEL_MAP: Record<string, string> = {
  'ANTHROPIC_API_KEY': 'claude',
  'OPENAI_API_KEY': 'gpt',
  'GOOGLE_API_KEY': 'gemini',
  'COHERE_API_KEY': 'cohere',
  'MISTRAL_API_KEY': 'mistral',
  'TOGETHER_API_KEY': 'together',
  'REPLICATE_API_TOKEN': 'replicate',
};

const GIT_TRAILER_MAP: Record<string, string> = {
  'claude': 'claude',
  'anthropic': 'claude',
  'gpt': 'gpt',
  'openai': 'gpt',
  'copilot': 'copilot',
  'gemini': 'gemini',
  'cursor': 'cursor',
};

export function detectModel(env?: Record<string, string | undefined>, commitMsg?: string): ModelDetection {
  const e = env ?? process.env;

  // Check git commit message trailers first (highest confidence)
  if (commitMsg) {
    const lower = commitMsg.toLowerCase();
    for (const [key, model] of Object.entries(GIT_TRAILER_MAP)) {
      if (lower.includes(`ai-model: ${key}`) || lower.includes(`generated-by: ${key}`)) {
        return { model, confidence: 1.0, source: 'commit-trailer' };
      }
    }
    // Check for common AI tool signatures
    for (const [key, model] of Object.entries(GIT_TRAILER_MAP)) {
      if (lower.includes(key)) {
        return { model, confidence: 0.6, source: 'commit-message' };
      }
    }
  }

  // Check environment variables
  for (const [envVar, model] of Object.entries(ENV_MODEL_MAP)) {
    if (e[envVar]) {
      return { model, confidence: 0.8, source: 'env' };
    }
  }

  return { model: null, confidence: 0, source: 'none' };
}
