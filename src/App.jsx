import { useEffect, useRef, useState } from 'react';
import AddTrackForm from './components/AddTrackForm';
import Queue from './components/Queue';
import Deck from './components/Deck';
import SyncPanel from './components/SyncPanel';
import PlaylistsPanel from './components/PlaylistsPanel';
import YouTubeSource from './components/YouTubeSource';
import AudioSource from './components/AudioSource';
import { detectLink, guessTitleFromUrl, fetchYouTubeTitle } from './utils/linkDetector';
import { pullSession, pushSession } from './lib/syncApi';
import { saveFileBlob, getFileBlob, deleteFileBlob } from './lib/localFilesDb';
import { useMediaSession } from './hooks/useMediaSession';
import './App.css';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SYNC_CODE_STORAGE_KEY = 'patchdeck-sync-code';
const QUEUE_STORAGE_KEY = 'patchdeck-queue-v2';
const PLAYLISTS_STORAGE_KEY = 'patchdeck-playlists-v1';
const MAX_BULK_LINKS = 30;
const BULK_PASTE_COOLDOWN_MS = 5000;

function loadSavedQueue() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY));
    if (!saved || !Array.isArray(saved.tracks)) return null;
    return saved;
  } catch {
    return null;
  }
}

function loadSavedPlaylists() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYLISTS_STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Strips the ephemeral blob URL from upload tracks before saving to
// localStorage/playlists — the URL dies on reload regardless, but the
// underlying file itself lives in IndexedDB keyed by this same id, so it
// can be re-attached later via rehydrateUploadTracks.
function serializeTracks(tracks) {
  return tracks.map((t) =>
    t.type === 'upload' ? { id: t.id, type: t.type, title: t.title, videoId: null } : t
  );
}

// Re-attaches a fresh blob URL to any upload track that's missing one, by
// looking up its stored File in IndexedDB. Tracks whose file is gone
// (cleared browser storage, etc.) are dropped rather than left broken.
async function rehydrateUploadTracks(tracks) {
  const resolved = await Promise.all(
    tracks.map(async (t) => {
      if (t.type !== 'upload' || t.url) return t;
      try {
        const blob = await getFileBlob(t.id);
        if (!blob) return null;
        return { ...t, url: URL.createObjectURL(blob), isObjectUrl: true };
      } catch {
        return null;
      }
    })
  );
  return resolved.filter(Boolean);
}

const YT_ERROR_MESSAGES = {
  2: "That's not a valid video link.",
  5: "This video can't play in an embedded player.",
  100: 'Video not found — it may be private or deleted.',
  101: "This video's owner has disabled embedding, so it can't play here.",
  150: "This video's owner has disabled embedding, so it can't play here.",
};

// Combines two track lists without duplicates, keyed by URL (not id, since
// ids are randomly generated per-device and won't match across devices for
// what is actually the same track). Upload tracks are never merged in from
// a remote source — see the sync-push effect for why.
function mergeTracks(localTracks, remoteTracks) {
  const seen = new Set(localTracks.map((t) => t.url));
  const merged = [...localTracks];
  for (const t of remoteTracks || []) {
    if (!seen.has(t.url)) {
      merged.push(t);
      seen.add(t.url);
    }
  }
  return merged;
}

