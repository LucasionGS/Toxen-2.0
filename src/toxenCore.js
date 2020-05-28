// FS takes files relative to the root "Resources" directory.
// It is NOT relative to the HTML file or script file.
const fs = require("fs");
const { Popup } = require("ionlib");
const fetch = require("node-fetch").default;
const hue = require("node-hue-api").v3;
let hueApi = null;
const Imd = require("./ionMarkDown").Imd;
const electron = require("electron");
const { remote, shell } = electron;
const { Menu, dialog } = remote;
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

class Settings {
  /**
   * @type {Settings}
   */
  static current = null;

  constructor(doNotReplaceCurrent = false) {
    if (!doNotReplaceCurrent) {
      Settings.current = this;
    }
  }

  static createFromFile(fileLocation = "./data/settings.json") {
    let newSettings = new Settings();
    try {
      if (!fs.existsSync(fileLocation)) {
        fs.writeFileSync(fileLocation, "{}");
      }
      let stgs = JSON.parse(fs.readFileSync(fileLocation, "utf8"));
      for (const key in stgs) {
        if (newSettings.hasOwnProperty(key)) {
          newSettings[key] = stgs[key];
        }
      }

      return newSettings;
    } catch (error) {
      console.error("Unable to parse settings file.", error);
    }
  }

  loadFromFile(fileLocation = "./data/settings.json") {
    try {
      if (!fs.existsSync(fileLocation)) {
        fs.writeFileSync(fileLocation, "{}");
      }
      let stgs = JSON.parse(fs.readFileSync(fileLocation, "utf8"));
      for (const key in stgs) {
        if (this.hasOwnProperty(key)) {
          this[key] = stgs[key];
        }
      }
    } catch (error) {
      console.error("Unable to parse settings file.", error);
    }
  }

  saveToFile(fileLocation = "./data/settings.json") {
    fs.writeFileSync(fileLocation, JSON.stringify(this));
  }

  /**
   * Set the media's volume.
   * @param {number} value Volume value.
   */
  setVolume(value) {
    this.volume = value;
    SongManager.player.volume = value / 100;
  }

  applySettingsToPanel() {
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        const value = this[key];
        if (typeof value == "string" || typeof value == "number") {
          let element = document.getElementById(key.toLowerCase()+"="+value);
          if (element != null && element instanceof HTMLInputElement) {
            if (element.type == "radio") {
              element.checked = true;
            }
            else {
              element.value = value;
            }
            continue;
          }
          element = document.getElementById(key.toLowerCase()+"Value");
          if (element != null && element instanceof HTMLInputElement) {
            element.value = value;
            continue;
          }
        }

        if (typeof value == "boolean") {
          let element = document.getElementById(key.toLowerCase()+"Toggle");          
          if (element != null && element instanceof HTMLInputElement) {
            console.log("Found one!");
            console.log(element);
            if (element.type == "radio") {
              element.checked = value;
            }
            if (element.type == "checkbox") {
              element.checked = value;
            }
          }
        }
      }
    }
  }

  async selectSongFolder() {
    let self = this;
    dialog.showOpenDialog(remote.getCurrentWindow(), {
      "buttonLabel": "Select Folder",
      "properties": [
        "openDirectory"
      ],
      "message": "Select your song folder"
    })
    .then(value => {
      if (value.filePaths.length == 0) {
        return;
      }
      document.querySelector("input#songfolderValue").value = value.filePaths[0];
      self.songFolder = value.filePaths[0];
      if (fs.existsSync(self.songFolder + "/db.json")) {
        SongManager.loadFromFile();
      }
      else {
        SongManager.scanDirectory();
      }
      self.saveToFile();
    });
  }

  /**
   * @param {boolean} force
   */
  toggleSongPanelLock(force) {
    /**
     * @type {HTMLButtonElement}
     */
    const element = document.getElementById("lockPanel");
    if (typeof force == "boolean") {
      this.songMenuLocked = !force;
    }

    if (this.songMenuLocked == false) {
      element.innerText = "🔒";
      element.style.opacity = 1;
      this.songMenuLocked = true;
    }
    else {
      element.innerText = "🔓";
      element.style.opacity = 0.5;
      this.songMenuLocked = false;
    }
    
    document.getElementById("songmenusidebar").toggleAttribute("open", this.songMenuLocked);
    // this.saveToFile();
    return this.songMenuLocked;
  }

  /**
   * @param {boolean} force
   */
  toggleSongPanelToRight(force) {
    if (typeof force == "boolean") {
      this.songMenuToRight = force;
    }

    if (this.songMenuToRight) {
      document.querySelector("#songmenusidebar").classList.replace("left", "right");
      document.querySelector("#settingsmenusidebar").classList.replace("right", "left");
    }
    else {
      document.querySelector("#songmenusidebar").classList.replace("right", "left");
      document.querySelector("#settingsmenusidebar").classList.replace("left", "right");
    }
    
    this.saveToFile();
    return this.songMenuToRight;
  }

  // 
  // All Settings
  // 
  /**
   * Percentage to dim the background.
   * @type {number}
   */
  backgroundDim = 0;
  /**
   * Audio volume.
   * @type {number}
   */
  volume = 100;
  /**
   * Full path to the current song folder.
   * @type {string}
   */
  songFolder = null;
  /**
   * Returns whether or not the `songFolder` is a remote URL or not.
   */
  get remote() {
    return /^(?:http|https):\/\//g.test(this.songFolder);
  };
  /**
   * List of full paths to the song folders.
   * @type {string[]}
   */
  songFolderList = [ ];
  /**
   * Intensity of the audio visualizer.
   * @type {number}
   */
  visualizerIntensity = 15;
  /**
   * Whether or not the visualizer is enabled.
   * @type {boolean}
   */
  visualizer = true;
  /**
   * Whether or not the storyboard is enabled.
   * @type {boolean}
   */
  storyboard = true;
  /**
   * `true` Displays the advanced options.  
   * `false` Keep the advanced options hidden.
   */
  advanced = false;
  /**
   * Visualizer Colors RGB
   */
  visualizerColor = {
    red: 0,
    green: 255,
    blue: 100
  };
  visualizerStyle = 3;
  /**
   * Repeat the same song.
   */
  repeat = false;
  /**
   * Shuffle to a random song instead of the next in the list.
   */
  shuffle = true;
  /**
   * Detail to sort by
   * @type { "artist" | "title" | "length" }
   */
  sortBy = "artist";
  /**
   * `true` Set the song menu on the right hand side.  
   * `false` Keep the song menu on the left hand side.
   */
  songMenuToRight = false;
  /**
   * `true` Lock the song panel in place and don't make it fade away.  
   * `false` Only show the panel when hovered over.
   */
  songMenuLocked = false;
  /**
   * `true` Shows backgrounds as a thumbnail for the songs with a custom background.  
   * `false` Doesn't show thumbnails.
   */
  thumbnails = true;
}

