import { useState } from 'react';

export default function Queue({ tracks, currentIndex, onSelect, onRemove, onClear, onReorder }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  if (tracks.length === 0) {
    return (
      <div className="queue queue--empty">
        <p>Nothing queued yet. Paste a link above to load the first track.</p>
      </div>
    );
  }

  function handleDragStart(e, index) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setData to be called for drag to actually start.
    e.dataTransfer.setData('text/plain', String(index));
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== overIndex) setOverIndex(index);
  }

  function handleDrop(e, index) {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      onReorder(dragIndex, index);
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="queue-wrap">
      <div className="queue__header">
        <span className="queue__count">{tracks.length} queued</span>
        <button className="queue__clear" onClick={onClear}>
          Clear queue
        </button>
      </div>
      <ol className="queue">
        {tracks.map((track, i) => (
          <li
            key={track.id}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={`queue__row ${i === currentIndex ? 'queue__row--active' : ''} ${
              i === overIndex && dragIndex !== null && dragIndex !== i
                ? 'queue__row--drag-over'
                : ''
            } ${i === dragIndex ? 'queue__row--dragging' : ''}`}
          >
            <span className="queue__handle" aria-hidden="true">
              ⠿
            </span>
            <button className="queue__select" onClick={() => onSelect(i)}>
              <span className="queue__index">{String(i + 1).padStart(2, '0')}</span>
              <span className={`queue__tag queue__tag--${track.type}`}>
                {track.type === 'youtube' ? 'YT' : track.type === 'upload' ? 'FILE' : 'AUD'}
              </span>
              <span className="queue__title">{track.title}</span>
            </button>
            <div className="queue__row-actions">
              <div className="queue__move-pair">
                <button
                  className="queue__move"
                  onClick={() => i > 0 && onReorder(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move ${track.title} up`}
                >
                  ▲
                </button>
                <button
                  className="queue__move"
                  onClick={() => i < tracks.length - 1 && onReorder(i, i + 1)}
                  disabled={i === tracks.length - 1}
                  aria-label={`Move ${track.title} down`}
                >
                  ▼
                </button>
              </div>
              <button
                className="queue__remove"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${track.title} from queue`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
