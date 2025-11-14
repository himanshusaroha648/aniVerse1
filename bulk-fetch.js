import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

// ==================== CONFIGURATION ====================

const CONFIG = {
	timeout: 30000,
	referer: 'https://example.com/',
	maxRetries: 3,
	retryDelay: 2000, // 2 seconds
	requestDelay: { min: 300, max: 500 }, // 300-500ms between requests (super fast)
};

const AJAX_ENDPOINT = 'https://example.com/wp-admin/admin-ajax.php';
const SEASON_ONE_MAX_ATTEMPTS = 3;
const EPISODE_CONCURRENCY = 5;

async function promptRange(total) {
	const rl = readline.createInterface({ input, output });
	const maxIndex = Math.max(total - 1, 0);
	const startAnswer = await rl.question(`Start from index (0-${maxIndex}, default 0): `);
	const endAnswer = await rl.question(`End at index (0-${maxIndex}, default ${maxIndex}): `);
	rl.close();

	let startIndex = parseInt(startAnswer, 10);
	if (Number.isNaN(startIndex) || startIndex < 0) startIndex = 0;
	if (startIndex > maxIndex) startIndex = maxIndex;

	let endIndex = parseInt(endAnswer, 10);
	if (Number.isNaN(endIndex) || endIndex > maxIndex) endIndex = maxIndex;
	if (endIndex < 0) endIndex = maxIndex;

	if (startIndex > endIndex) {
		const temp = startIndex;
		startIndex = endIndex;
		endIndex = temp;
	}

	return { startIndex, endIndex };
}

