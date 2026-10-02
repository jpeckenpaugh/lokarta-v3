# Feature Specification: 06 — Procedural Web Audio Synthesizer

## 1. Overview & Purpose

The **Procedural Web Audio Synthesizer** provides zero-dependency, code-generated retro sound effects and audio feedback for *Lokarta: Come Into The Light*. It uses the standard HTML5 Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`) to synthesize sound effects dynamically without downloading external audio files or MP3 assets.

---

## 2. Mapped Codebase Modules

- [html/audio/audio-system.js](file:///Users/jarad/git/lokarta-v3/html/audio/audio-system.js) — `AudioSystem` singleton synthesizer.
- [html/data/sounds.json](file:///Users/jarad/git/lokarta-v3/html/data/sounds.json) — JSON sound catalog containing 19 procedural sound definitions (`footstep`, `wandSpark`, `lightSpell`, `energyBeam`, `bowShot`, `powerShot`, `hit`, `monsterAttack`, `monsterDeath`, `playerHurt`, `itemPickup`, `potionDrink`, `equip`, `unequip`, `stairs`, `levelUp`, `victory`, `defeat`, `click`).

---

## 3. Discrete Capabilities & Key Mechanics

### 3.1 Web Audio Context Initialization & User Unlock
- **Browser Autoplay Compliance:** Lazily instantiates `AudioContext` and resumes suspended audio states upon the first user interaction (click, keypress, touch gesture).
- **Master Gain & Mute Controls:** Manages global master gain (`0.35` default volume) and provides instant mute/unmute toggles with preference persistence in `localStorage`.

### 3.2 Procedural Sound Effect Categories
- **Movement & Exploration:** Low-frequency white noise bursts and sub-bass thumps simulating tower footsteps and opening doors.
- **Vocation Abilities & Spells:**
  - *Wand Spark:* Frequency-swept sine wave with high-pass sparkle.
  - *Energy Beam:* Sawtooth oscillator sweep with low-pass resonant filtering.
  - *Bow Shot & Power Shot:* Quick pitch drop square wave simulating string release and arrow flight.
  - *Holy Strike:* Dual-oscillator chime combining square and triangle harmonics.
  - *Healing Prayer:* Ascending pitch chord sweep with gentle gain envelope decay.
- **Combat Feedback:** Noise bursts and pitch drops for melee impacts, monster hits, and player damage feedback.
- **Progression & Items:**
  - *Level-Up Fanfare:* Arpeggiated multi-tone celebratory sequence.
  - *Item Pickup & Potion Drink:* High-register chime and bubble pitch modulation.

### 3.3 Zero-Asset Runtime Synthesis
- Generates all sound effects entirely in memory via oscillator nodes and envelope generators.
- Zero HTTP network requests for sound files, guaranteeing instant audio playback offline.

---

## 4. Inputs, Outputs & State Data

- **Inputs:** Trigger method calls (e.g., `soundFX.wandSpark()`), master volume level, mute state boolean.
- **Outputs:** Synthesized real-time audio waveforms routed to `AudioContext.destination` speakers.

---

## 5. Operational Constraints & Boundaries

- If browser Web Audio API is unavailable or disabled, audio calls fail silently without interrupting gameplay loop or throwing unhandled exceptions.
- Muted audio state suppresses oscillator creation to save system CPU cycles.
