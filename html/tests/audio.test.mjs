import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AudioSystem } from '../audio.js';

test('AudioSystem & JSON Sound Catalog', async (t) => {
  await t.test('loads all 19 required sound definitions from sounds.json', () => {
    const soundsPath = resolve(process.cwd(), 'html/data/sounds.json');
    const soundsJson = JSON.parse(readFileSync(soundsPath, 'utf8'));

    const expectedKeys = [
      'footstep', 'wandSpark', 'lightSpell', 'energyBeam', 'bowShot', 'powerShot',
      'hit', 'monsterAttack', 'monsterDeath', 'playerHurt', 'itemPickup',
      'potionDrink', 'equip', 'unequip', 'stairs', 'levelUp', 'victory', 'defeat', 'click'
    ];

    assert.equal(Object.keys(soundsJson).length, 19);

    for (const key of expectedKeys) {
      assert.ok(soundsJson[key], `Missing sound definition for ${key}`);
      assert.ok(['sweep', 'sequence', 'composite'].includes(soundsJson[key].type), `Invalid sound type for ${key}: ${soundsJson[key].type}`);
    }
  });

  await t.test('initializes AudioSystem singleton and handles play calls gracefully', () => {
    const audio = AudioSystem.getInstance();
    assert.ok(audio instanceof AudioSystem);
    assert.equal(audio.enabled, true);

    // Uninitialized / headless environment play calls shouldn't crash
    audio.play('click');
    audio.play('hit');
    audio.play('non_existent_key');

    assert.equal(audio.getMuted(), false);
    audio.toggleMute();
    assert.equal(audio.getMuted(), true);
    audio.toggleMute();
    assert.equal(audio.getMuted(), false);
  });
});
