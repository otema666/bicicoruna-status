const { app, BrowserWindow, Menu } = require('electron');
const path = require('path'); // Para facilitar rutas de archivos

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'icon.ico'), // Ruta al ícono
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadFile('index.html');
  win.setMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
