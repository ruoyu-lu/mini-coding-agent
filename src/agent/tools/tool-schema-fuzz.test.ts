import assert from 'node:assert/strict';
import test from 'node:test';
import { createRandomString, createSeededRandom } from '../../test/helpers.js';
import { miniTools } from './index.js';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function createRandomJsonValue(random: () => number, depth = 0): JsonValue {
  const choices = depth > 2 ? 4 : 6;
  const choice = Math.floor(random() * choices);

  if (choice === 0) return null;
  if (choice === 1) return random() > 0.5;
  if (choice === 2) return Math.floor(random() * 2200) - 1100;
  if (choice === 3) return random() * 20 - 10;
  if (choice === 4) return createRandomString(random, 'abcdefghijklmnopqrstuvwxyz0123456789-_/.*? ', 24);

  if (choice === 5 && random() > 0.5) {
    return Array.from({ length: Math.floor(random() * 4) }, () => createRandomJsonValue(random, depth + 1));
  }

  const object: Record<string, JsonValue> = {};
  const keys = ['path', 'pattern', 'include', 'startLine', 'endLine', 'maxResults', 'caseSensitive', 'useRegex'];
  const count = Math.floor(random() * keys.length);

  for (let index = 0; index < count; index += 1) {
    object[keys[Math.floor(random() * keys.length)]] = createRandomJsonValue(random, depth + 1);
  }

  return object;
}

test('tool input schema fuzz: arbitrary JSON-like values do not throw during validation', () => {
  const random = createSeededRandom(0x7001);

  for (const tool of miniTools) {
    for (let index = 0; index < 300; index += 1) {
      const value = createRandomJsonValue(random);

      assert.doesNotThrow(
        () => tool.inputSchema.safeParse(value),
        `${tool.id} schema threw for ${JSON.stringify(value)}`,
      );
    }
  }
});

test('tool input schema property: successful parsed values satisfy documented bounds', () => {
  const random = createSeededRandom(0x7002);

  for (const tool of miniTools) {
    for (let index = 0; index < 300; index += 1) {
      const result = tool.inputSchema.safeParse(createRandomJsonValue(random));
      if (!result.success) continue;

      const data = result.data as Record<string, unknown>;

      if (tool.id === 'read') {
        assert.equal(typeof data.path, 'string');
        assert.equal(data.startLine === undefined || Number.isInteger(data.startLine), true);
        assert.equal(data.endLine === undefined || Number.isInteger(data.endLine), true);
        assert.equal(data.startLine === undefined || (typeof data.startLine === 'number' && data.startLine > 0), true);
        assert.equal(data.endLine === undefined || (typeof data.endLine === 'number' && data.endLine > 0), true);
      }

      if (tool.id === 'glob') {
        assert.equal(typeof data.pattern, 'string');
        assert.equal(typeof data.pattern === 'string' && data.pattern.length > 0, true);
        assert.equal(data.maxResults === undefined || Number.isInteger(data.maxResults), true);
        assert.equal(data.maxResults === undefined || (typeof data.maxResults === 'number' && data.maxResults > 0), true);
        assert.equal(data.maxResults === undefined || (typeof data.maxResults === 'number' && data.maxResults <= 1000), true);
      }

      if (tool.id === 'grep') {
        assert.equal(typeof data.pattern, 'string');
        assert.equal(typeof data.pattern === 'string' && data.pattern.length > 0, true);
        assert.equal(data.include === undefined || (typeof data.include === 'string' && data.include.length > 0), true);
        assert.equal(data.maxResults === undefined || Number.isInteger(data.maxResults), true);
        assert.equal(data.maxResults === undefined || (typeof data.maxResults === 'number' && data.maxResults > 0), true);
        assert.equal(data.maxResults === undefined || (typeof data.maxResults === 'number' && data.maxResults <= 1000), true);
      }
    }
  }
});
