/**
 * Lokarta: Come Into The Light - Input Controller Subsystem
 */

import { GestureEngine } from '../engine.js';
import { soundFX } from '../audio.js';

export class InputController {
  constructor(app) {
    this.app = app;
  }

  bindInputs() {
    window.addEventListener('keydown', e => {
      this.app.keysDown.add(e.code);

      const slotIdx = GestureEngine.keyToSlotIndex(e.key);
      if (slotIdx !== null) {
        e.preventDefault();
        this.app.gestureEngine.handleInputDown(slotIdx);
      }
    });

    window.addEventListener('keyup', e => {
      this.app.keysDown.delete(e.code);

      const slotIdx = GestureEngine.keyToSlotIndex(e.key);
      if (slotIdx !== null) {
        e.preventDefault();
        this.app.gestureEngine.handleInputUp(slotIdx);
      }
    });

    // Canvas click: targeting or looting
    if (this.app.canvas) {
      this.app.canvas.addEventListener('click', e => {
        soundFX.init();
        const rect = this.app.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const gridPos = this.app.renderer.screenToGrid(clickX, clickY);

        const clickedMonster = this.app.monsters.find(
          m => m.x === gridPos.x && m.y === gridPos.y && m.visible && m.hp > 0
        );
        if (clickedMonster) {
          this.app.selectedMonsterId = clickedMonster.id;
          this.app.logCombat(`Targeted ${clickedMonster.name} (${clickedMonster.hp}/${clickedMonster.max_hp} HP).`, 'system');
        } else {
          const clickedItems = this.app.gridMap.getItems(gridPos.x, gridPos.y);
          if (clickedItems.length > 0) {
            const topItem = clickedItems[clickedItems.length - 1];
            this.app.logCombat(`Ground inspection: ${topItem.name} (${topItem.type}) on tile (${gridPos.x}, ${gridPos.y}).`, 'system');
          } else {
            this.app.selectedMonsterId = null;
          }
        }
      });
    }

    // Touch D-Pad buttons
    const touchBtns = document.querySelectorAll('.touch-btn');
    touchBtns.forEach(btn => {
      const key = btn.getAttribute('data-key');
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        soundFX.init();
        this.app.keysDown.add(key);
      });
      btn.addEventListener('touchend', e => {
        e.preventDefault();
        this.app.keysDown.delete(key);
      });
    });
  }
}
