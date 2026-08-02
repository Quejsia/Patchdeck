import { useState } from 'react';
import { generateSyncCode, normalizeSyncCode } from '../utils/syncCode';
import { pushSession, pullSession } from '../lib/syncApi';

export default function SyncPanel({ syncCode, onGenerate, onConnect, onDisconnect }) {
  const [inputCode, setInputCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleGenerate() {
    setBusy(true);
    setStatus(null);
    try {
      const code = generateSyncCode();
      await pushSession(code, onGenerate());
      setStatus({ type: 'ok', message: 'Code created — enter it on your other device.' });
      onConnect(code, null);
    } catch {
      setStatus({ type: 'error', message: "Couldn't create a code. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect() {
    const code = normalizeSyncCode(inputCode);
    if (!code) return;
    setBusy(true);
    setStatus(null);
    try {
      const remote = await pullSession(code);
      if (!remote) {
        setStatus({ type: 'error', message: 'No queue found for that code.' });
        return;
      }
      onConnect(code, remote);
      setStatus({ type: 'ok', message: 'Connected — queues merged.' });
      setInputCode('');
    } catch {
      setStatus({ type: 'error', message: "Couldn't connect. Check the code and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sync">
      <div className="sync__header">
        <span className="sync__label">SYNC ACROSS DEVICES</span>
      </div>

      {syncCode ? (
        <div className="sync__connected">
          <p className="sync__code-display">
            <span>Syncing with</span>
            <strong>{syncCode}</strong>
          </p>
          <p className="sync__hint">
            Enter this code on another device to bring your queue along. Local
            uploads don't sync — only links do.
          </p>
          <button className="sync__disconnect" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <div className="sync__actions">
          <button className="sync__generate" onClick={handleGenerate} disabled={busy}>
            Generate sync code
          </button>
          <div className="sync__connect-row">
            <input
              id="patchdeck-sync-code-input"
              name="syncCode"
              className="sync__input"
              type="text"
              placeholder="Enter code"
              aria-label="Sync code from another device"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              disabled={busy}
            />
            <button
              className="sync__connect"
              onClick={handleConnect}
              disabled={busy || !inputCode.trim()}
            >
              Connect
            </button>
          </div>
        </div>
      )}

      {status && <p className={`sync__status sync__status--${status.type}`}>{status.message}</p>}
    </section>
  );
}
