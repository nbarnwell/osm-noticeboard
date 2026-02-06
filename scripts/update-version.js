#!/usr/bin/env node

/**
 * Update version file from git tag
 * Run this script after deploying a new version
 * Usage: node scripts/update-version.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

function getVersion() {
    try {
        return execSync('git describe --tags --always', {
            cwd: projectRoot,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
    } catch (e) {
        console.error('Error getting git version:', e.message);
        return 'unknown';
    }
}

function updateVersionFile() {
    const version = getVersion();
    const versionFile = path.join(projectRoot, '.version');
    
    try {
        fs.writeFileSync(versionFile, version, 'utf-8');
        console.log(`✓ Version file updated: ${version}`);
        console.log(`  File: ${versionFile}`);
    } catch (e) {
        console.error(`✗ Failed to write version file:`, e.message);
        process.exit(1);
    }
}

updateVersionFile();
