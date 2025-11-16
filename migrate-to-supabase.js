#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERROR: Supabase credentials not found!');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  console.error('\nExample:');
  console.error('  export SUPABASE_URL=https://your-project.supabase.co');
  console.error('  export SUPABASE_ANON_KEY=your-anon-key');
  console.error('  npm run migrate:supabase');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DATA_ROOT = path.resolve('data');

console.log('🚀 Starting migration from data/ folder to Supabase...\n');

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

async function migrateSeries() {
  console.log('📺 Migrating series data...');
  
  const directories = await fs.readdir(DATA_ROOT, { withFileTypes: true });
  const seriesList = [];
  
  for (const dirent of directories) {
    if (!dirent.isDirectory()) continue;
    
    const slug = dirent.name;
    const seriesDir = path.join(DATA_ROOT, slug);
    
    try {
      const seriesJsonPath = path.join(seriesDir, 'series.json');
      const movieJsonPath = path.join(seriesDir, 'movie.json');
      
      let isMovie = false;
      let metadata = await safeReadJSON(seriesJsonPath);
      
      if (!metadata) {
        metadata = await safeReadJSON(movieJsonPath);
        isMovie = true;
      }
      
      if (!metadata) {
        console.log(`  ⚠️  Skipping ${slug} - no series.json or movie.json found`);
        continue;
      }
      
      const seriesData = {
        slug,
        title: metadata.title || formatTitle(slug),
        description: metadata.description || metadata.synopsis || '',
        poster: metadata.poster || metadata.movie_poster || null,
        thumbnail: metadata.thumbnail || null,
        genres: metadata.genres || [],
        status: isMovie ? 'Movie' : (metadata.status || 'Unknown'),
        release_year: metadata.release_year || metadata.year || null,
        total_episodes: metadata.totalEpisodes || (isMovie ? 1 : 0),
        type: isMovie ? 'movie' : 'series',
        url: metadata.url || null,
        tmdb_id: metadata.tmdb_id || null,
        tvdb_id: metadata.tvdb_id || null,
        languages: metadata.languages || []
      };
      
      seriesList.push(seriesData);
      console.log(`  ✅ Prepared: ${seriesData.title}`);
      
    } catch (error) {
      console.error(`  ❌ Error processing ${slug}:`, error.message);
    }
  }
  
  if (seriesList.length === 0) {
    console.log('  ⚠️  No series found to migrate\n');
    return;
  }
  
  console.log(`\n📤 Uploading ${seriesList.length} series to Supabase...`);
  
  const { data, error } = await supabase
    .from('series')
    .upsert(seriesList, { onConflict: 'slug' });
  
  if (error) {
    console.error('❌ Error uploading series:', error.message);
  } else {
    console.log(`✅ Successfully migrated ${seriesList.length} series!\n`);
  }
}

