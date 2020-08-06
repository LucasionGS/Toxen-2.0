import * as fs from "fs";
import { TextEditor } from "./texteditor";
import * as ToxenCore from "./toxenCore";
const {
  Toxen,
  Settings,
  Song,
  SongManager,
  Storyboard,
  ToxenScriptManager,
  Tools,
  Prompt,
  Update,
  ScriptEditor,
  ToxenModule,
  Statistics,
  SelectList,
  PanelManager,
  SongGroup,
  toxenMenus,
  toxenHeaderMenu,
  showTutorial,
} = ToxenCore
import * as path from "path";
import rimraf = require("rimraf");
import * as __toxenVersion from "./version.json"
Toxen.version = __toxenVersion;
const { remote, ipcRenderer, shell } = require("electron");
let debugMode = !remote.app.isPackaged;
let browserWindow = remote.getCurrentWindow();

/**
 * Global Settings Object
 */
// This is automatically set to Settings.current as well
let settings = new Settings();

/**
 * Global Statistics Object
 */
// This is automatically set to Statistics.current as well
let stats = new Statistics();

Toxen.title = "Loading Toxen...";
window.addEventListener("load", () => {
  setTimeout(() => {
    initialize().then(() => {
      if (SongManager.songList.length == 0) Toxen.title = "Add some songs to start listening!";
    }).catch(err => {
      Toxen.title = "Unable to load Toxen";
      Toxen.errorPrompt(err);
    });
  }, 10);
});

// Progress bar
Toxen.interactiveProgressBar = new Toxen.InteractiveProgressBar("48%", 16);
Toxen.interactiveProgressBar.element.id = "progressbar";
Toxen.interactiveProgressBar.element.classList.add("hideoninactive");
// Progress bar events
Toxen.interactiveProgressBar.on("click", value => {
  SongManager.moveToTime(value);
  Toxen.updateDiscordPresence();
})
.on("drag", value => {
  SongManager.moveToTime(value);
})
.on("release", () => {
  Toxen.updateDiscordPresence();
});