/**
 * Custom HTML Song Element that extends div.  
 * Every `musicitem` is this.
 */
class HTMLSongElement extends HTMLDivElement {
  /**
   * @type {Song}
   */
  songObject;
}

class Song {
  constructor() {
    let self = this;
    /**
     * @type {HTMLSongElement}
     */
    const div = document.createElement("div");
    this.setElement(div);
    this.element.className = "musicitem";
    const innerDiv = document.createElement("div");
    innerDiv.className = "innermusicitem";
    this.element.appendChild(innerDiv);
    this.element.addEventListener("click", function(e) {
      e.preventDefault();
      self.click();
    });
    this.element.addEventListener("contextmenu", function(e) {
      e.preventDefault();
      menus.songMenu.items.find(i => i.label === "Open song folder").songObject = self;
      menus.songMenu.popup({
        "x": e.clientX,
        "y": e.clientY
      });
    });
  }

  refreshElement() {
    this.element.children[0].innerHTML = "<p>" + Imd.MarkDownToHTML(this.details.artist + " - " + this.details.title) + "</p>";
    this.element.children[0].style.position = "relative";
    if (this.background != null && Settings.current.thumbnails) {
      this.element.children[0].children[0].style.width = "calc(100% - 96px)";
      const thumbnail = document.createElement("div");
      const img = document.createElement("img");
      thumbnail.appendChild(img).src = this.getFullPath("background");
      thumbnail.style.overflow = "hidden";
      thumbnail.style.width = "96px";
      thumbnail.style.position = "absolute";
      thumbnail.style.right = "0";
      thumbnail.style.top = "0";
      img.setAttribute("loading", "lazy");
      // img.style.display = "block";
      // img.style.margin = "auto";
      this.element.children[0].appendChild(thumbnail);
      thumbnail.addEventListener("load", () => {
        thumbnail.style.height = this.element.clientHeight+"px";
        img.style.maxHeight = this.element.clientHeight+"px";
        // img.style.maxWidth = "100%";
      }, 10);
    }

    this.click = function() {
      this.play();
    };
  }

  songId = 0;

  click = function() {};

  /**
   * Relative path for this song / Folder name
   * @type {string}
   */
  path = null;

  /**
   * Relative path to the song mp3/mp4.
   * @type {string}
   */
  songPath = null;
  
  /**
   * Relative path to the song's SRT file (if any).
   * @type {string}
   */
  subtitlePath = null;

  /**
   * Relative path to the song's TXN script file (if any).
   * @type {string}
   */
  txnScript = null;

  /**
   * Relative path to the song's background image (if any).
   * @type {string}
   */
  background = null;

  /**
   * Detailed information about this song (if applied)
   */
  details = {
    /**
     * The artist who made this song.
     * @type {string}
     */
    artist: null,

    /**
     * The title for this song.
     * @type {string}
     */
    title: null,
    
    /**
     * List of tags to better help find this song in searches.
     * @type {string[]}
     */
    tags: []
  };

  /**
   * @type {HTMLSongElement}
   */
  element = null;

  /**
   * @param {HTMLDivElement | HTMLSongElement} elm 
   */
  setElement(elm) {
    this.element = elm;
    this.element.songObject = this;
  }

  /**
   * Executes when a song is played.
   * @param {Song} song 
   */
  onplay(song) { }

  /**
   * Play this song.
   */
  play() {
    let fp = this.getFullPath("songPath");
    let id = this.songId;
    let cur = SongManager.getCurrentlyPlayingSong();
    if (cur != null) cur.element.toggleAttribute("playing", false);
    this.element.toggleAttribute("playing", true);
    this.element.scrollIntoViewIfNeeded();

    if (SongManager.player.getAttribute("songid") != id) {
      SongManager.player.setAttribute("songid", id);
      if (this.isVideo) {
        let source = SongManager.player.querySelector("source");
        if (source == null) {
          source = document.createElement("source");
        }
        source.src = fp;
        SongManager.player.removeAttribute("src");
        SongManager.player.appendChild(source);
        SongManager.player.load();
      }
      else {
        if (SongManager.player.querySelector("source") != null) {
          SongManager.player.innerHTML = "";
        }
        if (fp.toLowerCase().endsWith(".mp3")) {
          SongManager.player.src = fp;
        }
        else {
          let newSrc;
          fs.readdirSync(this.getFullPath("path")).forEach(f => {
            if (f.toLowerCase().endsWith(".mp3")) {
              newSrc = this.getFullPath("path") + "/" + f;
            }
          });
          if (newSrc != undefined) {
            SongManager.player.src = newSrc;
          }
          else {
            const format = fp.split(".")[fp.split(".").length - 1];
            /**
             * @type {ffmpeg.FfmpegCommand}
             */
            let src = new ffmpeg(fp);
            let newName = fp.substring(0, fp.length - format.length) + "mp3";
            console.log("Converting the file...");
            let p = new Popup("First Time Convertion", "This song is in a different format than supported, "
            + "so it is being converted to a usable format.<br>Please allow a moment until it has been converted...");
            p.setButtonText(false);
            src.toFormat("mp3").saveToFile(newName).on("end", () => {
              console.log("Finished!");
              SongManager.player.src = newName;
              p.close();
              new Popup("Convertion Completed.", [], 2000);
              this.play();
            });
            return;
          }
        }
      }
      SongManager.player.play().catch(err => console.log(err));
      Storyboard.setBackground(this.getFullPath("background"));
      const _d = document.createElement("div");
      _d.innerHTML = Imd.MarkDownToHTML(this.details.artist + " - " + this.details.title);
      document.title = _d.innerText;
      if (this.txnScript) {
        ToxenScriptManager.reloadCurrentScript();
      }
      else {
        ToxenScriptManager.events = [];
      }
      if (this.subtitlePath) {
        Subtitles.renderSubtitles(this.getFullPath("subtitlePath"));
        // Maybe await
      }
      else {
        Subtitles.current = [];
      }
    }
    else {
      if (!SongManager.player.paused) {
        SongManager.player.pause();
      }
      else {
        SongManager.player.play();
      }
    }

    SongManager.onplay(this);
  }

  get isVideo() {
    if (this.songPath.endsWith(".mp4")) {
      return true;
    }
    else {
      return false;
    }
  };

