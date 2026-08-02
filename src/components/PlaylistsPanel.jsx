import { useState } from 'react';

export default function PlaylistsPanel({ playlists, onSave, onLoad, onDelete, canSave }) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(true);

  function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  }

  return (
    <section className="playlists">
      <button
        type="button"
        className="playlists__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="playlists__label">SAVED PLAYLISTS</span>
        <span className="playlists__count">{playlists.length}</span>
      </button>

      {open && (
        <div className="playlists__body">
          <form className="playlists__save-row" onSubmit={handleSave}>
            <input
              id="patchdeck-playlist-name"
              name="playlistName"
              className="playlists__input"
              type="text"
              placeholder="Name this queue…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canSave}
              aria-label="New playlist name"
            />
            <button type="submit" className="playlists__save" disabled={!canSave || !name.trim()}>
              Save current queue
            </button>
          </form>

          {playlists.length === 0 ? (
            <p className="playlists__empty">No saved playlists yet.</p>
          ) : (
            <ul className="playlists__list">
              {playlists.map((p) => (
                <li key={p.id} className="playlists__row">
                  <button className="playlists__load" onClick={() => onLoad(p.id)}>
                    <span className="playlists__name">{p.name}</span>
                    <span className="playlists__meta">{p.tracks.length} tracks</span>
                  </button>
                  <button
                    className="playlists__delete"
                    onClick={() => onDelete(p.id)}
                    aria-label={`Delete playlist ${p.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
