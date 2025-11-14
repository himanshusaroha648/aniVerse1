#!/bin/bash

# Insert saveLatestEpisode function after saveEpisodeToDisk
sed -i '/^function saveEpisodeToDisk/i\
function saveLatestEpisode(seriesCtx, seasonNumber, episodeNumber, filePath) {\
\ttry {\
\t\tlet latest = [];\
\t\tif (fs.existsSync(LATEST_EPISODES_FILE)) {\
\t\t\tlatest = JSON.parse(fs.readFileSync(LATEST_EPISODES_FILE, '"'"'utf-8'"'"'));\
\t\t}\
\t\t\
\t\tconst episodeData = JSON.parse(fs.readFileSync(filePath, '"'"'utf-8'"'"'));\
\t\tconst entry = {\
\t\t\tseries: seriesCtx.title,\
\t\t\tseason: seasonNumber,\
\t\t\tepisode: episodeNumber,\
\t\t\ttitle: episodeData.episode_title || `Episode ${episodeNumber}`,\
\t\t\tthumbnail: episodeData.episode_card_thumbnail || episodeData.thumbnail || null,\
\t\t\tpath: path.relative(DATA_DIR, filePath),\
\t\t\ttimestamp: new Date().toISOString()\
\t\t};\
\t\t\
\t\tlatest = latest.filter(e => !(e.series === entry.series \&\& e.season === entry.season \&\& e.episode === entry.episode));\
\t\tlatest.unshift(entry);\
\t\tlatest = latest.slice(0, 20);\
\t\t\
\t\tfs.writeFileSync(LATEST_EPISODES_FILE, JSON.stringify(latest, null, 2), '"'"'utf-8'"'"');\
\t} catch (err) {\
\t\tconsole.log(`   ⚠️ Failed to save to latest episodes: ${err.message}`);\
\t}\
}\
' episode-links.js

# Modify saveEpisodeToDisk to call saveLatestEpisode
sed -i '/processedEpisodePaths.add(filePath);/a\
\tsaveLatestEpisode(seriesCtx, seasonNumber, episodeNumber, filePath);' episode-links.js

echo "Patch applied successfully!"