// Random User-Agents pool
const USER_AGENTS = [
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// ==================== UTILITY FUNCTIONS ====================

function ensureDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

function getRandomUserAgent() {
	return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
	const ms = Math.floor(Math.random() * (max - min + 1)) + min;
	return delay(ms);
}

function normalizeUrl(rawUrl, base = 'https://example.com') {
	if (!rawUrl || /^javascript:/i.test(rawUrl)) return null;
	try {
		return new URL(rawUrl, base).href;
	} catch {
		return null;
	}
}

function sanitizeFileName(name) {
	return name
		.replace(/[<>:"/\\|?*]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.substring(0, 100);
}

function extractPostId(seriesHtml) {
	const $ = cheerio.load(seriesHtml);
	const candidates = [];

	$('input#post_id, input#postId, input[name="post_id"], input[name="post"], [data-post-id], [data-post]').each((_, el) => {
		const attrs = [
			$(el).attr('value'),
			$(el).attr('data-post-id'),
			$(el).attr('data-post'),
			$(el).attr('data-id'),
		];
		for (const attr of attrs) {
			if (attr && /^\d+$/.test(attr.trim())) {
				candidates.push(parseInt(attr.trim(), 10));
			}
		}
	});

	// WordPress body class often contains postid-XXXX
	const bodyClass = $('body').attr('class') || '';
	const bodyMatch = bodyClass.match(/postid-(\d+)/);
	if (bodyMatch) candidates.push(parseInt(bodyMatch[1], 10));

	if (candidates.length > 0) {
		return candidates[0];
	}

	const html = $.html();
	const regexes = [
		/post[_-]?id\s*[:=]\s*"?(\d+)"?/i,
		/"post"\s*:\s*"?(\d+)"?/i,
		/"post_id"\s*:\s*"?(\d+)"?/i,
		/\bpost\s*=\s*(\d+)/i,
		/postID\s*=\s*['"](\d+)['"]/i,
		/var\s+postId\s*=\s*(\d+)/i,
	];

	for (const regex of regexes) {
		const match = html.match(regex);
		if (match && match[1]) {
			return parseInt(match[1], 10);
		}
	}

	return null;
}

async function fetchSeasonEpisodesViaAjax(postId, seasonNumber, retries = CONFIG.maxRetries, refererUrl = CONFIG.referer) {
	let lastErr = null;
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const payload = new URLSearchParams();
			payload.append('action', 'action_select_season');
			payload.append('season', String(seasonNumber));
			payload.append('post', String(postId));

			const res = await axios.post(AJAX_ENDPOINT, payload.toString(), {
				timeout: CONFIG.timeout,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'User-Agent': getRandomUserAgent(),
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					Referer: refererUrl || CONFIG.referer,
					Origin: 'https://example.com',
					'X-Requested-With': 'XMLHttpRequest',
				}
			});

			let html = res?.data;
			if (html == null) throw new Error('Empty response');
			if (typeof html === 'object') {
				if (typeof html.data === 'string') html = html.data;
				else if (typeof html.html === 'string') html = html.html;
				else html = JSON.stringify(html);
			}
			html = String(html);
			if (!html || !html.trim()) throw new Error('Season response empty');
			return html;
		} catch (err) {
			lastErr = err;
			if (attempt < retries) await delay(CONFIG.retryDelay);
		}
	}
	throw new Error(`Season AJAX failed after ${retries} attempts: ${lastErr?.message || 'unknown error'}`);
}

function extractSeasonPosterFromHtml(seasonHtml) {
	const $ = cheerio.load(seasonHtml);
	const img =
		$('div.post-thumbnail img').first().attr('data-src') ||
		$('div.post-thumbnail img').first().attr('src') ||
		$('img').first().attr('data-src') ||
		$('img').first().attr('src') ||
		null;
	return normalizeUrl(img);
}

// ==================== FETCH WITH RETRY ====================

async function fetchHtmlWithRetry(url, retries = CONFIG.maxRetries) {
	let lastErr = null;
	
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const userAgent = getRandomUserAgent();
			const res = await axios.get(url, {
				timeout: CONFIG.timeout,
				headers: {
					'User-Agent': userAgent,
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					Referer: CONFIG.referer,
					'Accept-Language': 'en-US,en;q=0.9',
					'Accept-Encoding': 'gzip, deflate, br',
					Connection: 'keep-alive',
					'Upgrade-Insecure-Requests': '1',
				},
			});
			return String(res.data || '');
		} catch (err) {
			lastErr = err;
			if (attempt < retries) {
				console.log(`   ⚠️  Retry ${attempt}/${retries} after ${CONFIG.retryDelay}ms...`);
				await delay(CONFIG.retryDelay);
			}
		}
	}
	
	throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${lastErr?.message || 'unknown error'}`);
}

// ==================== COMMON EXTRACTION ====================

function extractCommonFields(html) {
	const $ = cheerio.load(html);
	
	// Title
	const title =
		$('h1.entry-title').first().text().trim() ||
		$('meta[property="og:title"]').attr('content')?.trim() ||
		$('title').first().text().trim() ||
		'';

	// Description
	const description =
		$('meta[property="og:description"]').attr('content')?.trim() ||
		$('div.entry-content p').first().text().trim() ||
		$('div.description p').first().text().trim() ||
		'';

	// Release Year
	let releaseYear = null;
	const yearMatch = $('span.year, .year, [class*="year"]').first().text().match(/\d{4}/);
	if (yearMatch) {
		releaseYear = parseInt(yearMatch[0], 10);
	}

	// Genres
	const genres = [];
	$('a[rel="tag"], .genres a, [class*="genre"] a').each((_, el) => {
		const genre = $(el).text().trim();
		if (genre) genres.push(genre);
	});

	// Thumbnail (from page header poster)
	let thumbnail = null;
	thumbnail = normalizeUrl(
		$('div.post-thumbnail img').attr('src') ||
		$('div.post-thumbnail img').attr('data-src') ||
		$('div.post-thumbnail img').attr('data-lazy-src')
	);
	if (!thumbnail) {
		thumbnail = normalizeUrl($('meta[property="og:image"]').attr('content'));
	}
	if (!thumbnail) {
		thumbnail = normalizeUrl($('.series-cover img').attr('src') || $('.series-cover img').attr('data-src'));
	}

	// TMDB/TVDB IDs
	let tmdbId = null;
	let tvdbId = null;
	
	// Try to extract from meta tags or data attributes
	$('meta[property*="tmdb"], [data-tmdb-id], [data-tmdb]').each((_, el) => {
		const id = $(el).attr('content') || $(el).attr('data-tmdb-id') || $(el).attr('data-tmdb');
		if (id && !tmdbId) {
			const match = String(id).match(/(\d+)/);
			if (match) tmdbId = parseInt(match[1], 10);
		}
	});
	
	$('meta[property*="tvdb"], [data-tvdb-id], [data-tvdb]').each((_, el) => {
		const id = $(el).attr('content') || $(el).attr('data-tvdb-id') || $(el).attr('data-tvdb');
		if (id && !tvdbId) {
			const match = String(id).match(/(\d+)/);
			if (match) tvdbId = parseInt(match[1], 10);
		}
	});

	// Language tags
	const languages = [];
	$('[class*="language"], [class*="lang"], .language, .lang').each((_, el) => {
		const lang = $(el).text().trim();
		if (lang && !languages.includes(lang)) {
			languages.push(lang);
		}
	});

	return {
		title: title.replace(/\s+/g, ' '),
		description: description.replace(/\s+/g, ' '),
		release_year: releaseYear,
		genres: genres,
		thumbnail: thumbnail,
		tmdb_id: tmdbId,
		tvdb_id: tvdbId,
		languages: languages,
	};
}

// ==================== SERIES EXTRACTION ====================

function extractSeasonLinks(seriesHtml) {
	const $ = cheerio.load(seriesHtml);
	const links = [];
	
	$('li.sel-temp a').each((_, el) => {
		const name = $(el).text().trim().replace(/\s+/g, ' ');
		const href = normalizeUrl($(el).attr('href'));
		if (href && name) {
			const m = name.match(/season\s*(\d+)/i);
			links.push({ name, href, seasonNumber: m ? parseInt(m[1], 10) : null });
		}
	});
	
	if (links.length === 0) {
		$('ul.aa-cnt.sub-menu a').each((_, el) => {
			const name = $(el).text().trim().replace(/\s+/g, ' ');
			const href = normalizeUrl($(el).attr('href'));
			if (href && name) {
				const m = name.match(/season\s*(\d+)/i);
				links.push({ name, href, seasonNumber: m ? parseInt(m[1], 10) : null });
			}
		});
	}
	
	// Dedup and sort
	const seen = new Set();
	const uniq = [];
	for (const l of links) {
		if (!seen.has(l.href)) {
			seen.add(l.href);
			uniq.push(l);
		}
	}
	
	uniq.sort((a, b) => {
		if (a.seasonNumber == null && b.seasonNumber == null) return 0;
		if (a.seasonNumber == null) return 1;
		if (b.seasonNumber == null) return -1;
		return a.seasonNumber - b.seasonNumber;
	});
	
	// Fallback: if no explicit season links, infer from season labels
	if (uniq.length === 0) {
		const seasonNames = $('li.sel-temp')
			.map((_, el) => $(el).text().trim())
			.get()
			.filter(Boolean);
		const inferredCount = seasonNames.length || 1;
		const inferred = [];
		for (let i = 1; i <= inferredCount; i++) {
			inferred.push({
				name: `Season ${i}`,
				href: normalizeUrl($('link[rel="canonical"]').attr('href')) || null,
				seasonNumber: i,
			});
		}
		return inferred;
	}
	
	return uniq;
}

function extractEpisodesFromSeason(seasonHtml) {
	const $ = cheerio.load(seasonHtml);
	const episodes = [];
	const seen = new Set();

	// Primary containers
	$('#episode_by_temp a, ul#episode_by_temp li article a').each((_, el) => {
		const href = normalizeUrl($(el).attr('href'));
		if (!href || !href.includes('/episode/')) return;
		if (seen.has(href)) return;
		seen.add(href);
		const title = ($(el).text().trim() || $(el).find('.entry-title').text().trim() || '').replace(/\s+/g, ' ');
		const img =
			$(el).find('img[loading="lazy"]').attr('data-src') ||
			$(el).find('img').attr('data-src') ||
			$(el).find('img').attr('data-lazy-src') ||
			$(el).find('img').attr('src') ||
			null;
		episodes.push({ url: href, title, image: normalizeUrl(img) });
	});

	// Fallback: any episode link in returned HTML
	if (episodes.length === 0) {
		$('a[href*="/episode/"]').each((index, el) => {
			const href = normalizeUrl($(el).attr('href'));
			if (!href || seen.has(href)) return;
			seen.add(href);
			let title = $(el).text().trim();
			if (!title) title = $(el).attr('title')?.trim() || `Episode ${index + 1}`;
			let img =
				$(el).find('img').attr('data-src') ||
				$(el).find('img').attr('src') ||
				$(el).closest('li, article').find('img').attr('data-src') ||
				$(el).closest('li, article').find('img').attr('src') ||
				null;
			episodes.push({ url: href, title, image: normalizeUrl(img) });
		});
	}

	return episodes;
}

function extractEpisodeMainPoster(episodeHtml) {
	const $ = cheerio.load(episodeHtml);
	
	// Try div.video-options img first
	let poster = normalizeUrl(
		$('div.video-options img').attr('src') ||
		$('div.video-options img').attr('data-src') ||
		$('div.video-options img').attr('data-lazy-src')
	);
	
	// Fallback to other selectors
	if (!poster) {
		poster = normalizeUrl(
			$('div.post-thumbnail img').attr('src') ||
			$('div.post-thumbnail img').attr('data-src') ||
			$('meta[property="og:image"]').attr('content')
		);
	}
	
	return poster;
}

function extractIframeEmbeds(episodeHtml) {
	const $ = cheerio.load(episodeHtml);
	const iframes = [];
	
	// Extract from options-1, options-2, etc.
	for (let i = 1; i <= 20; i++) {
		const container = $(`div#options-${i}`);
		if (!container.length) continue;
		
		container.find('iframe').each((_, el) => {
			const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
			const url = normalizeUrl(src);
			if (url) {
				iframes.push({ option: i, url });
			}
		});
	}
	
	// Also extract any other iframes
	$('iframe').each((_, el) => {
		const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
		const url = normalizeUrl(src);
		if (url && !iframes.some((ifr) => ifr.url === url)) {
			iframes.push({ option: null, url });
		}
	});
	
	return iframes;
}

