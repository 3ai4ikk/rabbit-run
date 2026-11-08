// Run from any directory: node website/check.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('./', import.meta.url);
const context = { window: {} };
vm.runInNewContext(readFileSync(new URL('events.js', root), 'utf8'), context);
const events = context.window.RABBITRUN_EVENTS;
assert.ok(Array.isArray(events) && events.length > 0);
assert.equal(new Set(events.map(e => e.action)).size, events.length);
for (const field of ['twitchPoints', 'donationRub', 'tiktokCoins']) {
  assert.ok(events.every(e => Number.isSafeInteger(e[field]) && e[field] > 0), field);
  if (field !== 'twitchPoints') assert.equal(new Set(events.map(e => e[field])).size, events.length, field);
}
for (const e of events) {
  assert.ok(e.title && e.description && e.action);
  assert.ok(e.durationSeconds === null || Number.isSafeInteger(e.durationSeconds) && e.durationSeconds > 0);
  assert.ok(Number.isSafeInteger(e.twitchCooldownSeconds) && e.twitchCooldownSeconds >= 0);
}
// Compare public prices with the approved preset when run inside the mod project.
const preset = new URL('../config-presets/stream-events-2026-11-08/events-preview.json', root);
if (existsSync(preset)) {
  const source = JSON.parse(readFileSync(preset, 'utf8'));
  assert.equal(events.length, source.length);
  for (const e of events) {
    const expected = source.find(s => s.action === e.action);
    assert.ok(expected, e.action);
    for (const field of ['twitchPoints', 'donationRub', 'tiktokCoins', 'durationSeconds', 'twitchCooldownSeconds']) {
      assert.equal(e[field], expected[field], `${e.action}: ${field}`);
    }
  }
}
console.log(`OK: ${events.length} events, unique donation prices, valid durations and cooldowns.`);
