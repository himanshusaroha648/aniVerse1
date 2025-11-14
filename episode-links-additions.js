
function saveLatestEpisode(seriesCtx, seasonNumber, episodeNumber, filePath) {
	try {
		let latest = [];
		if (fs.existsSync(LATEST_EPISODES_FILE)) {
			latest = JSON.parse(fs.readFileSync(LATEST_EPISODES_FILE, 'utf-8'));
		}
		
		const episodeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
		const entry = {
			series: seriesCtx.title,
			season: seasonNumber,
			episode: episodeNumber,
			title: episodeData.episode_title || `Episode ${episodeNumber}`,
			thumbnail: episodeData.episode_card_thumbnail || episodeData.thumbnail || null,
			path: path.relative(DATA_DIR, filePath),
			timestamp: new Date().toISOString()
		};
		
		latest = latest.filter(e => !(e.series === entry.series && e.season === entry.season && e.episode === entry.episode));
		latest.unshift(entry);
		latest = latest.slice(0, 20);
		
		fs.writeFileSync(LATEST_EPISODES_FILE, JSON.stringify(latest, null, 2), 'utf-8');
	} catch (err) {
		console.log(`   ⚠️ Failed to save to latest episodes: ${err.message}`);
	}
}

async function handleEpisodeCardEnhanced(entry, { verbose = true } = {}) {
	const code = parseEpisodeCode(entry.url);
	if (!code) return;

	try {
		const { seriesUrl, seriesTitle } = await fetchEpisodeContext(entry.url);
		if (!seriesUrl) {
			if (verbose) console.log(`⚠️ Series URL not found for ${entry.url}`);
			return;
		}
		const seriesCtx = await ensureSeriesContext(seriesUrl, seriesTitle);
		const { filePath } = episodeFilePath(seriesCtx, code.season, code.episode);
		if (fs.existsSync(filePath)) {
			if (verbose) console.log(`✅ Already saved S${code.season}E${code.episode} -> ${path.relative(process.cwd(), filePath)}`);
			saveLatestEpisode(seriesCtx, code.season, code.episode, filePath);
			return;
		}

		console.log(`📥 Fetching new episode: ${seriesCtx.title} S${code.season}E${code.episode}`);
		await fetchAndStoreSeason(seriesCtx, code.season);
		
		for (let s = 1; s < code.season; s++) {
			const retryKey = `${seriesUrl}|${s}`;
			const retries = seasonRetryCount.get(retryKey) || 0;
			if (retries >= 3) {
				console.log(`   ⏭️ Skipping Season ${s} (max retries reached)`);
				continue;
			}
			
			console.log(`   🔍 Checking Season ${s}...`);
			try {
				await fetchAndStoreSeason(seriesCtx, s);
				seasonRetryCount.set(retryKey, 0);
			} catch (err) {
				seasonRetryCount.set(retryKey, retries + 1);
				console.log(`   ⚠️ Season ${s} attempt ${retries + 1}/3 failed: ${err.message}`);
			}
		}
	} catch (err) {
		console.log(`⚠️ Failed to process ${entry.url}: ${err.message}`);
	}
}
