const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// All paths below are relative to the repository root.
process.chdir(path.join(__dirname, '..'));

// Guard: manifest.json must be the production manifest. A dev/demo build
// (npm run dev, npm run screenshots) leaves manifest.dev.json contents at the
// root, and packaging that would ship the wrong OAuth client and dev key.
const manifest = fs.readFileSync('manifest.json', 'utf8');
const prodManifest = fs.readFileSync('manifest.prod.json', 'utf8');
if (manifest !== prodManifest) {
  console.error('❌ manifest.json does not match manifest.prod.json (development build detected).');
  console.error('   Run `npm run build` first, or use `npm run package`.');
  process.exit(1);
}

// Output filename
const outputFilename = 'SideTimeTable-release.zip';
const output = fs.createWriteStream(outputFilename);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  console.log(`✅ ${outputFilename} created successfully!`);
  console.log(`   Total bytes: ${archive.pointer()}`);
  console.log(`   Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add files
console.log('📦 Creating release package...\n');

// manifest.json
console.log('  ✓ manifest.json');
archive.file('manifest.json', { name: 'manifest.json' });

// dist/ directory
console.log('  ✓ dist/');
archive.directory('dist/', 'dist');

// src/ - HTML, CSS and images
console.log('  ✓ src/ (HTML, CSS, images)');
archive.glob('**/*.html', { cwd: 'src' }, { prefix: 'src' });
archive.glob('**/*.css', { cwd: 'src' }, { prefix: 'src' });
archive.directory('src/img/', 'src/img');

// src/lib/ - plain scripts loaded directly by the HTML pages
archive.file('src/lib/localize.js', { name: 'src/lib/localize.js' });
archive.file('src/lib/locale-utils.js', { name: 'src/lib/locale-utils.js' });

// src/vendor/fontawesome/ - icon fonts and license (the stylesheet is in the *.css glob above)
console.log('  ✓ src/vendor/fontawesome/ (fonts, license)');
archive.glob('**/*.{woff2,txt}', { cwd: 'src/vendor/fontawesome' }, { prefix: 'src/vendor/fontawesome' });

// _locales/
console.log('  ✓ _locales/');
archive.directory('_locales/', '_locales');

// docs/ is the public landing site (HTML pages, screenshots, sitemap) and is
// never loaded by the extension at runtime, so it is intentionally excluded
// from the store package to keep the upload small and the review surface clean.

console.log('\n⏳ Compressing...');
archive.finalize();