  /**
   * Get the full path to a file. (Default is `songPath`)
   * @param { "path" | "songPath" | "subtitlePath" | "background" | "txnScript"} itemToFind
   */
  getFullPath(itemToFind = "songPath") {
    if (typeof this[itemToFind] !== "string") {
      console.error("Could not find \""+itemToFind+"\"");
      return null;
    }
    if (!Settings.current instanceof Settings) {
      console.error("There is no current settings file.");
      return null;
    }
    // let fp = Settings.current.songFolder + "/" + this[itemToFind];
    let fp;
    if (Settings.current.remote) fp = Settings.current.songFolder + "/" + this[itemToFind];
    else fp = path.resolve(Settings.current.songFolder, this[itemToFind]);    
    return fp;
  }
}

class SongManager {
  /**
   * Full list of available songs.
   * @type {Song[]}
   */
  static songList = [];

  /**
   * List of playable songs from a search.
   * @type {Song[]}
   */
  static playableSongs = [];

  static refreshList() {
    if (this.songListElement) {
      let nList = this.songList;
      this.songListElement.innerHTML = "";
      for (let i = 0; i < nList.length; i++) {
        const song = nList[i];
        song.refreshElement();
        this.songListElement.appendChild(song.element);
      }
    }
    else {
      console.error("No div element applied to SongManager.songListElement",
      "SongManager.songListElement is " + typeof SongManager.songListElement);
    }
  }
  /**
   * @param {string} search Search for a string
   */
  static search(search = "") {
    search = search.toLowerCase();
    /** @param {string | string[]} string */
    function match(string) {
      if (Array.isArray(string)) {
        string = string.join(" ");
      }
      let p = search.split(" ");
      for (let i = 0; i < p.length; i++) {
        const item = p[i];
        if (!string.toLowerCase().includes(item)) {
          return false;
        }
      }
      return true;
      
    }
    let nSearch = [];
    this.songList.forEach(s => {
      let searchTags = [
        s.details.artist,
        s.details.title,
      ].concat(s.details.tags);

      if (match(searchTags)) {
        s.element.hidden = false;
        nSearch.push(s);
      }
      else {
        s.element.hidden = true;
      }
    });
    if (nSearch.length > 0) {
      SongManager.playableSongs = nSearch;
    }
    else {
      SongManager.playableSongs = SongManager.songList;
    }
  }

  /**
   * @type {HTMLDivElement}
   */
  static songListElement = null;

  /**
   * @type {HTMLVideoElement}
   */
  static player = null;

