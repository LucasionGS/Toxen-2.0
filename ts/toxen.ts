import * as fs from "fs";
import { TextEditor } from "./texteditor";
import { SelectBox, InteractiveProgressBar } from "./toxenStyle";
import * as ToxenCore from "./toxenCore";
const {
  Toxen,
  Settings,
  Song,
  SongManager,
  Storyboard,
  StoryboardObject,
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
  Sync,
  toxenMenus,
  toxenHeaderMenu,
  showTutorial,
} = ToxenCore;
import * as path from "path";
import rimraf = require("rimraf");
import * as __toxenVersion from "./version.json"
import User from "./auth/models/user";
Toxen.version = __toxenVersion;
import { remote, ipcRenderer, webFrame } from "electron";
import Remote = require("node-hue-api/lib/api/Remote");
let devMode = !remote.app.isPackaged;
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
Toxen.interactiveProgressBar = new Toxen.ProgressBar("48%", 16);
Toxen.interactiveProgressBar.mouseover = v => {
  return ToxenScriptManager.convertSecondsToDigitalClock(v, true);
}
Toxen.interactiveProgressBar.element.id = "progressbar";
Toxen.interactiveProgressBar.element.classList.add("hideoninactive");
// Progress bar events
Toxen.interactiveProgressBar.on("click", (_, value) => {
  SongManager.moveToTime(value);
  Toxen.updateDiscordPresence();
})
.on("drag", (_, value) => {
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
        settings.songFolder = path.resolve(process.env.HOMEDRIVE + process.env.HOMEPATH + "/Music/ToxenMusic");
        break;
      case "linux":
      case "darwin":
        settings.songFolder = path.resolve(process.env.HOME + "/Music/ToxenMusic");
        break;
    }
  }

  // Load zoom level
  if (localStorage.getItem("zoom")) webFrame.setZoomFactor(+localStorage.getItem("zoom"));

  if (settings.discordPresence === true) {
    Toxen.discordConnect();
  }

  settings.applySongFolderListToSelect();
  document.querySelector<HTMLSelectElement>("select#songfolderValue").addEventListener("input", () => {
    settings.songFolder = document.querySelector<HTMLSelectElement>("select#songfolderValue").value;
    settings.applySongFolderListToSelect();
    settings.setSongFolder();
    console.log("Changed");
  });

  addCustomInputs();
  
  if (settings.showTutorialOnStart) { showTutorial(); }
  stats.load();
  stats.startSaveTimer();

  if ((!devMode && settings.version != Toxen.version) || devMode) {
    setTimeout(() => {
      Toxen.emit("updated");
    }, 1000);
    settings.version = Toxen.version;
    let declarationDir = Tools.prodPath("./src/declarations/");
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

    // Reset speed changes
    // (document.getElementById("ratechangerbar") as InteractiveProgressBar.InteractiveProgressBar.HTMLInteractiveProgressBar).object.value = 1;
    // SongManager.playbackRate = 1;

    // Discord Rich Presence
    Toxen.updateDiscordPresence(song);

    while(isNaN(SongManager.player.duration)) {
      await Tools.wait(1); 
    }
    if (song.details.songLength != SongManager.player.duration) {
      song.details.songLength = SongManager.player.duration;
      song.saveDetails();
    }

    // Toxen.resetTray();
    Toxen.resetThumbarButtons();
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
      ToxenScriptManager.loadCurrentScript();
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
    
    // Analyser
    let _analyser = _context.createAnalyser();
    _src.connect(_analyser);
    _analyser.connect(_context.destination);
    Storyboard.analyser = _analyser;

    // Bass/Gain
    let _bass = _context.createGain();
    _bass.gain.value = 0;
    _src.connect(_bass);
    _bass.connect(_context.destination);
    Storyboard.bass = _bass;

    initializeVisualizer();
    console.log("Visualizer is now ready.");
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
    setTimeout(() => {
      c.width = window.innerWidth;
      c.height = browserWindow.isFullScreen() ? window.innerHeight : window.innerHeight - 32;
      c.style.width = c.width + "px";
      c.style.height = c.height + "px";
      StoryboardObject.widthRatio = c.width / StoryboardObject.widthDefault;
      StoryboardObject.heightRatio = c.height / StoryboardObject.heightDefault;
    }, 10);
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
      else if (file.path.endsWith(".txn")) {
        SongManager.getCurrentlyPlayingSong().setStoryboard(file.path);
      }
      else if (file.path.endsWith(".srt")) {
        SongManager.getCurrentlyPlayingSong().setSubtitles(file.path);
      }
      else {
        new Prompt(`Invalid file`, `${file.name} is not a valid file. Please only drop in one of the following:<br>${
          Toxen.imageExtensions.map(v => v)
          .concat(Toxen.mediaExtensions, "txn", "srt")
          .join(", ")
        }`)
        .addButtons("Close", "fancybutton", true);
        break;
      }
    }
  }, false);
  
  // Enable debug mode
  if (devMode) {
    // _debugModeLoop();
    function _debugModeLoop() {
      // Insert logic to go some shit here I suppose
      requestAnimationFrame(_debugModeLoop);
    }
    
    // setInterval(() => {
    //   Tools.updateCSS();
    // }, 1000);

    // Debug.refreshOnChange(["src/toxen.css", "data/settings.json"]);
  }

  // Load Settings
  settings.applySettingsToPanel();

  ([...document.getElementsByClassName("goToSettingsSection")] as HTMLImageElement[]).forEach(img => {
    let section = document.querySelector("section[name='"+ img.getAttribute("name") +"']");
    if (section) {
      img.addEventListener("click", () => {
        section.scrollIntoView();
      });
    }
  });
  
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

  //// Finish
  settings.reloadPlaylists();
  SongManager.playRandom();
  Toxen.resetTray();

}



