import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('分区标题不再用横向实心遮罩挡住游戏画面', () => {
  const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fillRect\(24,\s*332,\s*1232,\s*30\)/);
  assert.match(source, /function drawPlayfieldChrome\(\)/);
});
