import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout';
import Home from './pages/Home';
import TaskDetail from './pages/TaskDetail';
import Other from './pages/Other';
import UsageStats from './pages/UsageStats';
import StartupTip from './components/StartupTip';
import { useSettingsStore } from './store/settingsStore'
import { Toaster } from 'sonner'

function App() {
  const { settings, loadSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const root = document.documentElement;

    // Handle Tailwind's dark mode class
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set data-theme for other theme variations (like 'pink')
    root.setAttribute('data-theme', settings.theme);

    // Add a class to the body for smooth transitions
    document.body.classList.add('theme-transition');
  }, [settings.theme]);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="task/:id" element={<TaskDetail />} />
            <Route path="settings" element={<Other />} />
            <Route path="usage-stats" element={<UsageStats />} />
          </Route>
        </Routes>
      </Router>
      <StartupTip />
      <Toaster richColors position="top-center" duration={2000} />
    </>
  );
}

export default App