async function migrateEpisodes() {
  console.log('🎬 Migrating episode data...');
  
  const directories = await fs.readdir(DATA_ROOT, { withFileTypes: true });
  const episodesList = [];
  let totalEpisodes = 0;
  
  for (const dirent of directories) {
    if (!dirent.isDirectory()) continue;
    
    const slug = dirent.name;
    const seriesDir = path.join(DATA_ROOT, slug);
    
    try {
      const seasons = await fs.readdir(seriesDir, { withFileTypes: true });
      
      for (const seasonDir of seasons) {
        if (!seasonDir.isDirectory() || !seasonDir.name.startsWith('season-')) continue;
        
        const seasonNumber = parseInt(seasonDir.name.replace('season-', ''));
        const episodesPath = path.join(seriesDir, seasonDir.name);
        const episodeFiles = await fs.readdir(episodesPath);
        
        for (const file of episodeFiles) {
          if (!file.startsWith('episode-') || !file.endsWith('.json')) continue;
          
          const episodeData = await safeReadJSON(path.join(episodesPath, file));
          if (!episodeData) continue;
          
          const episodeNumber = parseInt(file.replace('episode-', '').replace('.json', ''));
          
          const episode = {
            series_slug: slug,
            season: seasonNumber,
            episode: episodeNumber,
            episode_title: episodeData.episode_title || `S${seasonNumber}E${episodeNumber}`,
            description: episodeData.description || null,
            duration: episodeData.duration || null,
            release_date: episodeData.releaseDate || episodeData.release_date || null,
            watch_url: episodeData.watch_url || episodeData.watchUrl || null,
            thumbnail: episodeData.thumbnail || null,
            episode_main_poster: episodeData.episode_main_poster || null,
            episode_card_thumbnail: episodeData.episode_card_thumbnail || null,
            episode_list_thumbnail: episodeData.episode_list_thumbnail || null,
            video_player_thumbnail: episodeData.video_player_thumbnail || null,
            servers: episodeData.servers || []
          };
          
          episodesList.push(episode);
          totalEpisodes++;
        }
      }
      
      if (totalEpisodes > 0 && totalEpisodes % 100 === 0) {
        console.log(`  📊 Prepared ${totalEpisodes} episodes so far...`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing episodes for ${slug}:`, error.message);
    }
  }
  
  if (episodesList.length === 0) {
    console.log('  ⚠️  No episodes found to migrate\n');
    return;
  }
  
  console.log(`\n📤 Uploading ${episodesList.length} episodes to Supabase in batches...`);
  
  const batchSize = 100;
  for (let i = 0; i < episodesList.length; i += batchSize) {
    const batch = episodesList.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('episodes')
      .upsert(batch, { onConflict: 'series_slug,season,episode' });
    
    if (error) {
      console.error(`❌ Error uploading batch ${i / batchSize + 1}:`, error.message);
    } else {
      console.log(`  ✅ Batch ${i / batchSize + 1}/${Math.ceil(episodesList.length / batchSize)} uploaded`);
    }
  }
  
  console.log(`✅ Successfully migrated ${episodesList.length} episodes!\n`);
}

async function migrateLatestEpisodes() {
  console.log('⏱️  Migrating latest episodes...');
  
  try {
    const latestPath = path.join(DATA_ROOT, 'latest-episodes.json');
    const latestData = await safeReadJSON(latestPath);
    
    if (!latestData || !Array.isArray(latestData) || latestData.length === 0) {
      console.log('  ⚠️  No latest-episodes.json found or empty\n');
      return;
    }
    
    const latestList = latestData.map(item => ({
      series_slug: item.seriesSlug || item.slug,
      series_title: item.series || item.title || '',
      season: item.season || 1,
      episode: item.episode || 1,
      episode_title: item.title || item.episodeTitle || '',
      thumbnail: item.thumbnail || null,
      added_at: item.fetchedAt || item.addedAt || new Date().toISOString()
    }));
    
    console.log(`📤 Clearing existing latest episodes and uploading fresh data...`);
    
    const { error: deleteError } = await supabase
      .from('latest_episodes')
      .delete()
      .gte('id', 0);
    
    if (deleteError) {
      console.warn('⚠️  Warning: Could not clear existing latest episodes:', deleteError.message);
    }
    
    const { error } = await supabase
      .from('latest_episodes')
      .insert(latestList);
    
    if (error) {
      console.error('❌ Error uploading latest episodes:', error.message);
    } else {
      console.log(`✅ Successfully migrated ${latestList.length} latest episodes!\n`);
    }
    
  } catch (error) {
    console.error('⚠️  Failed to migrate latest episodes:', error.message);
  }
}

async function main() {
  try {
    await migrateSeries();
    await migrateEpisodes();
    await migrateLatestEpisodes();
    
    console.log('🎉 Migration complete!');
    console.log('\n📊 Summary:');
    
    const { count: seriesCount } = await supabase
      .from('series')
      .select('*', { count: 'exact', head: true });
    
    const { count: episodesCount } = await supabase
      .from('episodes')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   - Total series in Supabase: ${seriesCount || 0}`);
    console.log(`   - Total episodes in Supabase: ${episodesCount || 0}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
