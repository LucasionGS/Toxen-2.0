// FS takes files relative to the root "Resources" directory.
// It is NOT relative to the HTML file or script file.
const fs = require("fs");
const { Popup } = require("ionlib");
// const fetch = require("node-fetch").default;
const hue = require("node-hue-api").v3;
/**
 * type {import("node-hue-api")}
 */
let hueApi = null;
const Imd = require("./ionMarkDown").Imd;
const electron = require("electron");
const { remote, shell, ipcRenderer } = electron;
const { Menu, dialog, Notification } = remote;
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const ytdl = require("ytdl-core");
const ion = require("ionodelib");
const Zip = require("adm-zip");
const browserWindow = remote.getCurrentWindow();

var updatePlatform;
switch (process.platform) {
  case "win32":
    updatePlatform = "win";
    break;
  case "linux":
    updatePlatform = "linux";
    break;
  case "darwin":
    updatePlatform = "mac";
    break;

  default:
    updatePlatform = null;
    break;
}

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
        if (!fs.existsSync(path.dirname(fileLocation))) {
          fs.mkdirSync(path.dirname(fileLocation), { recursive: true });
        }
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

  async saveToFile(fileLocation = "./data/settings.json") {
    if (!fs.existsSync(path.dirname(fileLocation))) {
      fs.mkdirSync(path.dirname(fileLocation), { recursive: true });
    } 
    fs.writeFileSync(fileLocation, JSON.stringify(this, null, 2));
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
    this.saveToFile();
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
  backgroundDim = 50;
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
  songFolderList = [];
  /**
   * Intensity of the audio visualizer.
   * @type {number}
   */
  visualizerIntensity = 15;
  /**
   * Direction of the audio visualizer.
   * @type {number}
   */
  visualizerDirection = 0;
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
  /**
   * Visualizer Style ID
   */
  visualizerStyle = 3;
  /**
   * If the visualizer should freeze while the song is paused.
   */
  freezeVisualizer = false;
  /**
   * Which style the songs should be grouped in.
   */
  songGrouping = 0;
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
   * `0` Doesn't show thumbnails.
   * `1` Shows backgrounds as a thumbnail for the songs with a custom background.  
   * `2` Shows backgrounds as a background on the music panel for the songs with a custom background.  
   */
  thumbnails = 1;
  /**
   * Display the details of the current song playing in Discord Presence.
   * Details include Artist, Title, and current time.
   */
  discordPresenceShowDetails = true;
  /**
   * Hue Bridge: IP Address / Host
   * @type {string}
   */
  hueBridgeIp = null;
  /**
   * Hue Bridge: Username
   * @type {string}
   */
  hueBridgeUser = null;
  /**
   * Hue Bridge: Client Key
   * @type {string}
   */
  hueBridgeClientKey = null;
}

/**
 * Custom HTML Song Element that extends div.  
 * Every `musicitem` is this.
 */
