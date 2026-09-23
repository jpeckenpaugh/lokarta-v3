# Feature Brief: 06 — Procedural Web Audio Synthesizer

## 1. Purpose

The **Procedural Web Audio Synthesizer** provides code-generated, zero-asset retro sound effects and dynamic audio feedback for *Lokarta: Come Into The Light*. Operating entirely via the browser standard HTML5 Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`), it synthesizes all sound effects programmatically at runtime without requiring MP3/WAV file downloads or remote network requests.

---

## 2. Implemented Behavior

### 2.1 Web Audio Context Lifecycle & User Unlock
- **Autoplay Compliance:** `AudioSystem.init()` instantiates `AudioContext` lazily and resumes suspended states upon the first user interaction event (pointer click, keypress, touch).
- **Master Volume & Mute Persistence:** Master gain is set to `0.35` by default. Mute state toggles via `toggleMute()` / `setMuted(boolean)` and persists in `localStorage` under key `'lokarta_audio_muted'`. When muted, master gain ramps to `0`.

### 2.2 Procedural Sound Synthesis Catalogue
- **Movement:** `playFootstep()` generates a low-pass filtered (400 Hz) triangle wave pitch drop ($90\text{ Hz} \rightarrow 30\text{ Hz}$) over 0.05s.
- **Spells & Abilities:**
  - *Wand Spark:* Frequency-swept sine wave with high-pass sparkle.
  - *Light Spell:* Ascending chime sequence.
  - *Energy Beam:* Sawtooth oscillator sweep with resonant low-pass filter sweep.
  - *Bow Shot & Power Shot:* Fast pitch drop square wave simulating string snap and arrow release.
  - *Holy Strike:* Dual-oscillator chime combining square and triangle harmonics.
  - *Healing Prayer:* Sweeping ascending chord with gentle gain decay envelope.
- **Combat Feedback:**
  - *Monster Hit:* Low-frequency noise burst and punchy sub-bass thump.
  - *Player Damage:* Discordant saw wave pitch drop.
- **Progression & Items:**
  - *Level-Up Fanfare:* Arpeggiated multi-tone fanfare sequence.
  - *Item Pickup & Potion Drink:* High-register chime and bubble pitch modulation.

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

1. **Lazy Initialization:** `AudioSystem.getInstance()` initializes singleton with `isMuted` loaded from `localStorage` (Verified in [html/audio.js](file:///Users/jarad/git/lokarta-v3/html/audio.js#L14-L31)).
2. **Master Gain Setting (0.35):** Active un-muted audio initializes `masterGain.gain.value = 0.35` (Verified in [html/audio.js](file:///Users/jarad/git/lokarta-v3/html/audio.js#L49)).
3. **Mute State Toggle:** `toggleMute()` updates `isMuted`, mutates `masterGain` value to `0`, and updates `localStorage` (Verified in [html/audio.js](file:///Users/jarad/git/lokarta-v3/html/audio.js#L67-L101)).
4. **Zero-Asset Playback:** Invoking sound methods (`playFootstep`, `playWandSpark`, `playLevelUp`) constructs oscillator nodes in memory without generating network HTTP GET requests for audio files.
