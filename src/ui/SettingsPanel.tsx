import { useMemo, useState } from 'react';
import type { GameState } from '../game/types';
import { exportSave, importSave } from '../save';

interface SettingsPanelProps {
  game: GameState;
  onImport: (game: GameState) => void;
}

export function SettingsPanel({ game, onImport }: SettingsPanelProps) {
  const exportText = useMemo(() => exportSave(game), [game]);
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportText);
      setStatus('Save copied to clipboard.');
    } catch {
      setStatus('Clipboard access is unavailable. Select and copy the save text.');
    }
  }

  function downloadExport() {
    const url = URL.createObjectURL(new Blob([exportText], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'guildmasters-ledger-save.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function handleImport() {
    let imported: GameState;
    try {
      imported = importSave(importText.trim());
    } catch {
      setError('That save is invalid or unsupported.');
      setStatus('');
      return;
    }

    if (!window.confirm('Import this save and replace the current game?')) return;
    onImport(imported);
    setError('');
    setStatus('Save imported.');
  }

  return (
    <section aria-labelledby="settings-heading" className="settings">
      <h2 id="settings-heading">Settings</h2>
      <div className="save-section">
        <h3>Export save</h3>
        <label htmlFor="export-save">Save data (base64)</label>
        <textarea id="export-save" readOnly rows={5} value={exportText} />
        <div className="button-row">
          <button onClick={copyExport} type="button">
            Copy
          </button>
          <button onClick={downloadExport} type="button">
            Download .txt
          </button>
        </div>
      </div>
      <div className="save-section">
        <h3>Import save</h3>
        <label htmlFor="import-save">Paste save data</label>
        <textarea
          id="import-save"
          onChange={(event) => setImportText(event.target.value)}
          rows={5}
          value={importText}
        />
        <button onClick={handleImport} type="button">
          Import
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
