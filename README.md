# Music Theory Learner

A hands-on music theory course for people who **can already play** guitar or piano, so you can understand how songs are put together, accompany them and **improvise**. The app is bilingual, English and Vietnamese (use the EN / VI switch in the top bar).

*Tiếng Việt: ứng dụng học nhạc lý thực hành cho người đã biết chơi guitar hoặc piano — bấm nút VI ở thanh trên để dùng bản tiếng Việt.*

**Try it:** https://anh-08.github.io/music-theory-learner/ (installable on your phone as an app and works offline).

Detailed plan: [PLAN.md](PLAN.md)

## What's inside

- **A 51-lesson curriculum** (Modules 0 – 10 plus a guitar track): the 12 notes, intervals, the major scale, the circle of fifths, triads, inversions, CAGED, diatonic chords, progressions, blues, pentatonics, seventh chords, chord tones, guide tones, modes, secondary dominants, borrowed chords, songwriting, and a **guitar rhythm comping** track (fingerpicking and strumming). Every lesson is shown on the fretboard or the keyboard depending on your instrument, with audio examples, quizzes, play-it-on-the-instrument exercises and ear training.
- **Explorer**: scales and chords on guitar, piano, bass, ukulele and mandolin.
- **Jam Room**: type a progression (chord symbols or Roman numerals); the app detects the key, plays a drums – bass – comping backing track, highlights the notes of the chord currently sounding in real time and suggests scales to improvise with. Changing the key transposes the progression.
- **Guitar comping**: 26 strumming / picking rhythms (including 3/4, 6/8 and 12/8) on a rhythm grid with a playhead, gradual tempo increase, custom rhythms, timing feedback through the mic, and per-chord shape selection.
- **Chord shapes**: many fingerings for every chord (major, minor, sus, dim, aug, 6, 7, maj7, m7♭5, dim7, 9, 11, 13, 7♭9, 7♯9…) with diagrams, finger numbers, barres and a listen button.
- **Chord reflex**: chords keep appearing with the metronome, never repeating a fixed loop but always connecting smoothly (familiar loops, function-based generation, your own, or a "chaos" mode with any chord from any key); strum on the beat or play one rhythm pass per chord, preview the next chord, Easy / Medium / Hard levels.
- **Note reflex**: see a note name, play it on the fretboard without counting frets. Targets are located by neck zone (frets 0–11 / 12–22) on a small neck, or by octave name (E2, E3) in advanced mode; one string, note + string, find every position, exact pitch, or inside a fret window; time limit or metronome; answer by clicking or on a real instrument (mic / MIDI); weak positions come back more often, with a blind-spot heat map and personal records after each session.
- **Tools**: Key Explorer (circle of fifths, diatonic chords and their functions), chord identifier, real-instrument input (MIDI or mic).
- **Sheet & tab editor**: write riffs, licks and solos as tab + staff (VexFlow) by clicking the fretboard, typing Guitar Pro style shortcuts or playing a MIDI keyboard / into the mic; techniques (hammer-on, pull-off, slide, bends, vibrato, palm mute…), repeats and chord symbols; playback with the cursor and fretboard following, loops and speed control; labels showing each note's interval to the chord, coloured by chord tone / scale tone / outside note; export to text tab, MusicXML or PDF, import text tab, share by link (the score lives in the URL), and a two-way bridge with the Jam Room.
- **Metronome**: tap tempo, any time signature (odd meters with groupings, compound meters by dotted quarter or eighth), subdivisions and swing, per-beat accents, speed trainer, muted bars, session timer, visual-only mode.
- **Daily review**: 7 decks of randomly generated questions on a spaced-repetition schedule.
- Progress is stored in your browser and can be exported / imported as JSON. No accounts, no data sent anywhere.

## Running locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build into `dist/` |
| `npm test` | Run the tests once (added / renamed a lesson file the tests don't see? delete `node_modules/.vitest-cache`) |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run lint` | Lint with oxlint |

## Project structure

| Folder | Contents |
|---|---|
| `src/theory/` | Pure music theory (no React dependency): notes, intervals, scales, chords, progressions, keys, guitar shapes… |
| `src/audio/` | Audio with Tone.js: note playback, the Jam backing track, comping rhythms, grooves |
| `src/input/` | Real instruments: Web MIDI, pitch and onset detection through the mic |
| `src/components/` | Fretboard, keyboard, rhythm grid, and the components used in lessons and exercises |
| `src/features/` | Pages: curriculum, lessons, Explorer, Jam Room, guitar comping, keys, chord identifier, metronome, sheet & tab editor, review, connect |
| `src/lessons/` | MDX lessons: `<module>/<NN-slug>.mdx` (Vietnamese) and `.en.mdx` (English) |
| `src/i18n/` | Interface strings in both languages |

Lesson folder and file names are Vietnamese slugs (e.g. `m1-quang` = intervals). They are part of lesson URLs and saved progress keys, so they stay as they are.

### Adding a lesson

Create `src/lessons/<module>/<NN-slug>.mdx` with `export const meta = { title, description, minutes }`, write the content in Markdown and use the components from `src/lessons/mdxComponents.ts` directly (`<Show>`, `<Play>`, `<PlayChords>`, `<Jam>`, `<RhythmPlayer>`, `<TabView>`, `<Quiz>`, `<FindNotes>`, `<EarQuiz>`…). Add an `.en.mdx` version with **the same exercise `id`s**. The tests check that every lesson renders in both languages and on both instruments, that ids are unique, and that both versions have the same set of exercises.

## Deployment

Every push to `main` runs GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)): lint, test, build and publish to GitHub Pages.

## License

Source code: [MIT](LICENSE).

Piano sound: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm (CC-BY 3.0), loaded from the copy hosted by [Tone.js](https://tonejs.github.io/). Music theory logic is built on [tonal](https://github.com/tonaljs/tonal); scores are drawn with [VexFlow](https://github.com/vexflow/vexflow) (MIT). Song examples in the lessons only mention the song title and its chord progression.
