import { config } from "../config";
import { MockProvider } from "./mock";
import type { ModelProvider } from "./types";

let provider: ModelProvider | undefined;

export function getProvider(): ModelProvider {
  if (provider) return provider;
  switch (config.modelProvider) {
    case "mock":
      provider = new MockProvider(config.mockDelayScale);
      break;
    default:
      throw new Error(`Unknown MODEL_PROVIDER "${config.modelProvider}". Phase 1 supports "mock" only.`);
  }
  return provider;
}

/** Tests swap in their own provider. */
export function setProvider(p: ModelProvider) {
  provider = p;
}
