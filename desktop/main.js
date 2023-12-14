const {app, BrowserWindow} = require('electron');
const contextMenu = require('electron-context-menu');
const path = require('path');

contextMenu({
  showCopyImage: true,
  showSaveImageAs: true
});

app.commandLine.appendSwitch('disable-http-cache');

const static = require('node-static');
const file = new static.Server(`${__dirname}/public`);

require('http').createServer((req, res) => {
  req.addListener('end', () => {
    file.serve(req, res);
  }).resume();
}).listen(9876);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 728,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'its.ico')
  });
  mainWindow.removeMenu();
  mainWindow.loadURL('http://127.0.0.1:9876');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) createWindow();
  })
});

app.on('window-all-closed', () => {
  if(process.platform !== 'darwin') app.quit();
});
