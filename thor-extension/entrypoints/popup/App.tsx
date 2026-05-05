import { useEffect, useState } from 'react';
import { analyzePrompt, type PromptAnalysis } from '../../src/lib/analyzePrompt';
import '../../src/styles.css';

const SUPPORTED_HOST = 'claude.ai';

async function getPrompt(): Promise<{ state: 'unsupported' | 'empty' | 'ready'; analysis?: PromptAnalysis }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !new URL(tab.url).hostname.includes(SUPPORTED_HOST)) {
    return { state: 'unsupported' };
  }

  const response = await chrome.tabs.sendMessage(tab.id, { type: 'THOR_READ_PROMPT' }).catch(() => null);
  const promptText = (response?.text || '').trim();

  if (!promptText) return { state: 'empty' };

  return { state: 'ready', analysis: analyzePrompt(promptText) };
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<Awaited<ReturnType<typeof getPrompt>> | null>(null);

  useEffect(() => {
    getPrompt().then((data) => {
      setResult(data);
      setLoading(false);
    });
  }, []);

  return (
    <main className="thor-shell">
      <header className="thor-header">
        <p className="thor-kicker">THOR</p>
        <h1>Prompt Scanner</h1>
      </header>

      {loading && <section className="card">Scanning active Claude prompt…</section>}

      {!loading && result?.state === 'unsupported' && <section className="card">Open Claude to scan your prompt.</section>}

      {!loading && result?.state === 'empty' && <section className="card">No active prompt found.</section>}

      {!loading && result?.state === 'ready' && result.analysis && (
        <section className="card">
          <div className="metric"><span>Estimated tokens</span><strong>{result.analysis.estimatedTokens.toLocaleString()}</strong></div>
          <div className="metric"><span>Waste level</span><strong className={`level ${result.analysis.wasteLevel}`}>{result.analysis.wasteLevel}</strong></div>
          <div>
            <h2>Issues</h2>
            <ul>
              {result.analysis.issues.length ? result.analysis.issues.map((issue) => <li key={issue}>{issue}</li>) : <li>No major issues detected.</li>}
            </ul>
          </div>
          <p className="suggestion">{result.analysis.suggestion}</p>
        </section>
      )}

      <footer className="thor-footer">Claude first · ChatGPT next · Cursor coming soon</footer>
    </main>
  );
}
