import { useEffect, useMemo, useState } from 'react';
import { analyzePrompt, type PromptAnalysis } from '../../src/lib/analyzePrompt';
import '../../src/styles.css';

type ScanState = 'loading' | 'unsupported' | 'empty' | 'done' | 'error';

export function App() {
  const [state, setState] = useState<ScanState>('loading');
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);

  useEffect(() => {
    const runScan = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url?.includes('claude.ai')) {
          setState('unsupported');
          return;
        }

        const response = await chrome.tabs.sendMessage(tab.id, { type: 'THOR_READ_PROMPT' }) as { promptText?: string };
        const promptText = response?.promptText?.trim() ?? '';

        if (!promptText) {
          setState('empty');
          return;
        }

        setAnalysis(analyzePrompt(promptText));
        setState('done');
      } catch {
        setState('error');
      }
    };

    runScan();
  }, []);

  const wasteClass = useMemo(() => {
    if (!analysis) return '';
    return `waste-${analysis.wasteLevel}`;
  }, [analysis]);

  return (
    <main className="thor-popup">
      <header>
        <p className="eyebrow">THOR</p>
        <h1>Prompt Scanner</h1>
      </header>

      {state === 'loading' && <p className="muted">Scanning current prompt…</p>}
      {state === 'unsupported' && <p className="muted">Open Claude to scan your prompt.</p>}
      {state === 'empty' && <p className="muted">No active prompt found.</p>}
      {state === 'error' && <p className="muted">Unable to scan this page right now.</p>}

      {state === 'done' && analysis && (
        <section className="report">
          <div className="card">
            <span>Estimated tokens</span>
            <strong>{analysis.estimatedTokens.toLocaleString()}</strong>
          </div>
          <div className={`card ${wasteClass}`}>
            <span>Waste level</span>
            <strong>{analysis.wasteLevel.toUpperCase()}</strong>
          </div>
          <div className="card">
            <span>Issues</span>
            <ul>
              {analysis.issues.length > 0 ? analysis.issues.map((issue) => <li key={issue}>{issue}</li>) : <li>No major issues detected</li>}
            </ul>
          </div>
          <div className="card suggestion">
            <span>Suggested action</span>
            <p>{analysis.suggestion}</p>
          </div>
        </section>
      )}

      <footer>Claude first · ChatGPT next · Cursor coming soon</footer>
    </main>
  );
}
