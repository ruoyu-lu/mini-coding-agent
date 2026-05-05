import { generateText } from 'ai';
import { createSingleTurnMessages } from './prompt.js';
import { getLanguageModel } from '../provider/provider.js';
import { getProviderOptions } from '../provider/transform.js';

export async function generateAgentResponse(userInput: string) {
  const { model, providerName, modelName } = getLanguageModel();

  const result = await generateText({
    model,
    messages: createSingleTurnMessages(userInput),
    providerOptions: getProviderOptions(providerName, modelName),
  });

  return result.text;
}
