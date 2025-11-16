import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  ERROR: Supabase credentials not found!');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase client initialized');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: '🎬 AniVerse API Server (Supabase Edition)',
    status: 'running',
    database: 'Supabase PostgreSQL',
    endpoints: {
      library: '/api/library',
      series: '/api/series',
      movies: '/api/movies',
      latestEpisodes: '/api/latest-episodes',
      seriesDetail: '/api/series/:slug',
      movieDetail: '/api/movies/:slug',
      episode: '/api/series/:slug/episode/:season-:episode'
    },
    note: 'All data is stored permanently in Supabase'
  });
});

app.get('/api/latest-episodes', async (req, res) => {
  try {
    const { data: latestData, error: latestError } = await supabase
      .from('latest_episodes')
      .select('*')
      .order('added_at', { ascending: false })
      .limit(20);

    if (latestError) throw latestError;

    const slugs = [...new Set((latestData || []).map(ep => ep.series_slug))];
    
    const { data: seriesData } = await supabase
      .from('series')
      .select('slug, title, poster')
      .in('slug', slugs);

    const seriesMap = {};
    (seriesData || []).forEach(s => {
      seriesMap[s.slug] = s;
    });

    const formatted = (latestData || []).map(ep => ({
      seriesSlug: ep.series_slug,
      seriesTitle: ep.series_title || seriesMap[ep.series_slug]?.title || ep.series_slug,
      seriesPoster: seriesMap[ep.series_slug]?.poster || null,
      season: ep.season,
      episode: ep.episode,
      episodeTitle: ep.episode_title,
      thumbnail: ep.thumbnail,
      addedAt: ep.added_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch latest episodes:', err);
    res.status(500).json({ error: 'Failed to fetch latest episodes' });
  }
});

app.get('/api/library', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map(series => ({
      type: series.type,
      slug: series.slug,
      title: series.title,
      poster: series.poster || series.thumbnail,
      genres: series.genres || [],
      synopsis: series.description || '',
      status: series.status || 'Unknown',
      release_year: series.release_year,
      totalEpisodes: series.total_episodes,
      updatedAt: series.updated_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to list library:', err);
    res.status(500).json({ error: 'Failed to list library' });
  }
});

app.get('/api/series', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('type', 'series')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map(series => ({
      type: series.type,
      slug: series.slug,
      title: series.title,
      poster: series.poster || series.thumbnail,
      genres: series.genres || [],
      synopsis: series.description || '',
      status: series.status || 'Unknown',
      release_year: series.release_year,
      totalEpisodes: series.total_episodes,
      updatedAt: series.updated_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to list series:', err);
    res.status(500).json({ error: 'Failed to list series' });
  }
});

app.get('/api/movies', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('type', 'movie')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map(movie => ({
      type: movie.type,
      slug: movie.slug,
      title: movie.title,
      poster: movie.poster || movie.thumbnail,
      genres: movie.genres || [],
      synopsis: movie.description || '',
      status: 'Movie',
      release_year: movie.release_year,
      totalEpisodes: 1,
      updatedAt: movie.updated_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to list movies:', err);
    res.status(500).json({ error: 'Failed to list movies' });
  }
});

app.get('/api/series/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();

    const { data: seriesData, error: seriesError } = await supabase
      .from('series')
      .select('*')
      .ilike('slug', slug)
      .eq('type', 'series')
      .single();

    if (seriesError || !seriesData) {
      return res.status(404).json({ error: 'Series not found' });
    }

    const { data: episodesData, error: episodesError } = await supabase
      .from('episodes')
      .select('*')
      .eq('series_slug', seriesData.slug)
      .order('season', { ascending: true })
      .order('episode', { ascending: true });

    if (episodesError) throw episodesError;

    const seasons = {};
    const episodes = {};

    (episodesData || []).forEach(ep => {
      const seasonNum = ep.season.toString();
      const epNum = ep.episode;

      if (!seasons[seasonNum]) {
        seasons[seasonNum] = [];
        episodes[seasonNum] = [];
      }

      seasons[seasonNum].push(epNum.toString());

      episodes[seasonNum].push({
        id: `${seasonNum}-${epNum}`,
        number: epNum,
        title: ep.episode_title || `Episode ${epNum}`,
        duration: ep.duration || '',
        thumbnail: ep.episode_card_thumbnail || ep.episode_list_thumbnail || ep.thumbnail,
        description: ep.description || '',
        releaseDate: ep.release_date || null,
        watch_url: ep.watch_url || null,
        servers: ep.servers || []
      });
    });

    const result = {
      type: 'series',
      slug: seriesData.slug,
      title: seriesData.title,
      description: seriesData.description || '',
      poster: seriesData.poster || seriesData.thumbnail,
      genres: seriesData.genres || [],
      status: seriesData.status || 'Unknown',
      release_year: seriesData.release_year,
      totalEpisodes: episodesData?.length || 0,
      seasons,
      episodes
    };

    res.json(result);
  } catch (err) {
    console.error('Failed to read series detail:', err);
    res.status(404).json({ error: 'Series metadata not found' });
  }
});

app.get('/api/movies/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();

    const { data: movieData, error: movieError } = await supabase
      .from('series')
      .select('*')
      .ilike('slug', slug)
      .eq('type', 'movie')
      .single();

    if (movieError || !movieData) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const { data: episodesData } = await supabase
      .from('episodes')
      .select('*')
      .eq('series_slug', movieData.slug);

    const servers = [];
    if (episodesData && episodesData.length > 0) {
      episodesData.forEach(ep => {
        if (ep.servers && Array.isArray(ep.servers)) {
          servers.push(...ep.servers);
        }
      });
    }

    const result = {
      type: 'movie',
      slug: movieData.slug,
      title: movieData.title,
      description: movieData.description || '',
      poster: movieData.poster || movieData.thumbnail,
      genres: movieData.genres || [],
      release_year: movieData.release_year,
      languages: movieData.languages || [],
      servers: servers
    };

    res.json(result);
  } catch (err) {
    console.error('Failed to read movie detail:', err);
    res.status(404).json({ error: 'Movie metadata not found' });
  }
});

app.get('/api/series/:slug/episode/:episode', async (req, res) => {
  try {
    const { slug, episode } = req.params;
    const match = episode.match(/(\d+)[-x](\d+)/i);

    if (!match) {
      return res.status(400).json({
        error: 'Episode format should be season-episode (e.g. 1-3 or 1x3)'
      });
    }

    const season = parseInt(match[1]);
    const ep = parseInt(match[2]);

    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .ilike('series_slug', slug)
      .eq('season', season)
      .eq('episode', ep)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const result = {
      series: data.series_slug,
      thumbnail: data.thumbnail,
      season: data.season,
      episode: data.episode,
      episode_title: data.episode_title,
      description: data.description,
      duration: data.duration,
      releaseDate: data.release_date,
      watch_url: data.watch_url,
      episode_main_poster: data.episode_main_poster,
      episode_card_thumbnail: data.episode_card_thumbnail,
      episode_list_thumbnail: data.episode_list_thumbnail,
      video_player_thumbnail: data.video_player_thumbnail,
      servers: data.servers || []
    };

    res.json(result);
  } catch (err) {
    console.error('Failed to fetch episode:', err);
    res.status(404).json({ error: 'Episode not found' });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`✅ AniVerse API (Supabase) listening on http://localhost:${PORT}`);
  console.log(`🗄️  Database: Supabase PostgreSQL`);
  console.log(`📍 Endpoints available at http://localhost:${PORT}/api/*`);
});
