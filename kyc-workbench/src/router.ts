import { useEffect, useState } from 'react';

export function useHashRoute(): string[] {
  const parse = () => window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  const [parts, setParts] = useState(parse);
  useEffect(() => {
    const on = () => {
      setParts(parse());
      document.querySelector('main')?.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export const go = (path: string) => {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
};

export const href = (path: string) => `#${path.startsWith('/') ? path : `/${path}`}`;
