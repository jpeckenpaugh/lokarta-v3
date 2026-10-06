# Feature Brief: 06 — Procedural Web Audio Synthesizer

## 1. Purpose

The **Procedural Web Audio Synthesizer** provides code-generated, zero-asset retro sound effects and dynamic audio feedback for *Lokarta: Come Into The Light*. Operating entirely via the browser standard HTML5 Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`), it synthesizes all sound effects programmatically at runtime without requiring MP3/WAV file downloads or remote network requests.

---

## 2. Implemented Behavior

### 2.1 Web Audio Context Lifecycle & User Unlock
- **Autoplay Compliance:** `AudioSystem.init()` instantiates `AudioContext` lazily and resumes suspended states upon the first user interaction event (pointer click, keypress, touch).
- **Master Volume & Mute Persistence:** Master gain is set to `0.35` by default. Mute state toggles via `toggleMute()` / `setMuted(boolean)` and persists in `localStorage` under key `'lokarta_audio_muted'`. When muted, master gain ramps to `0`.

### 2.2 Procedural Sound Synthesis Catalogue
- **19 JSON Sound Definitions (`html/data/sounds.json`):** Driven dynamically by parameter sets specifying oscillator shapes (`sine`, `square`, `sawtooth`, `triangle`, `noise`), frequency sweeps, envelope decays, and filter cutoff parameters.
- **Sound Events:** `footstep`, `wandSpark`, `lightSpell`, `energyBeam`, `bowShot`, `powerShot`, `hit`, `monsterAttack`, `monsterDeath`, `playerHurt`, `itemPickup`, `potionDrink`, `equip`, `unequip`, `stairs`, `levelUp`, `victory`, `defeat`, `click`.

### 2.3 Zero-Asset Runtime Architecture
- Creates node graphs programmatically: `OscillatorNode` $\rightarrow$ `BiquadFilterNode` $\rightarrow$ `GainNode` $\rightarrow$ `masterGain` $\rightarrow$ `AudioContext.destination`.
- Automatic node garbage collection by invoking `osc.stop(now + duration)`.

---

## 3. Inputs & Outputs

- **Inputs:** Method invocation calls (`audioSystem.playFootstep()`, `audioSystem.playWandSpark()`, `audioSystem.toggleMute()`).
- **Outputs:**
  - Real-time synthesized analog audio waveforms delivered to hardware speakers.
  - `localStorage` key `'lokarta_audio_muted'`: string (`'true'` | `'false'`).

---

## 4. User-Visible Experience

- **Sound Feedback:** Every movement tick, arrow shot, spell cast, potion drink, and monster strike produces crisp retro 8-bit sound feedback.
- **Mute Control:** UI header sound toggle button switches icon states and immediately silences or enables audio.

---

## 5. Constraints

- AudioContext initialization must be bound to a user gesture event to satisfy browser autoplay security policies.
- Audio calls execute non-blockingly and fail gracefully if Web Audio API is unavailable or disabled.

---

## 6. Acceptance Criteria

1. **Lazy Initialization:** `AudioSystem.getInstance()` initializes singleton with `isMuted` loaded from `localStorage` (in `html/audio/audio-system.js`).
2. **Master Gain Setting (0.35):** Active un-muted audio initializes `masterGain.gain.value = 0.35` (in `html/audio/audio-system.js`).
3. **Mute State Toggle:** `toggleMute()` updates `isMuted`, mutates `masterGain` value to `0`, and updates `localStorage` (in `html/audio/audio-system.js`).
4. **Zero-Asset Playback:** Invoking sound methods (`playFootstep`, `playWandSpark`, `playLevelUp`) constructs oscillator nodes in memory without generating network HTTP GET requests for audio files.
