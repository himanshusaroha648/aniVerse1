import { Link } from 'react-router-dom';

function EpisodeCard({ episode, seriesSlug }) {
  return (
    <Link
      to={`/series/${seriesSlug}/episode/${episode.id}`}
      className="card-hover group relative block overflow-hidden rounded-2xl bg-card"
    >
      <img
        src={episode.thumbnail || '/placeholder.jpg'}
        alt={`${episode.title} thumbnail`}
        loading="lazy"
        className="w-full aspect-video object-cover transition duration-300 group-hover:scale-105"
      />
      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
        EP {episode.number}
      </span>
      <div className="p-4">
        <p className="text-sm text-muted">{episode.duration}</p>
        <h4 className="mt-1 text-base font-semibold text-white">{episode.title}</h4>
      </div>
    </Link>
  );
}

export default EpisodeCard;