class HTMLSongElement extends HTMLDivElement {
  /**
   * @type {Song}
   */
  song;
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
      menus.songMenu.items.forEach(i => {
        i.songObject = self;
      });
      menus.songMenu.popup({
        "x": e.clientX,
        "y": e.clientY
      });
    });
  }

  refreshElement() {
    this.element.children[0].innerHTML = (() => {
      switch (Settings.current.songGrouping) {
        case 1:
          return "<p>" + Imd.MarkDownToHTML(this.details.title) + "</p>";
          
        default:
          return "<p>" + Imd.MarkDownToHTML(this.details.artist + " - " + this.details.title) + "</p>";
      }
    })();
    this.element.children[0].style.position = "relative";
    if (this.background != null && Settings.current.thumbnails == 1) {
      this.element.style.background = "";
      this.element.children[0].children[0].style.width = "calc(100% - 96px)";
      const thumbnail = document.createElement("div");
      const img = document.createElement("img");
      thumbnail.appendChild(img).src = this.getFullPath("background");
      thumbnail.style.overflow = "hidden";
      thumbnail.style.width = "96px";
      // thumbnail.style.height = "100%";
      thumbnail.style.position = "absolute";
      thumbnail.style.right = "0";
      thumbnail.style.top = "0";
      img.setAttribute("loading", "lazy");
      this.element.children[0].appendChild(thumbnail);
      img.style.maxWidth = "100%";
      // thumbnail.addEventListener("load", () => {
      //   thumbnail.style.height = this.element.offsetHeight+"px";
      //   img.style.maxHeight = this.element.offsetHeight+"px";
      // }, 10);
    }
    if (this.background != null && Settings.current.thumbnails == 2) {
      let _path = this.getFullPath("background");
      if (process.platform == "win32") {
        _path = _path.replace(/\\+/g, "/");
      }
      // console.log(`url("${_path}")`);
      
      // this.element.style.backgroundImage = `url("${_path}")`;
      this.element.style.background = "linear-gradient(to right,  rgba(0, 0, 0, 1), rgba(0, 0, 0, 0) ), "
      +`url("${_path}"),` + "center center / cover no-repeat fixed";
    }
    else {
      this.element.style.background = "";
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
     * Album this song belongs to, if any.
     * @type {string}
     */
    album: null,

    /**
     * Source for this song. If it's from a game, series, or sites, state them here.
     * @type {string}
     */
    source: null,

    /**
     * Source link for this song. If you got this from somewhere online originally, you can link it here.
     * @type {string}
     */
    sourceLink: null,
    
    /**
     * Main language for this song.
     * @type {string}
     */
    language: null,
    /**
     * List of tags to better help find this song in searches.
     * @type {string[]}
     */
    tags: [],

    // Unmodifiable
    /**
     * The length of the song in seconds.  
     * **Note:** This value is automatically updated if it doesn't match the song's duration.
     */
    songLength: 0,
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
    this.element.song = this;
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
    this.focus();

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

            // if (ffmpeg) {
              
            // }

            const format = fp.split(".")[fp.split(".").length - 1];
            /**
             * @type {ffmpeg.FfmpegCommand}
             */
            let src;
            try {
              src = new ffmpeg(fp);
            } catch (error) {
              console.error(error);
              return;
            }
            let newName = fp.substring(0, fp.length - format.length) + "mp3";
            console.log("Converting the file...");
            let p = new Prompt("First Time Convertion", "This song is in a different format than supported, "
            + "so it is being converted to a usable format.<br>Please allow a moment until it has been converted...");
            p.addButtons("Close", null, true);
            src.toFormat("mp3").saveToFile(newName).on("end", () => {
              console.log("Finished!");
              SongManager.player.src = newName;
              p.close();
              new Prompt("Convertion Completed.");
              this.play();
            })
            .on("error", (err) => {
              console.error(err);
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
      ToxenScriptManager.reloadCurrentScript();
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

  displayInfo() {
    let self = this;
    /**
     * @type {HTMLDivElement}
     */
    let panel = document.querySelector("div#songinfo");

    /**
     * 
     * @param {string} name 
     * @param {string} title 
     * @param {string} detailsItemName 
     * @param {string} isArraySeparatedBy If this is set, the value is an array.
     */
    function makeElement(name, title, detailsItemName, isArraySeparatedBy = null) {
      // any
      /**
       * @type {HTMLParagraphElement}
       */
      let p = panel.querySelector('p[name="'+name+'"]');
      /**
       * @type {HTMLInputElement}
       */
      let input = panel.querySelector('input[name="'+name+'"]');
      if (self.details[detailsItemName] == null) {
        if (typeof isArraySeparatedBy === "string") {
          self.details[detailsItemName] = [];
        }
        else {
          self.details[detailsItemName] = "";
        }
      }
      input.value = self.details[detailsItemName];
      if (typeof isArraySeparatedBy === "string") {
        p.innerHTML = `${title}: `.bold() + Imd.MarkDownToHTML(self.details[detailsItemName].join(", "));
        input.onsearch = function(e) {
          e.preventDefault();
          self.details[detailsItemName] = input.value.split(`${isArraySeparatedBy}`).map(v => v = v.trim());
          self.saveDetails();
          input.blur();
          p.innerHTML = "Tags: ".bold() + self.details[detailsItemName].join(`${isArraySeparatedBy} `);
          input.value = self.details[detailsItemName].join(`${isArraySeparatedBy} `);
          self.refreshElement();
        }
      }
      else {
        p.innerHTML = `${title}: `.bold() + Imd.MarkDownToHTML(self.details[detailsItemName]);
        input.onsearch = function(e) {
          e.preventDefault();
          self.details[detailsItemName] = input.value;
          self.saveDetails();
          input.blur();
          p.innerHTML = `${title}: `.bold() + Imd.MarkDownToHTML(input.value);
          self.refreshElement();
        }
      }
    }
    
    makeElement("title", "Title", "title");
    makeElement("artist", "Artist", "artist");
    makeElement("album", "Album", "album");
    makeElement("source", "Source", "source");
    makeElement("sourceLink", "Source Link", "sourceLink");
    makeElement("language", "Language", "language");
    makeElement("tags", "Tags", "tags", ",");
  }

  saveDetails() {
    try {
      fs.writeFileSync(this.getFullPath("path") + "/details.json", JSON.stringify(this.details, null, 2));
      SongManager.saveToFile();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  setBackground() {
    // Not yet implemented
    throw "Not yet implemented";
  }

  /**
   * Get the parent group if it belongs to one. Returns `null` if not grouped.
   */
  getGroup() {
    /**
     * @type {HTMLSongGroupElement}
     */
    const p = this.element.parentElement;
    return p != null && p.classList.contains("songgroup") ? p.songGroup : null;
  }

  /**
   * Scroll to the element and reveal it.
   */
  focus() {
    let cpp = this.getGroup();
    if (cpp != null) {
      cpp.collapsed = false;
    }
    this.element.scrollIntoViewIfNeeded();
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

  /**
   * Refresh the list with optional sorting.
   * @param {Settings["sortBy"]} sortBy Optional Sorting
   */
  static refreshList(sortBy = null) {
    if (typeof sortBy == "string") {
      Settings.current.sortBy = sortBy;
    }
    if (this.songListElement) {
      /**
       * @param {Song} a 
       * @param {Song} b 
       */
      let sortFunc = (a, b) => { return true; };
      switch (Settings.current.sortBy) {
        case "title":
          sortFunc = (a, b) => {
            if (a.details.title.toLowerCase() > b.details.title.toLowerCase()) {
              return 1;
            }
            if (a.details.title.toLowerCase() < b.details.title.toLowerCase()) {
              return -1;
            }
            return 0;
          };
          break;
          case "artist": // Fall-through
          default:
            sortFunc = (a, b) => {
              if (a.details.artist.toLowerCase() > b.details.artist.toLowerCase()) {
                return 1;
              }
              if (a.details.artist.toLowerCase() < b.details.artist.toLowerCase()) {
                return -1;
              }
              return 0;
            };
          break;
      }
      /**
       * @param {Song} a 
       * @param {Song} b 
       */
      function _sort(a, b) {
        // Make order reversable
        return sortFunc(a, b);
      }
      SongManager.songList.sort(_sort);

      let nList = SongManager.songList;
      let opened = SongGroup.getAllGroupNames(false);
      opened = [...new Set(opened)];
      SongManager.songListElement.innerHTML = "";
      let noGrouping = false;
      // Group Songs
      if (typeof Settings.current.songGrouping == "number" && Settings.current.songGrouping > 0 && Settings.current.songGrouping < 5) {
        /**
         * @type {{[key: string]: Song[]}}
         */
        let groups = {};
        /**
         * @param {string} name 
         * @param {Song} song 
         */
        function addToGroup(name, song, missingText = "!Missing Group!") {
          if (name == null || (typeof name == "string" && name.trim() == "")) {
            name = missingText;
          }
          if (groups.hasOwnProperty(name)) {
            groups[name].push(song);
          }
          else {
            groups[name] = [song];
          }
        }
        switch (Settings.current.songGrouping) {
          case 1:
            SongManager.songList.forEach(s => {
              addToGroup(s.details.artist, s, "!Missing artist!");
            });
            break;
          case 2:
            SongManager.songList.forEach(s => {
              addToGroup(s.details.album, s, "!Missing album!");
            });
            break;
          case 3:
            SongManager.songList.forEach(s => {
              addToGroup(s.details.source, s, "!Missing source!");
            });
            break;
          case 4:
            SongManager.songList.forEach(s => {
              addToGroup(s.details.language, s, "!Missing Language!");
            });
            break;
        
          default:
            noGrouping = true;
            break;
        }
        if (noGrouping == false) {          
          for (const key in groups) {
            if (groups.hasOwnProperty(key)) {
              const sg = new SongGroup(key);
              sg.songList = groups[key];
              if (opened.includes(sg.name)) {
                sg.collapsed = false;
              }
              else {
                sg.collapsed = true;
              }
              sg.refreshList();
            }
          }
        }
      }
      // Don't Group Songs
      else {
        noGrouping = true;
      }
      if (noGrouping == true) {
        for (let i = 0; i < nList.length; i++) {
          const song = nList[i];
          song.refreshElement();
          SongManager.songListElement.appendChild(song.element);
        }
      }

      SongManager.search();
    }
    else {
      console.error("No div element applied to SongManager.songListElement",
      "SongManager.songListElement is " + typeof SongManager.songListElement);
    }
  }
  /**
   * @param {string} search Search for a string
   */
  static search(search = document.getElementById("search").value) {
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

    /**
     * Escape the required characters in a RegExp string
     * @param {string} str 
     */
    function escapeRegex(str) {
      return str.replace(/[\[\\\^\$\.\|\?\*\+\(\)\]]/g, "\\$&");
    }

    let nSearch = [];
    this.songList.forEach(s => {
      let searchTags = [
        s.details.artist,
        s.details.title,
        s.details.album,
        s.details.source,
        s.details.language,
        // s.isVideo ? "$video" : "$audio",
        // s.background == null ? "$!background" : "$background",
        // s.txnScript == null ? "$!storyboard" : "$storyboard",
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

    if (Settings.current.songGrouping > 0) {
      let gs = SongGroup.getAllGroups();
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        let len = g.songList.length;
        let hiddenElements = 0;
        for (let i2 = 0; i2 < g.songList.length; i2++) {
          const song = g.songList[i2];
          if (song.element.hidden == true) {
            hiddenElements++;
          }
        }
        g.element.hidden = (len == hiddenElements);
        if (search != "" && len - 1 == hiddenElements) {
          g.collapsed = false;
        }
      }
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
      for (let i = 0; i < SongManager.songList.length; i++) {
        const song = SongManager.songList[i];
        if ("file:/" + song.getFullPath("songPath").replace(/\\+|\/\/+/g, "/") == decodeURIComponent(SongManager.player.src.replace(/\\+|\/\/+/g, "/"))) {
          song.element.toggleAttribute("playing", true);
          song.focus();
          break;
        }
      }
      SongManager.refreshList();
      SongManager.saveToFile();
      return songs;
    }
  }

  // /**
  //  * @param {Settings["sortBy"]} sortName
  //  */
  // static sortBy(sortName) {
  //   SongManager.songList.sort((a, b) => {
  //     if (sortName == "artist") {
  //       // TODO: Fix
  //     }
  //   });
  //   SongManager.refreshList();
  // }

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
      element.song.element = element;
    }
  }

  /**
   * @param {number} id Song ID
   */
  static getSong(id) {
    return SongManager.songList.find((s, i) => s.songId == id);
  }

  static getCurrentlyPlayingSong() {
    return SongManager.getSong(+SongManager.player.getAttribute("songid"));
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
    let song = SongManager.playableSongs[Math.floor(Math.random() * SongManager.playableSongs.length)];
    // while (song.songId === SongManager.getCurrentlyPlayingSong().songId && SongManager.songList.length > 1) {
    //   song = SongManager.playableSongs[Math.floor(Math.random() * SongManager.playableSongs.length)];
    // }
    song.play();
  }

  static playNext() {
    const song = SongManager.getCurrentlyPlayingSong();
    let id = song.songId;
    if (Settings.current.repeat) {
      SongManager.player.currentTime = 0;
      SongManager.player.play();
      setTimeout(() => {
        browserWindow.webContents.send("updatediscordpresence");
      }, 10);
    }
    else if (Settings.current.shuffle) {
      SongManager.playRandom();
    }
    else {
      // if (!song) {
      //   // SongManager.playRandom();
      //   return;
      // }
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
    let p = new Prompt("Add song");
    p.addContent("Add a song to your library");
    let youtubeBtn = document.createElement("button");
    youtubeBtn.innerText = "Download YouTube Audio";
    youtubeBtn.onclick = function() {
      p.close();
      SongManager.addSongYouTube();
    };
    let close = document.createElement("button");
    close.innerText = "Close";
    close.classList.add("color-red");
    close.onclick = function() {
      p.close();
    };
    p.addButtons([youtubeBtn, close], "fancybutton");
  }

  static addSongYouTube() {
    /**
     * @param {string} str 
     */
    function isValid(str) {
      // var orgStr = str;
      let reg = /[\\\/\:\*\?\"\<\>\|]/g;
      if (reg.test(str)) {
        str = str.replace(reg, "");
      }
      return str;
    }

    let p = new Prompt("Download YouTube Audio");
    let ytInput = document.createElement("input");
    ytInput.classList.add("fancyinput");
    ytInput.style.display = "block";
    ytInput.style.width = "90%";
    ytInput.style.margin = "auto";
    ytInput.placeholder = "YouTube URL*";

    let ytInputArtist = document.createElement("input");
    ytInputArtist.classList.add("fancyinput");
    ytInputArtist.style.display = "block";
    ytInputArtist.style.width = "90%";
    ytInputArtist.style.margin = "auto";
    ytInputArtist.placeholder = "Artist";
    
    let ytInputTitle = document.createElement("input");
    ytInputTitle.classList.add("fancyinput");
    ytInputTitle.style.display = "block";
    ytInputTitle.style.width = "90%";
    ytInputTitle.style.margin = "auto";
    ytInputTitle.placeholder = "Title*";
    
    let ytProgressBar = document.createElement("progress");
    ytProgressBar.classList.add("fancyprogress");
    ytProgressBar.style.width = "93%";
    ytProgressBar.style.display = "block";
    ytProgressBar.style.margin = "auto";

    p.addContent(ytInput);
    p.addContent(ytInputArtist);
    p.addContent(ytInputTitle);
    p.addContent(ytProgressBar);
    let downloadYouTube = document.createElement("button");
    downloadYouTube.innerText = "Download";
    downloadYouTube.classList.add("color-green");
    downloadYouTube.onclick = async function() {
      // Start Downloading...
      p.headerText = "Downloading...";

      ytInput.disabled = true;
      ytInputArtist.disabled = true;
      ytInputTitle.disabled = true;
      downloadYouTube.disabled = true;

      let url = ytInput.value.trim();
      let artist = ytInputArtist.value.trim();
      let title = ytInputTitle.value.trim();
      let error = false;
      if (url == "" || !ytdl.validateURL(url)) {
        dialog.showErrorBox("Invalid URL", "Please enter a valid YouTube URL");
        ytInput.disabled = false;
        ytInputArtist.disabled = false;
        ytInputTitle.disabled = false;
        downloadYouTube.disabled = false;
        p.headerText = "Download YouTube Audio";
        ytInput.focus();
        return;
      }
      if (title == "") {
        dialog.showErrorBox("Invalid Title", "Please enter a title for the audio");
        ytInput.disabled = false;
        ytInputArtist.disabled = false;
        ytInputTitle.disabled = false;
        downloadYouTube.disabled = false;
        p.headerText = "Download YouTube Audio";
        ytInputTitle.focus();
        return;
      }
      let audio = ytdl(url, {
        "filter": "audioonly"
      });

      const song = new Song();
      song.songId = SongManager.songList.length;
      song.path = isValid(artist) == "" ? isValid(title) : isValid(artist) + " - " + isValid(title);
      song.songPath = song.getFullPath("path") + "/audio.mp3";
      song.background = song.getFullPath("path") + "/maxresdefault.jpg";
      song.details.artist = artist === "" ? null : artist;
      song.details.title = title;
      song.details.source = "YouTube";
      song.details.sourceLink = url;
      
      let surfix = 0;
      while (fs.existsSync(song.getFullPath("path"))) {
        let len = surfix.toString().length + 3;
        if (surfix == 0) {
          song.path += ` (${surfix.toString()})`;
        }
        else {
          song.path = song.path.substring(0, song.path.length - len) + ` (${surfix.toString()})`;
        }
        surfix++;
      }

      fs.mkdirSync(song.getFullPath("path"));
      if (error || audio == null) {
        dialog.showErrorBox("Invalid URL", "Please enter a valid YouTube URL");
        ytInput.disabled = false;
        ytInputArtist.disabled = false;
        ytInputTitle.disabled = false;
        downloadYouTube.disabled = false;
        ytInput.focus();
        return;
      }
      let dl = new ion.Download(
        "https://i.ytimg.com/vi/" + ytdl.getURLVideoID(url) + "/maxresdefault.jpg",
        song.getFullPath("background")
      );
      dl.start(); // Download BG image
      let ws = new fs.WriteStream(song.getFullPath("songPath"));
      new Notification({
        "title": song.path + " started downloading..."
      }).show();

      let cancelledByUser = false;

      audio.pipe(ws)
      .on("finish", () => {
        if (cancelledByUser == true) {
          return;
        }
        console.log("Finshed");
        SongManager.songList.push(song);
        SongManager.refreshList();
        song.play();
        song.saveDetails();
        p.close();
        ws.close();
        new Notification({
          "title": song.path + " finished downloading."
        }).show();
      })
      .on("error", (err) => {
        ws.close();
        console.error(err);
        dialog.showErrorBox("Unexpected Error", err.message);
        ytInput.disabled = false;
        ytInputArtist.disabled = false;
        ytInputTitle.disabled = false;
        downloadYouTube.disabled = false;
        p.headerText = "Download YouTube Audio";
      })

      audio.on("progress", (chunk, downloaded, total) => {
        const percent = downloaded / total;
        // console.log(`${(percent * 100).toFixed(2)}% downloaded `);
        // let percentText = (percent * 100).toFixed(2);
        ytProgressBar.max = total;
        ytProgressBar.value = downloaded;
      });

      audio.on("error", (err) => {
        ws.close();
        console.error(err);
        dialog.showErrorBox("Unexpected Error", err.message);
        ytInput.disabled = false;
        ytInputArtist.disabled = false;
        ytInputTitle.disabled = false;
        downloadYouTube.disabled = false;
        p.headerText = "Download YouTube Audio";
      });

      ytProgressBar.min = 0;
      
      if (p.buttonsElement.children.length < 3) {
        let cancel = document.createElement("button");
        cancel.innerText = "Cancel Download";
        cancel.classList.add("color-red");
        cancel.onclick = function() {
          cancelledByUser = true;
          audio.destroy("Cancelled by user.");
          ws.close();
          ytInput.disabled = false;
          ytInputArtist.disabled = false;
          ytInputTitle.disabled = false;
          downloadYouTube.disabled = false;
          p.headerText = "Download YouTube Audio";
          p.buttonsElement.removeChild(p.buttonsElement.children[2]);
          setTimeout(() => {
            fs.rmdirSync(song.getFullPath("path"), { recursive: true });
          }, 10);
        };
        p.addButtons(cancel, "fancybutton");
      }
    };
    let close = document.createElement("button");
    close.innerText = "Close";
    close.classList.add("color-red");
    close.onclick = function() {
      p.close();
    };
    p.addButtons([downloadYouTube, close], "fancybutton");
  }

  static selectBackground(song = SongManager.getCurrentlyPlayingSong()) {
    dialog.showOpenDialog(remote.getCurrentWindow(), {
      "buttonLabel": "Select Image",
      "filters": [
        {
          "extensions": [
            "jpg",
            "jpeg",
            "png"
          ]
        }
      ]
    })
    .then(pathObject => {
      // TODO: Drag and Drop backgrounds directly
      if (pathObject.filePaths.length == 0) {
        return;
      }
      if (song.background) {
        fs.unlinkSync(song.getFullPath("background"));
      }
      let newPath = song.getFullPath("path") + "/" + pathObject.filePaths[0].replace(/\\+/g, "/").split("/").pop();
      fs.copyFileSync(pathObject.filePaths[0], newPath);
      song.background = song.path + "/" + path.relative(song.getFullPath("path"), newPath);
      Storyboard.setBackground(song.getFullPath("background"));
      SongManager.saveToFile();
    });
  }

  /**
   * This should be set bby the client.
   * @param {Song} song 
   */
  static onplay = function(song) { };
}

/**
 * Custom HTML Song Container Element that extends div.  
 * Every `songContainer` is this.
 */
class HTMLSongGroupElement extends HTMLDivElement {
  /**
   * @type {SongGroup}
   */
  songGroup;
}

class SongGroup {
  /**
   * @type {SongGroup[]}
   */
  static songGroups = [];

  /**
   * @param {string} name Name for this group container.
   */
  constructor(name) {
    this.name = name;
    this.element = document.createElement("div");
    this.element.songGroup = this;
    this.element.classList.add("songgroup");
    this.element.toggleAttribute("collapsed", true);
    this.element.addEventListener("click", (e) => {
      /**
       * @type {HTMLElement}
       */
      let t = e.target;
      if (t && t.classList.contains("songgrouphead")) {
        this.collapse();
      }
    });
  }
  /**
   * @type {Song[]}
   */
  songList = [];

  refreshList() {
    this.element.innerHTML = "";
    let inner = document.createElement("div");
    inner.classList.add("songgrouphead");
    inner.innerHTML = (() => {
      let p = document.createElement("p");
      p.classList.add("songgrouphead");
      p.innerHTML = "►" + Imd.MarkDownToHTML(this.name);
      return p.outerHTML;
    })();
    this.element.appendChild(inner);
    SongManager.songListElement.appendChild(this.element);

    for (let i = 0; i < this.songList.length; i++) {
      const song = this.songList[i];
      song.refreshElement();
      this.element.appendChild(song.element);
    }
  }

  /**
   * @type {string}
   */
  name = null;
  /**
   * @type {HTMLSongGroupElement}
   */
  element = null;
  set collapsed(value) {
    let res = this.element.toggleAttribute("collapsed", value);
    try {
      if (res) {
        this.element.firstChild.firstChild.innerHTML = "►" + Imd.MarkDownToHTML(this.name);
      }
      else {
        this.element.firstChild.firstChild.innerHTML = "▼" + Imd.MarkDownToHTML(this.name);
      }
    } catch {}
  } 
  get collapsed() {
    return this.element.hasAttribute("collapsed");
  }
  /**
   * Toggle collapse on this container.
   */
  collapse() {
    this.collapsed = !this.collapsed;
  }

  /**
   * @param {boolean} collapsedCondition Omit to ignore and return all
   */
  static getAllGroups(collapsedCondition = null) {
    let _a = [...document.querySelectorAll(".songgroup")].map((e) => {
      /**
       * @type {HTMLSongGroupElement}
       */
      const item = e;
      if (typeof collapsedCondition == "boolean") {
        if ((collapsedCondition && item.hasAttribute("collapsed")) || (!collapsedCondition && !item.hasAttribute("collapsed"))) {
          return item.songGroup;
        }
      }
      else {
        return item.songGroup;
      }
    });
    _a = [...new Set(_a)];
    for (let i = 0; i < _a.length; i++) {
      const _b = _a[i];
      if (typeof _b == "undefined") {
        _a.splice(i--, 1);
      }
    }
    return _a;
  }

  /**
   * @param {boolean} collapsedCondition Omit to ignore and return all
   */
  static getAllGroupNames(collapsedCondition = null) {
    let _a = [...document.querySelectorAll(".songgroup")].map((e) => {
      /**
       * @type {HTMLSongGroupElement}
       */
      const item = e;
      if (typeof collapsedCondition == "boolean") {
        if ((collapsedCondition && item.hasAttribute("collapsed")) || (!collapsedCondition && !item.hasAttribute("collapsed"))) {
          return item.songGroup.name;
        }
      }
      else {
        return item.songGroup.name;
      }
    });
    _a = [...new Set(_a)];
    for (let i = 0; i < _a.length; i++) {
      const _b = _a[i];
      if (typeof _b == "undefined") {
        _a.splice(i--, 1);
      }
    }
    return _a;
  }
}

const menus = {
  "songMenu": Menu.buildFromTemplate(
    [
      {
        label: "Display info",
        click: (menuItem) => {
          /**
           * @type {Song}
           */
          const song = menuItem.songObject;
          if (song instanceof Song) {
            song.displayInfo();
            document.getElementById("songinfo").scrollIntoView();
          }
        }
      },
      {
        label: "Open song folder",
        click: (menuItem) => {
          /**
           * @type {Song}
           */
          const song = menuItem.songObject;
          if (song instanceof Song) {
            let path = song.getFullPath("path");
            if (!shell.openItem(path)) {
              console.error("Unable to open directory", path);
            }
          }
        }
      },
      {
        label: "Edit Storyboard Script",
        click: (menuItem) => {
          /**
           * @type {Song}
           */
          const song = menuItem.songObject;
          if (song instanceof Song) {
            if (song.txnScript != null && fs.existsSync(song.getFullPath("txnScript"))) {
              
            }
            ScriptEditor.open(song);
            browserWindow.webContents.send("updatediscordpresence");
          }
        }
      },
      {
        type: "separator"
      },
      {
        label: "Delete song",
        click: (menuItem) => {
          /**
           * @type {Song}
           */
          const song = menuItem.songObject;
          if (song instanceof Song) {
            let path = song.getFullPath("path");
            let ans = dialog.showMessageBoxSync(remote.getCurrentWindow(),
            {
              "buttons": [
                "Delete",
                "Cancel"
              ],
              "message": "Delete the song:\n" + `"${song.details.artist} - ${song.details.title}"?`,
              "defaultId": 1,
              "noLink": true
            });

            if (ans !== 0) {
              return;
            }
            while(SongManager.getCurrentlyPlayingSong().songId === song.songId && SongManager.songList.length > 1) {
              SongManager.playNext();
            }
            SongManager.songList = SongManager.songList.filter(s => s.songId !== song.songId);
            fs.rmdirSync(path, {
              "recursive": true
            });
            SongManager.saveToFile();
            SongManager.refreshList();
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

  static visualizerIntensity = 15;
  static visualizerStyle = 0;
  static visualizerDirection = 0;
  /**
   * Fade into a RGB color.
   * @param {number} red 
   * @param {number} green 
   * @param {number} blue 
   */
  static rgb(red = Storyboard.red, green = Storyboard.green, blue = Storyboard.blue) {
    if (typeof red != "number") {
      Storyboard.red;
    }
    if (typeof green != "number") {
      Storyboard.green;
    }
    if (typeof blue != "number") {
      Storyboard.blue;
    }

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
    Storyboard.visualizerIntensity = value;
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
      this.width -= Math.max(Math.min(this.width, 1), (this.width / Storyboard.visualizerIntensity) * 2);
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
var testPulse;
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
    ToxenScriptManager.variables = {};
    for (const key in ToxenScriptManager.defaultVariables) {
      if (ToxenScriptManager.defaultVariables.hasOwnProperty(key)) {
        let v = ToxenScriptManager.defaultVariables[key];
        if (typeof v == "function") {
          v = v();
        }
        ToxenScriptManager.variables[key] = v;
      }
    }

    // Resetting to the default values on reset.
    Storyboard.visualizerDirection = 0;
    Storyboard.visualizerStyle = Settings.current.visualizerStyle;
    Storyboard.setIntensity(Settings.current.visualizerIntensity);
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
   * @type {{[$name: string]: string}}
   */
  static variables = {
    
  }

  /**
   * Default variable set.
   * @type {{[$name: string]: string}}
   */
  static defaultVariables = {
    "$end": function() {
      try {
        let s = SongManager.getCurrentlyPlayingSong();
        if (s.details.songLength > 0) {
          return s.details.songLength.toString();
        }
        return "100000";
      } catch (error) {
        return "100000";
      }
    }
  }

  /**
   * Apply the variables to the text.
   * @param {string} text 
   */
  static applyVariables(text) {
    for (const key in ToxenScriptManager.variables) {
      if (ToxenScriptManager.variables.hasOwnProperty(key)) {
        const v = ToxenScriptManager.variables[key];
        let reg = new RegExp("\\" + key + "\\b", "g");
        text = text.replace(reg, v);
      }
    }
    return text;
  }

  /**
   * Parses ToxenScript files for storyboard effects.
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
            new Prompt("Parsing error", ["Failed parsing script:", "\"" + scriptFile + "\"", "Error at line " + (i + 1), fb])
            .addButtons("Close", null, true);
          }, 100);
          throw "Failed parsing script. Error at line " + (i + 1) + "\n" + fb;
        }
        if (fb.success == false) {
          setTimeout(() => {
            new Prompt("Parsing error", ["Failed parsing script:", "\"" + scriptFile + "\"", "Error at line " + (i + 1)])
            .addButtons("Close", null, true);
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
        
        const checkVariable = /(?<=^\s*)(\$\w+)\s*=>?\s*"(.*?[^\\])"/g;
        if (checkVariable.test(line)) {
          line.replace(checkVariable, function(item, $1, $2) {
            $2 = $2.replace(/\\"/g, "\"");
            $2 = ToxenScriptManager.applyVariables($2)
            ToxenScriptManager.variables[$1] = $2
            return "";
          });
          return;
        }
        
        const checkRawVariable = /(?<=^\s*)(@\w+)\s*=>?\s*(.*)/g;
        if (checkRawVariable.test(line)) {
          line.replace(checkRawVariable, function(item, $1, $2) {
            // $2 = $2.replace(/\\"/g, "\"");
            $2 = ToxenScriptManager.applyVariables($2)
            ToxenScriptManager.variables[$1] = $2
            return "";
          });
          return;
        }

        // Replace variables
        line = ToxenScriptManager.applyVariables(line);

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

        // incompatible compatible with "once"
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
          maxPerSecond = 0.25;
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

  static getEventNames() {
    let list = [];
    for (const key in ToxenScriptManager.eventFunctions) {
      if (ToxenScriptManager.eventFunctions.hasOwnProperty(key)) {
        list.push(key);
      }
    }
    return list;
  }

  /**
   * Function Types for ToxenScript
   * @type {{[eventName: string]: (args: string[])}}
   */
  static eventFunctions = {
    // TODO: Implement logging function
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
      for (let i = 0; i < 3; i++) {
        if (isNaN(args[i])) args[i] = 0;
      }
      Storyboard.rgb(+args[0], +args[1], +args[2]);
    },
    /**
     * Change the intensity of the visualizer
     * @param {[string | number, string | number, string | number]} args Arguments
     */
    visualizerintensity: function (args) {
      if (args[1] && args[1].toLowerCase() == "smooth") {
        if (+args[0] < Storyboard.visualizerIntensity) {
          Storyboard.visualizerIntensity -= 0.1;
        }
        else if (+args[0] > Storyboard.visualizerIntensity) {
          Storyboard.visualizerIntensity += 0.1;
        }

        if (Math.round(+args[0] - Storyboard.visualizerIntensity) == 0) {
          Storyboard.visualizerIntensity = +args[0];
        }
      }
      else {
        Storyboard.setIntensity(+args[0]);
      }
    },
    /**
     * Change the style of the visualizer
     * @param {[string | number]} args Arguments
     */
    visualizerstyle: function ([style]) {
      style = style + "";
      switch (style.toLowerCase()) {
        case "0":
        case "bottom":
          Storyboard.visualizerStyle = 0;
          break;

        case "1":
        case "top":
          Storyboard.visualizerStyle = 1;
          break;

        case "2":
        case "top and bottom identical":
        case "identical":
          Storyboard.visualizerStyle = 2;
          break;

        case "3":
        case "center":
          Storyboard.visualizerStyle = 3;
          break;

        case "4":
        case "top and bottom alternating":
        case "alternating":
          Storyboard.visualizerStyle = 4;
          break;
      }
    },
    /**
     * Change the direction of the visualizer. (Default is `right`)
     * @param {["left" | "right"]} args Arguments
     */
    visualizerdirection: function ([direction]) {
      switch (direction) {
        case "right":
          Storyboard.visualizerDirection = 0;
          break;
        case "left":
          Storyboard.visualizerDirection = 1;
          break;
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
      for (let i = 1; i < 4; i++) {
        if (isNaN(args[i])) args[i] = 0;
      }
      Storyboard.rgb(+args[1], +args[2], +args[3]);
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
    pulse: function ([intensity]) {
      if (!SongManager.player.paused) {
        testPulse.pulse(Storyboard.visualizerIntensity * 32 * intensity);
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
     * Connect to a hue bridge.
     */
    ":hueconnect": async function([type, ip, user, clientKey]) {
      var ipAddress = "";
      var hueUser = {
        "username": "",
        "clientKey": ""
      };
      if (type == "local") {
        ipAddress = Settings.current.hueBridgeIp;
        hueUser = {
          "username": Settings.current.hueBridgeUser,
          "clientKey": Settings.current.hueBridgeClientKey
        };
      }
      else if (type == "login") {
        ipAddress = ip;
        hueUser = {
          "username": user,
          "clientKey": clientKey
        };
      }
      if (ipAddress && hueUser && hueUser.username && hueUser.clientKey) {
        hueApi = await hue.api.createInsecureLocal(ipAddress).connect(hueUser.username, hueUser.clientKey);
        console.log("Hue is now connected.");
        console.log(hueApi);
      }
      else {
        console.error("Missing arguments. Please make sure all the data is correct.\n" +
        `ipAddress: ${ipAddress}\nhueUser.username: ${hueUser.username}\nhueUser.clientkey: ${hueUser.clientKey}`)
      }
    },
    ":log": function() {
      console.log(...arguments);
    }
  }

  /**
   * Parse ToxenScript into HTML Highlighting
   * @param {string} code
   */
  static syntaxHighlightToxenScript(code, validEventNames = ToxenScriptManager.getEventNames()) {
    /**
     * @type {{[key: string]: {"expression": RegExp, "function": ($0: string, ...$n: string[]) => string}}}
     */
    const regex = {
      "value": {
        "expression": /"(.*?[^\\])"/g,
        "function": function($0, $1) {
          if (!/[^\s\d]/g.test($1)) {
            return `<span class=toxenscript_number>${$0}</span>`;
          }
          return `<span class=toxenscript_string>${$0}</span>`;
        }
      },
      "$var": {
        "expression": /\$\w+/g,
        "function": function($0, $1) {
          return `<span class=toxenscript_var>${$0}</span>`;
        }
      },
      "@rawvar": {
        "expression": /@\w+/g,
        "function": function($0, $1) {
          return `<span class=toxenscript_rawvar>${$0}</span>`;
        }
      },
      "limiter": {
        "expression": /(?<=\s*)(once|twice)/gm,
        "function": function($0) {
          return `<span class=toxenscript_limiter>${$0}</span>`;
        }
      },
      "event": {
        "expression": /((?<=\[.*\]\s*)[A-z]+)|:[A-z]+/g,
        "function": function($0) {
          for (let i = 0; i < validEventNames.length; i++) {
            const test = validEventNames[i];
            if (test.toLowerCase() == $0.toLowerCase()) {
              return `<span class=toxenscript_event>${$0}</span>`;
            }
          }
          return `<span class=toxenscript_eventinvalid>${$0}</span>`;
        }
      },
      "timing": {
        "expression": /(?<=\[\s*)((?:\d+:)*(?:\d+)(?:\.\d+)*)\s*(?:-\s*((?:\d+:)*(?:\d+)(?:\.\d+)*))*(?=\s*\])/g,
        "function": function($0, $1, $2) {
          if ($2 && ToxenScriptManager.timeStampToSeconds($1) > ToxenScriptManager.timeStampToSeconds($2)) {
            return `<span class=toxenscript_timinginvalid>${$0}</span>`;
          }
          return `<span class=toxenscript_timing>${$0}</span>`;
        }
      },
      "comment": {
        "expression": /#.*/g,
        "function": function($0) {
          let d = document.createElement("div");
          d.innerHTML = $0;
          $0 = d.innerText;
          return `<span class=toxenscript_comment>${$0}</span>`;
        }
      },
      "link": {
        "expression": /https?:\/\/(.*\.)*.*\.\S*/g,
        "function": function($0) {
          return `<a class=toxenscript_number title='${$0}' onclick='shell.openExternal(this.title)' style='pointer-events: all;'>${$0}</a>`;
        }
      },
    }

    for (const key in regex) {
      if (regex.hasOwnProperty(key)) {
        const obj = regex[key];
        code = code.replace(obj.expression, obj.function);
        // console.log("Checking " + obj.expression.source);
      }
    }

    return code;
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
  constructor(title = null, description = null) {
    this.main = document.createElement("div");
    this.headerElement = document.createElement("h1");
    this.contentElement = document.createElement("div");
    this.buttonsElement = document.createElement("div");

    if (title != null) this.headerElement.innerText = title;
    if (description != null) {
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
   * @param {string | HTMLButtonElement | (string | HTMLButtonElement)[]} button 
   * @param {string} btnClass 
   * @param {boolean} useDefault Attempts to use default buttons for certain strings
   * @returns {HTMLButtonElement | HTMLButtonElement[]}
   */
  addButtons(button, btnClass = null, useDefault = false) {
    let self = this;
    /**
     * Checks for a default button type.
     * @param {string} text 
     */
    function isDefault(text) {
      var _t;
      switch (text) {
        // Green buttons
        case "Done":
        case "Okay":
        case "OK":
          _t = document.createElement("button");
          _t.innerText = text;
          _t.classList.add("fancybutton", "color-green");
          return _t;
        // Red buttons
        case "Cancel":
          _t = document.createElement("button");
          _t.innerText = text;
          _t.classList.add("fancybutton", "color-red");
          return _t;

        // Close (Closes the prompt)
        case "Close":
          _t = document.createElement("button");
          _t.innerText = text;
          _t.classList.add("fancybutton", "color-red");
          _t.addEventListener("click", () => {
            self.close();
          });
          return _t;
      
        default:
          return text;
      }
    }
    if (Array.isArray(button)) {
      button.forEach((b, i) => {
        useDefault && typeof b == "string" ? b = isDefault(b) : null;
        if (typeof b == "string") {
          let _t = document.createElement("button");
          _t.innerText = b;
          b = _t;
        }
        if (btnClass != null && typeof btnClass == "string") {
          b.classList.add(...btnClass.split(" "));
        }
        this.buttonsElement.appendChild(b);
        button[i] = b;
      });
    }
    else {
      useDefault && typeof button == "string" ? button = isDefault(button) : null;
      if (typeof button == "string") {
        let _t = document.createElement("button");
        _t.innerText = button;
        button = _t;
      }
      if (btnClass != null && typeof btnClass == "string") {
        button.classList.add(...btnClass.split(" "));
      }
      this.buttonsElement.appendChild(button);
      
      return button;
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

  /**
   * Close the prompt.
   * @param {number} ms Optionally, close in `ms` milliseconds.
   */
  close(ms = 0) {
    if (typeof ms == "number" && ms > 0) {
      setTimeout(() => {
        if (typeof this.main == "object") {
          this.main.parentElement.removeChild(this.main);
        }
      }, ms);
    }
    else {
      if (typeof this.main == "object") {
        this.main.parentElement.removeChild(this.main);
      }
    }
    return this;
  }
}

class DropFile {
  constructor() {

  }
}

class Update {
  /**
   * 
   * @param {number} currentVersion Current version number.  
   * It is formatted as a 12 digit timestamp, starting from the year and onwards to the minute.  
   * `M` is Month and `m` is minute  
   * `YYYYMMDDHHmm`
   */
  static async check(currentVersion) {
    document.getElementById("currentversion").innerText = "vers. " + currentVersion + `${updatePlatform != null ? ` (${updatePlatform})` : ""}`;
    /**
     * @type {HTMLButtonElement}
     */
    let btn = document.getElementById("updatetoxen");
    if (updatePlatform == null) {
      btn.disabled = true;
      btn.innerText = "Undeterminable release";
      return;
    }
    btn.innerText = "Checking for updates...";
    let toxenGetLatestURL = `https://toxen.net/download/latest.php?platform=${updatePlatform}&get=version`;
    fetch(toxenGetLatestURL).then(res => res.text()).then(latest => {
      if (latest > currentVersion) {
        btn.innerText = "Download Latest Update";
        btn.onclick = function() {
          Update.downloadLatest();
          btn.disabled = true;
          btn.innerText = "Downloading latest...";
          btn.classList.add("color-blue");
          new Notification({
            "title": "New Toxen Update is available",
            "body": "Go to settings and press Download Latest Update to update."
          }).show();
        }
      }
      else {
        btn.classList.remove("color-blue");
        btn.innerText = "Check for updates";
        btn.onclick = function() {
          Update.check(currentVersion);
        }
      }
    });
  }
  
  static async downloadLatest() {
    if (updatePlatform == null) {
      dialog.showErrorBox("Unidentified release", "No release found for your current operating system (" + process.platform + ")");
      return;
    }
    let toxenGetLatestURL = `https://toxen.net/download/latest.php?platform=${updatePlatform}&get=url`;
    let toxenLatestURL = await fetch(toxenGetLatestURL).then(res => res.text());
    let dl = new ion.Download("https://"+toxenLatestURL, "./latest.zip");
    
    
    let dlText = document.createElement("p");
    dlText.innerText = "If it doesn't show any progress here for more than a minute, please restart the program and try again.";
    let p = new Prompt("Started downloading...", dlText);
    p.addButtons("Close", "fancybutton color-red").addEventListener("click", () => {
      p.close();
      
    });
    dl.start();
    dl.onData = function() {
      let pr = +dl.downloadPercent().toFixed(2);
      dlText.innerText = pr + "%";
    };

    dl.onEnd = function() {
      // p.close();
      p.headerText = "Extracting update...";
      p.contentElement.innerText = "Toxen will be frozen for a bit and restart automatically when finished.";
      
      setTimeout(async () => {
        let file = new Zip(path.resolve("./latest.zip"));
        try {
          file.getEntries().forEach((e) => {
            try {
              if (!e.isDirectory) {
                file.extractEntryTo(e, "./", true, true);
                console.log(e.entryName);
              }
            } catch (error) {
              // console.log(e.entryName + " ignored");
            }
          });
        } catch (err) {
          console.error(err);
          new Prompt("An error happened and was unable to update!", err.toString());
          return;
        }
        p.close();
        new Prompt("Update finished!", ["The program will restart in 5 seconds..."]);
        fs.unlinkSync("./latest.zip");
        setTimeout(() => {
          remote.app.relaunch();
          remote.app.quit();
        }, 5000);
      }, 10);
    }
    dl.onError = function(err) {
      console.error(err);
    };
  }
}

ipcRenderer.on("editor.save", () => {
  ToxenScriptManager.reloadCurrentScript();
});

ipcRenderer.on("editor.request.data", () => {
  let element = ScriptEditor.currentSong.element;
  let txnScript = ScriptEditor.currentSong.txnScript;
  ScriptEditor.currentSong.txnScript = ScriptEditor.currentSong.getFullPath("txnScript");
  ScriptEditor.currentSong.element = null;
  ScriptEditor.window.webContents.send("editor.song", JSON.stringify(ScriptEditor.currentSong));
  ScriptEditor.currentSong.txnScript = txnScript;
  ScriptEditor.currentSong.element = element;
});

class ScriptEditor {
  /**
   * @param {Song} song 
   */
  static open(song) {
    if (song.txnScript == null) {
      song.txnScript = song.path + "/storyboard.txn";
      SongManager.saveToFile();
    }
    if (!fs.existsSync(song.getFullPath("txnScript"))) {
      fs.writeFileSync(song.getFullPath("txnScript"),
        "# Start writting your storyboard code here!\n" + 
        "# Go to https://toxen.net/toxenscript\n" +
        "# for documentation on ToxenScript"
      );
    }
    if (ScriptEditor.window == null) {
      ScriptEditor.window = ScriptEditor.makeWindow();
      ScriptEditor.window.once("closed", () => {
        ScriptEditor.window = null;
        browserWindow.webContents.send("updatediscordpresence");
      });
      // console.log("Made window");
    }
    if (ScriptEditor.window.isVisible()) {
      dialog.showErrorBox("Editor already open", "Close down the previous editor before opening a new one.");
      ScriptEditor.window.show();
      return ScriptEditor.window;
    }
    ScriptEditor.currentSong = song;
    ScriptEditor.window.show();
    ScriptEditor.window.loadFile("./src/toxenscripteditor/index.html");
    return ScriptEditor.window;
  }

  static listening = false;

  static sendCommand(value) {
    ScriptEditor.window.webContents.send("editor.command", value);
  }
  // static sendJavaScript(value) {
  //   ScriptEditor.window.webContents.send("editor.command", value);
  // }

  static command = null;

  /**
   * @type {import("electron").BrowserWindow}
   */
  static window;

  static makeWindow() {
    return new remote.BrowserWindow({
      // "alwaysOnTop": true,
      "width": 1280,
      "height": 768,
      "minWidth": 640,
      "minHeight": 480,
      "webPreferences": {
        "nodeIntegration": true
      },
      "show": false,
      "parent": browserWindow,
      "icon": "./icon.ico"
    });
  }

  /**
   * @type {Song}
   */
  static currentSong = null;
}

// Export Classes
exports.Settings = Settings;
exports.HTMLSongElement = HTMLSongElement;
exports.Song = Song;
exports.SongManager = SongManager;
exports.SongGroup = SongGroup;
exports.Storyboard = Storyboard;
exports.ToxenScriptManager = ToxenScriptManager;
exports.Debug = Debug;
exports.Prompt = Prompt;
exports.Update = Update;
exports.ScriptEditor = ScriptEditor;

// Export Functions
