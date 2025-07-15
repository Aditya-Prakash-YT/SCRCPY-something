
const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');

// Define paths to the executables
const adbPath = path.join(process.resourcesPath, 'adb', 'adb.exe');
const scrcpyPath = path.join(process.resourcesPath, 'scrcpy', 'scrcpy.exe');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 650,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
  win.removeMenu();
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('Control+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Listen for the 'execute-command' event from the renderer process
ipcMain.on('execute-command', (event, { executable, args, commandType }) => {
  let executablePath;

  if (executable === 'adb') {
    executablePath = adbPath;
  } else if (executable === 'scrcpy') {
    executablePath = scrcpyPath;
  } else {
    event.reply('command-output', `Error: Unknown command ${executable}`);
    return;
  }

  execFile(executablePath, args, (error, stdout, stderr) => {
    if (error) {
      event.reply('command-output', { data: `Error: ${error.message}`, commandType });
      return;
    }
    if (stderr) {
      event.reply('command-output', { data: stderr, commandType });
    }
    event.reply('command-output', { data: stdout, commandType });
  });
});

// Handle the save dialog for recording
ipcMain.handle('show-save-dialog', async (event, format) => {
  const result = await dialog.showSaveDialog({
    title: 'Select where to save the recording',
    buttonLabel: 'Save',
    defaultPath: `recording-${Date.now()}.${format}`,
    filters: [
      { name: 'Movies', extensions: ['mp4', 'mkv'] }
    ]
  });
  return result.filePath;
});

ipcMain.handle('save-log', async (event, logContent, defaultFilename) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Log File',
    buttonLabel: 'Save',
    defaultPath: defaultFilename,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.filePath) {
    fs.writeFileSync(result.filePath, logContent);
    return true;
  } else {
    return false;
  }
});
