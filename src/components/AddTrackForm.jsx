import { useMemo, useRef, useState } from 'react';
import { detectLink } from '../utils/linkDetector';

export default function AddTrackForm({ onAdd, onAddFiles, onAddMultiple }) {
  const [value, setValue] = useState('');
  const fileInputRef = useRef(null);

  const detected = useMemo(() => (value.trim() ? detectLink(value) : null), [value]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text');
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      onAddMultiple(lines);
    }
    // Single-line paste falls through to normal input behavior.
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('audio/'));
    if (files.length) onAddFiles(files);
    e.target.value = '';
  }

  return (
    <div className="input-row">
      <form className="jack" onSubmit={handleSubmit}>
        <span className="jack__prompt" aria-hidden="true">IN&nbsp;/</span>
        <input
          id="patchdeck-link-input"
          name="link"
          className="jack__input"
          type="text"
          inputMode="url"
          placeholder="paste any link… youtube or direct audio"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={handlePaste}
          aria-label="Paste a link to play"
        />
        <span className={`jack__badge jack__badge--${detected ? detected.type : 'idle'}`}>
          {detected ? (detected.type === 'youtube' ? 'YT' : 'AUDIO') : '\u2013\u2013'}
        </span>
        <button type="submit" className="jack__submit" disabled={!value.trim()}>
          Plug in
        </button>
      </form>

      <button
        type="button"
        className="upload-btn"
        onClick={() => fileInputRef.current.click()}
      >
        <span aria-hidden="true">⤒</span> Upload local file
      </button>
      <input
        ref={fileInputRef}
        id="patchdeck-file-input"
        name="localFile"
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={handleFiles}
      />
    </div>
  );
}
