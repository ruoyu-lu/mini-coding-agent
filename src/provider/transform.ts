type ProviderOptionValue =
  | string
  | number
  | boolean
  | null
  | ProviderOptionValue[]
  | { [key: string]: ProviderOptionValue };

type ProviderOptions = Record<string, Record<string, ProviderOptionValue>>;

export function getProviderOptions(providerName: string, modelName: string): ProviderOptions {
  const options: Record<string, ProviderOptionValue> = {};

  if (modelName.startsWith('deepseek-')) {
    options.reasoningEffort = 'high';
    options.thinking = { type: 'enabled' };
  }

  return {
    [providerName]: options,
  };
}
