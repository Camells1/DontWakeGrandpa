// Developer launcher for automated tests and for filming the trailer: opens the game in a window parked
// off the edge of the screen (so it keeps drawing at full speed and nobody minimises it by accident).
// Usage: electron tools/test-main.js --remote-debugging-port=9391
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns,CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.whenReady().then(() => {
  const win = new BrowserWindow({ x: -2600, y: 40, width: 1600, height: 900, useContentSize: true, show: true, skipTaskbar: true, focusable: false, frame: false,
    webPreferences: { preload: path.join(__dirname, '..', 'electron', 'preload.js'), contextIsolation: true, backgroundThrottling: false } });
  win.loadFile(path.join(__dirname, '..', process.argv.includes('--viewer') ? 'viewer.html' : 'index.html'));
});
app.on('window-all-closed', () => app.quit());
ipcMain.on('quit', () => app.quit());