function addCustomInputs() {
  {
    let btn = document.querySelector<HTMLButtonElement>("#loginButton");
    btn.addEventListener("click", async () => {
      console.log(await User.loginPrompt());
    });
  }
  
  //#region Custom sliders/Progress bars
  document.body.appendChild(Toxen.interactiveProgressBar.element); // Insert the progress bar

  { // Block scope
    let audioAdjuster = new Toxen.ProgressBar(128, 12); // Create the volume bar
    audioAdjuster.max = 100;
    audioAdjuster.element.id = "audioadjusterbar";
    audioAdjuster.mouseover = v => {
      return Math.round(v) + "%";
    }
    document.getElementById("audioadjuster").appendChild(audioAdjuster.element); // Insert the volume bar
    audioAdjuster.on("click", (_, value) => {
      Settings.current.setVolume(value);
      Settings.current.saveToFile();
    })
    .on("drag", (_, value) => {
      Settings.current.setVolume(value);
    })
    .on("release", (_, value) => {
      Settings.current.setVolume(value);
      Settings.current.saveToFile();
    });

    [ // Generate speed buttons
      Toxen.generate.button({
        "text": "0.25x",
        click() {
          _chnRate(0.25, true);
        }
      }),
      Toxen.generate.button({
        "text": "0.5x",
        click() {
          _chnRate(0.5, true);
        }
      }),
      Toxen.generate.button({
        "text": "0.75x",
        click() {
          _chnRate(0.75, true);
        }
      }),
      Toxen.generate.button({
        "text": "1.00x",
        click() {
          _chnRate(1.00, true);
        }
      }),
      Toxen.generate.button({
        "text": "1.25x",
        click() {
          _chnRate(1.25, true);
        }
      }),
      Toxen.generate.button({
        "text": "1.50x",
        click() {
          _chnRate(1.50, true);
        }
      }),
      Toxen.generate.button({
        "text": "1.75x",
        click() {
          _chnRate(1.75, true);
        }
      }),
      Toxen.generate.button({
        "text": "2.00x",
        click() {
          _chnRate(2.00, true);
        }
      }),
    ].forEach(v => document.getElementById("playbackratebuttoncontainer").appendChild(v))

    let rateChanger = new Toxen.ProgressBar("100%", 20);
    rateChanger.element.id = "ratechangerbar";
    rateChanger.min = 0.1;
    rateChanger.max = 2;
    document.getElementById("playbackratecontainer").appendChild(rateChanger.element);
    _chnRate(1, true);
    rateChanger.on("change", (_, value) => {
      _chnRate(value);
    });

    function _chnRate (value: number, setRateChangerToo = false) {
      SongManager.playbackRate = value;
      if (setRateChangerToo) rateChanger.value = value;
    }

    [ // Generate gain buttons
      Toxen.generate.button({
        "text": "0x",
        click() {
          _chnBass(0, true);
        }
      }),
      Toxen.generate.button({
        "text": "0.5x",
        click() {
          _chnBass(0.5, true);
        }
      }),
      Toxen.generate.button({
        "text": "1x",
        click() {
          _chnBass(1, true);
        }
      }),
      Toxen.generate.button({
        "text": "1.5x",
        click() {
          _chnBass(1.5, true);
        }
      }),
      Toxen.generate.button({
        "text": "2x",
        click() {
          _chnBass(2, true);
        }
      }),
      Toxen.generate.button({
        "text": "2.5x",
        click() {
          _chnBass(2.5, true);
        }
      }),
      Toxen.generate.button({
        "text": "3x",
        click() {
          _chnBass(3, true);
        }
      })
    ].forEach(v => document.getElementById("gainbuttoncontainer").appendChild(v))

    let bassChanger = new Toxen.ProgressBar("100%", 20);
    bassChanger.element.id = "gainchangerbar";
    bassChanger.min = 0;
    bassChanger.max = 4;
    document.getElementById("gaincontainer").appendChild(bassChanger.element);
    _chnBass(0, true);
    bassChanger.on("change", (_, value) => {
      _chnBass(value);
    });

    function _chnBass (value: number, setBassChangerToo = false) {
      if (Storyboard.bass) Storyboard.bass.gain.value = value;
      if (setBassChangerToo) bassChanger.value = value;
    }

    let bd = new Toxen.ProgressBar("100%", 20);
    // bd.vertical = true;
    document.getElementById("backgrounddiminteractivebarcontainer").appendChild(bd.element);
    bd.value = settings.backgroundDim;
    _chnBd(settings.backgroundDim);
    bd.on("click", (_, value) => {
      _chnBd(value);
      settings.saveToFile();
    })
    .on("drag", (_, value) => {
      _chnBd(value);
    })
    .on("release", (_, value) => {
      _chnBd(value);
      settings.saveToFile();
    });

    function _chnBd (value: number) {
      settings.backgroundDim = value;
      Storyboard.backgroundDim = settings.backgroundDim;
      bd.color.red = 255 - (255 * (settings.backgroundDim / 100))
      bd.color.green = 255 - (255 * (settings.backgroundDim / 100))
      bd.color.blue = 255 - (255 * (settings.backgroundDim / 100))
    }
  }
  //#endregion

  // Grouping radio buttons
  let grouping = new SelectBox.SelectBoxGroup([{
    "text": "No grouping",
    "value": 0,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "By Artist",
    "value": 1,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "By Album",
    "value": 2,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "By Source",
    "value": 3,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "By Language",
    "value": 4,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "By Genre",
    "value": 5,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "By Year",
    "value": 6,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "By Custom Group",
    "value": 7,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "Alphabetically (Artist)",
    "value": 8,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  },
  {
    "text": "Alphabetically (Title)",
    "value": 9,
    click() {
      settings.songGrouping = this.value;
      settings.saveToFile();
      SongManager.refreshList();
    }
  }], "radio");

  grouping.appendTo("#songgroupingcontainer");
  grouping.boxes[settings.songGrouping].checked = true;

  // Visualizer style radio buttons
  let visualizerstyle = new SelectBox.SelectBoxGroup([
    {
      text: "Bottom",
      value: 0,
      click() {
        settings.visualizerStyle = Storyboard.visualizerStyle = this.value;
        settings.saveToFile();
      }
    },
    {
      text: "Top",
      value: 1,
      click() {
        settings.visualizerStyle = Storyboard.visualizerStyle = this.value;
        settings.saveToFile();
      }
    },
    {
      text: "Top and bottom (Identical)",
      value: 2,
      click() {
        settings.visualizerStyle = Storyboard.visualizerStyle = this.value;
        settings.saveToFile();
      }
    },
    {
      text: "Center",
      value: 3,
      click() {
        settings.visualizerStyle = Storyboard.visualizerStyle = this.value;
        settings.saveToFile();
      }
    },
    {
      text: "Top and bottom (Alternating)",
      value: 4,
      click() {
        settings.visualizerStyle = Storyboard.visualizerStyle = this.value;
        settings.saveToFile();
      }
    }
  ], "radio");
  
  visualizerstyle.appendTo("#visualizerstylecontainer");
  visualizerstyle.boxes[settings.visualizerStyle].checked = true;
  
  // Visualizer Toggle
  let visualizer = new SelectBox.SelectBox("Visualizer");
  visualizer.on("change", () => {
    settings.visualizer = visualizer.checked;
    settings.saveToFile();
  });
  visualizer.appendTo("#visualizercontainer");
  visualizer.checked = settings.visualizer;
  
  // Storyboard Toggle
  let storyboard = new SelectBox.SelectBox("Storyboard");
  storyboard.on("change", () => {
    settings.storyboard = storyboard.checked;
    settings.saveToFile();
  });
  storyboard.appendTo("#storyboardcontainer");
  storyboard.checked = settings.storyboard;
  
  // Video Toggle
  let video = new SelectBox.SelectBox("Display Video");
  video.on("change", () => {
    settings.toggleVideo(video.checked);
    settings.saveToFile();
  });
  video.appendTo("#videotogglecontainer");
  video.checked = settings.video;
 
  // ButtonActivationByHover Toggle
  let buttonactivationbyhovercontainer = new SelectBox.SelectBox("Button Activation By Hover");
  buttonactivationbyhovercontainer.on("change", () => {
    settings.buttonActivationByHover = buttonactivationbyhovercontainer.checked;
    settings.saveToFile();
  });
  buttonactivationbyhovercontainer.appendTo("#buttonactivationbyhovercontainer");
  buttonactivationbyhovercontainer.checked = settings.buttonActivationByHover;

  // Set Song Default Color
  document.getElementById("setsongdefaultcolor").appendChild(Toxen.generate.button({
    "text": "Set as Song Default Color",
    "click"() {
      let song = SongManager.getCurrentlyPlayingSong();
      if (song) song.details.visualizerColor = {
        red: settings.visualizerColor.red,
        green: settings.visualizerColor.green,
        blue: settings.visualizerColor.blue
      }
      song.saveDetails();
      Storyboard.rgb(
        song.details.visualizerColor.red,
        song.details.visualizerColor.green,
        song.details.visualizerColor.blue
      );

      new Prompt("Song default color set", [
        "Set the visualizer color as",
        (function() {
          let div = document.createElement("div");
          div.style.width = "128px";
          div.style.height = "32px";
          div.style.backgroundColor = `rgb(${song.details.visualizerColor.red}, ${song.details.visualizerColor.green}, ${song.details.visualizerColor.blue})`;
          return div;
        })(),
        "for " + song.parseName()
      ]).close(3000);
    },
    "id": "setsongdefaultcolorbutton"
  }));
  document.getElementById("setsongdefaultcolor").appendChild(Toxen.generate.button({
    "text": "Reset song's default color",
    "click"() {
      let song = SongManager.getCurrentlyPlayingSong();
      if (song) song.details.visualizerColor = null;
      song.saveDetails();
      Storyboard.red = settings.visualizerColor.red;
      Storyboard.green = settings.visualizerColor.green;
      Storyboard.blue = settings.visualizerColor.blue;
      new Prompt("", "Reset default color for " + song.parseName()).close(2000).setInteractive(false);
    },
    "id": "resetsongdefaultcolorbutton"
  }));
  
  // Visualizer style radio buttons
  let thumbnails = new SelectBox.SelectBoxGroup([
    {
      text: "No Images",
      value: 0,
      click() {
        settings.thumbnails = this.value;
        SongManager.refreshList();
        settings.saveToFile();
      }
    },
    {
      text: "Thumbnails",
      value: 1,
      click() {
        settings.thumbnails = this.value;
        SongManager.refreshList();
        settings.saveToFile();
      },
      subText: "Display background image next to the song name in the song list.<br>"
      + "If you're experiencing low performance, try to disable this."
    },
    {
      text: "Background Images",
      value: 2,
      click() {
        settings.thumbnails = this.value;
        SongManager.refreshList();
        settings.saveToFile();
      },
      subText: "Display background image as the background behind the song name in the song list.<br>"
      + "If you're experiencing low performance, try to disable this."
    },
    {
      text: "Background Images (Small & Repeating)",
      value: 3,
      click() {
        settings.thumbnails = this.value;
        SongManager.refreshList();
        settings.saveToFile();
      },
      subText: "Display background image as the background behind the song name in the song list.<br>"
      + "This however, makes the images small and repeat across the song item. Use this if you want to see the full images.<br>"
      + "If you're experiencing low performance, try to disable this."
    },
  ], "radio");

  thumbnails.appendTo("#thumbnailscontainer");
  thumbnails.boxes[settings.thumbnails].checked = true;
 
  // discordPresence Toggle
  let discordpresencecontainer = new SelectBox.SelectBox("Discord Presence");
  discordpresencecontainer.appendTo("#discordpresencecontainer");
  discordpresencecontainer.on("change", () => {
    settings.discordPresence = discordpresencecontainer.checked;
    settings.toggleDiscordPresence(discordpresencecontainer.checked);
    settings.saveToFile();
  })
  discordpresencecontainer.checked = settings.discordPresence;
  
  // discordPresenceShowDetails Toggle
  let discordpresenceshowdetailscontainer = new SelectBox.SelectBox("Discord Presence: Show Details");
  discordpresenceshowdetailscontainer.appendTo("#discordpresenceshowdetailscontainer");
  discordpresenceshowdetailscontainer.on("change", () => {
    settings.discordPresenceShowDetails = discordpresenceshowdetailscontainer.checked;
    Toxen.updateDiscordPresence();
    settings.saveToFile();
  })
  discordpresenceshowdetailscontainer.checked = settings.discordPresenceShowDetails;
  
  // freezeVisualizer Toggle
  let freezevisualizercontainer = new SelectBox.SelectBox("Freeze Visualizer");
  freezevisualizercontainer.appendTo("#freezevisualizercontainer");
  freezevisualizercontainer.on("change", () => {
    settings.freezeVisualizer = freezevisualizercontainer.checked;
    settings.saveToFile();
  })
  freezevisualizercontainer.checked = settings.freezeVisualizer;
  
}

