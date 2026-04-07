import { useEffect, useState } from 'react';

const CACHE_KEY = 'tmt-club-crests';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  url: string | null;
  ts: number;
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full
  }
}

/** Normalise a club name into a search string TheSportsDB can find. */
function toSearchName(name: string): string {
  return name
    .replace(/ FC$| AFC$/, '')
    .replace(/\bUtd\b/, 'United')
    .replace(/\bDons\b/, 'Dons')
    .trim();
}

const inflight = new Map<string, Promise<string | null>>();

async function fetchBadgeUrl(clubName: string): Promise<string | null> {
  const cache = readCache();
  const entry = cache[clubName];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.url;

  if (inflight.has(clubName)) return inflight.get(clubName)!;

  const promise = (async () => {
    const search = toSearchName(clubName);
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(search)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as { teams?: { strSport: string; strBadge: string | null }[] };
      if (data.teams) {
        const soccer = data.teams.find((t) => t.strSport === 'Soccer');
        if (soccer?.strBadge) {
          const next = readCache();
          next[clubName] = { url: soccer.strBadge, ts: Date.now() };
          writeCache(next);
          return soccer.strBadge;
        }
      }
      // Cache miss too so we don't retry immediately
      const next = readCache();
      next[clubName] = { url: null, ts: Date.now() };
      writeCache(next);
    } catch {
      // network error – don't cache
    } finally {
      inflight.delete(clubName);
    }
    return null;
  })();

  inflight.set(clubName, promise);
  return promise;
}

export default function ClubCrest({ clubName, size = 48 }: { clubName: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(() => {
    const cache = readCache();
    const entry = cache[clubName];
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.url;
    return null;
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchBadgeUrl(clubName).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [clubName]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${clubName} crest`}
      width={size}
      height={size}
      className={`inline-block object-contain ${loaded ? 'opacity-100' : 'opacity-0'}`}
      style={{ transition: 'opacity 0.2s' }}
      onLoad={() => setLoaded(true)}
      onError={() => setSrc(null)}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
    />
  );
}
