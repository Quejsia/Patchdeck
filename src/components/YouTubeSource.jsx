import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useYouTubeApi } from '../hooks/useYouTubeApi';

const YouTubeSource = forwardRef(function YouTubeSource(
  { videoId, autoplay, volume, onReady, onEnded, onError },
  ref
) {
  const YT = useYouTubeApi();
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const lastLoadedId = useRef(null);
  const [ready, setReady] = useState(false);

  // Keep the latest prop/callback values in refs so the player's event
  // handlers — registered once, when the player is first created — always
  // call the current version instead of a closure frozen at mount time.
  const volumeRef = useRef(volume);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  function safeCall(fn) {
    if (!playerRef.current) return null;
    try {
      return fn(playerRef.current);
    } catch {
      return null;
    }
  }

  // The player is created exactly ONCE and reused for every track. Rapidly
  // mashing Next/Prev used to destroy and rebuild a whole cross-origin
  // iframe each time, which could race and leave playback stuck — reusing
  // one instance (YouTube's own recommended pattern for playlist-style
  // switching) avoids that class of bug entirely.
  useEffect(() => {
    if (!YT || playerRef.current) return;
    playerRef.current = new YT.Player(mountRef.current, {
      // YouTube's IFrame API requires embedded players to be at least
      // 200x200 or playback silently gets stuck — we hide it off-screen
      // with CSS instead of shrinking it.
      height: '200',
      width: '200',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1 },
      events: {
        onReady: () => {
          setReady(true);
          onReadyRef.current && onReadyRef.current();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            safeCall((p) => p.unMute());
            safeCall((p) => p.setVolume(Math.round(volumeRef.current * 100)));
          }
          if (e.data === YT.PlayerState.ENDED) {
            onEndedRef.current && onEndedRef.current();
          }
        },
        onError: (e) => {
          onErrorRef.current && onErrorRef.current(e.data);
        },
      },
    });
    return () => {
      safeCall((p) => p.destroy());
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [YT]);

  // Swap videos on the same player instance whenever the requested
  // videoId changes, instead of remounting the whole component.
  useEffect(() => {
    if (!ready) return;
    if (!videoId) {
      // Nothing should be playing (queue cleared, or switched to a
      // non-YouTube track) — forget what was loaded so that re-adding the
      // same video later is treated as fresh, not "already loaded".
      lastLoadedId.current = null;
      safeCall((p) => p.pauseVideo());
      return;
    }
    if (videoId === lastLoadedId.current) return;
    lastLoadedId.current = videoId;
    safeCall((p) => {
      p.mute();
      if (autoplay) p.loadVideoById(videoId);
      else p.cueVideoById(videoId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, videoId]);

  useImperativeHandle(ref, () => ({
    play: () => {
      if (!ready) return;
      safeCall((p) => p.mute());
      safeCall((p) => p.playVideo());
    },
    pause: () => ready && safeCall((p) => p.pauseVideo()),
    seekTo: (t) => ready && safeCall((p) => p.seekTo(t, true)),
    setVolume: (v) => ready && safeCall((p) => p.setVolume(Math.round(v * 100))),
    getCurrentTime: () => (ready ? safeCall((p) => p.getCurrentTime()) || 0 : 0),
    getDuration: () => (ready ? safeCall((p) => p.getDuration()) || 0 : 0),
  }));

  return (
    <div className="hidden-mount" aria-hidden="true">
      <div ref={mountRef} />
    </div>
  );
});

export default YouTubeSource;