  static scanDirectory(location = Settings.current.songFolder + "/") {
    if (Settings.current.remote) {
      return console.error("Cannot scan directory as it is a remote.");
    }
    if (!fs.existsSync(location)) {
      fs.mkdirSync(location, {
        recursive: true
      });
      SongManager.songList = [];
      SongManager.refreshList();
      return [];
    }
    else {
      let files = fs.readdirSync(location, {
        withFileTypes: true
      });

      /**
       * @type {Song[]}
       */
      let songs = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.isDirectory()) {
          let song = new Song();
          song.songId = songs.length;
          let songDir = location + file.name + "/";
          song.path = file.name;
          let items = fs.readdirSync(songDir);
          for (let i2 = 0; i2 < items.length; i2++) {
            const item = items[i2];
            // Media file
            if (item.endsWith(".mp3") || item.endsWith(".wma") || item.endsWith(".mp4")) {
              song.songPath = file.name + "/" + item;
            }
            // Subtitle file
            if (item.endsWith(".srt")) {
              song.subtitlePath = file.name + "/" + item;
            }
            // ToxenScript File
            if (item.endsWith(".txn")) {
              song.txnScript = file.name + "/" + item;
            }
            // Graphical background file
            if (item.endsWith(".png") || item.endsWith(".jpg") || item.endsWith(".jpeg")) {
              song.background = file.name + "/" + item;
            }
            if (item == "details.json") {
              try {
                /**
                 * @type {Song["details"]}
                 */
                let info = JSON.parse(fs.readFileSync(songDir + item, "utf8"));
                song.details = info;
              } catch (error) {
                console.error("Unable to parse details for \"" + songDir + item + "\"", error);
              }
            }
          }

          if (song.songPath == null) {
            continue;
          }

          if (song.details.artist == null || song.details.title == null) {
            let _z;
            let st = (_z = song.path.split("/"))[_z.length - 1];
            let parts = st.split(" - ");
            if (song.details.artist == null) {
              if (parts.length == 1) {
                song.details.artist = "Unknown";
              }
              if (parts.length > 1) {
                song.details.artist = parts[0];
              }
            }
            if (song.details.title == null) {
              if (parts.length == 1) {
                song.details.title = parts[0];
              }
              if (parts.length == 2) {
                song.details.title = parts[1];
              }
              if (parts.length > 2) {
                parts.shift();
                song.details.title = parts.join(" - ");
              }
              if (song.details.title && (song.details.title.endsWith(".mp3") || song.details.title.endsWith(".mp4"))) {
                song.details.title = song.details.title.substring(0, song.details.title.length - 4);
              }
            }
          }

          songs.push(song);
        }
      }
      if (Settings.current.songFolder != location) {
        Settings.current.songFolder = location;
      }
      SongManager.songList = songs;
      SongManager.refreshList();
      SongManager.saveToFile();
      return songs;
    }
  }

  /**
   * @param {Settings["sortBy"]} sortName
   */
  static sortBy(sortName) {
    SongManager.songList.sort((a, b) => {
      if (sortName == "artist") {
        // TODO: Fix
      }
    });
    SongManager.refreshList();
  }

  static async loadFromFile(fileLocation = Settings.current.songFolder + "/db.json") {
    if (!Settings.current.remote) {
      try {
        if (!fs.existsSync(fileLocation)) {
          fs.writeFileSync(fileLocation, "{}");
        }
        /**
         * @type {Song[]}
         */
        let songList = JSON.parse(fs.readFileSync(fileLocation, "utf8"));
        for (let i = 0; i < songList.length; i++) {
          const song = songList[i];
          songList[i] = new Song();
          for (const key in song) {
            if (song.hasOwnProperty(key)) {
              const value = song[key];
              songList[i][key] = value;
            }
          }
        }
        SongManager.songList = songList;
        SongManager.refreshList();
      } catch (error) {
        console.error("Unable to parse settings file.", error);
      }
    }
    // Fix
    else {
      try {
        /**
         * @type {Song[]}
         */
        let songList = await (await fetch(fileLocation)).json();
        for (let i = 0; i < songList.length; i++) {
          const song = songList[i];
          songList[i] = new Song();
          for (const key in song) {
            if (song.hasOwnProperty(key)) {
              const value = song[key];
              songList[i][key] = value;
            }
          }
        }
        SongManager.songList = songList;
        SongManager.refreshList();
      } catch (error) {
        console.error("Unable to parse settings file.", error);
      }
    }
  }

  static saveToFile(fileLocation = Settings.current.songFolder + "/db.json") {
    let list = Array.from(SongManager.songList);
    /**
     * @type {HTMLSongElement[]}
     */
    let elementList = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      elementList.push(s.element);
      delete s.element;
    }
    fs.writeFileSync(fileLocation, JSON.stringify(list));
    for (let i = 0; i < elementList.length; i++) {
      const element = elementList[i];
      element.songObject.element = element;
    }
  }

  /**
   * @param {number} id Song ID
   */
  static getSong(id) {
    return SongManager.songList[id];
  }

  static getCurrentlyPlayingSong() {
    return SongManager.getSong(SongManager.player.getAttribute("songid"));
  }

  /**
   * @param {number} timeInSeconds 
   */
  static moveToTime(timeInSeconds) {
    if (isNaN(timeInSeconds)) return false;
    try {
      SongManager.player.currentTime = timeInSeconds;
      return true;
    } catch (error) {
      console.error(error, timeInSeconds);
      return false
    }
  }

  /**
   * @param {number} id 
   */
  static playSongById(id) {
    SongManager.playSong(SongManager.getSong(id));
  }

  /**
   * @param {Song} song 
   */
  static playSong(song) {
    song.play();
  }

  static playRandom() {
    SongManager.playableSongs[Math.floor(Math.random() * SongManager.playableSongs.length)].play();
  }

  static playNext() {
    const song = SongManager.getCurrentlyPlayingSong();
    let id = song.songId;
    if (Settings.current.repeat) {
      SongManager.player.currentTime = 0;
      SongManager.player.play();
    }
    else if (Settings.current.shuffle) {
      SongManager.playRandom();
    }
    else {
      if (SongManager.playableSongs.length > id + 1) {
        SongManager.getSong(id + 1).play();
      }
      else {
        SongManager.getSong(0).play();
      }
    }
  }

  static playPrev() {
    let id = SongManager.getCurrentlyPlayingSong().songId;
    if (id - 1 >= 0) {
      SongManager.getSong(id - 1).play();
    }
    else {
      SongManager.getSong(SongManager.playableSongs.length - 1).play();
    }
  }

  /**
   * @param {boolean} force
   */
  static toggleShuffle(force) {
    /**
     * @type {HTMLButtonElement}
     */
    const element = document.getElementById("toggleShuffle");
    if (typeof force == "boolean") {
      Settings.current.shuffle = !force;
    }

    if (Settings.current.shuffle == false) {
      element.classList.replace("color-red", "color-green");
      Settings.current.shuffle = true;
    }
    else {
      element.classList.replace("color-green", "color-red");
      Settings.current.shuffle = false;
    }

    Settings.current.saveToFile();
    return Settings.current.shuffle;
  }

  /**
   * @param {boolean} force
   */
  static toggleRepeat(force) {
    /**
     * @type {HTMLButtonElement}
     */
    const element = document.getElementById("toggleRepeat");
    if (typeof force == "boolean") {
      Settings.current.repeat = !force;
    }

    if (Settings.current.repeat == false) {
      element.classList.replace("color-red", "color-green");
      Settings.current.repeat = true;
    }
    else {
      element.classList.replace("color-green", "color-red");
      Settings.current.repeat = false;
    }

    Settings.current.saveToFile();
    return Settings.current.repeat;
  }

  static addSong() {
    let p = new Prompt("This is test");
    p.addContent("lol");
    let ok = document.createElement("button");
    ok.innerText = "Cancel";
    ok.classList.add("color-red");
    ok.onclick = function() {
      p.close();
    };
    p.addButtons(ok, "fancybutton");
  }

  /**
   * This should be set bby the client.
   * @param {Song} song 
   */
  static onplay = function(song) { };
}

const menus = {
  "songMenu": Menu.buildFromTemplate(
    [
      {
        label: "Open song folder",
        click: (menuItem, bw) => {
          /**
           * @type {Song}
           */
          const song = menuItem.songObject;
          if (song instanceof Song) {
            let path = song.getFullPath("path")            
            if (!shell.openItem(path)) {
              console.error("Unable to open directory", path);
            }
          }
        }
      }
    ]
  )
}

class Storyboard {
  static red = 25;
  static green = 0;
  static blue = 250;

  static toRed = 25;
  static toGreen = 0;
  static toBlue = 250;
  /**
   * Fade into a RGB color.
   * @param {number} red 
   * @param {number} green 
   * @param {number} blue 
   */
  static rgb(red = Storyboard.red, green = Storyboard.green, blue = Storyboard.blue) {
    Storyboard.toRed = red;
    Storyboard.toGreen = green;
    Storyboard.toBlue = blue;

    if (Storyboard._fadingEnabled === false) {
      Storyboard._fadingEnabled = setInterval(function () {
        if (Storyboard.red != Storyboard.toRed) {
          Storyboard.red -= ((Storyboard.red - Storyboard.toRed) / 50);
        }
        if (Storyboard.green != Storyboard.toGreen) {
          Storyboard.green -= ((Storyboard.green - Storyboard.toGreen) / 50);
        }
        if (Storyboard.blue != Storyboard.toBlue) {
          Storyboard.blue -= ((Storyboard.blue - Storyboard.toBlue) / 50);
        }
      }, 1);
    }

    return {
      red: red,
      green: green,
      blue: blue
    };
  }

