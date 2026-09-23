/**
 * Lokarta: Data Catalog Barrel & Loader
 */

import cardsData from './cards.json' with { type: 'json' };
import monstersData from './monsters.json' with { type: 'json' };
import itemsData from './items.json' with { type: 'json' };
import vocationsData from './vocations.json' with { type: 'json' };
import soundsData from './sounds.json' with { type: 'json' };
import abilitiesData from './abilities.json' with { type: 'json' };
import biomesData from './biomes.json' with { type: 'json' };
import encountersData from './encounters.json' with { type: 'json' };
import dungeonsData from './dungeons.json' with { type: 'json' };
import tileThemesData from './tile_themes.json' with { type: 'json' };

export const CARDS_CATALOG = cardsData;
export const MONSTERS_CATALOG = monstersData;
export const ITEMS_CATALOG = itemsData;
export const VOCATIONS_CATALOG = vocationsData;
export const SOUNDS_CATALOG = soundsData;
export const ABILITIES_CATALOG = abilitiesData;
export const BIOMES_CATALOG = biomesData;
export const ENCOUNTERS_CATALOG = encountersData;
export const DUNGEONS_CATALOG = dungeonsData;
export const TILE_THEMES_CATALOG = tileThemesData;

