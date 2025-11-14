import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const latestPath = path.join(DATA_DIR, 'latest-episodes.json');

async function rebuildLatestEpisodes() {
        const episodes = [];
        
        const seriesDirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
                .filter(d => d.isDirectory());
        
        for (const seriesDir of seriesDirs) {
                const seriesPath = path.join(DATA_DIR, seriesDir.name);
                const seriesMetaPath = path.join(seriesPath, 'series.json');
                
                let seriesMeta = { title: seriesDir.name.replace(/-/g, ' ') };
                if (fs.existsSync(seriesMetaPath)) {
                        try {
                                seriesMeta = JSON.parse(fs.readFileSync(seriesMetaPath, 'utf-8'));
                        } catch {}
                }
                
                const seasonDirs = fs.readdirSync(seriesPath, { withFileTypes: true })
                        .filter(d => d.isDirectory() && d.name.startsWith('season-'));
                
                for (const seasonDir of seasonDirs) {
                        const seasonNum = parseInt(seasonDir.name.replace('season-', ''));
                        const seasonPath = path.join(seriesPath, seasonDir.name);
                        const episodeFiles = fs.readdirSync(seasonPath)
                                .filter(f => f.startsWith('episode-') && f.endsWith('.json'));
                        
                        for (const episodeFile of episodeFiles) {
                                const episodePath = path.join(seasonPath, episodeFile);
                                const stats = fs.statSync(episodePath);
                                const episodeNum = parseInt(episodeFile.replace('episode-', '').replace('.json', ''));
                                
                                let episodeThumbnail = seriesMeta.thumbnail || null;
                                try {
                                        const episodeData = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));
                                        episodeThumbnail = episodeData.episode_card_thumbnail || 
                                                         episodeData.episode_list_thumbnail || 
                                                         episodeData.thumbnail || 
                                                         seriesMeta.thumbnail || 
                                                         null;
                                } catch {}
                                
                                episodes.push({
                                        title: `${seriesMeta.title || seriesDir.name} - Episode ${episodeNum}`,
                                        series: seriesMeta.title || seriesDir.name,
                                        seriesSlug: seriesDir.name,
                                        season: seasonNum,
                                        episode: episodeNum,
                                        thumbnail: episodeThumbnail,
                                        fetchedAt: stats.mtime.toISOString()
                                });
                        }
                }
        }
        
        episodes.sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));
        const latest = episodes.slice(0, 9);
        
        fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2), 'utf-8');
        console.log(`✅ Rebuilt latest-episodes.json with ${latest.length} episodes`);
        latest.forEach(ep => console.log(`   - ${ep.series} S${ep.season}E${ep.episode}`));
}

rebuildLatestEpisodes().catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
});
