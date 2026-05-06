import { generateText, stepCountIs } from 'ai';
import { agentSystemPrompt, createSingleTurnMessages } from './prompt.js';
import { agentTools } from './tools/index.js';
import { getLanguageModel } from '../provider/provider.js';
import { getProviderOptions } from '../provider/transform.js';

export async function generateAgentResponse(userInput: string) {
  const { model, providerName, modelName } = getLanguageModel();

  const result = await generateText({
    model,
    system: agentSystemPrompt,
    messages: createSingleTurnMessages(userInput),
    tools: agentTools,
    stopWhen: stepCountIs(3),
    providerOptions: getProviderOptions(providerName, modelName),
  });

  return result.text;
}
