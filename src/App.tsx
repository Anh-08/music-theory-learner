import { Explorer } from './features/explorer/Explorer'

function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Music Theory Learner</h1>
          <span className="text-sm text-stone-500">Explorer</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Explorer />
      </main>
    </div>
  )
}

export default App
