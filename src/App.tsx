import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout';
import Home from './pages/Home';
import TaskDetail from './pages/TaskDetail';
import Other from './pages/Other';
import UsageStats from './pages/UsageStats';
import TaskCalendar from './pages/TaskCalendar';
import StartupTip from './components/StartupTip';
import LiquidGlassRuntime from './components/LiquidGlassRuntime';
import UpdateNotifier from './components/UpdateNotifier';
import { useNativePinMode } from './hooks/useNativePinMode';
import { useSettingsStore } from './store/settingsStore'
import { Toaster } from 'sonner'
import { TooltipLayer } from './ui/TooltipLayer';
import { useContextMenuGuard } from './hooks/useGlobalInteractionGuards';

function App() {
  useContextMenuGuard();
  const theme = useSettingsStore(state => state.settings.theme);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const compact = useSettingsStore(state => state.settings.collapseMode !== 'expanded');
  const zenModeActive = useSettingsStore(state => state.settings.zenMode?.enabled === true && state.settings.zenMode.active && state.settings.collapseMode === 'expanded');

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useNativePinMode(zenModeActive || compact);
  useEffect(() => {
    document.documentElement.dataset.zenMode = String(zenModeActive);
    return () => { delete document.documentElement.dataset.zenMode; };
  }, [zenModeActive]);

  useEffect(() => {
    const root = document.documentElement;

    // Handle Tailwind's dark mode class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set data-theme for other theme variations (like 'pink')
    root.setAttribute('data-theme', theme);

    // Add a class to the body for smooth transitions
    document.body.classList.add('theme-transition');
  }, [theme]);

  return (
    <>
      <LiquidGlassRuntime />
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="task/:id" element={<TaskDetail />} />
            <Route path="settings" element={<Other />} />
            <Route path="usage-stats" element={<UsageStats />} />
            <Route path="task-calendar" element={<TaskCalendar />} />
          </Route>
        </Routes>
      </Router>
      <StartupTip />
      <UpdateNotifier />
      <TooltipLayer />
      {!compact && <Toaster richColors position="top-center" duration={2000} />}
    </>
  );
}

export default App
