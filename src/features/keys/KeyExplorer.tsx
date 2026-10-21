import { useState } from 'react'
import { Link } from 'react-router'
import { CircleOfFifths } from '../../components/lesson/CircleOfFifths'
import { PlayChords } from '../../components/lesson/PlayChords'
import { Show } from '../../components/lesson/Show'
import { Segmented } from '../../components/ui/Segmented'
import { useT } from '../../i18n/useT'
import { usePersistentState } from '../../store/usePersistentState'
import { diatonicChords, displayNote, keyLabel, keySignature, relatedKeys, type ChordFunction, type KeyRef } from '../../theory'

const FN_KEY: Record<ChordFunction, 'keys.fnT' | 'keys.fnS' | 'keys.fnD'> = { T: 'keys.fnT', S: 'keys.fnS', D: 'keys.fnD' }
const FN_CLASS: Record<ChordFunction, string> = {
  T: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  S: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  D: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
}

export function KeyExplorer() {
  const { t, locale } = useT()
  const [key, setKey] = usePersistentState<KeyRef>('keys.key', { tonic: 'C', mode: 'major' })
  const [sevenths, setSevenths] = useState(false)

  const chords = diatonicChords(key, sevenths)
  const sig = keySignature(key)
  const { relative, parallel } = relatedKeys(key)
  const accidentals = [...sig.sharps, ...sig.flats]
  const sigText = accidentals.length
    ? `${accidentals.length}${sig.sharps.length ? '♯' : '♭'} (${accidentals.map(displayNote).join(' ')})`
    : t('keys.noAccidentals')

  const pop = key.mode === 'major' ? [0, 4, 5, 3] : [0, 5, 2, 6]
  const progression = pop.map((d) => diatonicChords(key)[d].symbol).join(' ')
  const progressionRoman = pop.map((d) => diatonicChords(key)[d].roman).join(' – ')
  const majorV = key.mode === 'minor' ? `${diatonicChords(key)[4].root}` : null
  const keyParam = key.mode === 'major' ? key.tonic : `${key.tonic}m`

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{t('keys.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">{t('keys.intro')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <CircleOfFifths selected={key} onSelect={setKey} />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">{keyLabel(key, locale)}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-stone-500">{t('keys.signature')}</dt>
            <dd>{sigText}</dd>
            <dt className="text-stone-500">{t('keys.relative')}</dt>
            <dd>
              <button type="button" onClick={() => setKey(relative)} className="text-rose-600 hover:underline">
                {keyLabel(relative, locale)}
              </button>
            </dd>
            <dt className="text-stone-500">{t('keys.parallel')}</dt>
            <dd>
              <button type="button" onClick={() => setKey(parallel)} className="text-rose-600 hover:underline">
                {keyLabel(parallel, locale)}
              </button>
            </dd>
          </dl>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-semibold">{t('keys.chords')}</h3>
            <Segmented
              label=""
              value={sevenths ? '7' : '3'}
              onChange={(v) => setSevenths(v === '7')}
              options={[
                { value: '3', label: t('keys.triads') },
                { value: '7', label: t('keys.sevenths') },
              ]}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-stone-500">
                <tr>
                  <th className="py-1 pr-3">{t('keys.degree')}</th>
                  <th className="py-1 pr-3">{t('keys.chord')}</th>
                  <th className="py-1 pr-3">{t('keys.function')}</th>
                  <th className="py-1">{t('keys.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {chords.map((c) => (
                  <tr key={c.degree} className="border-t border-stone-200 dark:border-stone-800">
                    <td className="py-1.5 pr-3 font-mono">{c.roman}</td>
                    <td className="py-1.5 pr-3">
                      <PlayChords chords={c.symbol} seconds={1.6} />
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${FN_CLASS[c.function]}`}>{t(FN_KEY[c.function])}</span>
                    </td>
                    <td className="py-1.5 text-stone-600 dark:text-stone-400">{c.notes.map(displayNote).join(' – ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {majorV && <p className="text-sm text-stone-600 dark:text-stone-400">{t('keys.minorNote', { chord: displayNote(majorV) })}</p>}
          <Link to={`/jam?${new URLSearchParams({ p: progression, key: keyParam })}`} className="inline-block text-sm text-rose-600 hover:underline">
            {t('keys.jam', { progression: progressionRoman })}
          </Link>
        </section>
      </div>

      <section>
        <h3 className="font-semibold">{t('keys.scale')}</h3>
        <Show root={key.tonic} scale={key.mode === 'major' ? 'major' : 'aeolian'} labels="interval" frets={15} neck />
      </section>
    </div>
  )
}
