import { useEffect } from 'react';

/**
 * Wires the current track + transport controls into the browser's Media
 * Session API. This is what puts Patchdeck on the lock screen / notification
 * shade on mobile and in the OS media overlay on desktop, and is also what
 * makes mobile browsers much more willing to keep audio playing when the
 * tab is backgrounded or the screen is locked — without it, background
 * playback is unreliable on several mobile browsers regardless of anything
 * else in the app.
 */
export function useMediaSession({
  track,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onPrev,
  onSeekBy,
}) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (!track) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'Patchdeck',
      album:
        track.type === 'youtube' ? 'YouTube' : track.type === 'upload' ? 'Local file' : 'Direct link',
    });
  }, [track]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Some Android OEM skins won't fully render (or keep alive) the media
  // notification without valid position data — this is a real, separate
  // requirement from just setting metadata.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (!track || !duration || !Number.isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // Invalid state (e.g. mid-transition between tracks) — safe to skip.
    }
  }, [track, currentTime, duration]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers = [
      ['play', () => !isPlaying && onTogglePlay()],
      ['pause', () => isPlaying && onTogglePlay()],
      ['previoustrack', onPrev],
      ['nexttrack', onNext],
      ['seekbackward', () => onSeekBy(-10)],
      ['seekforward', () => onSeekBy(10)],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions aren't supported in every browser — safe to ignore.
      }
    });

    return () => {
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // no-op
        }
      });
    };
  }, [isPlaying, onTogglePlay, onNext, onPrev, onSeekBy]);
}
