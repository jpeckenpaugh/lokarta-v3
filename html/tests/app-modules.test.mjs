import test from 'node:test';
import assert from 'node:assert/strict';

import { SpriteRenderer } from '../app/sprite-renderer.js';
import { CanvasRenderer } from '../app/canvas-renderer.js';
import { HUDManager } from '../app/hud-manager.js';
import { ModalManager } from '../app/modal-manager.js';
import { InputController } from '../app/input-controller.js';
import { LokartaApp } from '../app/app-controller.js';
import * as AppExports from '../app/index.js';
import * as RootAppExports from '../app.js';

test('App Submodules & Root Re-exports', async (t) => {
  await t.test('verifies SpriteRenderer exports and helper methods', () => {
    assert.equal(typeof SpriteRenderer.drawTile, 'function');
    assert.equal(typeof SpriteRenderer.drawPlayer, 'function');
    assert.equal(typeof SpriteRenderer.drawMonster, 'function');
    assert.equal(typeof SpriteRenderer.drawItem, 'function');
  });

  await t.test('verifies CanvasRenderer constructor and coordinate conversion', () => {
    const cr = new CanvasRenderer(null);
    assert.equal(cr.cameraX, 0);
    assert.equal(cr.cameraY, 0);
    const grid = cr.screenToGrid(32, 64);
    assert.equal(typeof grid.x, 'number');
    assert.equal(typeof grid.y, 'number');
  });

  await t.test('verifies HUDManager helper functions', () => {
    assert.equal(HUDManager.renderItemIcon({ item_id: 'health_potion', name: 'Health Potion' }), '<img class="openmoji-icon" src="./assets/openmoji/1F9EA.svg" alt="Health Potion" />');
    assert.equal(HUDManager.escapeHtml('<test>'), '&lt;test&gt;');
  });

  await t.test('verifies ModalManager static methods', () => {
    assert.equal(typeof ModalManager.showTitleScreen, 'function');
    assert.equal(typeof ModalManager.showCharacterSelectModal, 'function');
    assert.equal(typeof ModalManager.showFateGrantModal, 'function');
  });

  await t.test('verifies InputController class', () => {
    assert.equal(typeof InputController.prototype.bindInputs, 'function');
  });

  await t.test('verifies LokartaApp class and barrel exports', () => {
    assert.equal(typeof LokartaApp, 'function');
    assert.equal(AppExports.LokartaApp, LokartaApp);
    assert.equal(RootAppExports.LokartaApp, LokartaApp);
  });
});
