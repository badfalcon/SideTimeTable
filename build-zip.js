const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Guard: manifest.json must be the production manifest. A dev/demo build
// (npm run dev, npm run screenshots) leaves manifest.dev.json contents at the
// root, and packaging that would ship the wrong OAuth client and dev key.
const manifest = fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8');
const prodManifest = fs.readFileSync(path.join(__dirname, 'manifest.prod.json'), 'utf8');
if (manifest !== prodManifest) {
  console.error('❌ manifest.json does not match manifest.prod.json (development build detected).');
  console.error('   Run `npm run build` first, or use `npm run package`.');
  process.exit(1);
}

// Output filename
const outputFilename = 'SideTimeTable-release.zip';
const output = fs.createWriteStream(path.join(__dirname, outputFilename));
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

// src/ - HTML and CSS only
console.log('  ✓ src/ (HTML, CSS, images, libs)');
archive.glob('**/*.html', { cwd: 'src' }, { prefix: 'src' });
archive.glob('**/*.css', { cwd: 'src', ignore: ['vendor/**'] }, { prefix: 'src' });
archive.directory('src/img/', 'src/img');

// src/lib/ - Non-JS files and specific required JS files
archive.file('src/lib/localize.js', { name: 'src/lib/localize.js' });
archive.file('src/lib/locale-utils.js', { name: 'src/lib/locale-utils.js' });
archive.glob('*.min.js', { cwd: 'src/lib' }, { prefix: 'src/lib' });

// src/vendor/ - Bootstrap, Popper, etc.
console.log('  ✓ src/vendor/');
archive.directory('src/vendor/', 'src/vendor');

// _locales/
console.log('  ✓ _locales/');
archive.directory('_locales/', '_locales');

// docs/ (if needed)
if (fs.existsSync('docs')) {
  console.log('  ✓ docs/');
  archive.directory('docs/', 'docs');
}

console.log('\n⏳ Compressing...');
archive.finalize();