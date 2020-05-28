let debugMode = true;
const fs = require("fs");
const {Popup} = require("ionlib");
const {
  Settings,
  Song,
  SongManager,
  Storyboard,
  ToxenScriptManager,
  Debug,
  Prompt
} = require("./toxenCore");
const process = require("process");
const rpc = require("discord-rpc");

// Discord RPC
const discord = new rpc.Client({"transport": "ipc"});
const clientId = '647178364511191061';
let discordReady = false;
discord.on("ready", () => {
  // console.log('Logged in as', discord.application.name);
  discordReady = true;
});

/**
 * Wait `ms` milliseconds.
 * @param {number} ms 
 */
async function wait(ms) {
  var resolve;
  setTimeout(() => {
    resolve();
  }, ms);
  return new Promise((res => {
    resolve = res;
  }));
}

discord.login({ clientId }).catch(reason => console.error(reason));

/**
 * Global Settings Object
 */
// This is automatically set to Settings.current as well
let settings = new Settings();

/**
 * Removes unnecessary extra "forward slashes" `/`
 * @param {string} path Path to fix
 */
function fixPath(path) {
  return path.replace(/\/\/+/, "/");
}

window.addEventListener("load", initialize);

async function initialize() {
  settings.loadFromFile();
  if (settings.songFolder == null) {
    settings.songFolder = process.env.HOMEDRIVE + process.env.HOMEPATH + "/Music/";
  }

  // Initialize Discord RPC
  SongManager.onplay = async function(song) {
    let attemptCount = 0;
    while(true) {
      if (attemptCount > 3) {
        break;
      }
      if (isNaN(SongManager.player.duration) || !discordReady) {
        attemptCount++;
        await wait(1000);
      }
      else {
        discord.setActivity({
          "startTimestamp": Date.now(),
          "endTimestamp": Date.now() + (SongManager.player.duration - SongManager.player.currentTime) * 1000,
          "details": `${song.isVideo ? "Watching a video" : "Listening to a song"}`,
          "state": `${song.details.artist} - ${song.details.title}`,
          "largeImageKey": "toxen"
        });
        break;
      }
    }
  }

  SongManager.toggleShuffle(settings.shuffle);
  SongManager.toggleRepeat(settings.repeat);
  settings.toggleSongPanelLock(settings.songMenuLocked);
  Storyboard.rgb(settings.visualizerColor.red, settings.visualizerColor.green, settings.visualizerColor.blue);

  // Applying everything
  SongManager.songListElement = document.querySelector("#songselection");
  SongManager.player = document.querySelector("#musicObject");
  SongManager.player.volume = settings.volume / 100;

  // Get songs from either database or scan folder.
  if (!settings.remote && !fs.existsSync(settings.songFolder+"/db.json")) {
    SongManager.scanDirectory();
  }
  else {
    await SongManager.loadFromFile();
  }

  SongManager.playableSongs = SongManager.songList;

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
    document.querySelector("div#progress progress#progressbar").value = SongManager.player.currentTime;
    if (!SongManager.player.paused) {
      let cur = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.currentTime).replace(",", ".");
      let dur = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.duration).replace(",", ".");
  
      while (dur.startsWith("00:")) {
        cur = cur.substring(3);
        dur = dur.substring(3);
      }
      document.querySelector("div#progress label#progresstext").innerText = cur + "/" + dur;
    }
    requestAnimationFrame(updateTimer);
  }

  SongManager.player.addEventListener("canplay", () => {
    document.querySelector("div#progress progress#progressbar").max = SongManager.player.duration;
  });

  //#region Initialize Audio visualizer
  (function () {
    var _context = new AudioContext();
    /**
     * @type {MediaElementAudioSourceNode}
     */
    var _src;
    _src = _context.createMediaElementSource(document.getElementById("musicObject"));
    let _analyser = _context.createAnalyser();
    _src.connect(_analyser);
    _analyser.connect(_context.destination);
    analyser = _analyser;

    console.log("Visualizer is now ready.");
    initializeVisualizer();
    SongManager.playRandom();
  })();
  //#endregion

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return true;
      }
      else {
        return false;
      }
    }

    if (!ctrl && key == " " && !hasInputFocus()) {
      e.preventDefault();
      SongManager.getCurrentlyPlayingSong().play();
    }

    if (ctrl && key == "r") {
      window.location.reload();
    }
    
    if (ctrl && !shift && key == "s" || ctrl && !shift && key == "f") {
      document.getElementById("search").focus();
    }

    if (ctrl && key == " ") {
      e.preventDefault();
      SongManager.getCurrentlyPlayingSong().play();
    }

    if (ctrl && shift && key == "f") {
      SongManager.getCurrentlyPlayingSong().element.scrollIntoViewIfNeeded();
    }
    
    if (ctrl && !shift && key == "l") {
      settings.toggleSongPanelLock();
    }
  });


  window.addEventListener("resize", (e) => {
    /**
     * @type {HTMLCanvasElement}
     */
    let c = document.getElementById("storyboard");
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });
  
  window.addEventListener("mouseup", function(e) {
    if (e.button == 0) document.getElementById("progressbar").clicking = false;
  });
  document.getElementById("progressbar").addEventListener("click", function(e) {
    /**
     * @type {HTMLProgressElement}
     */
    const p = document.getElementById("progressbar");
    let percent = (e.clientX - p.clientLeft) / p.clientWidth;
    percent = Math.min(Math.max(0, percent), 1);
    SongManager.moveToTime(SongManager.player.duration * percent);
  });
  window.addEventListener("mousemove", function(e) {
    /**
     * @type {HTMLProgressElement}
     */
    const p = document.getElementById("progressbar");
    if (p.clicking === true) {
      let percent = (e.clientX - p.clientLeft) / p.clientWidth;
      percent = Math.min(Math.max(0, percent), 1);
      SongManager.moveToTime(SongManager.player.duration * percent);
    }
  });
  document.getElementById("progressbar").addEventListener("mousedown", function(e) {
    e.preventDefault();
    if (e.button == 0) document.getElementById("progressbar").clicking = true;
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
}

/**
 * For audio Visualizer
 * @type {AnalyserNode}
 */
var analyser = null;

var avg = 0;
var avgSec = 0;
var dim = 0;
/**
 * Run once to activate the visualizer.
 */
function initializeVisualizer() {
  dim = settings.backgroundDim;
  /**
   * @type {HTMLCanvasElement}
   */
  var canvas = document.getElementById("storyboard");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext("2d");

  analyser.fftSize = 512;

  var bufferLength = analyser.frequencyBinCount / 2;

  var dataArray = new Uint8Array(bufferLength);
  
  function renderFrame() {
    requestAnimationFrame(renderFrame);
    if (SongManager.player.paused) {
      return;
    }
    var WIDTH = canvas.width;
    var HEIGHT = canvas.height;
    var barWidth = (WIDTH / bufferLength) - 1;
    var barHeight;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    var x = 0;
    if (settings.storyboard) {
      dim = +dim;
      if (avg > 65) {
        if (dim > +settings.backgroundDim - (+avg - 70)) {
          dim -= 1;
        }
        if (dim < +settings.backgroundDim - (+avg - 70)) {
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

    analyser.getByteFrequencyData(dataArray);
    
    dim = Math.max(dim, Math.min(0.2, 1 - (settings.backgroundDim/100)));
    ctx.fillStyle = "rgba(0, 0, 0, "+(dim/100)+")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    var intensity = settings.visualizerIntensity/10;
    if (settings.visualizer) {
      avg = 0;
      dataArray = dataArray.reverse();
      for (var i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i]*intensity-(10*intensity));

        var r = Storyboard.red;
        var g = Storyboard.green;
        var b = Storyboard.blue;
        
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b + ", " + 0.3 + ")";
        switch (settings.visualizerStyle) {
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
        avg += dataArray[i];
      }
      avg /= bufferLength;
      avgSec += avg;
      // avg -= settings.volume;
    }
  }
  setInterval(() => {
    avgSec = 0;
  }, 1000);
  renderFrame();
}
