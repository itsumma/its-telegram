const {app, BrowserWindow} = require('electron');
const contextMenu = require('electron-context-menu');
const path = require('path');

contextMenu({
  showCopyImage: true,
  showSaveImageAs: true
});

app.commandLine.appendSwitch('disable-http-cache');

const static = require('node-static');
const file = new static.Server(`${__dirname}/bundle`);

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
    icon: path.join(__dirname, 'favicon.ico')
  });
  mainWindow.removeMenu();
  mainWindow.loadURL('http://127.0.0.1:9876');

  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    if(url.startsWith('file:')){
      return {action: 'allow'};
    }
    const {shell} = require('electron');
    console.log(shell);
    shell.openExternal(url);
    return {action: 'deny'};
  })
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
