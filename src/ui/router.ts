import { useEffect, useState } from 'react';

/** Hash routes reload safely under any GitHub Pages project subpath. */
export function parseHash(h: string): string[] {
  return h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

export function useRoute(): string[] {
  const [r, setR] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setR(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

let depth = 0;
if (typeof window !== 'undefined') window.addEventListener('popstate', () => (depth = Math.max(0, depth - 1)));

export function go(path: string, opts: { replace?: boolean } = {}) {
  const h = `#/${path.replace(/^\//, '')}`;
  if (!opts.replace && location.hash !== h) depth += 1;
  if (opts.replace) {
    history.replaceState(history.state, '', h);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (location.hash !== h) location.hash = h;
}

/** In-app back. Falls back to a known screen when there is no in-app history to return to. */
export function back(fallback: string) {
  if (depth > 0) history.back();
  else go(fallback, { replace: true });
}