async function initialize() {
  // Load settings
  settings.loadFromFile();
  if (settings.songFolder == null) {
    switch(process.platform) {
      case "win32":
        settings.songFolder = process.env.HOMEDRIVE + process.env.HOMEPATH + "/Music/ToxenMusic";
        break;
      case "linux":
      case "darwin":
        settings.songFolder = process.env.HOME + "/Music/ToxenMusic";
        break;
    }
  }

  if (settings.discordPresence === true) {
    Toxen.discordConnect();
  }

  //#region Custom sliders/Progress bars
  document.body.appendChild(Toxen.interactiveProgressBar.element); // Insert the progress bar

  { // Block scope
    let audioAdjuster = new Toxen.InteractiveProgressBar(128, 12); // Create the volume bar
    audioAdjuster.max = 100;
    audioAdjuster.element.id = "audioadjusterbar";
    document.getElementById("audioadjuster").appendChild(audioAdjuster.element); // Insert the volume bar
    audioAdjuster.on("click", value => {
      Settings.current.setVolume(value);
      Settings.current.saveToFile();
    })
    .on("drag", value => {
      Settings.current.setVolume(value);
    })
    .on("release", value => {
      Settings.current.setVolume(value);
      Settings.current.saveToFile();
    });

    let bd = new Toxen.InteractiveProgressBar("100%", 20);
    // bd.vertical = true;
    document.getElementById("backgrounddiminteractivebarcontainer").appendChild(bd.element);
    bd.value = settings.backgroundDim;
    bd.on("click", value => {
      _chnBd(value);
      settings.saveToFile();
    })
    .on("drag", value => {
      _chnBd(value);
    })
    .on("release", value => {
      _chnBd(value);
      settings.saveToFile();
    });

    let _chnBd = function(value: number) {
      settings.backgroundDim = value;
      Storyboard.backgroundDim = settings.backgroundDim;
      bd.color.red = 255 - (255 * (settings.backgroundDim / 100))
      bd.color.green = 255 - (255 * (settings.backgroundDim / 100))
      bd.color.blue = 255 - (255 * (settings.backgroundDim / 100))
    }
  }
  //#endregion
  
  if (settings.showTutorialOnStart) { showTutorial(); }
  stats.load();
  stats.startSaveTimer();

  if ((!debugMode && settings.version != Toxen.version) || debugMode) {
    settings.version = Toxen.version;
    let declarationDir = path.resolve(debugMode ? "./src/declarations/" : "./resources/app/src/declarations/");
    let declarationTarget = Toxen.updatePlatform == "win" ? process.env.APPDATA + "\\ToxenData\\data\\declarations" : process.env.HOME + "/.toxendata/data/declarations";
    if (fs.existsSync(declarationTarget)) rimraf.sync(declarationTarget);
    copyFilesRecursively(declarationDir, declarationTarget);
    function copyFilesRecursively(srcDir: string, targetDir: string) {
      fs.exists(targetDir, async exists => {
        if (!exists) await fs.promises.mkdir(targetDir);
        fs.readdir(srcDir, {withFileTypes: true}, (_, files) => {
          files.forEach(file => {
            if (file.isFile()) {
              fs.copyFile(path.resolve(srcDir, file.name), path.resolve(targetDir, file.name), err => {
                if (err) { console.error(err); return; }
              });
            }
            else if (file.isDirectory()) copyFilesRecursively(path.resolve(srcDir, file.name), path.resolve(targetDir, file.name));
          });
        });
      });
    }
  }

  Toxen.extraStyle = document.querySelector("#extracss");

  settings.setThemeBase(settings.lightThemeBase);

  // Check for update
  Update.check(Toxen.version);

  // Initialize onplay & Discord RPC
  SongManager.onplay = async function(song) {
    // Song Info
    song.displayInfo();

    // Discord Rich Presence
    Toxen.updateDiscordPresence(song);

    while(isNaN(SongManager.player.duration)) {
      await Tools.wait(1); 
    }
    if (song.details.songLength != SongManager.player.duration) {
      song.details.songLength = SongManager.player.duration;
      song.saveDetails();
    }
  }
  
  // Applying everything
  SongManager.player = document.querySelector("#musicObject"); // Important to be done first
  settings.setVolume(settings.volume);
  SongManager.songListElement = document.querySelector("#songselection");

  SongManager.toggleShuffle(settings.shuffle);
  SongManager.toggleRepeat(settings.repeat);
  SongManager.toggleOnlyVisible(settings.onlyVisible);
  settings.toggleSongPanelLock(settings.songMenuLocked);
  settings.toggleVideo(settings.video);
  // settings.setProgressBarSpot(settings.progressBarSpot);
  // settings.setProgressBarSpot(1);
  Storyboard.rgb(settings.visualizerColor.red, settings.visualizerColor.green, settings.visualizerColor.blue);

  // Get songs from either database or scan folder.
  if (!settings.remote && !fs.existsSync(settings.songFolder+"/db.json")) {
    SongManager.scanDirectory();
  }
  else {
    await SongManager.loadFromFile();
  }

  settings.toggleSongPanelToRight(settings.songMenuToRight);

  SongManager.player.addEventListener("ended", function() {
    if (settings.repeat) {
      SongManager.player.currentTime = 0;
      SongManager.player.play();
      return;
    }
    else {
      // if (settings.shuffle) {
      //   SongManager.playRandom();
      // }
      // else {
      // }
      SongManager.playNext();
    }
  });

  updateTimer();
  function updateTimer() {
    // document.querySelector<HTMLProgressElement>("div#progress progress#progressbar").value = SongManager.player.currentTime;
    Toxen.interactiveProgressBar.value = SongManager.player.currentTime;
    if (Toxen.interactiveProgressBar.color.red != Storyboard.red) Toxen.interactiveProgressBar.color.red = Storyboard.red;
    if (Toxen.interactiveProgressBar.color.green != Storyboard.green) Toxen.interactiveProgressBar.color.green = Storyboard.green;
    if (Toxen.interactiveProgressBar.color.blue != Storyboard.blue) Toxen.interactiveProgressBar.color.blue = Storyboard.blue;
    let cur = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.currentTime, false, true);
    let dur = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.duration, false, true);
    let progressText = document.querySelector<HTMLLabelElement>("label#progresstext");
    while (dur.startsWith("00:")) {
      cur = cur.substring(3);
      dur = dur.substring(3);
    }
    if (progressText.innerText != cur + " / " + dur) {
  
      progressText.innerText = cur + " / " + dur;
    }
    requestAnimationFrame(updateTimer);
  }

  SongManager.player.addEventListener("canplay", () => {
    Toxen.interactiveProgressBar.max = SongManager.player.duration;
  });

  // Initialize other objects
  Toxen.initialize();
  PanelManager.initialize();
  //#region Initialize Audio visualizer
  (function () {
    var _context = new AudioContext();
    var _src: MediaElementAudioSourceNode;
    _src = _context.createMediaElementSource(document.querySelector<HTMLMediaElement>("#musicObject"));
    let _analyser = _context.createAnalyser();
    _src.connect(_analyser);
    _analyser.connect(_context.destination);
    Storyboard.analyser = _analyser;

    console.log("Visualizer is now ready.");
    initializeVisualizer();
  })();
  //#endregion

  let search: HTMLInputElement = document.querySelector("#search");
  search.addEventListener("keydown", e => {
    let songs;
    if (e.key == "Enter" && (songs = SongManager.onlyVisibleSongList(true)).length == 1 && songs[0].songId != SongManager.getCurrentlyPlayingSong().songId) {
      songs[0].play();
      search.blur();
    }
  })
  
  // Shortcuts
  window.addEventListener("keydown", function(e) {
    let {
      key,
      ctrlKey: ctrl,
      shiftKey: shift,
      altKey: alt,
    } = e;
    key = key.toLowerCase();

    function hasInputFocus() {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return true; else return false;
    }

    if (!ctrl && key == " " && !hasInputFocus()) {
      e.preventDefault();
      SongManager.getCurrentlyPlayingSong().play();
    }
    
    if (!ctrl && key == "escape" && !hasInputFocus()) {
      e.preventDefault();
      SongManager.getSelectedSongs().forEach(s => s.deselect());
    }

    if (ctrl && key == "a" && !hasInputFocus()) {
      e.preventDefault();
      SongManager.playableSongs.forEach(s => {
        if (Settings.current.songGrouping === 0) {
          s.select();
        }
        else {
          let grp = s.getGroup();
          if (grp && !grp.collapsed) {
            s.select();
          }
        }
      });
    }

    if (ctrl && key == "r") {
      window.location.reload();
    }

    if (ctrl && !shift && key == "s" || ctrl && !shift && key == "f") {
      SongManager.revealSongPanel();
      search.focus();
      search.setSelectionRange(0, search.value.length);
      SongManager.songListElement.parentElement.scrollLeft = 0;
    }

    if (ctrl && key == " ") {
      e.preventDefault();
      SongManager.getCurrentlyPlayingSong().play();
    }
    
    if (ctrl && !shift && key == "l") {
      settings.toggleSongPanelLock();
    }

    if (ctrl && shift && key == "l") {
      settings.toggleSettingsPanelLock();
    }
    
    if (ctrl && !shift && key == "arrowup") {
      e.preventDefault();
      settings.setVolume(Math.min(settings.volume + 5, 100));
    }
    
    if (ctrl && !shift && key == "arrowdown") {
      e.preventDefault();
      settings.setVolume(Math.max(settings.volume - 5, 0));
    }
  });

  window.addEventListener("resize", (e) => {
    let c: HTMLCanvasElement = document.querySelector("#storyboard");
    c.width = window.innerWidth;
    c.height = browserWindow.isFullScreen() ? window.innerHeight : window.innerHeight - 32;
  });
  
  // Confine window and panels.
  window.addEventListener("scroll", () => {
    if (window.scrollY > 0 || window.scrollX > 0) {
      window.scrollTo(0, 0);
    }
  });
  document.getElementById("songmenusidebar").addEventListener("scroll", function() {
    if (this.scrollLeft > 0) {
      this.scrollTo(0, 0);
    }
  });
  document.getElementById("settingsmenusidebar").addEventListener("scroll", function() {
    if (this.scrollLeft > 0) {
      this.scrollTo(0, 0);
    }
  });

  document.getElementById("storyboard").addEventListener('dragenter', function (){}, false);
  document.getElementById("storyboard").addEventListener('dragleave', function (){}, false);
  document.getElementById("storyboard").addEventListener('dragover', function (e) {
    e.stopPropagation();
    e.preventDefault();
  }, false);
  document.getElementById("storyboard").addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    let files = e.dataTransfer.files;
    let hasImages = false;
    let hasMedia = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (Toxen.imageExtensions.find(f => file.path.endsWith("."+f))) {
        hasImages = true;
        break;
      }
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (Toxen.mediaExtensions.find(f => file.path.endsWith("."+f))) {
        hasMedia = true;
        break;
      }
    }
    if (hasMedia && hasImages && files.length > 2) {
      new Prompt(`Mixed formats`, `Please only import audio files at once, then pictures. Pictures imported will become the background of the currently playing song.`)
      .addButtons("Close", "fancybutton", true);
      return;
    }
    else if (hasMedia && hasImages && files.length == 2) {
      // Import 2 files, media and image
      if (Toxen.mediaExtensions.find(f => files[0].path.endsWith("."+f))) {
        SongManager.importMediaFile(files[0]).then(song => {
          setTimeout(() => {
            song.setBackground(files[1].path);
          }, 100);
        });
      }
      else {
        SongManager.importMediaFile(files[1]).then(song => {
          setTimeout(() => {
            song.setBackground(files[0].path);
          }, 100);
        });
      }
      return;
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (Toxen.mediaExtensions.find(f => file.path.endsWith("."+f))) {
        SongManager.importMediaFile(file);
      }
      else if (Toxen.imageExtensions.find(f => file.path.endsWith("."+f))) {
        SongManager.getCurrentlyPlayingSong().setBackground(file.path);
      }
      else {
        new Prompt(`Invalid file`, `${file.name} is not a valid file. Please only drop in one of the following:<br>${Toxen.imageExtensions.map(v => v).concat(Toxen.mediaExtensions).join(", ")}`)
        .addButtons("Close", "fancybutton", true);
        break;
      }
    }
  }, false);
  
  // Enable debug mode
  if (debugMode) {
    // _debugModeLoop();
    function _debugModeLoop() {
      // Insert logic to go some shit here I suppose
      requestAnimationFrame(_debugModeLoop);
    }
    
    setInterval(() => {
      Tools.updateCSS();
    }, 1000);

    // Debug.refreshOnChange(["src/toxen.css", "data/settings.json"]);
  }

  // Load Settings
  settings.applySettingsToPanel();
  
  // Apply visualizer coloring values from visualizer ranges
  (function() {
    let red = +(document.getElementById("visualizercolor.redValue") as unknown as HTMLInputElement).value;
    let green = +(document.getElementById("visualizercolor.greenValue") as unknown as HTMLInputElement).value;
    let blue = +(document.getElementById("visualizercolor.blueValue") as unknown as HTMLInputElement).value;
    document.querySelector<HTMLDivElement>("#redColorBlock").style.backgroundColor = `rgb(${red}, 0, 0)`;
    document.querySelector<HTMLDivElement>("#greenColorBlock").style.backgroundColor = `rgb(0, ${green}, 0)`;
    document.querySelector<HTMLDivElement>("#blueColorBlock").style.backgroundColor = `rgb(0, 0, ${blue})`;

    (document.querySelector<HTMLDivElement>("#redColorBlock").firstElementChild as unknown as HTMLLabelElement).innerText = red.toString();
    (document.querySelector<HTMLDivElement>("#greenColorBlock").firstElementChild as unknown as HTMLLabelElement).innerText = green.toString();
    (document.querySelector<HTMLDivElement>("#blueColorBlock").firstElementChild as unknown as HTMLLabelElement).innerText = blue.toString();

    document.querySelector<HTMLInputElement>("#colorPicker").value = Tools.rgbToHex(red, green, blue);
  })();

  // Load modules
  ToxenModule.initialize();
  ToxenModule.loadAllModules();

  // Create "on" events.
  Toxen.on("play", () => {
    stats.songsPlayed++;
    
    let spb: HTMLImageElement = document.getElementById("svgplaybutton") as HTMLImageElement;
    spb.src = spb.getAttribute("svgpause");
  });
  Toxen.on("pause", () => {
    let spb: HTMLImageElement = document.getElementById("svgplaybutton") as HTMLImageElement;
    spb.src = spb.getAttribute("svgplay");
  });

  // Finish
  settings.reloadPlaylists();
  SongManager.playRandom();
}


