import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EpisodeCard from '../components/EpisodeCard.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';
import SeriesCard from '../components/SeriesCard.jsx';
import { fetchSeriesMetadata, fetchLibrary } from '../api/client.js';
import NotFound from './NotFound.jsx';

function Series() {
        const { id } = useParams();
        const navigate = useNavigate();
        const [series, setSeries] = useState(null);
        const [loading, setLoading] = useState(true);
        const [selectedSeason, setSelectedSeason] = useState('1');
        const [error, setError] = useState(null);
        const [suggestedAnime, setSuggestedAnime] = useState([]);

        useEffect(() => {
                setLoading(true);
                setError(null);
                fetchSeriesMetadata(id)
                        .then((meta) => {
                                if (meta.type === 'movie') {
                                        navigate(`/movie/${id}`, { replace: true });
                                        return;
                                }
                                setSeries(meta);
                                const defaultSeason = Object.keys(meta.seasons || {})[0] || '1';
                                setSelectedSeason(defaultSeason);
                        })
                        .catch(() => {
                                setSeries(null);
                                setError('Series not found');
                        })
                        .finally(() => setLoading(false));
        }, [id, navigate]);

        useEffect(() => {
                if (!series) return;
                
                fetchLibrary()
                        .then((library) => {
                                if (!Array.isArray(library) || library.length === 0) {
                                        setSuggestedAnime([]);
                                        return;
                                }
                                
                                const animeList = library.filter(
                                        (item) => item && item.type === 'series' && item.slug && item.slug !== id
                                );
                                
                                if (animeList.length === 0) {
                                        setSuggestedAnime([]);
                                        return;
                                }
                                
                                const seriesGenres = series.genres || [];
                                const withMatchingGenres = animeList.filter((anime) => {
                                        const animeGenres = anime.genres || [];
                                        return seriesGenres.some((genre) => animeGenres.includes(genre));
                                });
                                
                                const suggestionPool = withMatchingGenres.length >= 3 ? withMatchingGenres : animeList;
                                const shuffled = suggestionPool.sort(() => 0.5 - Math.random());
                                const count = Math.min(5, Math.floor(Math.random() * 3) + 3);
                                setSuggestedAnime(shuffled.slice(0, count));
                        })
                        .catch(() => setSuggestedAnime([]));
        }, [series, id]);

        const episodes = useMemo(() => {
                if (!series || !selectedSeason) return [];
                const list = series.episodes?.[selectedSeason] || [];
                return list.map((episode) => ({
                        id: episode.id || `${selectedSeason}-${episode.number}`,
                        number: episode.number,
                        title: episode.title || `Episode ${episode.number}`,
                        duration: episode.duration || '',
                        thumbnail: episode.thumbnail || '/placeholder.jpg',
                        description: episode.description || ''
                }));
        }, [series, selectedSeason]);

        if (error && !loading) {
                return <NotFound />;
        }

        if (loading || !series) {
                return (
                        <section className="mx-auto max-w-6xl px-4 py-16">
                                <div className="grid gap-8 md:grid-cols-[220px,1fr]">
                                        <div className="w-full aspect-[2/3] rounded-3xl bg-card/50" />
                                        <div className="space-y-4">
                                                <div className="h-10 rounded bg-card/50" />
                                                <div className="h-4 rounded bg-card/40" />
                                                <div className="glass-surface rounded-3xl p-6">
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                                {Array.from({ length: 4 }).map((_, index) => (
                                                                        <SkeletonCard key={index} />
                                                                ))}
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        </section>
                );
        }

        return (
                <section className="mx-auto max-w-6xl px-4 py-16">
                        <div className="grid gap-10 md:grid-cols-[220px,1fr]">
                                <img
                                        src={series.poster || '/placeholder.jpg'}
                                        alt={`${series.title} poster`}
                                        className="w-full aspect-[2/3] rounded-3xl object-cover shadow-lg"
                                />
                                <div className="space-y-4">
                                        <div>
                                                <p className="text-sm text-muted">
                                                        <Link to="/" className="hover:text-primary">
                                                                Home
                                                        </Link>{' '}
                                                        / Series
                                                </p>
                                                <h1 className="mt-2 text-3xl font-semibold text-white">{series.title}</h1>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-sm text-muted">
                                                <span>{series.release_year || series.year}</span>
                                                <span>·</span>
                                                <span>{series.status || 'Unknown status'}</span>
                                                <span>·</span>
                                                <span>
                                                        {series.totalEpisodes ||
                                                                Object.values(series.seasons || {}).reduce(
                                                                        (total, arr) => total + arr.length,
                                                                        0
                                                                )}{' '}
                                                        episodes
                                                </span>
                                        </div>
                                        <p className="text-muted/80">{series.description || 'Description unavailable.'}</p>
                                        <div className="flex flex-wrap gap-2">
                                                {(series.genres || []).map((genre) => (
                                                        <span
                                                                key={genre}
                                                                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                                                        >
                                                                {genre}
                                                        </span>
                                                ))}
                                        </div>
                                        <div className="glass-surface rounded-3xl border border-white/5 p-6">
                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                        <h2 className="text-lg font-semibold text-white">Episodes</h2>
                                                        <div className="rounded-full border border-white/10 bg-card px-3 py-1 text-sm text-muted">
                                                                <select
                                                                        value={selectedSeason}
                                                                        onChange={(event) => setSelectedSeason(event.target.value)}
                                                                        className="bg-transparent focus:outline-none"
                                                                        aria-label="Select season"
                                                                >
                                                                        {Object.keys(series.seasons || { 1: [] }).map((season) => (
                                                                                <option key={season} value={season}>
                                                                                        Season {season}
                                                                                </option>
                                                                        ))}
                                                                </select>
                                                        </div>
                                                </div>
                                                {episodes.length === 0 ? (
                                                        <p className="mt-4 text-sm text-muted">
                                                                No episodes listed for this season. The API may need to refresh the JSON cache.
                                                        </p>
                                                ) : (
                                                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                                {episodes.map((episode) => (
                                                                        <EpisodeCard key={episode.id} episode={episode} seriesSlug={series.slug} />
                                                                ))}
                                                        </div>
                                                )}
                                        </div>
                                </div>
                        </div>

                        {suggestedAnime.length > 0 && (
                                <div className="mx-auto max-w-6xl px-4 pb-16">
                                        <h2 className="text-2xl font-semibold text-white mb-6">Suggested Anime</h2>
                                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                                {suggestedAnime.map((anime) => (
                                                        <SeriesCard key={anime.slug} series={anime} />
                                                ))}
                                        </div>
                                </div>
                        )}
                </section>
        );
}

export default Series;
