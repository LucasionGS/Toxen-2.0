const { app: electronApp, BrowserWindow, Menu, Tray, shell } = require('electron');
const { accessSync } = require('fs');
const { dirname } = require('path');
if (false) {
  // SQUIRREL UPDATE
  if (require('electron-squirrel-startup')) return;


  // this should be placed at top of main.js to handle setup events quickly
  if (handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
  }

  function handleSquirrelEvent() {
    if (process.argv.length === 1) {
      return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAppFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAppFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
      let spawnedProcess, error;

      try {
        spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
      } catch (error) {}

      return spawnedProcess;
    };

    const spawnUpdate = function(args) {
      return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
      case '--squirrel-install':
      case '--squirrel-updated':
        // Optionally do things such as:
        // - Add your .exe to the PATH
        // - Write to the registry for things like file associations and
        //   explorer context menus

        // Install desktop and start menu shortcuts
        spawnUpdate(['--createShortcut', exeName]);

        setTimeout(nodeApp.quit, 1000);
        return true;

      case '--squirrel-uninstall':
        // Undo anything you did in the --squirrel-install and
        // --squirrel-updated handlers

        // Remove desktop and start menu shortcuts
        spawnUpdate(['--removeShortcut', exeName]);

        setTimeout(nodeApp.quit, 1000);
        return true;

      case '--squirrel-obsolete':
        // This is called on the outgoing version of your app before
        // we update to the new version - it's the opposite of
        // --squirrel-updated

        nodeApp.quit();
        return true;
    }
  };
}

// ELECTRON MAIN APP

// const process = require('process');
// const fs = require('fs');
const winWidth = 1280;
const winHeight = 720;
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
/**
 * @type {Electron.BrowserWindow}
 */
let win;
electronApp.allowRendererProcessReuse = true; // Electron mad if i don't :(

try {
  let cwd = process.cwd();
  accessSync(cwd);
  if (/^\w:\\windows\\system32/gi.test(cwd.toLowerCase())) {
    throw "CWD cannot be System32";
  }
} catch (err) {
  console.error(err + "\n\n", process.cwd(), "is inaccessible, changing cwd to launch file directory.");
  let dir = process.argv.find(a => a.startsWith("--app-path="));
  if (typeof dir == "string") {
    dir = dir.substring("--app-path=".length);
    if (!electronApp.isPackaged && dir.endsWith("resources\\app")) dir = dir.substring(0, dir.length - "resources\\app".length),
    process.chdir(dir);
  }
  else {
    console.error("Unable to find --app-path in parameters... Using executable path instead.");
    process.chdir(dirname(process.argv[0]));
  }
}

console.log("cwd: ", process.cwd());

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    title: "Toxen",
    minWidth: 720,
    minHeight: 360,
    width: winWidth,
    height: winHeight,
    frame: false,
    backgroundColor: "#fff",
    webPreferences: {
      nodeIntegration: true
    },
    show:false
  });

  try {
    win.setIcon("./icon.ico");
  } catch (error) {
    try {
      win.setIcon("./icon.png"); // For non-windows icon support.
    } catch (error) {
      console.error("No icon accessible");
    }
  }

  win.once('ready-to-show', () => {
    //This will prevent the white startup screen before the page loads in fully
    win.show();
  });

  // and load the index.html of the app.
  win.loadFile('./src/index.html');

  // Open the DevTools.
  //win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  /*win.on('minimize', function(event){
      event.preventDefault();
      win.hide();
    });*/

    var appIcon = null;
    try {
      appIcon = new Tray("./icon.ico");
      var contextMenu = Menu.buildFromTemplate([
        {
          label: "Show",
          type: "radio",
          click(){
            win.show();
          }
        },
        {
          label: "Quit",
          type: "radio",
          click(){
            electronApp.quit();
          }
        }
      ]);
      appIcon.setToolTip("Toxen♫");
      appIcon.setContextMenu(contextMenu);

      appIcon.on("click", () => {
        win.show();
      });
    } catch (error) {}

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electronApp.on('ready', createWindow);

// Quit when all windows are closed.
electronApp.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    electronApp.quit();
  }
});

electronApp.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