ipcRenderer.on("updatediscordpresence", () => {
  Toxen.updateDiscordPresence();
})

var avg = 0;
var avgSec = 0;
var dim = 0;
/**
 * Run once to activate the visualizer.
 */
function initializeVisualizer() {
  dim = Storyboard.backgroundDim;
  var canvas: HTMLCanvasElement = document.querySelector("#storyboard");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 32;
  var ctx = canvas.getContext("2d");

  Storyboard.setAnalyserFftSize(512);
  
  function renderFrame() {
    requestAnimationFrame(renderFrame);
    if (settings.freezeVisualizer && SongManager.player.paused) return;
    var WIDTH = canvas.width;
    var HEIGHT = canvas.height;
    var barWidth = (WIDTH / Storyboard.bufferLength) - 1;
    var barHeight: number;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    var x = 0;
    if (settings.storyboard) {
      dim = +dim;
      
      if (avg > 65) {
        if (dim > Storyboard.backgroundDim - (+avg - (Storyboard.backgroundDim / 2))) {
          dim -= 1;
        }
        if (dim < Storyboard.backgroundDim - (+avg - (Storyboard.backgroundDim / 2))) {
          dim += 1;
        }
      }
      else {
        if (dim < Storyboard.backgroundDim) {
          dim += 2;
        }
        if (dim > Storyboard.backgroundDim) {
          dim -= 1;
        }
      } 
    }
    else {
      dim =Storyboard.backgroundDim;
    }

    Storyboard.analyser.getByteFrequencyData(Storyboard.dataArray);
    
    dim = Math.max(dim, 0);
    // console.log("Avg: ", avg);
    // console.log(dim);
    
    Storyboard.currentBackgroundDim = 100 - dim;
    ctx.fillStyle = "rgba(0, 0, 0, "+(dim / 100)+")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    var intensity = Storyboard.visualizerIntensity/10;
    if (settings.visualizer) {
      avg = 0;
      if (Storyboard.visualizerDirection == 0) Storyboard.dataArray = Storyboard.dataArray.reverse();
      for (var i = 0; i < Storyboard.bufferLength; i++) {
        barHeight = (Storyboard.dataArray[i]*intensity-(10*intensity));

        var r = Storyboard.red;
        var g = Storyboard.green;
        var b = Storyboard.blue;
        
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b + ", " + 0.3 + ")";
        switch (Storyboard.visualizerStyle) {
          case 0:
            ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight); // Normal
            break;
          case 1:
            ctx.fillRect(x, 0, barWidth, barHeight); // From top only
            break;
          case 2:
            ctx.fillRect(x, 0, barWidth, barHeight); // From top
            ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight); // From Bottom
            break;
          case 3:
            if (barHeight < 0) {
              barHeight = 0;
            }
            ctx.fillRect(x, (HEIGHT / 2) - barHeight, barWidth, barHeight * 2); // Center
            break;
          case 4:
            if (i % 2 == 0 || i == 0) {
              ctx.fillRect(i * (barWidth + 1), 0, (barWidth * 2) - 1, barHeight); // From top
              
            }
            else {
              ctx.fillRect((i - 1) * (barWidth + 1), HEIGHT - barHeight, (barWidth * 2) - 1, barHeight); // From Bottom
            }
            break;
          default:
            break;
        }
        
        x += barWidth + 1;
        avg += Storyboard.dataArray[i];
      }
      avg /= Storyboard.bufferLength * 2;
      avgSec += avg;
      // avg -= settings.volume;
    }
  }
  setInterval(() => {
    avgSec = 0;
  }, 1000);
  renderFrame();
}

