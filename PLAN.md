# Project plan: Music Theory Learner

> A web app that helps people who **can already play** guitar or piano learn music theory hands-on — to understand how songs are put together and to **improvise** on their own.

---

## 1. Goals

### Who is it for?
- People who play guitar or piano at a beginner–intermediate level: they know the common chord shapes, can play a few songs, and can find notes / keys without much trouble.
- They don't understand (or only partly understand) *why* chords go together, or *why* a scale sounds right over a song.
- They want to: accompany new songs on their own (on guitar: comp in many rhythm styles, both fingerpicking and strumming with muted chops), write their own chord progressions, and solo / improvise over a backing track.

### Design principles
1. **Learn on your own instrument.** Every concept is shown on the guitar fretboard *and* the piano keyboard; the user picks a main instrument once and the app displays that one first.
2. **Listen first, theory second.** Every concept can be heard with one click. Theory explains the sound, not the other way round.
3. **Every lesson ends with playing.** Not just quizzes: there are "play along with the backing track" exercises to apply the idea right away.
4. **Don't start from zero.** Skip reading notes on the staff, basic rhythm… since users can already play. Focus on intervals → scales → chords → progressions → improvisation.
5. **Bilingual Vietnamese – English**, with Vietnamese as the source; in the Vietnamese version, terms carry the English word in parentheses, e.g. *quãng (interval)*, *điệu thức (mode)* — since most outside material and videos are in English. The VI / EN button in the top bar switches both the interface and the lessons.

### Out of scope (at least early on)
- No accounts, servers or payments. This is a personal repo that runs entirely in the browser.
- No basic hand technique (holding a pick, posture, fretting chords cleanly…). **Rhythm comping patterns** for guitar (fingerpicking, strumming) are taught though — see the *Rhythm comping* track in section 4.
- No reading staff notation (could be added later as an optional module).

---

## 2. Technology

