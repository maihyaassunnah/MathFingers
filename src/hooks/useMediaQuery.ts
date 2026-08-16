import { useState, useEffect } from 'react';

/**
 * Custom hook to detect media query matching in real-time.
 * Defaults to desktop breakpoint 'md' (min-width: 768px).
 *
 * @param query CSS media query string, e.g. '(min-width: 768px)'
 * @returns boolean indicating if the current viewport matches the query
 */
export function useMediaQuery(query: string = '(min-width: 768px)'): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const updateMatch = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches);
    };

    // Set initial matching state
    setMatches(mediaQueryList.matches);

    // Modern event listener support
    try {
      mediaQueryList.addEventListener('change', updateMatch);
      return () => mediaQueryList.removeEventListener('change', updateMatch);
    } catch {
      // Legacy browser support
      mediaQueryList.addListener(updateMatch);
      return () => mediaQueryList.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}