  /**
 * Change the current background image.
 * @param {string} image The path to the image
 * @param {string} queryString An extra query string for updating cache.
 * @param {boolean} reset If true, removes background.
 */
  static setBackground(image, queryString, reset) {
    if (queryString == undefined) {
      try {
        queryString = fs.statSync(image).ctimeMs;
      } catch (e) {
        // queryString = Debug.generateRandomString(4);
        queryString = "";
      }
    }
    if (reset == true) {
      var body = document.body;
      body.style.background = ""; //Resets
    }
    else {
      var body = document.body;
      var curBG = image;
      if (curBG != null) curBG = curBG.replace(/\\/g, "/");
      if (Settings.current.remote && curBG != "" && curBG != null) {
        body.style.background = "url(\"" + curBG + "\") no-repeat center center fixed black";
        body.style.backgroundSize = "cover";
      }
      else if (curBG != "" && curBG != null) {
        body.style.background = "url(\"" + curBG + "?" + queryString + "\") no-repeat center center fixed black";
        body.style.backgroundSize = "cover";
      }
      else {
        var defImg = "../icon.png";
        if (!Settings.current.remote && fs.existsSync(Settings.current.songFolder + "/default.jpg")) {
          defImg = Settings.current.songFolder + "/default.jpg";
          body.style.background = "url(\"" + defImg.replace(/\\/g, "/") + "?" + queryString + "\") no-repeat center center fixed black";
          body.style.backgroundSize = "cover";
        }
        else {
          body.style.background = "url(\"" + defImg + "?" + queryString + "\") no-repeat center center fixed black";
          body.style.backgroundSize = "contain";
        }
      }
    }
  }
  
  /**
   * Set the intensity of the visualizer.
   * @param {number} value 
   */
  static setIntensity(value) {
    Settings.current.visualizerIntensity = value;
  }

  static _fadingEnabled = false;
}

class Subtitles {
  /**
   * @type {{ id: number, startTime: number, endTime: number, text: string }[]}
   */
  static current = [];

  /**
   * @param {string} srtPath 
   */
  static async parseSrt(srtPath) {
    try {
      var srtText;
      if (Settings.current.remote) {
        srtText = await (await fetch(srtPath)).text();
      }
      else {
        srtText = fs.readFileSync(srtPath, "utf8");
      }
    } catch (e) {
      console.error(e);
      return false;
    }
    var subData = [];
    //Parsing
    var lines = srtText.split("\n");
  
    for (var i = 0; i < lines.length; i++) {
      var newSub = {
        "id": -1,
        "startTime": -1,
        "endTime": -1,
        "text": ""
      };
      if (lines[i].trim() == "") {
        continue;
      }
      if (!isNaN(lines[i])) {
        //Set ID
        newSub.id = +lines[i];
        i++;
  
        //Set timestamps
        var timeStamps = lines[i].split("-->");
        //startTime
        var ints = timeStamps[0].split(",", 1)[0].split(":");
        newSub.startTime = ((+ints[0] * 60 * 60) + (+ints[1] * 60) + (+ints[2]) + (+timeStamps[0].split(",", 2)[1] / 1000));
  
        //endTime
        ints = timeStamps[1].split(",", 1)[0].split(":");
        newSub.endTime = ((+ints[0] * 60 * 60) + (+ints[1] * 60) + (+ints[2]) + (+timeStamps[1].split(",", 2)[1] / 1000));
        i++;
        //Set texts
        while (lines[i] && lines[i].trim() != "") {
          newSub.text += Imd.MarkDownToHTML(lines[i]) + "\n";
          i++;
        }
        subData.push(newSub);
      }
    }
  
    //Returning
    return subData;
  }
  
  static isRendering = false;
  /**
   * @param {string} srtFile 
   */
  static async renderSubtitles(srtFile) {
    Subtitles.current = await Subtitles.parseSrt(srtFile);
    var subText = document.querySelector("p#subtitles");
    if (subText && subText.innerHTML) {
      subText.innerHTML = "";
    }
    if (!Subtitles.current) {
      return;
    }
    Subtitles.isRendering = setInterval(function () {
      var hasSub = false;
      for (var i = 0; i < Subtitles.current.length; i++) {
        if (SongManager.player.currentTime >= Subtitles.current[i].startTime && SongManager.player.currentTime <= Subtitles.current[i].endTime) {
          if (subText.innerHTML.replace(/\"/g, "\'") != Subtitles.current[i].text.replace(/\"/g, "\'")) {
            subText.innerHTML = Subtitles.current[i].text;
          }
          hasSub = true;
        }
      }
      if (!hasSub) {
        subText.innerHTML = "";
      }
    }, 5);
  }
}

// Background Pulse
class Pulse {
  /**
   * @type {Pulse[]}
   */
  allPulses = [];
  constructor() {
    const leftDiv = document.createElement("div");
    leftDiv.style.position = "absolute";
    leftDiv.style.top = "0";
    leftDiv.style.left = "0";
    leftDiv.style.background = "linear-gradient(-90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.8) 100%)";
    leftDiv.style.height = "100vh";

    this.left = leftDiv;

    document.body.insertBefore(leftDiv, SongManager.player);

    const rightDiv = document.createElement("div");
    rightDiv.style.position = "absolute";
    rightDiv.style.top = "0";
    rightDiv.style.right = "0";
    rightDiv.style.background = "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.8) 100%)";
    rightDiv.style.height = "100vh";

    this.right = rightDiv;

    document.body.insertBefore(rightDiv, SongManager.player);

    this.allPulses.push(this);
  }
  /**
   * @type {HTMLDivElement}
   */
  left = null;
  /**
   * @type {HTMLDivElement}
   */
  right = null;

  _width = 0;

  lastPulse = 0;

  set width(value) {
    this._width = value;
    this.left.style.width = this._width+"px";
    this.right.style.width = this._width+"px";
  }

  get width() {
    return this._width;
  }

  /**
   * @param {Number} width 
   */
  pulse(width) {
    this.lastPulse = width;
    this.width = width;
  }

  interval = setInterval(() => {
    if (this.width > 0) {
      this.width -= Math.max(Math.min(this.width, 1), (this.width / Settings.current.visualizerIntensity) * 2);
      let opacity = (this.width / this.lastPulse);
      this.left.style.opacity = opacity;
      this.right.style.opacity = opacity;
    }
  }, 10);

  destroy() {
    this.left.parentElement.removeChild(this.left);
    this.right.parentElement.removeChild(this.right);
    clearInterval(this.interval);
  }
}

/**
 * This is temporary plz
 * @type {Pulse}
 */
let testPulse;
setTimeout(() => {
  testPulse = new Pulse();
}, 10);

class ToxenScriptManager {
  static currentScriptFile = "";
  static isRunning = false;

  /**
   * Reloads the script for the currently playing song.
   */
  static async reloadCurrentScript() {
    ToxenScriptManager.events = [];

    // Prevent the intensity from going mayham on smooth setters, which it does for some unknown reason.
    Storyboard.setIntensity(15);
    Storyboard.rgb(
      Settings.current.visualizerColor.red,
      Settings.current.visualizerColor.green,
      Settings.current.visualizerColor.blue
    );

    let song = SongManager.getCurrentlyPlayingSong();
    if (Settings.current.remote && song.txnScript) {
      ToxenScriptManager.scriptParser(song.getFullPath("txnScript"));
    }
    else if (song.txnScript && fs.existsSync(song.getFullPath("txnScript"))) {
      ToxenScriptManager.scriptParser(song.getFullPath("txnScript"));
    }
  }

