import { NavLink, Outlet } from 'react-router'
import { Segmented } from '../components/ui/Segmented'
import { useSettings } from '../store/settingsContext'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-stone-200 font-medium dark:bg-stone-800' : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'}`

export function Layout() {
  const { instrument, setInstrument } = useSettings()
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            Music Theory Learner
          </NavLink>
          <nav aria-label="Chính" className="flex gap-1">
            <NavLink to="/" end className={navClass}>
              Lộ trình
            </NavLink>
            <NavLink to="/explorer" className={navClass}>
              Explorer
            </NavLink>
            <NavLink to="/jam" className={navClass}>
              Jam Room
            </NavLink>
          </nav>
          <div className="ml-auto">
            <Segmented
              label="Nhạc cụ của tôi"
              value={instrument}
              onChange={setInstrument}
              options={[
                { value: 'guitar', label: 'Guitar' },
                { value: 'piano', label: 'Piano' },
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
