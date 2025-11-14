#!/usr/bin/env node

/**
 * Setup Checker Script
 * यह script check करता है कि project properly setup है या नहीं
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const issues = [];
const warnings = [];

console.log('\n🔍 Checking project setup...\n');

// 1. Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
	issues.push(`❌ Node.js version ${nodeVersion} is too old. Please use Node.js 18 or higher.`);
} else {
	console.log(`✅ Node.js version: ${nodeVersion}`);
}

// 2. Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
	issues.push('❌ node_modules folder not found. Run: npm install');
} else {
	console.log('✅ Dependencies installed (node_modules exists)');
}

// 3. Check if data folder exists
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) {
	warnings.push('⚠️  data/ folder not found. Backend will not have any content to serve.');
	console.log('⚠️  data/ folder missing');
} else {
	console.log('✅ data/ folder exists');
	
	// Check if data folder has content
	const dataContents = fs.readdirSync(dataPath);
	const folders = dataContents.filter(item => {
		const itemPath = path.join(dataPath, item);
		return fs.statSync(itemPath).isDirectory();
	});
	
	if (folders.length === 0) {
		warnings.push('⚠️  data/ folder is empty. Add anime/series folders with JSON files.');
	} else {
		console.log(`✅ Found ${folders.length} series/movie folder(s) in data/`);
	}
}

// 4. Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
	issues.push('❌ package.json not found');
} else {
	console.log('✅ package.json exists');
}

// 5. Check if vite.config.js exists
const viteConfigPath = path.join(__dirname, 'vite.config.js');
if (!fs.existsSync(viteConfigPath)) {
	issues.push('❌ vite.config.js not found');
} else {
	console.log('✅ vite.config.js exists');
}

// 6. Check if server/index.js exists
const serverIndexPath = path.join(__dirname, 'server', 'index.js');
if (!fs.existsSync(serverIndexPath)) {
	issues.push('❌ server/index.js not found');
} else {
	console.log('✅ Backend server file exists');
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 SETUP CHECK SUMMARY');
console.log('='.repeat(60) + '\n');

if (issues.length === 0 && warnings.length === 0) {
	console.log('🎉 Everything looks good! You can run the project now.\n');
	console.log('To start the project, run:');
	console.log('  npm start\n');
	console.log('Then open: http://localhost:5000');
} else {
	if (issues.length > 0) {
		console.log('❌ CRITICAL ISSUES (must fix):');
		issues.forEach(issue => console.log('  ' + issue));
		console.log('');
	}
	
	if (warnings.length > 0) {
		console.log('⚠️  WARNINGS:');
		warnings.forEach(warning => console.log('  ' + warning));
		console.log('');
	}
	
	console.log('💡 NEXT STEPS:');
	if (issues.some(i => i.includes('node_modules'))) {
		console.log('  1. Run: npm install');
	}
	if (warnings.some(w => w.includes('data/'))) {
		console.log('  2. Create data/ folder: mkdir data');
		console.log('  3. Add your anime/series JSON files to data/');
	}
	console.log('  4. Run: npm start');
	console.log('  5. Open: http://localhost:5000\n');
}

// Exit with error code if there are critical issues
if (issues.length > 0) {
	process.exit(1);
}