| Part | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Music theory logic has many data types (notes, intervals, chords) — types prevent mistakes. |
| Framework | **React + Vite** | Popular, well documented, fast builds, outputs a static site. |
| Theory logic | **[tonal](https://github.com/tonaljs/tonal)** | MIT library that already covers notes, intervals, scales, chords, keys, modes, Roman numerals. No rewriting from scratch. |
| Audio | **[Tone.js](https://tonejs.github.io/)** + piano/guitar samples | Plays notes and chords, schedules rhythm (Transport) for the backing track and comping patterns. |
| Guitar chord shapes | **[chords-db](https://github.com/tombatossals/chords-db)** (MIT) or self-defined | tonal has no shapes; we need to know what each string plays to sound strums / picking and to find the bass string. |
| Instrument graphics | **Hand-drawn SVG** (React components) | The fretboard and keyboard must be interactive (click, highlight, colour by degree) — custom SVG gives the most control. |
| Lesson content | **MDX** (Markdown + components) | Lessons are written in Markdown, embedding `<Fretboard />`, `<Piano />`, `<Quiz />` right in the text. |
| Styling | **Tailwind CSS** | Fast, compact, has dark mode. |
| Progress storage | **localStorage** | No backend needed. Export / import a JSON file for backups. |
| Tests | **Vitest** + Testing Library | Especially thorough tests for the theory logic (easy to get wrong, hard to spot by eye). |
| Deploy | **GitHub Pages** via GitHub Actions | Free, builds automatically on every push to `main`. |

### Optional features (later phases)
- **Web MIDI API**: plug a digital piano / MIDI keyboard into the computer → the app knows which notes the user plays, to grade exercises.
- **Pitch detection through the mic** (a library like `pitchy`): for acoustic guitar — play a note and the app knows what it is.
- **PWA**: install on a phone, use offline.

---

## 3. Main parts of the app

### 3.1. Tools — free use, outside the lessons
1. **Fretboard / Piano Explorer**
   - Pick a scale or chord + root → shown on the fretboard / keyboard.
   - Label modes: *note names* (C, D, E…), *intervals* (1, ♭3, 5…), *degrees* (1–7).
   - Guitar: choose the tuning (Standard, Drop D, DADGAD…), number of frets, filter by position / CAGED / 3-notes-per-string.
   - Click a note to hear it.
2. **Chord Builder**: pick a root + chord type → see the formula (1-3-5-♭7…), guitar shapes, and piano hand positions (including inversions).
3. **Chord Identifier**: press notes on the virtual instrument → the app tells you the chord.
4. **Key Explorer**: pick a key → list the 7 diatonic chords and each chord's function, plus an interactive circle of fifths.
5. **Jam Room (Backing Track)** — *the most important tool for improvising*
   - Choose a progression (preset or typed, e.g. `ii-V-I` or `Am F C G`), key, tempo, and groove (pop, rock, blues shuffle, bossa…).
   - The app plays a loop: drums + bass + chords.
   - At the same time it **highlights on the fretboard / keyboard** the scale to use and the **notes of the current chord** (chord tones), changing colour with each chord as it plays.
   - The guitar comping in the backing track follows the **rhythm style** the user picks (sharing the rhythm library with the Rhythm Trainer).
6. **Rhythm Trainer — rhythm comping (guitar)**
   - Rhythm library: pick a style (Ballad, Slow Rock, Waltz, Bolero, Bossa Nova…) and a technique (**strumming** or **picking**).
   - Shows the pattern on a **rhythm grid**: a row of ↓ ↑ / x arrows for strumming; 6 string rows with notes B, 1, 2, 3 for picking. A playhead follows the music and the current beat lights up.
   - Listen to a demo with simulated guitar sound: downstrokes play strings 6→1 a few milliseconds apart, upstrokes 1→6, mutes are a short dead "chop".
   - Pick a chord progression → the pattern applies to each chord (the bass note follows the chord, e.g. C bass on string 5, G bass on string 6).
   - Adjust tempo, metronome, a "drums + bass only" mode so the user comps along, and a mode that raises the tempo after every loop.
   - Create custom rhythms by clicking the grid and saving them.
7. **Metronome** — a standalone practice metronome: tempo + tap tempo, any time signature, subdivisions, per-beat accents, speed trainer and muted bars. See Phase 9.
8. **Sheet & tab editor** — write riffs, licks and solos as tab + staff, play them back with the fretboard following, label each note by its degree, and save / print / export (ASCII tab, MusicXML) / share by link. See Phase 10.

### 3.2. Curriculum
Split into modules, each with several short lessons (10–15 minutes). Every lesson follows the same structure:

> **Listen** → **Understand** (explanation + interactive illustration) → **See it on the instrument** → **Practise** (quiz / listening exercise) → **Play** (an exercise in the Jam Room)

### 3.3. Exercises
- **Find it on the instrument**: "Play F# on string 3", "Find the minor third above A".
- **Build**: "Play a Dm7 chord", "Play the E Dorian scale".
- **Ear training**: hear and name intervals, chord qualities (major / minor / 7…), chord degrees in a progression.
- **Analysis**: given the progression of a familiar song → identify the key and the Roman numerals.
- **Guided improvisation**: "Solo for 8 bars over this progression using only notes 1-3-5 of each chord."
- **Comping (guitar)**: hear and name the rhythm / time signature; pick the right bass note for a chord; assemble a strum pattern from ↓ ↑ x cells to match a sample; comp a progression at increasing tempo.
- Review with **spaced repetition** — wrong answers come back sooner.

---

## 4. Content roadmap (detailed curriculum)

### Module 0 — The map of sound
- The 12 notes, whole & half steps, sharps / flats, enharmonic notes.
- Guitar: find any note on the neck (strings 6 & 5 as landmarks, octave shapes).
- Piano: groups of 2 / 3 black keys, the C and F landmarks.

### Module 1 — Intervals: the building blocks of everything
- 2nds, 3rds, 4ths, 5ths, 6ths, 7ths, octaves; major / minor / perfect / augmented / diminished.
- The shape of each interval on the fretboard and on the keyboard.
- Ear training: each interval tied to a familiar song to remember it.

### Module 2 — Major scale & keys
- The whole–half step formula (W-W-H-W-W-W-H) and building the scale from any note.
- Scale degrees and their names: tonic, dominant, subdominant…
- The circle of fifths and key signatures.
- Guitar: major scale patterns on the neck.

### Module 3 — Triads
- Building chords by stacking thirds: major, minor, diminished, augmented.
- Inversions — piano: minimal hand movement; guitar: chords on 3 strings.
- The **CAGED** system (guitar): one chord in 5 positions along the neck.
- **Diatonic chords**: the 7 chords built from the major scale (I ii iii IV V vi vii°).

### Module 4 — Chord progressions
- Roman numerals and the Nashville number system.
- Function: Tonic – Subdominant – Dominant; the feeling of "tension" and "resolution".
- Classic progressions: I–IV–V, I–V–vi–IV, vi–IV–I–V, ii–V–I, 12-bar blues, the Canon progression…
- Analysing progressions of familiar songs (both Vietnamese and international).
- Transposing — think in Roman numerals and any key works.

### Module 5 — Pentatonic & Blues: the doorway to improvisation
- Major and minor pentatonic, relative / parallel key relationships.
- Guitar: the 5 pentatonic boxes and how to connect them.
- The blues scale, the "blue note".
- **First Jam exercise**: solo with minor pentatonic over a 12-bar blues and over I–V–vi–IV.

### Module 6 — Seventh and extended chords
- maj7, 7, m7, m7♭5, dim7; formulas and sound.
- Diatonic seventh chords (Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7).
- sus2, sus4, add9, 6, 9, 11, 13 — understanding "tension" and colour.
- Piano: two-hand voicings, shell voicings (1-3-7). Guitar: voicings on strings 6 and 5, drop 2 voicings.

### Module 7 — Improvising over the changes (chord tones & melody)
- **Targeting chord tones**: land notes 1-3-5-7 of the current chord on strong beats.
- **Guide tones** (the 3rd and 7th) and how they connect smoothly between chords.
- Approach notes, enclosures, chromatic notes.
- Developing ideas: motifs, repetition – variation, call & response.
- Rhythm in a solo: space, syncopation — *right notes with boring rhythm still sound dull*.

### Module 8 — Modes
- The 7 modes of the major scale: Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian.
- Understanding modes by their **"colour"** (characteristic note) rather than just "starting on a different degree".
- Chord–scale: which mode fits which chord (m7 → Dorian, 7 → Mixolydian…).
- Jam: one- and two-chord vamps to feel each mode.

### Module 9 — Expanding the harmony
- Minor keys: natural, harmonic and melodic minor; why V in a minor key is usually a major chord.
- Secondary dominants: V/V, V/vi…
- Modal interchange / borrowed chords: ♭VI, ♭VII, iv in a major key.
- Tritone substitution, passing diminished chords.
- Modulation within a song.

### Module 10 — Writing a complete song
- Song structure: intro, verse, pre-chorus, chorus, bridge.
- Writing a progression for each section, creating contrast.
- Writing a melody over the progression (using the chord-tone ideas from Module 7).
- Final project: write a 16-bar section + a solo over it.

> The module order is deliberate: users get to **improvise from Module 5**, as early as possible, before going deeper. Every later module returns to the Jam Room with new knowledge.

### Guitar-only track — Rhythm comping (fingerpicking & strumming)

A track that runs **in parallel** with the main curriculum, unlocked after Module 3 (once triads and diatonic chords are known). Goal: pick up the chord sheet of any song and accompany singing, choose the right rhythm, and change chords without losing the beat.

**R1 — Time and counting**
- Beats, bars, 2/4, 3/4, 4/4, 6/8, 12/8 time.
- Subdivisions: quarter notes, eighths, sixteenths, triplets, swing / shuffle feel.
- Counting out loud "1 & 2 &", "1 e & a"; strong / weak beats, syncopation.

**R2 — Reading rhythm notation**
- Strumming: ↓ (downstroke), ↑ (upstroke), **mute / chop** (x – deaden the strings with the palm), accents, ghost strums (the hand moves but misses the strings).
- Picking: **B** (bass note), **B'** (alternate bass), string numbers 1-2-3 for treble notes.
- **The bass note of each chord**: whether a chord's bass is on string 6, 5 or 4; alternating between the root and the 5th (alternating bass).

**R3 — Strumming rhythms**
| Rhythm | Time | Notes |
|---|---|---|
| Ballad / Pop | 4/4 | The most basic pattern, many variants |
| Slow | 4/4 | Slow, gentle |
| Slow Rock | 12/8 | Triplet feel |
| Rock / Pop Rock | 4/4 | Steady eighth-note strums, accents on 2 & 4 |
| Disco | 4/4 | Mutes on beats 2 & 4 |
| Fox (Foxtrot) | 4/4 | Alternating bass + chop |
| Blues / Shuffle | 4/4 (swing) | A "swaying" feel |
| Waltz (Valse) | 3/4 | Bass – chop – chop |
| Boston | 3/4 | A slow waltz, with variants |
| Bolero | 4/4 | Both strummed and picked versions |
| Cha-cha | 4/4 | The signature "cha-cha-cha" rhythm |
| Rumba | 4/4 | Off-beat accents |
| Bossa Nova | 4/4 | Fingerstyle, bass and chord offset |
| Tango | 2/4 or 4/4 | Crisp, muted |
| Surf | 4/4 | Energetic |
| Reggae | 4/4 | Mutes on the weak beats |

**R4 — Picking patterns (fingerpicking / arpeggio)**
- Basic ballad picking (B-3-2-3-1-3-2-3) and its variants.
- Slow, Slow Rock (12/8), Waltz/Boston (3/4), Bolero picking.
- **Travis picking**: the thumb keeps a steady alternating bass while the other fingers play melody / chord notes.
- Up–down arpeggios for intros / outros.

**R5 — Putting it together and making the comping "breathe"**
- Changing chords without losing the beat: which beat to change on, strumming open strings during the change.
- Bass runs between chords (walk-up / walk-down), e.g. C → Am via B.
- Adding colour notes (sus2, sus4, add9) inside picking patterns — applying Module 6.
- Arranging by section: light picking in the verse → strong strumming in the chorus; intros, outros, breaks.

**R6 — Choosing a rhythm for a song**
- Listen and identify the time signature (3/4 or 4/4, straight or swing) and tempo.
- A song can be comped with several rhythms — try the same progression with different rhythms.
- Each rhythm comes with a few familiar songs as examples (song title and chord progression only).

**Every rhythm lesson follows this structure:**
> **Hear the demo** (real tempo) → **See the pattern** on the rhythm grid with a playhead following the music → **Practise slowly** (50–60% tempo, metronome) on 1 chord → **Practise chord changes** on a 2–4 chord progression → **Comp the whole loop** with the Jam Room's drums + bass, raising the tempo gradually.

---

## 5. Planned folder structure

```
music-theory-learner/
├── public/
│   └── samples/              # piano, guitar, drum samples
├── src/
│   ├── theory/               # pure music theory logic (no React dependency)
│   │   ├── notes.ts
│   │   ├── intervals.ts
│   │   ├── scales.ts
│   │   ├── chords.ts
│   │   ├── progressions.ts
│   │   ├── fretboard.ts      # note positions for a tuning
│   │   ├── rhythm.ts         # time, subdivisions, data types for comping patterns
│   │   └── __tests__/
│   ├── audio/                # Tone.js: notes, chords, backing track
│   │   ├── instruments.ts
│   │   ├── player.ts
│   │   ├── grooves/          # drum + bass grooves: pop, rock, blues, bossa…
│   │   └── strum.ts          # simulated strumming / picking from chord shapes
│   ├── components/
│   │   ├── Fretboard/
│   │   ├── Piano/
│   │   ├── ChordDiagram/
│   │   ├── CircleOfFifths/
│   │   ├── RhythmGrid/       # rhythm grid showing strum / picking patterns
│   │   └── Quiz/
│   ├── features/
│   │   ├── explorer/         # Fretboard/Piano Explorer
│   │   ├── chord-builder/
│   │   ├── key-explorer/
│   │   ├── jam-room/
│   │   ├── rhythm-trainer/   # rhythm comping practice (guitar)
│   │   └── exercises/
│   ├── lessons/              # MDX lesson content
│   │   ├── 00-ban-do-am-thanh/
│   │   ├── 01-quang/
│   │   ├── ...
│   │   └── dem-guitar/       # Rhythm comping track (R1–R6)
│   ├── data/
│   │   ├── rhythms/          # definitions of each rhythm (strum & pick) as JSON/TS
│   │   └── chord-shapes/     # guitar chord shapes
│   ├── store/                # learning progress, settings (localStorage)
│   └── App.tsx
├── .github/workflows/deploy.yml
├── PLAN.md                   # this file
├── README.md
└── package.json
```

Rule: the `theory/` folder **never imports React or Tone.js** — it is plain functions, easy to test. The UI and audio only call into it.

---

## 6. Phases

### Phase 0 — Setup (≈ 1 session)
- [x] Create the Vite + React + TypeScript + Tailwind + Vitest project.
- [x] `git init`, create the GitHub repo, write a short README.
- [x] GitHub Actions deploy to GitHub Pages (deploy a "Hello" page right away to make sure the pipeline works).

### Phase 1 — Theory foundation + virtual instruments
- [x] A `theory/` layer around tonal: notes, intervals, scales, chords, fretboard positions. With tests.
- [x] `<Fretboard />` component (SVG): tuning, fret count, note highlighting, note / interval / degree labels, click to hear.
- [x] `<Piano />` component (SVG): configurable octaves, highlighting, click to hear.
- [x] Audio: single notes and chords (piano + guitar).
- [x] **Explorer** page (scales & chords on both instruments).

> Note: piano uses Salamander samples loaded at runtime (falling back to a synth when offline); guitar uses PluckSynth for now (Karplus-Strong synthesis, no samples). Swap in real guitar samples during Phase 4 (rhythm comping) if a better sound is needed.

✅ *Result: already a usable scale / chord reference tool.*

### Phase 2 — Lesson system (MVP)
- [x] MDX setup, lesson layout, table of contents, "previous / next lesson" buttons.
- [x] `<Quiz />` component and the basic exercise types (multiple choice, find notes on the virtual instrument, listen & guess).
- [x] Progress saved in localStorage.
- [x] Write content for **Modules 0 → 3**.

> Writing lessons: each lesson is a file `src/lessons/<module>/<NN-lesson-name>.mdx` with `export const meta = { title, description, minutes }`. The components `<Show>`, `<Play>`, `<PlayChords>`, `<OnlyFor>`, `<Callout>`, `<CircleOfFifths>`, `<Quiz>`, `<FindNotes>`, `<EarQuiz>`, `<NoteDrill>` can be used directly (see `src/lessons/mdxComponents.ts`). Every exercise needs a unique `id` — the tests flag duplicates. The English version is a `<NN-lesson-name>.en.mdx` file next to the Vietnamese one, using **exactly the same `id`s** so progress is shared (checked by tests). UI strings live in `src/i18n/messages.ts`.

✅ *Result: MVP — learn from scratch up to diatonic chords.*

### Phase 3 — Jam Room
- [x] Progression parser (type `ii-V-I` or `Dm7 G7 Cmaj7`).
- [x] Sequencer on Tone.Transport: drums + bass + chords, tempo control, looping.
- [x] Real-time chord tone highlighting on the virtual instrument.
- [x] Scale suggestions for the progression.
- [x] Write content for **Modules 4 → 5**, with Jam exercises.

> Note: the `#/jam` page accepts `?p=<progression>&key=<key>&groove=<pop|ballad|rock|blues|bossa>&tempo=<bpm>`. In lessons use `<Jam progression="..." songKey="..." groove="..." scale="..." />`. Groove patterns live in `src/audio/grooves.ts` — Phase 4 (guitar rhythm comping) can build on them. Only 4/4 is supported for now; Waltz/Boston (3/4) need adding in Phase 4.

✅ *Result: users can really start improvising.*

### Phase 4 — Guitar rhythm comping
- [x] Data format for rhythms: each step on the grid is a down / up strum, a mute, a rest, or a list of strings to pick (B, B', 1, 2, 3…).
- [x] Guitar chord shape data → derive the bass string and alternate bass for each chord.
- [x] Simulated strumming (timing offset between strings, velocity) and picking; muted chops.
- [x] `<RhythmGrid />` component with a playhead driven by Tone.Transport.
- [x] **Rhythm Trainer** page: pick a rhythm, progression, tempo, metronome, gradual tempo increase, custom rhythms.
- [x] Enter about 15 strumming + 8 picking rhythms from section 4.
- [x] Use the rhythms for the Jam Room's guitar comping.
- [x] Write content for the **R1 → R6** track.

> Note: rhythms live in `src/audio/rhythms.ts` (16 strumming + 10 picking, including 3/4, 6/8 and 12/8 — slow rock comes in both 12/8 and 6/8), shapes in `src/theory/guitarVoicing.ts`. Page `#/rhythm?r=<rhythm id>&p=<progression>`. In lessons: `<RhythmPlayer rhythm="..." progression="..." />`, `<RhythmQuiz options="..." />`, `<PatternView pattern="..." />`. The guitar track sits after Module 5 in the curriculum. Guitar sound is still PluckSynth.

✅ *Result: pick up a chord sheet and accompany singing in many rhythm styles.*

### Phase 5 — Advanced content
- [x] Modules 6 → 10.
- [x] Advanced ear training, spaced repetition.
- [x] Key Explorer + interactive circle of fifths, Chord Identifier.

> Note: the Review page (`#/review`) has 7 decks generating random questions (naming intervals, reading chord notes, key signatures, diatonic chords, hearing intervals, hearing chord types including sevenths, hearing progressions), scheduled with Leitner boxes stored in the progress data. Key Explorer is at `#/keys`, the chord identifier at `#/identify` (both in the Tools menu). Lesson content is loaded per lesson (the `lesson-meta` plugin in `vite.config.ts`).

### Phase 6 — Optional / extensions
- [x] Web MIDI input (digital piano).
- [x] Pitch detection through the mic (guitar).
- [x] Listening through the mic to score steadiness while comping (detecting strum / pick timing against the beat).
- [x] Offline PWA.
- [x] English interface and lessons (i18n).
- [x] More instruments (bass, ukulele — only the `<Fretboard />` tuning changes).

> Note: the `#/connect` page (Tools menu) connects a MIDI instrument or the mic; pitch detection uses a hand-written McLeod method (`src/input/pitch.ts`) and sends no audio anywhere. Real instruments work in the note-name drill, the "find it on the instrument" exercises, the chord identifier, the Explorer and timing scores on the Guitar comping page. PWA via `vite-plugin-pwa`: installable on phones, works offline (piano samples are cached after the first listen). The Explorer also has 4/5-string bass, ukulele, baritone ukulele and mandolin tunings.

### Phase 7 — Chord reflex training (guitar)

Goal: chords appear **continuously with the metronome** and the user has to change in time; because the chords connect **smoothly**, long practice never feels grating, and the ear gets used to how chords move. Unlike the Rhythm Trainer, the progression **never loops in a fixed way** — it keeps changing, so it cannot be memorised; you have to read and react.

Decided: guitar only; **no mic, no scoring** — users practise along with the metronome; the screen **shows only chords**, no Roman numerals or explanations.

**Screen** (new page `#/reflex/chords`, *Reflex* menu):
- A horizontal "tape": the **current** chord large in the middle with its shape, 1–2 **upcoming** chords dimmer on the right (to prepare the hand), a beat light flashing with the metronome. One bar of count-in before starting.
- Shapes come from `chordShapes` (`src/theory/guitarShapes.ts`), preferring the shape **closest to the previous one** so the hand moves less.
- Sound: metronome only (beat 1 accented). Optional demo chord sound, off by default.

**Playing — 2 modes:**
1. **Strum on the beat**: one downstroke per metronome beat; each chord lasts N beats (4 → 2 → 1).
2. **One rhythm pass**: each chord gets exactly **1 pass** (1 bar) of the chosen rhythm from `src/audio/rhythms.ts`, with the pattern shown small under the chord using `<PatternView />`; beats follow the rhythm's time signature (3/4, 4/4, 12/8).

**Chord source — keeping it smooth:**
- **Chained loops**: familiar progressions (I–V–vi–IV, vi–IV–I–V, I–vi–IV–V, ii–V–I, the Canon progression…), each played 1–2 times, then joined to another loop **in the same key** at a bar boundary; only joined when the last chord of one loop leads naturally into the first chord of the next (e.g. ending on V, the next loop starts on I or vi).
- **Generated**: a "harmonic graph" within the key — nodes are diatonic chords, edges weighted by pop-music habits (I → anything; ii → V; iii → vi, IV; IV → V, I, ii; V → I, vi; vi → ii, IV). Prefer moves with **common tones** and root motion by 4ths/5ths; 4- or 8-bar phrases that always **end with a cadence** (V–I, IV–I) so the phrase feels complete. Drop vii° at the easy level (hard to fret, sounds harsh).
- **Avoid jarring moves**: no sudden key changes. Only when the option is on, and only to close keys (relative key, one accidental away) via a **pivot chord**.
- **Custom**: type a few progressions (using `parseProgression`) and the app chains them by the rules above.
- Seeded random generator so a stream can be shared via URL (`?seed=`).

**Difficulty** (each adjustable, or Easy / Medium / Hard presets):
- Beats per chord (strum-on-the-beat mode), tempo, optional automatic tempo increase after each phrase.
- Hide shapes (chord name only).
- Key: one of the 14 keys most common when accompanying singing (C, G, D, A, E, F, B♭, Am, Em, Dm, Bm, F♯m, Gm, Cm).
- Chord types: triads → add sevenths (V7, ii7…) → add sus/add9.

**Tasks:**
- [x] `src/theory/chordFlow.ts`: a weighted "smooth" function graph, phrases with cadences, chained loops, pivot-chord key changes, seeds. Thorough tests (every move is in the allowed list, phrases always end correctly, the same seed gives the same stream).
- [x] Pick nearby shapes for the whole chord stream.
- [x] Chord tape component + `#/reflex/chords` page, metronome and one-rhythm-pass mode (reusing the Rhythm Trainer's scheduling).
- [x] A short bilingual lesson in the guitar track embedding `<ChordReflex />`; UI strings in `src/i18n/messages.ts`.

> Note: the `#/reflex/chords` page (*Chord reflex* in the main bar, accepts `?seed=` to share an exact stream). The generator is in `src/theory/chordFlow.ts`, its own scheduler in `src/audio/reflex.ts` (Transport `scheduleRepeat` every beat, an endless stream — not the Jam Room's fixed loop), the UI in `src/features/reflex/`. Easy / Medium / Hard are setting presets. In lessons: `<ChordReflex level="easy" source="loops" songKey="G" />`; lesson R8 "Changing chords by reflex".
- [x] Chaos mode (`source: 'chaos'`): any root, any triad/seventh/colour chord, no key or cadence; never the same chord or root twice in a row; the key and key-change controls are hidden.

✅ *Result: chords run continuously with the metronome, cannot be memorised, and connect smoothly.*

### Phase 8 — Fretboard note reflex training (guitar) (from 2026-10-19)

Goal: see a note name and fret it immediately, without counting frets. Notes appear continuously against a time limit (or with the metronome), like Phase 7 but with single notes.

**How the target note is indicated — by neck zone (default).** On one string the same note name repeats every 12 frets, so the neck is split into 2 zones: **frets 0–11** and **frets 12–22**. Within a zone, each note name has **exactly one position** on a string. The screen shows the note name (E) with a **mini fretboard** highlighting the zone to search; no octave numbers or other notation needed.

```
       String 6
          E
  ┌────────────┬──────────┐
  │░░░░░░░░░░░░│██████████│   ← highlighted zone = where to look
  └────────────┴──────────┘
   0          11 12        22    (answer: fret 12)
```

**Names with octaves — advanced mode** (toggled in the page settings, for users solid on theory): scientific pitch notation at real pitch — open string 6 is **E2**, string 6 fret 12 is **E3**, open string 1 is **E4**; the Vietnamese version shows *Mi3 (E3)*. When on, the mini fretboard is hidden. No "low E / high E", since the neck has 4 different-pitch Es (E2–E5).

**Part 1 — On one string**
- Pick a string (or let the app switch strings every N notes).
- **Level 1 — one fixed zone**: practise only frets 0–11 (or only 12–22). The zone never changes, so only the note names need remembering. The easiest way in.
- **Level 2 — the whole string**: each round the app picks a random zone, shown on the mini fretboard; the user must play **the right note in that zone**.
- **Level 3 — advanced**: like level 2 but only the octave name is shown (E2 / E3), no mini fretboard.
- On the idea of "play every E on the string": on one string two notes with the same name are always exactly 12 frets apart, so finding one gives away the other — as feared, users would "add 12" instead of remembering. So there is **no** "find all" mode for a single string; use levels 1 + 2 above. "Find all" only makes sense across several strings (see below).

**Part 2 — Across several strings**
- **Note name + string**: "F♯ — string 3", the string chosen at random among the enabled strings; the mini fretboard highlights the string and zone. Levels 1–3 as in part 1.
- **Find all on the neck**: "Find every F♯ from fret 0 to 12" — play every position on every string. There is no "add 12" trick here because strings are a 4th apart (strings 3–2 a major 3rd), so users learn the **octave shapes** across strings. Time limit for the whole round.
- **Exact pitch** (advanced mode only, since it needs octave names): "Find every position of G3" — the same pitch exists on several strings (string 6 fret 15, string 5 fret 10, string 4 fret 5, open string 3). Very useful for soloing: knowing how to play a line in several positions.
- **By position**: limited to a 4–5 fret window (e.g. frets 5–8), all strings — exactly how you think when improvising inside a scale box.

**Reflex mechanics (shared by every mode):**
- Each note has a time limit (e.g. 5 seconds → 1.5 seconds), or notes change with the metronome (1 note per bar → per beat).
- After answering: play that note (tying the ear to the position), colour green / red, show the right position when wrong or out of time.
- Weak notes (often wrong, slow reaction) appear more often; stored per **string/fret position** in the Leitner schedule (`note-pos:3:11`).
- End-of-session **heat map** of the neck: slow / often-wrong cells are darker — instantly showing "blind spots" (usually frets 6–11 on strings 3 and 4).
- Personal records: correct notes per minute, average reaction time.
- Reverse mode (partly exists in `NoteDrill`): the app shows a position → the user names the note.

**How answers are received:**
- **Clicking the virtual fretboard** (`<Fretboard />` with `onNoteClick`) — the default: exact string + fret.
- **Real guitar through the mic** (optional): detects pitch down to the octave (enough for level 2 and exact-pitch mode), but **cannot tell strings apart** — E3 on string 6 fret 12 and string 4 fret 2 sound the same. In "note name + string" mode the right pitch is accepted (users keep to the right string themselves). In "find all", users play each position in turn and the app counts the distinct pitches heard.
- The tuning follows the settings (Standard, Drop D…), so it works for bass / ukulele too.

**Tasks:**
- [x] `src/theory/fretTargets.ts`: generate targets by mode / string / zone / tuning (ensuring each note name has only one position in a zone on a string), check answers (position or pitch), pick notes weighted by weakness. Use `fretboardPositions` / `positionForMidi` in `src/theory/fretboard.ts`. Thorough tests.
- [x] Mini fretboard component showing the zone / string; `#/reflex/notes` page: mode bar, advanced-mode switch, timer / metronome, virtual fretboard, feedback.
- [x] Hook up the mic (pitch with octave) + MIDI.
- [x] Heat map, records, per-position review schedule.
- [x] A short bilingual lesson in Module 0 ("Learning the neck"), embedding `<FretReflex mode="..." />`.

> Note: the `#/reflex/notes` page (*Note reflex* in the main bar). Targets and answer checking are in `src/theory/fretTargets.ts`, session settings / stats / heat in `src/features/reflex/fretReflexModel.ts`, the UI in `src/features/reflex/FretReflex.tsx` (with `MiniFretboard` and `FretHeatMap` in `src/components/Fretboard/`), the metronome in `src/audio/noteReflex.ts`. Level 3 is the advanced-mode switch (octave names, no mini fretboard), which also unlocks the exact-pitch mode. "By position" asks a note name and every position of it inside a 5-fret window. Each answered position goes into the Leitner schedule as `note-pos:<string>:<fret>` (a correct but slow answer — over 75% of the time limit — counts as weak); records are stored in the progress data (`records`, per mode and level). With the mic, a wrong pitch counts as a wrong answer, and in "find all" each pitch heard marks every position with that pitch. Not done: the reverse mode (position → name), which `NoteDrill` already covers in lessons. In lessons: `<FretReflex id="..." mode="string" strings="6" level={1} zone={0} naturalsOnly />`; lesson M0-3 "Learning the neck".

✅ *Result: notes appear against the clock or the metronome, answered on the virtual fretboard or a real guitar, with weak positions practised more.*

**Agreed with the user (2026-10-18):**
1. Chord reflex is guitar only, no mic, no scoring.
2. Chords change with the metronome: one strum per beat, or one rhythm pass per chord.
3. The screen shows only chords, no explanations; smooth chord changes come first.
4. Note practice: by default notes are indicated by **neck zone**; E2/E3 names are an advanced mode for users solid on theory.

### Phase 9 — Metronome (Tools menu)

Decided with the user (2026-10-20): it stays in the *Tools* menu; no embedded metronome in lessons.

Goal: a metronome good enough to replace a phone app while practising — open it, set the tempo, play. Today a click only exists inside other features (the Jam Room's click track, the reflex drills); there is no way to just practise with a click.

**Screen** (new page `#/metronome`, *Tools* menu → *Metronome*):
- A big tempo number in the middle with its Italian tempo name (Largo, Adagio, Andante, Moderato, Allegro, Presto — bilingual tooltip), a row of **beat dots** that light up on each beat, and a large Start / Stop button.
- Below: tempo controls, time signature, subdivision, sound, practice tools (collapsible "Advanced" section so the basic screen stays simple).
- Works at phone width (it is the tool people will most often open on a phone next to the instrument).

**Tempo:**
- 30–300 BPM: slider, −5 / −1 / +1 / +5 buttons, and a typed number.
- **Tap tempo**: average of the last 4 taps, ignoring outliers; the tap history resets after 2 seconds without a tap.
- Changing the tempo while running takes effect **without restarting** (set `Transport.bpm`, the bar position is kept).

**Time signature & beats:**
- Presets 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8, plus a custom beat count (1–16).
- Compound meters (6/8, 9/8, 12/8): the BPM counts the **dotted quarter** by default (6/8 at 60 = 2 felt beats per second), with an option to count eighths. Odd meters get a grouping (7/8 = 2+2+3, 3+2+2, 2+3+2), whose group starts are accented.
- **Per-beat accent**: clicking a beat dot cycles *accent → normal → silent*, e.g. accent only beats 2 and 4 (backbeat practice) or leave beat 1 silent.

**Subdivision:** none, eighths, triplets, sixteenths, swung eighths (adjustable swing ratio); subdivision clicks are quieter than beats, with their own volume.

**Sound:** the shared click timbres and volume from `src/audio/click.ts` (soft / wood block / sharp — synthesized, works offline). Optional **visual-only mode** (screen flash, no sound) for loud rooms or recording.

**Practice tools:**
- **Speed trainer**: start BPM → target BPM, +N BPM every M bars (or every M seconds); stops rising at the target. Shows the current step.
- **Muted bars (gap trainer)**: play X bars, then mute Y bars (beat dots keep moving) — to check whether you hold the tempo on your own.
- **Session timer**: stop after N minutes; shows the elapsed time and bar count.

**Comfort:**
- Keyboard: Space = start/stop, ↑/↓ = ±1 BPM (Shift = ±5), T = tap.
- Every setting is remembered (`usePersistentState`, keys `metronome:*`).
- Keep the screen awake while running (Screen Wake Lock API, silently skipped where unsupported).

**Architecture:**
- `src/features/metronome/metronomeModel.ts` — pure, fully tested logic: the click events of one bar (offset in beats, beat/subdivision index, level accent / normal / sub / silent) for a meter + grouping + subdivision + swing; the tempo of bar *n* in the speed trainer; whether bar *n* is muted in the gap trainer; tap tempo averaging; the tempo name for a BPM.
- `src/audio/metronome.ts` — the scheduler, following `src/audio/noteReflex.ts`: claims the single Transport through `transportOwner` (starting the metronome stops a Jam / reflex drill and vice versa), `scheduleRepeat` once per bar placing that bar's events, UI updates through `setTimeout` (not `Draw`, which stops in hidden tabs), state exposed through a `useSyncExternalStore` store (running, current beat, bar, current tempo).
- Clicks go through the shared `src/audio/click.ts` (done before this phase, see below); the page only adds the subdivision volume.
- `src/features/metronome/MetronomePage.tsx` + route `metronome` in `src/App.tsx` + entry in `TOOLS` (`src/app/Layout.tsx`) + `nav.metronome` and `metronome.*` strings in `src/i18n/messages.ts` (vi: *Máy đếm nhịp (Metronome)*).

**Tasks:**
- [x] `metronomeModel.ts` + tests (meters, groupings, subdivisions, swing offsets, accents/silent beats, speed-trainer steps, gap bars, tap tempo).
- [x] `src/audio/metronome.ts` scheduler: start/stop, live tempo change, transport ownership, beat callback.
- [x] `#/metronome` page, basic screen: tempo controls, tap tempo, time signature, beat dots, start/stop, keyboard shortcuts, persisted settings, phone layout.
- [x] Advanced section: subdivision, per-beat accents, grouping, timbre/volume, visual-only mode, speed trainer, gap trainer, session timer, wake lock.
- [x] Page tests (`MetronomePage.test.tsx`: renders from the Tools menu, tap tempo sets the BPM, beat dots cycle accents, settings survive a reload) and the bilingual UI strings.

> Note: the `#/metronome` page (*Tools* menu). Logic in `src/features/metronome/metronomeModel.ts`, the scheduler in `src/audio/metronome.ts` (Transport `scheduleRepeat` once per pulse; the page's `plan(bar, elapsed)` is read at every bar start, so meter, accent, gap and trainer changes apply from the next bar; tempo changes from the controls apply at once). A pulse is one counted beat: 7/8 and "count by eighths" count eighths, 6/8 / 9/8 / 12/8 count dotted quarters by default. Accents have 4 levels (strong / medium / normal / silent); group starts default to medium. While the speed trainer is on, the main tempo controls are disabled and the trainer's start tempo is shown. Settings are stored in `mtl:metronome:settings`.

✅ *Result: a standalone metronome in the Tools menu, usable on a phone, with tap tempo, any meter, subdivisions, accents and practice tools.*

### Phase 10 — Sheet & tab editor (Tools menu) (planned 2026-10-21)

Goal: write down your own riffs, licks, solos and arrangements as **tab + staff**, hear them back, and keep or share them. It closes the loop of the app: after learning a scale, a chord-tone idea or a lick in the Jam Room, the user can *notate* what they played and see *why* it works (each note labelled by its degree against the chord). Guitar-first, like the rest of the app; piano users get the staff view.

Defaults chosen in this plan (to confirm with the user, see "Open decisions" below): one voice per staff, staff + tab shown together, the notation drawn by **VexFlow** (MIT) loaded only on this page, scores stored in the browser, no song transcriptions shipped with the app.

**Screen** (new page `#/sheet`, *Tools* menu → *Sheet & tab*; vi: *Soạn sheet & tab (Tab editor)*):
- **Library view** (`#/sheet`): the user's scores as cards (title, key, tempo, last edited) — New, Duplicate, Delete (with confirmation), Import. A few starter templates written for the app (empty 4/4 tab, 12-bar blues comping, a pentatonic lick sheet) — no copyrighted songs.
- **Editor view** (`#/sheet/:id`):
  - Top bar: title, tempo, time signature, key signature, tuning + capo, view switch *Staff + tab / Tab only / Staff only*.
  - The score in the middle, wrapped into systems that fit the screen width; a blinking **cursor** (current bar, beat, string) and a selection range.
  - A **duration palette** (whole → 16th, dot, triplet, rest, tie) and a **technique palette** (hammer-on, pull-off, slide, bend ½/full, vibrato, palm mute, dead note ×, let ring, natural harmonic).
  - The virtual **fretboard** under the score (piano keyboard for piano users) — the main way to enter notes, and during playback it lights up the notes being played.
  - Transport bar: Play / Stop, play from cursor, loop the selected bars, tempo % slider (50–150%, for slow practice), count-in, metronome on/off (shared `src/audio/click.ts`).
- Phone: viewing, playback and tap-to-enter on the fretboard work at phone width; the palettes collapse into a bottom sheet. Heavy editing is designed for desktop first.

**Data model** (`src/theory/score.ts`, pure, no React / Tone.js):
```ts
interface Score {
  id: string; title: string; version: 1
  tempo: number; timeSig: [number, number]; keySig: string   // e.g. 'G', 'Em'
  tuning: string; capo: number                               // tuning id from TUNINGS
  measures: Measure[]
}
interface Measure { events: ScoreEvent[]; chords?: { beat: number; symbol: string }[]; repeat?: 'start' | 'end'; endings?: number[] }
interface ScoreEvent {
  duration: 'w' | 'h' | 'q' | '8' | '16' | '32'; dots: 0 | 1 | 2; tuplet?: 3
  rest?: boolean; tieToNext?: boolean
  notes: { midi: number; string: number; tech?: Technique[] }[]   // several notes = a chord / double stop
}
```
- Pitch is stored as **midi + string**; the fret is derived (`midi − open string − capo`). Changing the capo or transposing keeps the notes musically correct, and the tab follows.
- Note spelling comes from the key signature (F major writes B♭, not A♯) — reuse `noteFromMidi` / tonal, as everywhere else in the app.
- `chords` holds optional chord symbols above the staff (parsed with `parseProgression`).

**Editing rules** (`src/theory/scoreEdit.ts`, pure functions returning a new `Score`, so undo / redo is just a history stack):
- Insert / replace / delete an event at the cursor; add a note to the current event (build a chord); change duration, dots, tuplet, tie, techniques.
- **Bar filling**: each bar must add up to the time signature. Entering past the end of a bar moves to the next bar; a note that does not fit is split and tied across the bar line; short bars are padded with rests when leaving them; a bar that is too full is flagged in red (never silently cut).
- **String choice** when a pitch arrives without a string (piano, MIDI, mic, transpose): pick the playable position closest to the previous note's fret (`positionForMidi`), keeping within a 4–5 fret hand span when possible.
- Transpose the selection or the whole score by semitones or to a new key; *octave up/down*; *move to another string* (same pitch, other position) with Alt+↑/↓.
- Copy / paste / duplicate bars; insert / delete bars; repeat signs and 1st/2nd endings (playback follows them).
- Undo / redo (Ctrl+Z / Ctrl+Shift+Z), up to 100 steps.

**Ways to enter notes:**
1. **Click the fretboard** (`<Fretboard onNoteClick>`): exact string + fret at the cursor with the current duration; Shift+click adds the note to the current event (chord).
2. **Keyboard, Guitar Pro style**: ←/→ move between events, ↑/↓ between strings, digits type the fret (two digits within 0.5 s → fret 12), `+`/`−` change duration, `.` dot, `R` rest, `T` tie, `H`/`P`/`S`/`B` techniques, Delete removes, Space plays from the cursor.
3. **Real instrument** (`useLiveNote` from `src/input/`): MIDI keyboard or mic — each stable note heard is entered at the cursor with the current duration ("step entry"; no real-time rhythm transcription).
4. **Insert a chord shape**: pick a chord → its shape from `chordShapes` (`src/theory/guitarShapes.ts`) is entered as one event, and its symbol is written above the staff.
5. **Paste ASCII tab** (the `e|--3--5--|` text found on forums): parsed into notes with a default duration per column; the user then fixes the rhythm. Best effort — unknown symbols are ignored with a warning.

**Playback** (`src/audio/scorePlayer.ts`, following `src/audio/metronome.ts`):
- `scoreToEvents(score)` (pure, tested) turns the score into timed `PlayEvent`s, unrolling repeats/endings, adding ties, applying tempo % and swing; bends/slides become short pitch glides where the voice allows, otherwise grace notes.
- Claims the Transport through `transportOwner` (starting it stops the Jam Room / metronome / reflex drills and vice versa), UI updates through `setTimeout`, state through a `useSyncExternalStore` store (playing, current event, bar).
- Cursor and fretboard follow the music; auto-scroll keeps the current system in view.
- Voice follows the main instrument (guitar PluckSynth / piano samples).

**Learning overlays** (what makes it more than a tab app):
- **Degree labels**: under each note show its interval to the chord above it (1, ♭3, 5, ♭7…) or its scale degree in the key — the same label modes as the Explorer.
- **Colour by function**: chord tones / scale tones / outside notes, using `markerColors`; helps check a solo against the changes.
- **Scale check**: warn on notes outside the chosen scale (optional).
- **Send to the Jam Room**: the score's chord symbols open `#/jam?p=...&key=...&tempo=...` to improvise over the same changes; and the other way, a *Notate* button in the Jam Room opens a new score with that progression already written as chord symbols over empty bars.

**Saving, import & export** (`src/features/sheet/sheetStore.ts`):
- Every score autosaves to `localStorage` (`mtl:sheets:index` + `mtl:sheets:<id>`), versioned (`version: 1`) with a migration hook. A warning when storage is nearly full.
- Included in the existing progress **backup / restore** JSON (`ProgressBackup`).
- **Export**: the app's own `.json`; **ASCII tab** (`.txt`, copy to clipboard); **MusicXML** (`.musicxml`, opens in MuseScore / Guitar Pro / Sibelius); **PDF / print** through a print stylesheet (score only, no UI).
- **Import**: the app's `.json`, ASCII tab; MusicXML import (single part, single voice) as a later task.
- **Share by link**: the score compressed (`CompressionStream('deflate')` → base64url) into `#/sheet/shared?d=...`; opening it shows a read-only copy with *Save to my library*. Nothing is uploaded anywhere.

**Rendering** (`src/components/Score/`):
- `ScoreView` draws a `Score` with VexFlow (`Stave` + `TabStave`, beams, ties, techniques, chord symbols), **lazy-loaded** with `import()` so other pages do not grow; the PWA caches it after the first visit.
- Layout (how many bars per system) is a pure function in `src/theory/scoreLayout.ts`, tested, so VexFlow only draws.
- Click / tap on the drawing maps back to (bar, event, string) to move the cursor.
- If VexFlow ever gets in the way, the model and layout stay the same and only `ScoreView` changes.

**Lessons** (small, at the end of the phase):
- A read-only `<TabView src="..." />` MDX component to show short licks inside lessons (pentatonic licks in Module 5, chord-tone lines in Module 7), with a play button and *Open in editor*.
- A short bilingual lesson "Writing your licks down" (how to read tab rhythm, the techniques symbols) embedding a small editor.

**Architecture summary:**
- `src/theory/score.ts`, `scoreEdit.ts`, `scoreLayout.ts`, `asciiTab.ts`, `musicXml.ts` — pure, fully tested.
- `src/audio/scorePlayer.ts` — scheduler.
- `src/components/Score/ScoreView.tsx` (VexFlow), `TabView.tsx` (read-only).
- `src/features/sheet/` — `SheetLibrary.tsx`, `SheetEditor.tsx`, `sheetStore.ts`, palettes, keyboard handling.
- Routes `sheet`, `sheet/:id`, `sheet/shared` in `src/App.tsx`; entry in `TOOLS` (`src/app/Layout.tsx`); `nav.sheet` and `sheet.*` strings in `src/i18n/messages.ts`.

**Tasks:**
- [ ] 10.1 Model: `score.ts` (types, fret ↔ midi with tuning + capo, spelling, durations in ticks) + `scoreEdit.ts` (insert / delete / chord / duration / bar filling with ties / string choice / transpose / copy-paste / repeats) + tests.
- [ ] 10.2 Rendering: add VexFlow (lazy), `scoreLayout.ts` + tests, `ScoreView` for staff + tab, tab only, staff only; techniques and chord symbols; click → cursor mapping.
- [ ] 10.3 Editor page: library + editor routes, cursor, palettes, fretboard entry, keyboard entry, chord-shape insert, undo/redo, autosave, phone layout.
- [ ] 10.4 Playback: `scoreToEvents` + tests (repeats, ties, tuplets, tempo %), `scorePlayer.ts` with Transport ownership, cursor/fretboard follow, loop selection, count-in.
- [ ] 10.5 Real-instrument step entry (MIDI / mic) with automatic string choice.
- [ ] 10.6 Import / export: JSON, ASCII tab (both ways) + tests, MusicXML export + tests (validated against a sample file), print stylesheet, share link, backup integration.
- [ ] 10.7 Learning overlays: degree labels, colour by function, scale check, Jam Room ↔ editor links.
- [ ] 10.8 `<TabView>` in MDX, a few licks added to Modules 5 and 7, the short lesson; page tests (`SheetEditor.test.tsx`: create a score from the Tools menu, enter notes by fretboard and keyboard, undo, survives a reload, export ASCII tab) and bilingual UI strings.
- [ ] Later: MusicXML import, a second voice (bass + melody), grand staff for piano (two hands), Guitar Pro file import.

**Open decisions (to confirm with the user before starting):**
1. Scope: *riff / lick / solo tab with staff* (this plan) — or a **chord sheet** (lyrics + chords above them, the "sheet hợp âm" used for singing) — or both? A chord-sheet mode is simple to add (text + chord symbols, transpose, print) and could be done first as a small step.
2. Piano: staff only on a single treble staff in this phase, grand staff later — OK?
3. VexFlow as a new dependency (MIT, loaded only on this page) instead of drawing the staff by hand — OK?
4. Editing on phones: view + simple tap entry only, full editing on desktop — OK?

✅ *Expected result: write a lick or solo as tab + staff, hear it back with the cursor and fretboard following, see each note's degree against the chord, and save, print, export or share it.*

## 10. Status (2026-10-21)

All 6 original phases are done: 50 bilingual lessons (Modules 0–10 and the guitar track), Explorer, Key Explorer, chord identifier, Jam Room, comping practice page, spaced-repetition review, real-instrument input, PWA.

Phase 7 (chord reflex training) was finished on 2026-10-18, Phase 8 (fretboard note reflex training) on 2026-10-19 and Phase 9 (metronome) on 2026-10-21. Phase 10 (sheet & tab editor) is planned, waiting for the open decisions to be confirmed.

Added later: the **Chord shapes** page (`#/chords`, Tools menu) — an automatic shape finder (`src/theory/guitarShapes.ts`) for 31 chord types (adding m(maj7), 7♭5, 7♯5, 6/9, 9sus4, 7♭9, 7♯9, 11, m11, 13) at several positions, with fingering and barres; changing each chord's shape right on the Guitar comping page; lesson R7 "Chord shapes". In the Jam Room, changing the key transposes the typed progression, and presets follow the selected key. The note reflex trainer lets users set how many frets their neck has (12–24, default 22 — e.g. 20 on a Taylor 214ce), with an advanced per-string override for necks whose strings have different fret counts; the upper zone runs from fret 12 to the last fret (at most 23, so zones stay unambiguous).

Metronome sound (2026-10-20): every click (Jam Room, guitar comping, chord and note reflex) now goes through `src/audio/click.ts`. The old square wave at C6/G5 was harsh in headphones, so the default is a soft sine tick; a *Metronome sound* pop-over next to each tempo slider picks soft / wood block / sharp (the old sound) and the volume, remembered in `mtl:click` and applied live.

Ideas for later:
- Real guitar samples instead of PluckSynth (needs a sample source with a clear licence).
- Staff notation (VexFlow / abcjs) for piano learners.
- More analysis examples from Vietnamese songs (chord progressions only).
- A similar comping track for piano (left hand, comping).
- The `@tailwindcss/typography` dependency pulls in `postcss-selector-parser`, which has a moderate security advisory (build time only) — update when a fix is released.

---

## 7. Conventions

- **Commits**: Conventional Commits (`feat:`, `fix:`, `content:`, `docs:`…) in English, so the history is easy to read.
- **Code**: comments, test names and docs in English. Vietnamese appears only in user-facing content (UI strings in `src/i18n/messages.ts`, `.mdx` lessons, localized data such as `{ vi, en }` names).
- **Branches**: working directly on `main` is fine (personal repo); branch off for big experiments.
- **Note names**: letter names by default (C D E F G A B) — common among Vietnamese guitar/piano players through chord charts. Do-Re-Mi display is optional.
- **Sharps / flats**: spelled for the key (F major uses B♭, not A#) — tonal handles this.
- **Licensing**:
  - Source code: **MIT** licence.
  - Audio samples: only free samples with a clear licence (e.g. Salamander Grand Piano – CC-BY), credited in the README.
  - Song examples: only **chord progressions** for analysis (no lyrics or full scores).

---

## 8. Open questions

Things that can be decided along the way:
1. Show staff notation (sheet music) for piano? → Phase 10 proposes **VexFlow** (staff + tab); grand staff for piano comes later.
2. Optimise the UI for phones from the start, or prioritise desktop (the virtual fretboard is wide)?
3. Which Vietnamese songs to use as progression analysis examples in Module 4 and as examples for each comping rhythm?
4. Build a similar comping track for piano (left-hand comping, arpeggio patterns, comping)?

---

## 9. Next step

Confirm the open decisions of **Phase 10** (sheet & tab editor), then start with task 10.1 (the score model).