  /**
   * Parses Toxen script files for background effects.
   * @param {string} scriptFile Path to script file.
   */
  static async scriptParser(scriptFile) {
    if (ToxenScriptManager.isRunning === false) {
      ToxenScriptManager.isRunning = setInterval(() => {
        
        if (ToxenScriptManager.events.length > 0 && Settings.current.visualizer && Settings.current.storyboard) {
          for (let i = 0; i < ToxenScriptManager.events.length; i++) {
            /**
             * @type {ToxenEvent}
             */
            const e = ToxenScriptManager.events[i];
            if (SongManager.player.currentTime >= e.startPoint && SongManager.player.currentTime <= e.endPoint) {
              e.fn();
            }
          }
        }
      }, 0);
    }

    fs.unwatchFile(ToxenScriptManager.currentScriptFile);
    if (!Settings.current.remote) {
      fs.watchFile(scriptFile, (curr, prev) => {
        ToxenScriptManager.reloadCurrentScript();
      });
    }
    ToxenScriptManager.currentScriptFile = scriptFile;
    let data;
    if (Settings.current.remote) {
      data = (await (await fetch(scriptFile)).text()).split("\n");
    }
    else {
      data = fs.readFileSync(scriptFile, "utf8").split("\n");
    }

    for (let i = 0; i < data.length; i++) {
      const line = data[i].trim();
      if (typeof line == "string" && !line.startsWith("#") && !line.startsWith("//") && line != "") {

        let fb = lineParser(line);
        if (fb == undefined) continue;
        // Failures
        if (typeof fb == "string") {
          setTimeout(() => {
            new Popup("Parsing error", ["Failed parsing script:", "\"" + scriptFile + "\"", "Error at line " + (i + 1), fb]);
          }, 100);
          throw "Failed parsing script. Error at line " + (i + 1) + "\n" + fb;
        }
        if (fb.success == false) {
          setTimeout(() => {
            new Popup("Parsing error", ["Failed parsing script:", "\"" + scriptFile + "\"", "Error at line " + (i + 1)]);
          }, 100);
          throw "Failed parsing script. Error at line " + (i + 1) + "\n" + fb.error;
        }
      }
    }

    if (ToxenScriptManager.events[ToxenScriptManager.events.length - 1] && ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint == "$") {
      ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint = ToxenScriptManager.timeStampToSeconds("2:00:00");
    }

    /**
     * Checks a line and parses it.
     * @param {string} line Current line of the script.
     */
    function lineParser(line) {
      try { // Massive trycatch for any error.
        let maxPerSecond = 0;
        const checkMaxPerSecond = /^\b(once|twice)\b/g;
        if (checkMaxPerSecond.test(line)) {
          line.replace(checkMaxPerSecond, function(item) {
            if (item == "once") {
              maxPerSecond = 1;
            }
            if (item == "twice") {
              maxPerSecond = 2;
            }
            return "";
          });
        }

        // Check if non-time function
        const checkFunction = /:\S*\s*=>\s*.*/g;
        if (checkFunction.test(line)) {
          line = "[0 - 1]" + line;
        }

        // Check if no only start
        const checkTime = /(?<=\[)[^-]*(?=\])/g;
        if (checkTime.test(line)) {
          line = line.replace(checkTime, "$& - $");
        }
        // Regexes
        const timeReg = /(?<=\[).+\s*-\s*\S+(?=\])/g;
        const typeReg = /(?<=\[.+\s*-\s*\S+\]\s*)\S*(?=\s*=>)/g;
        const argReg = /(?<=\[.+\s*-\s*\S+\]\s*\S*\s*=>\s*).*/g;

        // Variables
        var startPoint = 0;
        var endPoint = 0;
        var args = [];
        var fn = (args) => { };

        // Parsing...
        var timeRegResult = line.match(timeReg)[0];
        timeRegResult = timeRegResult.replace(/\s/g, "");
        var tP = timeRegResult.split("-");
        startPoint = tP[0];
        endPoint = tP[1];

        // if (!startPoint.startsWith("$")) { // Maybe add this as a features just like endPoint...
        startPoint = ToxenScriptManager.timeStampToSeconds(tP[0]);
        // }
        if (endPoint != "$") {
          endPoint = ToxenScriptManager.timeStampToSeconds(tP[1]);
        }
        // else {
        //   endPoint = "$";
        // }

        if (ToxenScriptManager.events[ToxenScriptManager.events.length - 1] && ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint == "$") {
          ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint = startPoint;
        }

        if (startPoint >= endPoint) { // Catch error if sP is higher than eP
          return "startPoint cannot be higher than endPoint";
        }

        var type = line.match(typeReg)[0].toLowerCase();
        if (typeof type != "string") {
          return "Invalid type format.";
        }

        // only compatible with "once"
        if (maxPerSecond == 0 && /\b(huecolor|hueandvisualizercolor)\b/g.test(type)) {
          return "Invalid type compatibility.\n"+type+" is required to use a limiter prefix.";
        }

        // only compatible with "once"
        if (maxPerSecond > 0 && /\b(bpmpulse)\b/g.test(type)) {
          console.warn("Irrelevant limiter.\n"+type+" cannot use a limiter prefix and has been ignored.");
        }

        var argString = line.match(argReg)[0].trim();

        if (typeof argString != "string") {
          return `Arguments are not in a valid format.`;
        }

        /**
         * @param {string} as 
         */
        function parseArgumentsFromString(as) {
          var argList = [];
          var curArg = "";
          var waitForQuote = true;
          for (let i = 0; i < as.length; i++) {
            const l = as[i];
            if (l == "\"" && i == 0) {
              waitForQuote = false;
              continue;
            }
            else if (l == "\"" && curArg == "" && waitForQuote == true) {
              waitForQuote = false;
              continue;
            }
            else if (l == "\\\\" && curArg != "" && as[i + 1] == "\"") {
              i++;
              curArg += "\"";
              continue;
            }
            else if (l == "\"" && curArg != "") {
              argList.push(curArg);
              curArg = "";
              waitForQuote = true;
              continue;
            }
            else {
              if (!waitForQuote) {
                curArg += l;
              }
              continue;
            }
          }

          return argList;
        }

        args = parseArgumentsFromString(argString);

        // Special treatments
        if (type == "bpmpulse") {
          // BPM calculation
          if (args[1] == undefined) {
            args[1] = 1;
          }
          let bpm = +args[0], intensity = +args[1];

          let bps = bpm / 60;
          maxPerSecond = 1;
          let mspb = 1000 / bps;
          let beatCount = (endPoint - startPoint) * 1000 / mspb;
          // console.log(
          //   bpm,
          //   bps,
          //   mspb,
          //   beatCount
          // );
          
          for (let i = 0; i < beatCount; i++) {
            let st = +(startPoint + (i * (mspb / 1000))).toFixed(3);
            let et = +(startPoint + ((i + 1) * (mspb / 1000))).toFixed(3);
            let cmd = `[${st} - ${et}] Pulse => "${intensity}"`;
            // console.log(cmd);
            lineParser(cmd);
          }

          return {
            "success": true
          };
        }
        if (type == "pulse") {
          // Convert to pulses
          maxPerSecond = 1;
        }

        ToxenScriptManager.events.push(new ToxenEvent(startPoint, endPoint, fn));
        let currentEvent = ToxenScriptManager.events[ToxenScriptManager.events.length - 1];
        fn = function () {
          if (maxPerSecond > 0 && !type.startsWith(":") && currentEvent.hasRun == false) {
            try {
              ToxenScriptManager.eventFunctions[type](args);
            } catch (error) {
              console.error(error);
            }
            setTimeout(() => {
              currentEvent.hasRun = false;
            }, (1000 / maxPerSecond));
          }
          else if (maxPerSecond == 0 && !type.startsWith(":")) {
            ToxenScriptManager.eventFunctions[type](args);
          }
          else if (type.startsWith(":") && currentEvent.hasRun == false) {
            ToxenScriptManager.eventFunctions[type](args);
          }
          currentEvent.hasRun = true;
        };

        currentEvent.fn = fn;

        if (typeof ToxenScriptManager.eventFunctions[type] == undefined) {
          return `Type "${type.toLowerCase()}" is not valid.`;
        }

      } catch (error) { // Catch any error
        return {
          "success": false,
          "error": error
        };
      }
    }
  }

