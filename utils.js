import axios from 'axios';
import fs from 'fs';
import path from 'path';

const CONFIG = {
	timeout: 30000,
	userAgent:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	referer: 'https://example.com/',
};

export function normalizeUrl(rawUrl, base = 'https://example.com') {
	if (!rawUrl || /^javascript:/i.test(rawUrl)) return null;
	try {
		return new URL(rawUrl, base).href;
	} catch {
		return rawUrl;
	}
}

export async function fetchHtml(url, { retries = 1, allow404 = false } = {}) {
	let lastErr = null;
	for (let i = 0; i < Math.max(1, retries); i++) {
		try {
			const res = await axios.get(url, {
				timeout: CONFIG.timeout,
				maxRedirects: 5,
				validateStatus: () => true,
				headers: {
					'User-Agent': CONFIG.userAgent,
					Accept:
						'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					Referer: CONFIG.referer,
				},
			});
			if (res.status === 404 && allow404) return null;
			if (res.status >= 200 && res.status < 400) {
				return String(res.data || '');
			}
			lastErr = new Error(`HTTP ${res.status}`);
		} catch (err) {
			lastErr = err;
		}
	}
	if (allow404) return null;
	throw new Error(`Failed to fetch ${url}: ${lastErr?.message || 'unknown error'}`);
}

export function ensureDir(dir) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function saveJson(targetPath, obj) {
	ensureDir(path.dirname(targetPath));
	fs.writeFileSync(targetPath, JSON.stringify(obj, null, 2), 'utf-8');
}

export async function mapConcurrent(items, mapper, concurrency = 10) {
	const results = new Array(items.length);
	let idx = 0;
	async function worker() {
		while (true) {
			const i = idx++;
			if (i >= items.length) return;
			try {
				results[i] = await mapper(items[i], i);
			} catch (e) {
				results[i] = e;
			}
		}
	}
	const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
	await Promise.all(workers);
	return results;
}


