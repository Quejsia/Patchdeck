import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const AudioSource = forwardRef(function AudioSource(
  { src, autoplay, volume, onEnded, onError },
  ref
) {
  const audioRef = useRef(null);
  const lastSrc = useRef(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current || !src || src === lastSrc.current) return;
    lastSrc.current = src;
    audioRef.current.src = src;
    audioRef.current.load();
    if (autoplay) audioRef.current.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useImperativeHandle(ref, () => ({
    play: () => audioRef.current && audioRef.current.play().catch(() => {}),
    pause: () => audioRef.current && audioRef.current.pause(),
    seekTo: (t) => {
      if (audioRef.current) audioRef.current.currentTime = t;
    },
    setVolume: (v) => {
      if (audioRef.current) audioRef.current.volume = v;
    },
    getCurrentTime: () => (audioRef.current ? audioRef.current.currentTime || 0 : 0),
    getDuration: () => (audioRef.current ? audioRef.current.duration || 0 : 0),
  }));

  return <audio ref={audioRef} preload="metadata" onEnded={onEnded} onError={onError} />;
});

export default AudioSource;