// When document has loaded, initialise
document.onreadystatechange = (event) => {
  if (document.readyState == "complete") {
      handleWindowControls();
  }
};

window.onbeforeunload = (event) => {
  /* If window is reloaded, remove win event listeners
  (DOM element listeners get auto garbage collected but not
  Electron win listeners as the win is not dereferenced unless closed) */
  browserWindow.removeAllListeners();
}

function handleWindowControls() {
  // Make minimise/maximise/restore/close buttons work when they are clicked
  document.getElementById('min-button').addEventListener("click", event => {
      browserWindow.minimize();
  });

  document.getElementById('max-button').addEventListener("click", event => {
      browserWindow.maximize();
  });

  document.getElementById('restore-button').addEventListener("click", event => {
      browserWindow.unmaximize();
  });

  document.getElementById('close-button').addEventListener("click", event => {
      browserWindow.close();
  });

  // Toggle maximise/restore buttons when maximisation/unmaximisation occurs
  toggleMaxRestoreButtons();
  browserWindow.on('maximize', toggleMaxRestoreButtons);
  browserWindow.on('unmaximize', toggleMaxRestoreButtons);

  function toggleMaxRestoreButtons() {
      if (browserWindow.isMaximized()) {
          document.body.classList.add('maximized');
      } else {
          document.body.classList.remove('maximized');
      }
  }
}