import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Segmented } from '../components/ui/Segmented'
import type { MessageKey } from '../i18n/messages'
import { useT } from '../i18n/useT'
import { useLiveInput } from '../input/useLiveInput'
import { useSettings } from '../store/settingsContext'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${isActive ? 'bg-stone-200 font-medium dark:bg-stone-800' : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'}`

const MAIN: { to: string; label: MessageKey; end?: boolean }[] = [
  { to: '/', label: 'nav.curriculum', end: true },
  { to: '/review', label: 'nav.review' },
  { to: '/jam', label: 'nav.jam' },
  { to: '/rhythm', label: 'nav.rhythm' },
  { to: '/reflex/chords', label: 'nav.reflex' },
]

const TOOLS: { to: string; label: MessageKey }[] = [
  { to: '/chords', label: 'nav.chords' },
  { to: '/explorer', label: 'nav.explorer' },
  { to: '/keys', label: 'nav.keys' },
  { to: '/identify', label: 'nav.identify' },
  { to: '/connect', label: 'nav.connect' },
]

export function Layout() {
  const { instrument, setInstrument, setLocale } = useSettings()
  const { t, locale } = useT()
  const location = useLocation()
  const live = useLiveInput()
  const tools = useRef<HTMLDetailsElement>(null)
  const inTools = TOOLS.some((x) => location.pathname.startsWith(x.to))

  // Close the Tools menu on navigation.
  useEffect(() => {
    if (tools.current) tools.current.open = false
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            Music Theory Learner
          </NavLink>
          <nav aria-label={t('nav.main')} className="flex flex-wrap items-center gap-1">
            {MAIN.map((x) => (
              <NavLink key={x.to} to={x.to} end={x.end} className={navClass}>
                {t(x.label)}
              </NavLink>
            ))}
            <details ref={tools} className="relative">
              <summary className={`${navClass({ isActive: inTools })} cursor-pointer list-none`}>{t('nav.tools')} ▾</summary>
              <div className="absolute z-20 mt-1 flex min-w-44 flex-col rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                {TOOLS.map((x) => (
                  <NavLink key={x.to} to={x.to} className={navClass}>
                    {t(x.label)}
                  </NavLink>
                ))}
              </div>
            </details>
          </nav>
          <div className="ml-auto flex items-end gap-4">
            {live.status === 'on' && (
              <NavLink to="/connect" className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {t(live.source === 'midi' ? 'live.pillMidi' : 'live.pillMic')}
              </NavLink>
            )}
            <Segmented
              label={t('nav.myInstrument')}
              value={instrument}
              onChange={setInstrument}
              options={[
                { value: 'guitar', label: t('common.guitar') },
                { value: 'piano', label: t('common.piano') },
              ]}
            />
            <Segmented
              label={t('nav.language')}
              value={locale}
              onChange={setLocale}
              options={[
                { value: 'vi', label: 'VI' },
                { value: 'en', label: 'EN' },
              ]}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
