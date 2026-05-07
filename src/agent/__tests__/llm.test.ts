import assert from 'node:assert/strict';
import type { ModelMessage } from 'ai';
import test from 'node:test';
import { agentSystemPrompt } from '../prompt.js';
import { generateAgentResponse, streamAgentResponse } from '../llm.js';

function createTextStream(chunks: string[]) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

test('streamAgentResponse streams text deltas and returns accumulated text', async () => {
  const textDeltas: string[] = [];
  let streamTextOptions: Record<string, unknown> | undefined;
  const messages: ModelMessage[] = [{ role: 'user', content: 'custom' }];

  const response = await streamAgentResponse(
    'ignored',
    {
      messages,
      onTextDelta(text) {
        textDeltas.push(text);
      },
    },
    {
      getLanguageModel: () => ({
        providerName: 'testProvider',
        modelName: 'test-model',
        model: { id: 'model' } as never,
      }),
      getProviderOptions: (providerName, modelName) => ({
        [providerName]: { modelName },
      }),
      streamText: ((options: Record<string, unknown>) => {
        streamTextOptions = options;
        return { textStream: createTextStream(['hello', ' ', 'world']) };
      }) as never,
    },
  );

  assert.equal(response, 'hello world');
  assert.deepEqual(textDeltas, ['hello', ' ', 'world']);
  assert.equal(streamTextOptions?.system, agentSystemPrompt);
  assert.equal(streamTextOptions?.messages, messages);
  assert.deepEqual(streamTextOptions?.providerOptions, { testProvider: { modelName: 'test-model' } });
});

test('streamAgentResponse creates single-turn messages when none are supplied', async () => {
  let streamTextOptions: Record<string, unknown> | undefined;

  await streamAgentResponse(
    'hello',
    { onTextDelta() {} },
    {
      getLanguageModel: () => ({
        providerName: 'testProvider',
        modelName: 'test-model',
        model: {} as never,
      }),
      getProviderOptions: () => ({}),
      streamText: ((options: Record<string, unknown>) => {
        streamTextOptions = options;
        return { textStream: createTextStream([]) };
      }) as never,
    },
  );

  assert.deepEqual(streamTextOptions?.messages, [{ role: 'user', content: 'hello' }]);
});

test('streamAgentResponse forwards stream errors to the caller callback', async () => {
  const errors: unknown[] = [];

  await streamAgentResponse(
    'hello',
    {
      onTextDelta() {},
      onError(error) {
        errors.push(error);
      },
    },
    {
      getLanguageModel: () => ({
        providerName: 'testProvider',
        modelName: 'test-model',
        model: {} as never,
      }),
      getProviderOptions: () => ({}),
      streamText: ((options: { onError?: (event: { error: unknown }) => void }) => {
        options.onError?.({ error: new Error('stream failed') });
        return { textStream: createTextStream([]) };
      }) as never,
    },
  );

  assert.equal(errors.length, 1);
  assert.equal(errors[0] instanceof Error, true);
  assert.match((errors[0] as Error).message, /stream failed/);
});

test('generateAgentResponse returns accumulated text without requiring a delta callback', async () => {
  const response = await generateAgentResponse('hello', {
    getLanguageModel: () => ({
      providerName: 'testProvider',
      modelName: 'test-model',
      model: {} as never,
    }),
    getProviderOptions: () => ({}),
    streamText: (() => ({ textStream: createTextStream(['ok']) })) as never,
  });

  assert.equal(response, 'ok');
});