// ==================== TREMBED URL RESOLUTION ====================

async function resolveTrembedUrl(trembedUrl) {
	try {
		const html = await fetchHtmlWithRetry(trembedUrl);
		const $ = cheerio.load(html);
		
		// Extract actual video iframe sources from trembed page
		const realVideoUrls = [];
		
		// Look for iframes that are NOT example.com (external video sources)
		$('iframe').each((_, el) => {
			const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
			const url = normalizeUrl(src);
			if (url && !url.includes('example.com') && !realVideoUrls.includes(url)) {
				realVideoUrls.push(url);
			}
		});
		
		// Also look for video sources in script tags or data attributes
		$('script').each((_, el) => {
			const content = $(el).html() || '';
			// Match common video embed patterns
			const patterns = [
				/https?:\/\/[^\s"']+\.(mp4|m3u8|webm)/gi,
				/https?:\/\/[^\s"']+embed[^\s"']*/gi,
				/https?:\/\/[^\s"']+video[^\s"']*/gi,
			];
			
			patterns.forEach((pattern) => {
				const matches = content.match(pattern);
				if (matches) {
					matches.forEach((match) => {
						const url = normalizeUrl(match);
						if (url && !url.includes('example.com') && !realVideoUrls.includes(url)) {
							realVideoUrls.push(url);
						}
					});
				}
			});
		});
		
		// Return first real video URL found, or null
		// If multiple found, prefer iframe sources over script sources
		const iframeUrls = realVideoUrls.filter((url) => {
			try {
				const parsed = new URL(url);
				return parsed.hostname !== 'example.com';
			} catch {
				return false;
			}
		});
		
		return iframeUrls.length > 0 ? iframeUrls[0] : (realVideoUrls.length > 0 ? realVideoUrls[0] : null);
	} catch (err) {
		// Silent fail - return null so we keep original URL
		return null;
	}
}

async function resolveIframeEmbeds(iframes) {
	// Process trembed URLs in parallel for speed
	const resolvedPromises = iframes.map(async (ifr) => {
		if (ifr.url && ifr.url.includes('trembed=')) {
			// This is a trembed URL, resolve it
			const realUrl = await resolveTrembedUrl(ifr.url);
			return {
				option: ifr.option,
				url: realUrl || ifr.url, // Use real URL if found, otherwise keep original
				original_url: ifr.url,
			};
		} else {
			// Not a trembed URL, use as-is
			return {
				option: ifr.option,
				url: ifr.url,
				original_url: null,
			};
		}
	});
	
	return await Promise.all(resolvedPromises);
}

async function processSeason({ seasonNumber, seasonLabel, postId, seriesTitle, seriesUrl }) {
	const label = seasonLabel ? ` (${seasonLabel})` : '';
	console.log(`   ⏳ Processing Season ${seasonNumber}${label}...`);

	let attempts = 0;
	let seasonHtml = '';
	let episodes = [];
	let lastError = null;

	while (true) {
		attempts++;
		try {
			seasonHtml = await fetchSeasonEpisodesViaAjax(postId, seasonNumber, CONFIG.maxRetries, seriesUrl);
			episodes = extractEpisodesFromSeason(seasonHtml);
		} catch (err) {
			lastError = err;
			console.log(`   ⚠️ Season ${seasonNumber} attempt ${attempts} failed: ${err.message}`);
		}

		if (episodes.length > 0) {
			break;
		}

		if (seasonNumber === 1 && attempts < SEASON_ONE_MAX_ATTEMPTS) {
			console.log(`   🔁 Season 1 empty. Retry ${attempts}/${SEASON_ONE_MAX_ATTEMPTS}...`);
			await delay(CONFIG.retryDelay);
			continue;
		}

		break;
	}

	if (episodes.length === 0) {
		const reason = lastError ? lastError.message : 'No episodes returned';
		console.log(`   ⏭️ Skipping Season ${seasonNumber}. ${reason}`);
		return {
			season_number: seasonNumber,
			season_poster: null,
			episodes: [],
			error: reason,
		};
	}

	console.log(`   ✅ Season ${seasonNumber}: Found ${episodes.length} episode(s)`);
	console.log(`   ⚡ Fetching episode details in parallel...`);

	const seasonPoster = extractSeasonPosterFromHtml(seasonHtml) || null;

	const seasonEpisodes = await Promise.all(
		episodes.map(async (ep, index) => {
			const episodeNumber = index + 1;
			try {
				const episodeHtml = await fetchHtmlWithRetry(ep.url);
				const episodeMainPoster = extractEpisodeMainPoster(episodeHtml);
				const rawIframeEmbeds = extractIframeEmbeds(episodeHtml);
				const resolvedEmbeds = await resolveIframeEmbeds(rawIframeEmbeds);
				return {
					episode_number: episodeNumber,
					episode_title: ep.title || null,
					episode_card_thumbnail: ep.image || null,
					episode_page_url: ep.url || null,
					episode_main_poster: episodeMainPoster || null,
					iframe_embeds: resolvedEmbeds.map((ifr) => ({
						option: ifr.option,
						url: ifr.url,
					})),
				};
			} catch (err) {
				console.error(`      ❌ Episode ${episodeNumber} failed: ${err.message}`);
				return {
					episode_number: episodeNumber,
					episode_title: ep.title || null,
					episode_card_thumbnail: ep.image || null,
					episode_page_url: ep.url || null,
					episode_main_poster: null,
					iframe_embeds: [],
					error: err.message,
				};
			}
		})
	);

	seasonEpisodes.sort((a, b) => a.episode_number - b.episode_number);
	const successCount = seasonEpisodes.filter((e) => !e.error).length;
	const totalEmbeds = seasonEpisodes.reduce((sum, e) => sum + (e.iframe_embeds?.length || 0), 0);
	console.log(`   ✅ Season ${seasonNumber}: ${successCount}/${episodes.length} episodes processed, ${totalEmbeds} total embed(s)`);

	return {
		season_number: seasonNumber,
		season_poster: seasonPoster,
		episodes: seasonEpisodes,
	};
}

async function processSeries(seriesUrl) {
	console.log(`\n📺 Processing SERIES: ${seriesUrl}`);

	try {
		const seriesHtml = await fetchHtmlWithRetry(seriesUrl);
		const common = extractCommonFields(seriesHtml);
		const postId = extractPostId(seriesHtml);
		if (!postId) {
			throw new Error('Unable to determine post ID for this series');
		}

		const rawSeasonLinks = extractSeasonLinks(seriesHtml);
		const normalizedSeasons = rawSeasonLinks.length > 0 ? rawSeasonLinks : [{ name: 'Season 1', seasonNumber: 1 }];
		const totalSeasons = normalizedSeasons.length;

		console.log(`   ✅ Found ${totalSeasons} season(s)`);

		const seasons = [];
		for (let i = 0; i < normalizedSeasons.length; i++) {
			const seasonEntry = normalizedSeasons[i];
			const seasonNumber = seasonEntry.seasonNumber ?? i + 1;
			const seasonLabel = seasonEntry.name || null;

			const seasonResult = await processSeason({
				seasonNumber,
				seasonLabel,
				postId,
				seriesTitle: common.title,
				seriesUrl,
			});
			seasons.push(seasonResult);
		}

		return {
			type: 'series',
			url: seriesUrl,
			...common,
			total_seasons: totalSeasons,
			seasons,
		};
	} catch (err) {
		console.error(`❌ Series processing failed: ${err.message}`);
		throw err;
	}
}

// ==================== MOVIE EXTRACTION ====================

async function processMovie(movieUrl) {
	console.log(`\n🎥 Processing MOVIE: ${movieUrl}`);
	
	try {
		const movieHtml = await fetchHtmlWithRetry(movieUrl);
		const common = extractCommonFields(movieHtml);
		
		const $ = cheerio.load(movieHtml);
		
		// Movie poster
		let moviePoster = null;
		const postThumbnail = $('div.post-thumbnail.alg-ss figure img, div.post-thumbnail img').first();
		if (postThumbnail.length) {
			moviePoster = normalizeUrl(
				postThumbnail.attr('src') ||
				postThumbnail.attr('data-src') ||
				postThumbnail.attr('data-lazy-src')
			);
		}
		if (!moviePoster) {
			moviePoster = common.thumbnail;
		}
		
		// All iframe embeds
		const rawIframeEmbeds = [];
		$('iframe').each((_, el) => {
			const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
			const url = normalizeUrl(src);
			if (url) {
				rawIframeEmbeds.push(url);
			}
		});
		
		// Resolve trembed URLs to real video links
		const iframeEmbedsWithOption = rawIframeEmbeds.map((url, idx) => ({ option: idx + 1, url }));
		const resolvedEmbeds = await resolveIframeEmbeds(iframeEmbedsWithOption);
		const iframeEmbeds = resolvedEmbeds.map((ifr) => ifr.url).filter(Boolean);
		
		console.log(`   ✅ Movie processed: ${iframeEmbeds.length} embed(s) found`);
		
		return {
			type: 'movie',
			url: movieUrl,
			...common,
			movie_poster: moviePoster || null,
			iframe_embeds: iframeEmbeds,
		};
	} catch (err) {
		console.error(`❌ Movie processing failed: ${err.message}`);
		throw err;
	}
}

// ==================== SAVE TO FOLDER STRUCTURE ====================

function saveToFolderStructure(data, baseDir = 'data') {
	if (data.type === 'series') {
		const seriesName = sanitizeFileName(data.title || 'unknown-series');
		const seriesDir = path.join(baseDir, seriesName);
		ensureDir(seriesDir);
		
		for (const season of data.seasons || []) {
			const seasonDir = path.join(seriesDir, `season-${season.season_number}`);
			ensureDir(seasonDir);
			
			for (const episode of season.episodes || []) {
				const episodeData = {
					series: data.title || null,
					thumbnail: data.thumbnail || null,
					season: season.season_number,
					episode: episode.episode_number,
					episode_title: episode.episode_title || null,
					episode_main_poster: episode.episode_main_poster || null,
					episode_card_thumbnail: episode.episode_card_thumbnail || null,
					episode_list_thumbnail: episode.episode_card_thumbnail || null,
					video_player_thumbnail: null,
					servers: (episode.iframe_embeds || []).map((ifr) => ({
						option: ifr.option,
						real_video: ifr.url || null,
					})),
				};
				
				const episodeFile = path.join(seasonDir, `episode-${episode.episode_number}.json`);
				fs.writeFileSync(episodeFile, JSON.stringify(episodeData, null, 2), 'utf-8');
			}
		}
	} else if (data.type === 'movie') {
		// Save movie to data/{movie-name}/movie.json
		const movieName = sanitizeFileName(data.title || 'unknown-movie');
		const movieDir = path.join(baseDir, movieName);
		ensureDir(movieDir);
		
		const movieData = {
			title: data.title || null,
			description: data.description || null,
			release_year: data.release_year || null,
			genres: data.genres || [],
			thumbnail: data.thumbnail || null,
			movie_poster: data.movie_poster || null,
			tmdb_id: data.tmdb_id || null,
			tvdb_id: data.tvdb_id || null,
			languages: data.languages || [],
			url: data.url || null,
			servers: (data.iframe_embeds || []).map((url, idx) => ({
				option: idx + 1,
				real_video: url || null,
			})),
		};
		
		const movieFile = path.join(movieDir, 'movie.json');
		fs.writeFileSync(movieFile, JSON.stringify(movieData, null, 2), 'utf-8');
		console.log(`   💾 Movie saved to: ${movieFile}`);
	}
}

// ==================== MAIN PROCESSING ====================

async function processUrl(url) {
	try {
		if (url.includes('/series/')) {
			return await processSeries(url);
		} else if (url.includes('/movies/')) {
			return await processMovie(url);
		} else {
			// Handle shorts/OVA or unknown types
			console.log(`\n⚠️  Unknown URL type: ${url}`);
			return {
				type: 'unknown',
				url: url,
				error: 'Unknown URL type',
			};
		}
	} catch (err) {
		throw err;
	}
}

// ==================== MAIN FUNCTION ====================

async function main() {
	console.log('🚀 Starting Bulk Fetch Script');
	console.log('================================\n');

	// Read data.json
	let urls = [];
	try {
		const dataContent = fs.readFileSync('data.json', 'utf-8');
		const data = JSON.parse(dataContent);
		
		if (Array.isArray(data)) {
			urls = data
				.map((item) => {
					if (typeof item === 'string') {
						return item;
					} else if (item && typeof item === 'object' && item.link) {
						return item.link;
					} else if (item && typeof item === 'object' && item.url) {
						return item.url;
					}
					return null;
				})
				.filter(Boolean);
		} else {
			throw new Error('data.json must contain an array');
		}
	} catch (err) {
		console.error(`❌ Failed to read data.json: ${err.message}`);
		process.exit(1);
	}

	if (urls.length === 0) {
		console.error('❌ No URLs found in data.json');
		process.exit(1);
	}

	console.log(`📋 Found ${urls.length} anime entries in data.json\n`);

	// Auto mode: only process not-yet-fetched items
	let autoMode = process.argv.includes('--auto') || process.argv.includes('-a');
	if (autoMode) {
		const entries = getDataEntriesFromJson();
		const toFetch = filterUnfetchedEntries(entries);
		console.log(`🧠 Auto mode enabled: ${toFetch.length} unfetched item(s) detected.`);
		urls = toFetch;
		if (urls.length === 0) {
			console.log('✅ Nothing to fetch. All entries appear processed.');
			return;
		}
	}

	const { startIndex, endIndex } = await promptRange(urls.length);
	const totalToProcess = endIndex - startIndex + 1;

	if (totalToProcess <= 0) {
		console.log('ℹ️ Nothing to process in the selected range. Exiting.');
		return;
	}

	console.log(`🔢 Processing entries ${startIndex} to ${endIndex} (${totalToProcess} total)\n`);
	console.log('⏳ Processing sequentially with delays...\n');

	// Initialize output structures
	const results = { success: [] };
	const errors = { errors: [] };

	// Process each URL sequentially within range
	for (let i = startIndex; i <= endIndex; i++) {
		const url = urls[i];
		console.log(`\n${'='.repeat(60)}`);
		console.log(`[${i + 1}/${urls.length}] Processing: ${url}`);
		console.log('='.repeat(60));

		try {
			const data = await processUrl(url);
			
			// Save to folder structure
			saveToFolderStructure(data);
			
			results.success.push(data);
			console.log(`✅ Successfully processed: ${url}`);
		} catch (err) {
			const errorEntry = {
				url: url,
				error: err.message,
				timestamp: new Date().toISOString(),
			};
			errors.errors.push(errorEntry);
			console.error(`❌ Failed to process: ${url}`);
			console.error(`   Error: ${err.message}`);
		}

		// Small delay before next URL (except for the last one)
		if (i < endIndex) {
			await randomDelay(CONFIG.requestDelay.min, CONFIG.requestDelay.max);
		}
	}

	// Ensure output directory exists
	const outputDir = path.resolve('output');
	ensureDir(outputDir);

	// Save results
	const resultPath = path.join(outputDir, 'result.json');
	const errorPath = path.join(outputDir, 'errors.json');

	fs.writeFileSync(resultPath, JSON.stringify(results, null, 2), 'utf-8');
	fs.writeFileSync(errorPath, JSON.stringify(errors, null, 2), 'utf-8');

	// Print summary
	console.log('\n' + '='.repeat(60));
	console.log('✅ BULK FETCH COMPLETED!');
	console.log('='.repeat(60));
	console.log(`📊 Summary:`);
	console.log(`   ✅ Successfully processed: ${results.success.length}`);
	console.log(`   ❌ Errors: ${errors.errors.length}`);
	console.log(`\n💾 Results saved to:`);
	console.log(`   📁 ${resultPath}`);
	console.log(`   📁 ${errorPath}`);
	console.log(`\n📁 Individual files saved to: data/{anime-name}/season-{n}/episode-{n}.json`);
	console.log('='.repeat(60) + '\n');
}

// ==================== AUTO MODE HELPERS ====================

function getDataEntriesFromJson() {
	try {
		const raw = fs.readFileSync('data.json', 'utf-8');
		const data = JSON.parse(raw);
		if (!Array.isArray(data)) return [];
		return data.map((item) => {
			if (typeof item === 'string') {
				return { url: item };
			}
			return {
				url: item.link || item.url || null,
				title: item.title || null,
				type: item.type || (item.link?.includes('/series/') ? 'series' : item.link?.includes('/movies/') ? 'movies' : null),
			};
		}).filter((it) => it.url);
	} catch {
		return [];
	}
}

function slugFromUrl(url) {
	try {
		const u = new URL(url);
		const parts = u.pathname.split('/').filter(Boolean);
		// Expecting /series/<slug>/ or /movies/<slug>/
		const slug = parts[1] || parts[parts.length - 1] || 'item';
		return slug;
	} catch {
		return 'item';
	}
}

function safeNamesForEntry(entry) {
	const names = [];
	if (entry.title) names.push(sanitizeFileName(entry.title));
	names.push(sanitizeFileName(slugFromUrl(entry.url).replace(/-/g, ' ')));
	names.push(sanitizeFileName(slugFromUrl(entry.url))); // raw slug
	return Array.from(new Set(names));
}

function isSeriesFetchedByName(baseName) {
	const seriesDir = path.join('data', baseName);
	if (!fs.existsSync(seriesDir)) return false;
	try {
		const entries = fs.readdirSync(seriesDir, { withFileTypes: true });
		const seasonDirs = entries.filter((e) => e.isDirectory() && /^season[-_]/i.test(e.name));
		for (const s of seasonDirs) {
			const seasonPath = path.join(seriesDir, s.name);
			const files = fs.readdirSync(seasonPath);
			if (files.some((f) => /^episode[-_].*\.json$/i.test(f))) return true;
		}
		return false;
	} catch {
		return false;
	}
}

function isMovieFetchedByName(baseName) {
	const movieDir = path.join('data', baseName);
	return fs.existsSync(path.join(movieDir, 'movie.json'));
}

function filterUnfetchedEntries(entries) {
	const out = [];
	for (const entry of entries) {
		const type = entry.type || (entry.url.includes('/series/') ? 'series' : entry.url.includes('/movies/') ? 'movies' : 'unknown');
		if (type === 'unknown') continue;
		const possibleNames = safeNamesForEntry(entry);
		let fetched = false;
		for (const name of possibleNames) {
			if (type === 'series' && isSeriesFetchedByName(name)) { fetched = true; break; }
			if (type === 'movies' && isMovieFetchedByName(name)) { fetched = true; break; }
		}
		if (!fetched) out.push(entry.url);
	}
	return out;
}

// Run the script
main().catch((err) => {
	console.error('\n❌ Fatal error:', err);
	process.exit(1);
});

