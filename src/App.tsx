import { HashRouter, Link, Route, Routes } from 'react-router'
import { Layout } from './app/Layout'
import { useT } from './i18n/useT'
import { Home } from './features/curriculum/Home'
import { Explorer } from './features/explorer/Explorer'
import { JamRoomPage } from './features/jam/JamRoomPage'
import { LessonPage } from './features/lesson/LessonPage'
import { ProgressProvider } from './store/ProgressProvider'
import { SettingsProvider } from './store/SettingsProvider'

function NotFound() {
  const { t } = useT()
  return (
    <p className="py-16 text-center">
      {t('notFound.page')}{' '}
      <Link to="/" className="text-rose-600 underline">
        {t('notFound.back')}
      </Link>
    </p>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="learn/:moduleId/:slug" element={<LessonPage />} />
        <Route path="explorer" element={<Explorer />} />
        <Route path="jam" element={<JamRoomPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

// HashRouter: GitHub Pages không hỗ trợ chuyển hướng mọi đường dẫn về index.html.
function App() {
  return (
    <HashRouter>
      <SettingsProvider>
        <ProgressProvider>
          <AppRoutes />
        </ProgressProvider>
      </SettingsProvider>
    </HashRouter>
  )
}

export default App