export default function App() {
  const [tracks, setTracks] = useState(() => loadSavedQueue()?.tracks ?? []);
  const [currentIndex, setCurrentIndex] = useState(() => loadSavedQueue()?.currentIndex ?? -1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => loadSavedQueue()?.volume ?? 0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(null);
  const [syncCode, setSyncCode] = useState(null);
  const [isLooping, setIsLooping] = useState(() => loadSavedQueue()?.isLooping ?? false);
  const [isShuffled, setIsShuffled] = useState(() => loadSavedQueue()?.isShuffled ?? false);
  const [playlists, setPlaylists] = useState(loadSavedPlaylists);

  // On first load, re-attach real blob URLs to any uploaded files restored
  // from localStorage (which only ever stores their id/title, never the
  // dead ephemeral URL). If the track that was playing gets dropped
  // because its file is gone, currentIndex resets rather than pointing at
  // the wrong track.
  useEffect(() => {
    const hasPendingUploads = tracks.some((t) => t.type === 'upload' && !t.url);
    if (!hasPendingUploads) return;
    const previousCurrentId = tracks[currentIndex]?.id ?? null;
    rehydrateUploadTracks(tracks).then((resolved) => {
      setTracks(resolved);
      if (previousCurrentId) {
        setCurrentIndex(resolved.findIndex((t) => t.id === previousCurrentId));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On first load, if this browser was previously synced, pull that queue
  // in automatically.
  useEffect(() => {
    const saved = localStorage.getItem(SYNC_CODE_STORAGE_KEY);
    if (!saved) return;
    setSyncCode(saved);
    pullSession(saved)
      .then((remote) => {
        if (!remote) return;
        setTracks((prev) => mergeTracks(prev, remote.queue));
        if (typeof remote.volume === 'number') setVolume(remote.volume);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the queue locally so it survives a refresh — separate from and
  // independent of the sync-code feature; private to this one browser only.
  useEffect(() => {
    const toSave = {
      tracks: serializeTracks(tracks),
      currentIndex,
      volume,
      isLooping,
      isShuffled,
    };
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Storage full or disabled — not worth surfacing to the user.
    }
  }, [tracks, currentIndex, volume, isLooping, isShuffled]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
    } catch {
      // Storage full or disabled — not worth surfacing to the user.
    }
  }, [playlists]);

  // Both sources stay mounted for the app's whole lifetime — we just feed
  // whichever one is "active" a videoId/src and drive that one. Switching
  // tracks no longer destroys and rebuilds a player, which is what made
  // rapid Next/Prev/Remove mashing on YouTube tracks fragile before.
  const youtubeRef = useRef(null);
  const audioRef = useRef(null);
  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;
  const activeRef = currentTrack?.type === 'youtube' ? youtubeRef : audioRef;

  // Mirrors currentIndex so addTrack/addFiles can check "was the queue
  // empty" against the real current value instead of a stale closure.
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  const lastBulkPasteRef = useRef(0);

  function addTrack(rawUrl) {
    const detected = detectLink(rawUrl);
    const track = {
      id: makeId(),
      url: detected.url,
      type: detected.type,
      videoId: detected.videoId,
      title: detected.type === 'youtube' ? 'Loading title…' : guessTitleFromUrl(detected.url),
    };
    setTracks((prev) => [...prev, track]);

    if (detected.type === 'youtube') {
      fetchYouTubeTitle(detected.videoId).then((title) => {
        if (!title) return;
        setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, title } : t)));
      });
    }

    const wasEmpty = currentIndexRef.current === -1;
    setCurrentIndex((idx) => (idx === -1 ? 0 : idx));
    if (wasEmpty) setIsPlaying(true);
  }

  function addMultipleTracks(urls) {
    const now = Date.now();
    if (now - lastBulkPasteRef.current < BULK_PASTE_COOLDOWN_MS) return;
    lastBulkPasteRef.current = now;

    const capped = urls.slice(0, MAX_BULK_LINKS);
    const newTracks = capped.map((rawUrl) => {
      const detected = detectLink(rawUrl);
      return {
        id: makeId(),
        url: detected.url,
        type: detected.type,
        videoId: detected.videoId,
        title: detected.type === 'youtube' ? 'Loading title…' : guessTitleFromUrl(detected.url),
      };
    });

    setTracks((prev) => [...prev, ...newTracks]);

    newTracks.forEach((t) => {
      if (t.type !== 'youtube') return;
      fetchYouTubeTitle(t.videoId).then((title) => {
        if (!title) return;
        setTracks((prev) => prev.map((x) => (x.id === t.id ? { ...x, title } : x)));
      });
    });

    const wasEmpty = currentIndexRef.current === -1;
    setCurrentIndex((idx) => (idx === -1 ? 0 : idx));
    if (wasEmpty) setIsPlaying(true);
  }

  function addFiles(files) {
    const newTracks = files.map((file) => {
      const id = makeId();
      saveFileBlob(id, file).catch(() => {});
      return {
        id,
        url: URL.createObjectURL(file),
        type: 'upload',
        videoId: null,
        title: file.name.replace(/\.[a-zA-Z0-9]+$/, ''),
        isObjectUrl: true,
      };
    });
    setTracks((prev) => [...prev, ...newTracks]);
    const wasEmpty = currentIndexRef.current === -1;
    setCurrentIndex((idx) => (idx === -1 ? 0 : idx));
    if (wasEmpty) setIsPlaying(true);
  }

  function removeTrack(index) {
    setTracks((prev) => {
      const removed = prev[index];
      if (removed && removed.type === 'upload') {
        if (removed.isObjectUrl) URL.revokeObjectURL(removed.url);
        deleteFileBlob(removed.id).catch(() => {});
      }
      return prev.filter((_, i) => i !== index);
    });
    if (index === currentIndex) {
      setIsPlaying(false);
      setCurrentIndex(-1);
    } else if (index < currentIndex) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function clearQueue() {
    tracks.forEach((t) => {
      if (t.type === 'upload') {
        if (t.isObjectUrl) URL.revokeObjectURL(t.url);
        deleteFileBlob(t.id).catch(() => {});
      }
    });
    setTracks([]);
    setCurrentIndex(-1);
    currentIndexRef.current = -1;
    setIsPlaying(false);
  }

  function playAt(index) {
    setCurrentIndex(index);
    setIsPlaying(true);
  }

  function togglePlay() {
    if (!currentTrack) return;
    setIsPlaying((p) => !p);
  }

  function handleYouTubeError(code) {
    setIsPlaying(false);
    setPlaybackError(YT_ERROR_MESSAGES[code] || `Playback error (code ${code}).`);
  }

  function handleAudioError() {
    setIsPlaying(false);
    setPlaybackError(
      "Couldn't load that link — check the URL, or the host may not allow direct playback."
    );
  }

  // Auto-push to Supabase whenever the synced queue/state changes — local
  // uploads are excluded since blob URLs (and even the IndexedDB-stored
  // file itself) only exist on this one device and would be useless on
  // another one.
  useEffect(() => {
    if (!syncCode) return;
    const syncableTracks = tracks.filter((t) => t.type !== 'upload');
    const timer = setTimeout(() => {
      pushSession(syncCode, {
        queue: syncableTracks,
        currentIndex,
        volume,
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [tracks, currentIndex, volume, syncCode]);

  function handleSyncConnect(code, remote) {
    setSyncCode(code);
    localStorage.setItem(SYNC_CODE_STORAGE_KEY, code);
    if (remote) {
      setTracks((prev) => mergeTracks(prev, remote.queue));
      if (typeof remote.volume === 'number') setVolume(remote.volume);
    }
  }

  function handleSyncDisconnect() {
    setSyncCode(null);
    localStorage.removeItem(SYNC_CODE_STORAGE_KEY);
  }

  function savePlaylist(name) {
    const playlist = {
      id: makeId(),
      name,
      tracks: serializeTracks(tracks),
      createdAt: Date.now(),
    };
    setPlaylists((prev) => [playlist, ...prev]);
  }

  function loadPlaylist(id) {
    const playlist = playlists.find((p) => p.id === id);
    if (!playlist) return;

    // Load whatever's available immediately (no async lookup needed) so
    // playback starts right in response to the click — awaiting an
    // IndexedDB read first can silently break the browser's "this play()
    // was triggered by a real click" allowance, leaving audio stuck
    // paused with no visible error.
    const immediate = playlist.tracks.filter((t) => t.type !== 'upload');
    setTracks(immediate);
    setCurrentIndex(immediate.length ? 0 : -1);
    setIsPlaying(immediate.length > 0);

    const uploadTracks = playlist.tracks.filter((t) => t.type === 'upload');
    if (uploadTracks.length === 0) return;
    rehydrateUploadTracks(uploadTracks).then((resolved) => {
      setTracks((prev) => [...prev, ...resolved]);
      if (immediate.length === 0 && resolved.length > 0) {
        setCurrentIndex(0);
        setIsPlaying(true);
      }
    });
  }

  function deletePlaylist(id) {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }

  function next() {
    if (tracks.length === 0) return;
    if (isShuffled && tracks.length > 1) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * tracks.length);
      } while (randomIndex === currentIndex);
      setCurrentIndex(randomIndex);
    } else {
      setCurrentIndex((i) => (i + 1) % tracks.length);
    }
    setIsPlaying(true);
  }

  function prev() {
    if (tracks.length === 0) return;
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }

  // Called when a track finishes naturally. Loop replays the same track;
  // otherwise it behaves like pressing Next (shuffle-aware).
  function handleTrackEnded() {
    if (isLooping && activeRef.current) {
      activeRef.current.seekTo(0);
      activeRef.current.play();
      return;
    }
    next();
  }

  function toggleLoop() {
    setIsLooping((v) => !v);
  }

  function toggleShuffle() {
    setIsShuffled((v) => !v);
  }

  function reorderTracks(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    setTracks((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    setCurrentIndex((prevIndex) => {
      if (prevIndex === fromIndex) return toIndex;
      if (fromIndex < prevIndex && toIndex >= prevIndex) return prevIndex - 1;
      if (fromIndex > prevIndex && toIndex <= prevIndex) return prevIndex + 1;
      return prevIndex;
    });
  }

  // Reflect play/pause state onto whichever source is active, and make
  // sure the inactive one (if any) is paused so two things can't play
  // at once when switching between a YouTube track and an audio track.
  useEffect(() => {
    if (!currentTrack) {
      youtubeRef.current && youtubeRef.current.pause();
      audioRef.current && audioRef.current.pause();
      return;
    }
    const inactiveRef = currentTrack.type === 'youtube' ? audioRef : youtubeRef;
    inactiveRef.current && inactiveRef.current.pause();
    if (!activeRef.current) return;
    if (isPlaying) activeRef.current.play();
    else activeRef.current.pause();
  }, [isPlaying, currentTrack?.id, currentTrack?.type]);

  // Keep the active source's volume in sync with the slider.
  useEffect(() => {
    if (activeRef.current) activeRef.current.setVolume(volume);
  }, [volume, currentTrack?.id]);

  // Poll playback position — YouTube's API has no timeupdate event, so a
  // single interval keeps both source types in sync the same way.
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError(null);
    if (!currentTrack) return;
    const id = setInterval(() => {
      if (!activeRef.current) return;
      setCurrentTime(activeRef.current.getCurrentTime());
      setDuration(activeRef.current.getDuration());
    }, 400);
    return () => clearInterval(id);
  }, [currentTrack?.id]);

  // Surfaces Now Playing + play/pause/skip on the OS lock screen and
  // notification controls, and is what makes mobile browsers much more
  // willing to keep audio going while backgrounded or locked.
  useMediaSession({
    track: currentTrack,
    isPlaying,
    currentTime,
    duration,
    onTogglePlay: togglePlay,
    onNext: next,
    onPrev: prev,
    onSeekBy: (delta) =>
      activeRef.current && activeRef.current.seekTo(Math.max(0, currentTime + delta)),
  });

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="wordmark">Patchdeck</h1>
        <p className="tagline">
          Paste a link or upload a file. YouTube, direct audio, or local — auto-detected.
        </p>
      </header>

      <AddTrackForm onAdd={addTrack} onAddFiles={addFiles} onAddMultiple={addMultipleTracks} />

      <div className="layout">
        <Deck
          track={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          error={playbackError}
          canGoPrevNext={tracks.length > 1}
          isLooping={isLooping}
          isShuffled={isShuffled}
          onTogglePlay={togglePlay}
          onNext={next}
          onPrev={prev}
          onSeek={(t) => activeRef.current && activeRef.current.seekTo(t)}
          onVolumeChange={setVolume}
          onRemove={() => currentIndex >= 0 && removeTrack(currentIndex)}
          onToggleLoop={toggleLoop}
          onToggleShuffle={toggleShuffle}
        />

        <Queue
          tracks={tracks}
          currentIndex={currentIndex}
          onSelect={playAt}
          onRemove={removeTrack}
          onClear={clearQueue}
          onReorder={reorderTracks}
        />
      </div>

      <PlaylistsPanel
        playlists={playlists}
        onSave={savePlaylist}
        onLoad={loadPlaylist}
        onDelete={deletePlaylist}
        canSave={tracks.length > 0}
      />

      <SyncPanel
        syncCode={syncCode}
        onGenerate={() => ({
          queue: tracks.filter((t) => t.type !== 'upload'),
          currentIndex,
          volume,
        })}
        onConnect={handleSyncConnect}
        onDisconnect={handleSyncDisconnect}
      />

      <YouTubeSource
        ref={youtubeRef}
        videoId={currentTrack?.type === 'youtube' ? currentTrack.videoId : null}
        autoplay={isPlaying && currentTrack?.type === 'youtube'}
        volume={volume}
        onEnded={handleTrackEnded}
        onError={handleYouTubeError}
      />
      <AudioSource
        ref={audioRef}
        src={currentTrack && currentTrack.type !== 'youtube' ? currentTrack.url : null}
        autoplay={isPlaying && currentTrack?.type !== 'youtube'}
        volume={volume}
        onEnded={handleTrackEnded}
        onError={handleAudioError}
      />

      <footer className="app__footer">
        Direct links (.mp3, .wav, streams) and local uploads keep playing in
        the background and work offline. YouTube links play audio-only via a
        hidden player, but YouTube pauses itself when the tab isn't in the
        foreground — that's a YouTube limitation, not a Patchdeck one.
        Installable as an app — look for "Install" in your browser's menu.
      </footer>
    </div>
  );
}
