import assert from 'node:assert/strict';
import type { ModelMessage } from 'ai';
import test from 'node:test';
import { generateAgentResponse, streamAgentResponse } from '../llm.js';

function createFullStream(chunks: string[]) {
  return (async function* () {
    for (const chunk of chunks) {
      yield {
        type: 'text-delta',
        text: chunk,
      };
    }
  })();
}

test('streamAgentResponse streams text deltas and returns accumulated text', async () => {
  const textDeltas: string[] = [];
  let callModelMessages: ModelMessage[] | undefined;
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
      callModel({ messages: modelMessages }) {
        callModelMessages = modelMessages;
        return { fullStream: createFullStream(['hello', ' ', 'world']) };
      },
    },
  );

  assert.equal(response, 'hello world');
  assert.deepEqual(textDeltas, ['hello', ' ', 'world']);
  assert.equal(callModelMessages, messages);
});

test('streamAgentResponse creates single-turn messages when none are supplied', async () => {
  let callModelMessages: ModelMessage[] | undefined;

  await streamAgentResponse(
    'hello',
    { onTextDelta() {} },
    {
      callModel({ messages }) {
        callModelMessages = messages;
        return { fullStream: createFullStream([]) };
      },
    },
  );

  assert.deepEqual(callModelMessages, [{ role: 'user', content: 'hello' }]);
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
      callModel({ onError }) {
        onError?.(new Error('stream failed'));
        return { fullStream: createFullStream([]) };
      },
    },
  );

  assert.equal(errors.length, 1);
  assert.equal(errors[0] instanceof Error, true);
  assert.match((errors[0] as Error).message, /stream failed/);
});

test('generateAgentResponse returns accumulated text without requiring a delta callback', async () => {
  const response = await generateAgentResponse('hello', {
    callModel: () => ({ fullStream: createFullStream(['ok']) }),
  });

  assert.equal(response, 'ok');
});
