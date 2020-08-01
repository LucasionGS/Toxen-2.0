const { app, BrowserWindow, Menu, Tray, shell } = require('electron');
const { accessSync } = require('fs');
const { dirname } = require('path');


// Auto updating (Reenable when it works :/)
// require("update-electron-app")({
//   "repo": "LucasionGS/Toxen-2.0",
// });

// const process = require('process');
// const fs = require('fs');
const winWidth = 1280;
const winHeight = 800;
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
/**
 * @type {Electron.BrowserWindow}
 */
let win;
app.allowRendererProcessReuse = true; // Electron mad if i don't :(
process.chdir("C:/Windows/System32");

try {
  let cwd = process.cwd();
  accessSync(cwd);
  if (/^\w:\\windows\\system32/gi.test(cwd.toLowerCase())) {
    throw "CWD cannot be System32";
  }
} catch (err) {
  console.error(err + "\n\n", process.cwd(), "is inaccessible, changing cwd to launch file directory.");
  process.chdir(dirname(process.argv[0]));
}

console.log("cwd: ", process.cwd());

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    title: "Toxen",
    minWidth: 800,
    minHeight: 600,
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
    console.error("No icon accessible");
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
            app.quit();
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
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
