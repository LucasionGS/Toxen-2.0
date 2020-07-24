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
  Debug,
  Prompt,
  Update,
  ScriptEditor,
  ToxenModule,
  Statistics,
  SelectList,
  PanelManager,
  showTutorial,
} = ToxenCore;
import * as rpc from "discord-rpc";
import * as version from "./version.json";
import * as path from "path";
import rimraf = require("rimraf");
const { remote, ipcRenderer, shell } = require("electron");
let debugMode = !remote.app.isPackaged;

// Discord RPC
const discord = new rpc.Client({"transport": "ipc"});
const clientId = '647178364511191061';
let discordReady = false;
discord.on("ready", () => {
  console.log('Discord RPC Connected');
  discordReady = true;
});

interface HTMLElementScroll {
  scrollIntoViewIfNeeded(): void
}

discordApplicationLogin();
function discordApplicationLogin(attempts = 3) {
  let tries = 0;
  _login();
  function _login() {
    discord.login({ clientId }).catch(reason => {
      console.error(reason);
      tries++;
      // Re-enble if I figure out the issue.
      // if (tries < attempts) {
      //   console.error(`Login attempt ${tries + 1}...`);
      //   _login();
      // }
    });
  }
}

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

window.addEventListener("load", initialize);

async function initialize() {
  // Load settings (IMPORTANT TO BE DONE FIRST)
  settings.loadFromFile();
  if (settings.songFolder == null) {
    switch(process.platform) {
      case "win32":
        settings.songFolder = process.env.HOMEDRIVE + process.env.HOMEPATH + "/Music/";
        break;
      case "linux":
      case "darwin":
        settings.songFolder = process.env.HOME + "/Music/";
        break;
    }
  }
  if (settings.showTutorialOnStart) { showTutorial(); }
  stats.load();
  stats.startSaveTimer();

  if ((!debugMode && settings.version != version) || debugMode) {
    settings.version = version;
    let declarationDir = path.resolve(debugMode ? "./src/declarations/" : "./resources/app/src/declarations/");
    let declarationTarget = Toxen.updatePlatform == "win" ? process.env.APPDATA + "\\ToxenData\\data\\declarations" : process.env.HOME + "/.toxendata/data/declarations";
    if (fs.existsSync(declarationTarget)) rimraf.sync(declarationTarget);
    copyFilesRecursively(declarationDir, declarationTarget);
    function copyFilesRecursively(srcDir: string, targetDir: string) {
      fs.exists(targetDir, async exists => {
        if (!exists) await fs.promises.mkdir(targetDir);
        fs.readdir(srcDir, {withFileTypes: true}, (err, files) => {
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
  Update.check(version);

  // Initialize onplay & Discord RPC
  SongManager.onplay = async function(song) {
    // Song Info
    song.displayInfo();

    // Discord Rich Presence
    updateDiscordPresence(song);

    while(isNaN(SongManager.player.duration)) {
      await Debug.wait(1); 
    }
    if (song.details.songLength != SongManager.player.duration) {
      song.details.songLength = SongManager.player.duration;
      song.saveDetails();
    }
  }

  
  // Applying everything
  SongManager.player = document.querySelector("#musicObject"); // Important to be done first
  SongManager.player.volume = settings.volume / 100;
  SongManager.songListElement = document.querySelector("#songselection");

  SongManager.toggleShuffle(settings.shuffle);
  SongManager.toggleRepeat(settings.repeat);
  SongManager.toggleOnlyVisible(settings.onlyVisible);
  settings.toggleSongPanelLock(settings.songMenuLocked);
  settings.toggleVideo(settings.video);
  settings.setProgressBarSpot(settings.progressBarSpot);
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
      if (settings.shuffle) {
        SongManager.playRandom();
      }
      else {
        SongManager.playNext();
      }
    }
  });

  updateTimer();
  function updateTimer() {
    document.querySelector<HTMLProgressElement>("div#progress progress#progressbar").value = SongManager.player.currentTime;
    let cur = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.currentTime);
    let dur = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.duration);
    let progressText = document.querySelector<HTMLLabelElement>("div#progress label#progresstext");
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
    document.querySelector<HTMLProgressElement>("div#progress progress#progressbar").max = SongManager.player.duration;
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
    if (e.key == "Enter" && (songs = SongManager.onlyVisibleSongList()).length == 1 && songs[0].songId != SongManager.getCurrentlyPlayingSong().songId) {
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

    if (ctrl && key == "r") {
      window.location.reload();
    }

    if (ctrl && !shift && key == "s" || ctrl && !shift && key == "f") {
      settings.revealSongPanel();
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
      settings.setVolume(Math.min(settings.volume + 5, 100));
    }
    
    if (ctrl && !shift && key == "arrowdown") {
      settings.setVolume(Math.max(settings.volume - 5, 0));
    }
  });

  

  interface HTMLProgressElement extends Element {
    clicking: boolean;
    value: number;
    max: number;
  }

  window.addEventListener("resize", (e) => {
    let c: HTMLCanvasElement = document.querySelector("#storyboard");
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });
  
  window.addEventListener("mouseup", function(e) {
    if (e.button == 0 && document.querySelector<HTMLProgressElement>("#progressbar").clicking == true) {
      document.querySelector<HTMLProgressElement>("#progressbar").clicking = false;
      updateDiscordPresence();
    }
  });
  document.getElementById("progressbar").addEventListener("click", function(e) {
    const p: HTMLProgressElement = document.querySelector("#progressbar");
    let percent = (e.clientX - p.clientLeft) / p.clientWidth;
    percent = Math.min(Math.max(0, percent), 1);
    SongManager.moveToTime(SongManager.player.duration * percent);
    updateDiscordPresence();
  });
  window.addEventListener("mousemove", function(e) {
    const p: HTMLProgressElement = document.querySelector("#progressbar");
    if (p.clicking === true) {
      let percent = (e.clientX - p.clientLeft) / p.clientWidth;
      percent = Math.min(Math.max(0, percent), 1);
      SongManager.moveToTime(SongManager.player.duration * percent);
    }
  });
  document.getElementById("progressbar").addEventListener("mousedown", function(e) {
    e.preventDefault();
    if (e.button == 0) document.querySelector<HTMLProgressElement>("#progressbar").clicking = true;
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
  
  // Enable debug mode
  if (debugMode) {
    // _debugModeLoop();
    function _debugModeLoop() {
      // Insert logic to go some shit here I suppose
      requestAnimationFrame(_debugModeLoop);
    }
    
    setInterval(() => {
      Debug.updateCSS();
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

    document.querySelector<HTMLInputElement>("#colorPicker").value = Debug.rgbToHex(red, green, blue);
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
  updateDiscordPresence();
})

/**
 * Update Discord presence
 */
async function updateDiscordPresence(song = SongManager.getCurrentlyPlayingSong()) {
  let attemptCount = 0;
  while(true) {
    if (attemptCount > 30) {
      break;
    }
    if (isNaN(SongManager.player.duration) || !discordReady) {
      attemptCount++;
      await Debug.wait(100);
    }
    else {
      let options: import("discord-rpc").Presence = {
        "details": `${ScriptEditor.window != null ? "Editing a storyboard" : song.isVideo ? "Watching a video" : "Listening to a song"} (vers. ${version})`,
        "largeImageKey": Settings.current.lightThemeBase ? "toxenlight" : "toxen"
      };
      if (settings.discordPresenceShowDetails) {
        // options["startTimestamp"] = Date.now(); // For Time left
        // options["endTimestamp"] = Date.now() + (SongManager.player.duration - SongManager.player.currentTime) * 1000; // For Time left
        options["startTimestamp"] = Date.now() - (SongManager.player.currentTime * 1000); // For Time Elapsed
        options["details"] = (`${ScriptEditor.window != null ? "Editing " : song.isVideo ? "Watching " : "Listening to "}`) + `${song.details.artist} - ${song.details.title}`;
        options["state"] = (song.details.source ? `\nFrom ${song.details.source} ` : "") + `(Vers. ${version})`;
      }
      discord.setActivity(options);
      break;
    }
  }
}

var avg = 0;
var avgSec = 0;
var dim = 0;
/**
 * Run once to activate the visualizer.
 */
function initializeVisualizer() {
  dim = settings.backgroundDim;
  var canvas: HTMLCanvasElement = document.querySelector("#storyboard");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext("2d");

  Storyboard.setAnalyserFftSize(512);
  
  function renderFrame() {
    requestAnimationFrame(renderFrame);
    if (settings.freezeVisualizer && SongManager.player.paused) return;
    var WIDTH = canvas.width;
    var HEIGHT = canvas.height;
    var barWidth = (WIDTH / Storyboard.bufferLength) - 1;
    var barHeight;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    var x = 0;
    if (settings.storyboard) {
      dim = +dim;
      
      if (avg > 65) {
        if (dim > +settings.backgroundDim - (+avg - (settings.backgroundDim / 2))) {
          dim -= 1;
        }
        if (dim < +settings.backgroundDim - (+avg - (settings.backgroundDim / 2))) {
          dim += 1;
        }
      }
      else {
        if (dim < +settings.backgroundDim) {
          dim += 2;
        }
        if (dim > +settings.backgroundDim) {
          dim -= 1;
        }
      } 
    }
    else {
      dim = settings.backgroundDim;
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