  /**
   * Function Types
   */
  static eventFunctions = {
    /**
     * Change the image of the background.
     * @param {[string]} args Arguments.
     */
    background: function (args) {
      let song = SongManager.getCurrentlyPlayingSong();
      Storyboard.setBackground(song.getFullPath("path") + "/" + args[0]);
    },
    /**
     * Change the color of the visualizer
     * @param {[string | number, string | number, string | number]} args Arguments
     */
    visualizercolor: function (args) {
      Storyboard.rgb(args[0], args[1], args[2]);
    },
    visualizerintensity: function (args) {
      if (args[1] && args[1].toLowerCase() == "smooth") {
        if (+args[0] < settings.visualizerIntensity) {
          settings.visualizerIntensity -= 0.1;
        }
        else if (+args[0] > settings.visualizerIntensity) {
          settings.visualizerIntensity += 0.1;
        }

        if (Math.round(+args[0] - settings.visualizerIntensity) == 0) {
          settings.visualizerIntensity = +args[0];
        }
      }
      else {
        Storyboard.setIntensity(+args[0]);
      }
    },
    /**
     * Change the color of a Hue Light.
     * @param {[string | number, string | number, string | number, string | number, string | number]} args Arguments
     */
    huecolor: function (args) {
      let brightness = 100;
      let lights = args[0].split(",");
      if (args[4] !== undefined) {
        brightness = +args[4];
      }
      if (hueApi)
        for (let i = 0; i < lights.length; i++)
          hueApi.lights.setLightState(+lights[i], new hue.lightStates.LightState().on().rgb(+args[1], +args[2], +args[3]).brightness(brightness));
    },
    /**
     * Change the color of a Hue Light and Visualizer.
     * @param {[string | number, string | number, string | number, string | number, string | number]} args Arguments
     */
    hueandvisualizercolor: function (args) {
      Storyboard.rgb(args[1], args[2], args[3]);
      let brightness = 100;
      let lights = args[0].split(",");
      if (args[4] !== undefined) {
        brightness = +args[4];
      }
      if (hueApi)
        for (let i = 0; i < lights.length; i++)
          hueApi.lights.setLightState(+lights[i], new hue.lightStates.LightState().on().rgb(+args[1], +args[2], +args[3]).brightness(brightness));
    },
    /**
     * 
     * @param {[number]} args 
     */
    pulse: function (args) {
      if (!SongManager.player.paused) {
        let [intensity] = args;
        testPulse.pulse(settings.visualizerIntensity * 32 * intensity);
      }
    },
    /**
     * This function doesn't do anything.  
     * BPMPulse is converted to Pulses when parsed.
     */
    bpmpulse: function() {
      // This function doesn't do anything.
      // BPMPulse is converted to Pulses when parsed.
    },
    // :Functions
    /**
     * 
     * @param {[string, string, string]} args 
     */
    ":hueconnect": async function(args) {
      let ipAddress = args[0];
      let hueUser = {
        "username": args[1],
        "clientkey": args[2]
      };
      hueApi = await hue.api.createInsecureLocal(ipAddress).connect(hueUser.username, hueUser.clientkey);
    }
  }

  /**
   * Convert a timestamp into seconds.
   * @param {string} timestamp Time in format "hh:mm:ss".
   */
  static timeStampToSeconds(timestamp) {
    try {
      var seconds = 0;
      var parts = timestamp.split(":");
      for (let i = 0; i < parts.length; i++) {
        const time = +parts[i];
        let x = parts.length - i - 1;
        if (x == 0) {
          seconds += time;
        }
        if (x == 1) {
          seconds += time * 60;
        }
        if (x == 2) {
          seconds += time * 60 * 60;
        }
        if (x == 3) {
          seconds += time * 60 * 60 * 24;
        }
      }
      return seconds;
    }
    catch (error) {
      var n = new Popup("Music Script Error", "Unable to convert timestamp \"" + timestamp + "\" to a valid timing point.");
      n.setButtonText("welp, fuck");
    }
  }

