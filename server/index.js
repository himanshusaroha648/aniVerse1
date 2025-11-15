import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const DATA_ROOT = path.resolve('data');

// Check if data directory exists
try {
        await fs.access(DATA_ROOT);
} catch (error) {
        console.error('⚠️  ERROR: data/ folder not found!');
        console.error('📁 Please create a data/ folder and add your anime/series JSON files');
        console.error(`📍 Expected location: ${DATA_ROOT}`);
}

app.use(cors());
app.use(express.json());

// Root endpoint - helpful message
app.get('/', (req, res) => {
        res.json({
                message: '🎬 AniVerse API Server',
                status: 'running',
                endpoints: {
                        library: '/api/library',
                        series: '/api/series',
                        movies: '/api/movies',
                        latestEpisodes: '/api/latest-episodes',
                        seriesDetail: '/api/series/:slug',
                        movieDetail: '/api/movies/:slug',
                        episode: '/api/series/:slug/episode/:season-:episode'
                },
                note: 'Frontend is available at https://aniverse1.onrender.com/api/'
        });
});

async function safeReadJSON(filePath) {
        try {
                const raw = await fs.readFile(filePath, 'utf-8');
                return JSON.parse(raw);
        } catch {
                return null;
        }
}

function formatTitle(slug) {
        return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function inferPosterFromEpisodes(seriesDir) {
        try {
                const seasons = await fs.readdir(seriesDir, { withFileTypes: true });
                for (const seasonDir of seasons) {
                        if (!seasonDir.isDirectory() || !seasonDir.name.startsWith('season-')) continue;
                        const files = await fs.readdir(path.join(seriesDir, seasonDir.name));
                        for (const file of files) {
                                if (!file.startsWith('episode-') || !file.endsWith('.json')) continue;
                                const episode = await safeReadJSON(path.join(seriesDir, seasonDir.name, file));
                                const thumb =
                                        episode?.episode_main_poster ||
                                        episode?.episode_card_thumbnail ||
                                        episode?.episode_list_thumbnail ||
                                        episode?.thumbnail;
                                if (thumb) return thumb;
                        }
                }
        } catch {
                /* ignore */
        }
        return null;
}
async function findActualSlug(slug) {
        try {
                const dirents = await fs.readdir(DATA_ROOT, { withFileTypes: true });
                const lowerSlug = slug.toLowerCase();
                for (const dirent of dirents) {
                        if (dirent.isDirectory() && dirent.name.toLowerCase() === lowerSlug) {
                                return dirent.name;
                        }
                }
                return slug;
        } catch {
                return slug;
        }
}


async function detectEntryType(slug) {
        const seriesDir = path.join(DATA_ROOT, slug);
        const dirents = await fs.readdir(seriesDir, { withFileTypes: true });
        let hasSeason = false;
        let hasMovie = false;

        for (const dirent of dirents) {
                if (dirent.isFile() && dirent.name === 'movie.json') {
                        hasMovie = true;
                }
                if (dirent.isDirectory() && dirent.name.startsWith('season-')) {
                        hasSeason = true;
                }
        }

        if (hasMovie && !hasSeason) return 'movie';
        if (hasSeason) return 'series';
        if (hasMovie) return 'movie';
        return null;
}

async function buildSeriesListEntry(slug) {
        const seriesDir = path.join(DATA_ROOT, slug);
        const meta = (await safeReadJSON(path.join(seriesDir, 'series.json'))) || {};
        const stats = await fs.stat(seriesDir);

        let poster = meta.poster || meta.thumbnail || meta.coverImage || null;
        if (!poster) {
                poster = await inferPosterFromEpisodes(seriesDir);
        }

        return {
                type: 'series',
                slug,
                title: meta.title || formatTitle(slug),
                poster: poster || null,
                genres: meta.genres || [],
                synopsis: meta.description || meta.synopsis || '',
                status: meta.status || 'Unknown',
                release_year: meta.release_year || meta.year || null,
                totalEpisodes: meta.totalEpisodes || null,
                updatedAt: stats.mtime
        };
}

async function buildMovieListEntry(slug) {
        const moviePath = path.join(DATA_ROOT, slug, 'movie.json');
        const meta = (await safeReadJSON(moviePath)) || {};
        const stats = await fs.stat(path.join(DATA_ROOT, slug));

        return {
                type: 'movie',
                slug,
                title: meta.title || formatTitle(slug),
                poster: meta.movie_poster || meta.thumbnail || null,
                genres: meta.genres || [],
                synopsis: meta.description || '',
                status: 'Movie',
                release_year: meta.release_year || null,
                totalEpisodes: 1,
                updatedAt: stats.mtime
        };
}

async function buildSeriesDetail(slug) {
        const seriesDir = path.join(DATA_ROOT, slug);
        const meta = (await safeReadJSON(path.join(seriesDir, 'series.json'))) || {};

        const result = {
                type: 'series',
                slug,
                title: meta.title || formatTitle(slug),
                description: meta.description || meta.synopsis || '',
                poster: meta.poster || meta.thumbnail || meta.coverImage || null,
                genres: meta.genres || [],
                status: meta.status || 'Unknown',
                release_year: meta.release_year || meta.year || null,
                totalEpisodes: meta.totalEpisodes || 0,
                seasons: {},
                episodes: {}
        };

        const dirents = await fs.readdir(seriesDir, { withFileTypes: true });
        for (const dirent of dirents) {
                if (!dirent.isDirectory() || !dirent.name.startsWith('season-')) continue;
                const seasonNumber = dirent.name.replace('season-', '');
                const episodeFiles = await fs.readdir(path.join(seriesDir, dirent.name));

                const seasonEpisodes = [];
                for (const file of episodeFiles) {
                        if (!file.startsWith('episode-') || !file.endsWith('.json')) continue;
                        const absolute = path.join(seriesDir, dirent.name, file);
                        const episodeJson = (await safeReadJSON(absolute)) || {};
                        const derivedNumber =
                                episodeJson.episode ||
                                episodeJson.episode_number ||
                                parseInt(file.replace('episode-', '').replace('.json', ''), 10);
                        const derivedTitle =
                                episodeJson.episode_title || episodeJson.title || `Episode ${derivedNumber}`;
                        const thumb =
                                episodeJson.episode_card_thumbnail ||
                                episodeJson.episode_list_thumbnail ||
                                episodeJson.episode_main_poster ||
                                episodeJson.thumbnail ||
                                null;

                        seasonEpisodes.push({
                                id: `${seasonNumber}-${derivedNumber}`,
                                number: Number(derivedNumber),
                                title: derivedTitle,
                                duration: episodeJson.duration || '',
                                thumbnail: thumb,
                                description: episodeJson.description || '',
                                releaseDate: episodeJson.releaseDate || null
                        });
                }

                seasonEpisodes.sort((a, b) => a.number - b.number);
                result.seasons[seasonNumber] = seasonEpisodes.map((ep) => ep.number.toString());
                result.episodes[seasonNumber] = seasonEpisodes;
                result.totalEpisodes += seasonEpisodes.length;

                if (!result.poster && seasonEpisodes[0]?.thumbnail) {
                        result.poster = seasonEpisodes[0].thumbnail;
                }
        }

        if (!result.poster) {
                result.poster = await inferPosterFromEpisodes(seriesDir);
        }

        return result;
}

async function buildMovieDetail(slug) {
        const moviePath = path.join(DATA_ROOT, slug, 'movie.json');
        const movie = await safeReadJSON(moviePath);
        if (!movie) throw new Error('Movie metadata missing');

        return {
                type: 'movie',
                slug,
                title: movie.title || formatTitle(slug),
                description: movie.description || '',
                poster: movie.movie_poster || movie.thumbnail || null,
                genres: movie.genres || [],
                release_year: movie.release_year || null,
                languages: movie.languages || [],
                servers: Array.isArray(movie.servers) ? movie.servers : []
        };
}

app.get('/api/latest-episodes', async (req, res) => {
        try {
                const latestPath = path.join(DATA_ROOT, 'latest-episodes.json');
                const latest = await safeReadJSON(latestPath);
                res.json(latest || []);
        } catch (err) {
                console.error('Failed to fetch latest episodes', err);
                res.status(500).json({ error: 'Failed to fetch latest episodes' });
        }
});


app.get('/api/library', async (req, res) => {
        try {
                const dirents = await fs.readdir(DATA_ROOT, { withFileTypes: true });
                const entries = [];
                for (const dirent of dirents) {
                        if (!dirent.isDirectory()) continue;
                        try {
                                const slug = dirent.name;
                                const type = await detectEntryType(slug);
                                if (type === 'movie') {
                                        entries.push(await buildMovieListEntry(slug));
                                } else if (type === 'series') {
                                        entries.push(await buildSeriesListEntry(slug));
                                }
                        } catch (err) {
                                console.warn(`Skipped ${dirent.name}:`, err.message);
                        }
                }
                entries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                res.json(entries);
        } catch (err) {
                console.error('Failed to list library', err);
                res.status(500).json({ error: 'Failed to list library' });
        }
});

app.get('/api/series', async (req, res) => {
        try {
                const dirents = await fs.readdir(DATA_ROOT, { withFileTypes: true });
                const entries = [];
                for (const dirent of dirents) {
                        if (!dirent.isDirectory()) continue;
                        if ((await detectEntryType(dirent.name)) === 'series') {
                                entries.push(await buildSeriesListEntry(dirent.name));
                        }
                }
                entries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                res.json(entries);
        } catch (err) {
                console.error('Failed to list series', err);
                res.status(500).json({ error: 'Failed to list series' });
        }
});

app.get('/api/movies', async (req, res) => {
        try {
                const dirents = await fs.readdir(DATA_ROOT, { withFileTypes: true });
                const entries = [];
                for (const dirent of dirents) {
                        if (!dirent.isDirectory()) continue;
                        if ((await detectEntryType(dirent.name)) === 'movie') {
                                entries.push(await buildMovieListEntry(dirent.name));
                        }
                }
                entries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                res.json(entries);
        }       catch (err) {
                console.error('Failed to list movies', err);
                res.status(500).json({ error: 'Failed to list movies' });
        }
});

app.get('/api/series/:slug', async (req, res) => {
        try {
                const actualSlug = await findActualSlug(req.params.slug);
                const type = await detectEntryType(actualSlug);
                if (type !== 'series') throw new Error('Not a series');
                const detail = await buildSeriesDetail(actualSlug);
                res.json(detail);
        } catch (err) {
                console.error('Failed to read series detail', err);
                res.status(404).json({ error: 'Series metadata not found' });
        }
});

app.get('/api/movies/:slug', async (req, res) => {
        try {
                const actualSlug = await findActualSlug(req.params.slug);
                const type = await detectEntryType(actualSlug);
                if (type !== 'movie') throw new Error('Not a movie');
                const detail = await buildMovieDetail(actualSlug);
                res.json(detail);
        } catch (err) {
                console.error('Failed to read movie detail', err);
                res.status(404).json({ error: 'Movie metadata not found' });
        }
});

app.get('/api/series/:slug/episode/:episode', async (req, res) => {
        const { slug, episode } = req.params;
        const actualSlug = await findActualSlug(slug);
        const match = episode.match(/(\d+)[-x](\d+)/i);
        if (!match) {
                return res
                        .status(400)
                        .json({ error: 'Episode format should be season-episode (e.g. 1-3 or 1x3)' });
        }
        const season = match[1];
        const ep = match[2];

        const filePath = path.join(DATA_ROOT, actualSlug, `season-${season}`, `episode-${ep}.json`);
        try {
                const json = await fs.readFile(filePath, 'utf-8');
                res.json(JSON.parse(json));
        } catch (err) {
                res.status(404).json({ error: 'Episode not found' });
        }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
        console.log(`API listening on http://localhost:${PORT}`);
});
