import { useState } from 'react';
import { clubBadgeUrls } from '../clubBadgeUrls';

export default function ClubCrest({ clubName, size = 48 }: { clubName: string; size?: number }) {
  const src = clubBadgeUrls[clubName] ?? null;
  const [loaded, setLoaded] = useState(false);

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
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      referrerPolicy="no-referrer"
    />
  );
}