  /**
   * Convert seconds to digital time format.
   * @param {number} seconds 
   */
  static convertSecondsToDigitalClock(seconds) {
    var milliseconds = seconds * 1000;
    var time = "";
    var curNumber = 0;

    // Convert into hours
    while (milliseconds >= 3600000) {
      curNumber++;
      milliseconds -= 3600000;
    }
    if (curNumber < 10) {
      time += "0" + (curNumber) + ":";
    }
    else {
      time += curNumber + ":";
    }
    curNumber = 0;

    // Convert into minutes
    while (milliseconds >= 60000) {
      curNumber++;
      milliseconds -= 60000;
    }
    if (curNumber < 10) {
      time += "0" + (curNumber) + ":";
    }
    else {
      time += curNumber + ":";
    }
    curNumber = 0;

    // Convert into seconds
    while (milliseconds >= 1000) {
      curNumber++;
      milliseconds -= 1000;
    }
    if (curNumber < 10) {
      time += "0" + (curNumber) + ",";
    }
    else {
      time += curNumber + ",";
    }
    curNumber = 0;

    // Use rest as decimal
    milliseconds = Math.round(milliseconds);
    if (milliseconds >= 100) {
      time += "" + milliseconds;
    }
    else if (milliseconds >= 10) {
      time += "0" + milliseconds;
    }
    else if (milliseconds < 10) {
      time += "00" + milliseconds;
    }

    return time;
  }

  /**
   * List of events in order for the current song.
   * @type {ToxenEvent[]}
   */
  static events = [];
}

class ToxenEvent {
  /**
   * Create a new Event
   * @param {number} startPoint Starting point in seconds.
   * @param {number} endPoint Ending point in seconds.
   * @param {(args: any[]) => void} fn Function to run at this interval.
   */
  constructor(startPoint, endPoint, fn) {
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.fn = fn;
  }

  hasRun = false;
}

class Debug {
  static updateCSS() {
    let links = document.querySelectorAll("link");
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      if (link.href.includes("?")) {
        link.href = link.href.replace(/(?<=.+)\?.*/g, "?" + Debug.generateRandomString());
      }
      else {
        link.href += "?" + Debug.generateRandomString();
      }
    }
  }

  /**
   * 
   * @param {string[]} exceptions 
   */
  static refreshOnChange(exceptions = []) {
    fs.watch("./", {
      recursive: true
    }, (event, file) => {
      if (exceptions.find(f => f.replace(/^\.\/+/g, "").replace(/\\+/g, "/") == file.replace(/\\+/g, "/")) == null) {
        window.location.reload();
      }
    });
  }

  static generateRandomString(length = 6) {
    const chars = "qwertyuiopasdfghjklzxcvbnnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
    const len = chars.length;
    let string = "";
    for (let i = 0; i < length; i++) {
      const char = chars[Debug.randomInt(len)];
      string += char;
    }
    return string;
  }

  /**
   * @param {number} max 
   * @param {number} min 
   */
  static randomInt(max, min = 0) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
}

// TODO: Complete this. Add time limitors and drag and drop zone
class Prompt {
  /**
   * 
   * @param {string} title 
   * @param {HTMLElement | HTMLElement[] | string} description 
   */
  constructor(title = null, description = null, ) {
    this.main = document.createElement("div");
    this.headerElement = document.createElement("h1");
    this.contentElement = document.createElement("div");
    this.buttonsElement = document.createElement("div");

    if (title != null) this.headerElement.innerText = title;
    if (description != null) {
      if (typeof description == "object") {
        if (Array.isArray(description)) {
          for (let i = 0; i < description.length; i++) {
            const item = description[i];
            this.addContent(item);
          }
        }
        else {
          this.addContent(description);
        }
      }
    }
    this.buttonsElement.style.display = "flex";
    this.buttonsElement.style.width = "100%";
    
    this.main.appendChild(this.headerElement);
    this.main.appendChild(this.contentElement);
    this.main.appendChild(this.buttonsElement);

    this.main.style.position = "absolute";
    this.main.style.top = "10px";
    this.main.style.left = "50vw";
    this.main.style.transform = "translateX(-50%)";
    this.main.style.border = "solid 2px #2b2b2b";
    this.main.style.borderRadius = "10px";
    this.main.style.backgroundColor = "#2b2b2b";
    this.main.style.paddingLeft = "32px";
    this.main.style.paddingRight = "32px";

    document.body.appendChild(this.main);
  }

  /**
   * @type {HTMLDivElement}
   */
  main = null;

  /**
   * @type {HTMLHeadingElement}
   */
  headerElement = null;

  get headerText() {
    return this.headerElement.innerText;
  }
  set headerText(value) {
    this.headerElement.innerText = value;
  }

  /**
   * @type {HTMLDivElement}
   */
  contentElement = null;

  /**
   * @type {HTMLDivElement}
   */
  buttonsElement = null;

  /**
   * 
   * @param {HTMLElement | string} content 
   * @param {boolean} textAsHTML If `content` is a string, set to `false` to disable HTML parsing.
   */
  addContent(content, textAsHTML = true) {
    /**
     * @type {HTMLElement}
     */
    let element;
    if (typeof content == "string") {
      element = document.createElement("p");
      if (textAsHTML) {
        element.innerHTML = content;
      }
      else {
        element.innerText = content;
      }
    }
    else {
      element = content;
    }
    this.contentElement.appendChild(element);
  }

  /**
   * 
   * @param {HTMLButtonElement | HTMLButtonElement[]} button 
   * @param {string} btnClass 
   */
  addButtons(button, btnClass = null) {
    if (Array.isArray(button)) {
      button.forEach(b => {
        if (btnClass != null && typeof btnClass == "string") {
          b.classList.add(btnClass.split(" "));
        }
        this.buttonsElement.appendChild(b);
      });
    }
    else {
      if (btnClass != null && typeof btnClass == "string") {
        button.classList.add(btnClass.split(" "));
      }
      this.buttonsElement.appendChild(button);
    }
  }

  get width() {
    return this.main.clientWidth;
  }
  /**
   * @param {number | string} value
   */
  set width(value) {
    if (typeof value == "number") {
      value = `${value}px`;
    }
    this.main.style.width = value;
  }

  get height() {
    return this.main.clientHeight;
  }
  /**
   * @param {number | string} value
   */
  set height(value) {
    if (typeof value == "number") {
      value = `${value}px`;
    }
    this.main.style.height = value;
  }

  /**
   * @type {HTMLHeadingElement}
   */
  headerElement = null;

  get headerText() {
    return this.headerElement.innerText;
  }
  set headerText(value) {
    this.headerElement.innerText = value;
  }

  close() {
    this.main.parentElement.removeChild(this.main);
  }
}

class DropFile {
  constructor() {

  }
}

exports.Settings = Settings;
exports.HTMLSongElement = HTMLSongElement;
exports.Song = Song;
exports.SongManager = SongManager;
exports.Storyboard = Storyboard;
exports.ToxenScriptManager = ToxenScriptManager;
exports.Debug = Debug;
exports.Prompt = Prompt;