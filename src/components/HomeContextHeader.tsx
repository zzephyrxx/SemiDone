import { useRotatingQuote } from '../hooks/useRotatingQuote';
import { useSettingsStore } from '../store/settingsStore';

export default function HomeContextHeader() {
  const theme = useSettingsStore(state => state.settings.theme);
  const quote = useRotatingQuote(theme);
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return <header className="home-context-row">
    <time dateTime={date}>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)}</time>
    <p key={quote} className="home-quote" aria-label="励志短语" title={quote}>{quote}</p>
  </header>;
}