ipcRenderer.on("updatediscordpresence", () => {
  Toxen.updateDiscordPresence();
})

var avg = 0;
// var avgSec = 0;
var dim = 0;
/**
 * Run once to activate the visualizer and storyboard elements.
 */
function initializeVisualizer() {
  dim = Storyboard.backgroundDim;
  var canvas: HTMLCanvasElement = document.querySelector("#storyboard");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 32;
  StoryboardObject.widthRatio = canvas.width / StoryboardObject.widthDefault;
  StoryboardObject.heightRatio = canvas.height / StoryboardObject.heightDefault;
  var ctx = canvas.getContext("2d");

  Storyboard.setAnalyserFftSize(512);
  
  var body = document.body;
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
      // Storyboard Objects
      StoryboardObject.drawObjects(ctx);
      // Background dimming
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

      // Background zooming
      // body.style.scale = "2";
      // console.log(Storyboard.currentVisualizerIntensityAverage);
    }
    else {
      dim = Settings.current.backgroundDim;
    }

    Storyboard.analyser.getByteFrequencyData(Storyboard.dataArray);
    
    dim = Math.max(dim, 0);
    // console.log("Avg: ", avg);
    // console.log(dim);
    
    Storyboard.currentBackgroundDim = 100 - dim;
    ctx.fillStyle = "rgba(0, 0, 0, "+(dim / 100)+")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    var multiplier = Settings.current.volume / 100;
    var intensity = Storyboard.visualizerIntensity/10;
    if (settings.visualizer) {
      avg = 0;
      if (Storyboard.visualizerDirection == 0) Storyboard.dataArray = Storyboard.dataArray.reverse();

      let minBarHeight: number = null;
      for (let i = 0; i < Storyboard.bufferLength; i++) {
        let _h = Math.max(0, (Storyboard.dataArray[i]*intensity-(10*intensity)));
        _h *= 0.75;
        if (minBarHeight === null || _h < minBarHeight) minBarHeight = _h;
      }

      for (let i = 0; i < Storyboard.bufferLength; i++) {
        barHeight = Math.max(0, (Storyboard.dataArray[i]*intensity-(10*intensity)) - minBarHeight);

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
      // avgSec += avg;
      Storyboard.currentVisualizerIntensityAverage = avg;
      // avg -= settings.volume;
    }
  }
  // setInterval(() => {
  //   avgSec = 0;
  // }, 1000);
  renderFrame();
}

// When document has loaded, initialise
document.onreadystatechange = (event) => {
  if (document.readyState == "complete") {
      handleWindowControls();
  }
};

window.onbeforeunload = () => {
  /* If window is reloaded, remove win event listeners
  (DOM element listeners get auto garbage collected but not
  Electron win listeners as the win is not dereferenced unless closed) */
  browserWindow.removeAllListeners();
}

function handleWindowControls() {
  // Make minimise/maximise/restore/close buttons work when they are clicked
  document.getElementById('min-button').addEventListener("click", () => {
    browserWindow.minimize();
  });

  document.getElementById('max-button').addEventListener("click", () => {
    browserWindow.maximize();
  });

  document.getElementById('restore-button').addEventListener("click", () => {
    browserWindow.unmaximize();
  });

  document.getElementById('close-button').addEventListener("click", () => {
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