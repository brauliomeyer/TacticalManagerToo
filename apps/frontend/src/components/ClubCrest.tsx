import { clubBadgeUrls } from '../clubBadgeUrls';

export default function ClubCrest({ clubName, size = 48 }: { clubName: string; size?: number }) {
  const src = clubBadgeUrls[clubName] ?? null;

  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${clubName} crest`}
      width={size}
      height={size}
      className="inline-block object-contain"
      referrerPolicy="no-referrer"
    />
  );
}
