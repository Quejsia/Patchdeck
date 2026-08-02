import { useEffect, useState } from 'react';

let apiPromise = null;

function loadYouTubeApi() {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });

  return apiPromise;
}

/** Returns window.YT once the IFrame API has finished loading (null until then). */
export function useYouTubeApi() {
  const [YT, setYT] = useState(window.YT && window.YT.Player ? window.YT : null);

  useEffect(() => {
    let mounted = true;
    loadYouTubeApi().then((ytApi) => {
      if (mounted) setYT(ytApi);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return YT;
}
