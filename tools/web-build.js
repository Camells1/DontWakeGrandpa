// Builds the browser version of Dont Wake Grandpa (Chromebooks, or no install) into the Camel Studios
// website repo, served by GitHub Pages at camells1.github.io/play/dontwakegrandpa/.
// Usage: node tools/web-build.js [targetDir]
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const target = path.resolve(process.argv[2] || 'D:/Projects/Camells1.github.io/play/dontwakegrandpa');
const { version } = require('../package.json');
const copy = ['index.html', 'src', 'vendor', 'assets/icon.png', 'assets/sfx', 'assets/voice', 'node_modules/three/build/three.module.js', 'node_modules/peerjs/dist/peerjs.min.js'];

fs.rmSync(target, { recursive: true, force: true });
for (const rel of copy) {
  const to = path.join(target, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(path.join(root, rel), to, { recursive: true });
}
// "Install app" in Chrome / ChromeOS
fs.writeFileSync(path.join(target, 'manifest.webmanifest'), JSON.stringify({
  name: 'Dont Wake Grandpa', short_name: 'Dont Wake Grandpa', description: 'Tiny beans rob a sleeping giant. He can hear your microphone. A Camel Studios game.',
  start_url: './', scope: './', display: 'fullscreen', orientation: 'landscape', background_color: '#130e2a', theme_color: '#130e2a',
  icons: [{ src: 'assets/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }]
}, null, 2));
const index = path.join(target, 'index.html');
fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<link rel="icon"', '<link rel="manifest" href="manifest.webmanifest" />\n  <link rel="icon"'));
fs.writeFileSync(path.join(target, 'version.txt'), version + '\n');
console.log(`web build v${version} -> ${target}`);
