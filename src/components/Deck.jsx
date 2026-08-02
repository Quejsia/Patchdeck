import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  ShuffleIcon,
  RepeatIcon,
} from './Icons';

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

const TICK_COUNT = 48;

export default function Deck({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  error,
  canGoPrevNext,
  isLooping,
  isShuffled,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onRemove,
  onToggleLoop,
  onToggleShuffle,
}) {
  const progress = duration > 0 ? currentTime / duration : 0;
  const litTicks = Math.round(progress * TICK_COUNT);
  const volumePercent = Math.round(volume * 100);

  function handleDialClick(e) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  }

  function handleDialKeyDown(e) {
    if (!duration) return;
    const step = 5;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + step));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSeek(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSeek(duration);
    }
  }

  return (
    <section className="deck">
      <div className="deck__readout">
        <span
          className={`deck__lamp ${isPlaying ? 'deck__lamp--on' : ''} ${
            error ? 'deck__lamp--error' : ''
          }`}
        />
        <div className="deck__nowplaying">
          <span className="deck__label">{error ? 'PLAYBACK ERROR' : 'NOW PLAYING'}</span>
          <span className={`deck__title ${error ? 'deck__title--error' : ''}`}>
            {error || (track ? track.title : 'No signal')}
          </span>
        </div>
        {track && (
          <button className="deck__remove" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <div
        className="dial"
        onClick={handleDialClick}
        onKeyDown={handleDialKeyDown}
        role="slider"
        tabIndex={track ? 0 : -1}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
      >
        {Array.from({ length: TICK_COUNT }).map((_, i) => (
          <span key={i} className={`dial__tick ${i < litTicks ? 'dial__tick--lit' : ''}`} />
        ))}
      </div>
      <div className="deck__time">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="transport">
        <button
          className={`transport__btn transport__btn--toggle ${isShuffled ? 'transport__btn--active' : ''}`}
          onClick={onToggleShuffle}
          aria-label={isShuffled ? 'Shuffle on' : 'Shuffle off'}
          aria-pressed={isShuffled}
          title="Shuffle"
        >
          <ShuffleIcon />
        </button>
        <button
          className="transport__btn"
          onClick={onPrev}
          aria-label="Previous track"
          disabled={!canGoPrevNext}
        >
          <SkipBackIcon />
        </button>
        <button
          className="transport__btn transport__btn--main"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={!track}
        >
          {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </button>
        <button
          className="transport__btn"
          onClick={onNext}
          aria-label="Next track"
          disabled={!canGoPrevNext}
        >
          <SkipForwardIcon />
        </button>
        <button
          className={`transport__btn transport__btn--toggle ${isLooping ? 'transport__btn--active' : ''}`}
          onClick={onToggleLoop}
          aria-label={isLooping ? 'Repeat on' : 'Repeat off'}
          aria-pressed={isLooping}
          title="Repeat one"
        >
          <RepeatIcon />
        </button>

        <div className="volume">
          <span className="volume__label">VOL</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            style={{
              background: `linear-gradient(to right, var(--amber) ${volumePercent}%, var(--panel-line) ${volumePercent}%)`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
