import { readFileSync, createWriteStream, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
const version = packageJson.version;
const outputFilename = `ot-list-v${version}.zip`;

// Create releases directory if it doesn't exist
const releasesDir = join(projectRoot, 'releases');
if (!existsSync(releasesDir)) {
  mkdirSync(releasesDir, { recursive: true });
}

// Create a file to stream archive data to
const output = createWriteStream(join(releasesDir, outputFilename));
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for all archive data to be written
output.on('close', () => {
  console.log(`✓ Release package created: releases/${outputFilename}`);
  console.log(`  Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

// Handle warnings
archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err);
  } else {
    throw err;
  }
});

// Handle errors
archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

console.log('Creating release package...');

// Add directories and files
archive.directory(join(projectRoot, 'dist'), 'dist');
archive.directory(join(projectRoot, 'pb', 'pb_migrations'), 'pb/pb_migrations', {
  // Only include migration files
});
archive.file(join(projectRoot, 'pb_schema.json'), { name: 'pb_schema.json' });
archive.file(join(projectRoot, 'README.md'), { name: 'README.md' });
archive.file(join(projectRoot, 'scripts', 'pocketbase.service'), { name: 'scripts/pocketbase.service' });

// Finalize the archive
archive.finalize();
