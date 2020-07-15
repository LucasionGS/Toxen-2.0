"use strict";
// FS takes files relative to the root "Resources" directory.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// It is NOT relative to the HTML file or script file.
//@@ts-expect-error
const fs = require("fs");
const rimraf = require("rimraf");
const node_hue_api_1 = require("node-hue-api");
exports.hueApi = null;
const ionMarkDown_1 = require("./ionMarkDown");
const Electron = require("electron");
const { remote, shell, ipcRenderer } = Electron;
const { Menu, dialog, Notification: ElectronNotification, app } = remote;
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const ytdl = require("ytdl-core");
const ion = require("ionodelib");
const Zip = require("adm-zip");
const events_1 = require("events");
const browserWindow = remote.getCurrentWindow();
const commandExists = require("command-exists");
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
/**
 * General Toxen functionality.
 *
 * Primarily used for events.
 */
class Toxen {
    /**
     * Restarts Toxen immediately.
     */
    static restart() {
        app.relaunch();
        app.exit();
    }
    /**
     * Reloads the Toxen window immediately.
     */
    static reload() {
        browserWindow.reload();
    }
    static ffmpegAvailable() {
        return Settings.current.ffmpegPath != null || commandExists.sync("ffmpeg");
    }
    static ffmpegPath() {
        return Settings.current.ffmpegPath ? Settings.current.ffmpegPath : commandExists.sync("ffmpeg") ? "ffmpeg" : null;
    }
    /**
     * Prompts you for installation of ffmpeg to your system.
     *
     * Windows: `\Users\%User%\.ffmpeg`
     * Linux && Mac: `/home/%user%/.ffmpeg`
     */
    static ffmpegDownload() {
        return __awaiter(this, void 0, void 0, function* () {
            Prompt.close("ffmpegdownload");
            let p = new Prompt("Install FFMPEG", "FFMPEG is a tool for media conversion and editing, and Toxen is dependent on this software to modify media files.");
            p.name = "ffmpegdownload";
            p.addContent(updatePlatform === "win" ?
                "Do you want Toxen to install FFMPEG automatically?<br><br><code>If you already have it installed in the correct location, it'll just be applied and used instead.</code>" :
                `You'll need to go to <a href="#ffmpeg" onclick="shell.openExternal(this.innerText)">https://ffmpeg.org/download.html</a> to install FFMPEG and you should either set it as a global command, or open the settings panel, go under <b>Advanced Settings</b>, and find the executable ffmpeg file after installation.
<br><br>
<code>If you already have FFMPEG installed elsewhere on this computer, find it and set it's path in settings as described above.</code>`);
            let [install, cancel] = p.addButtons(["Install", "Cancel"], "fancybutton", true);
            install.classList.add("color-green");
            install.addEventListener("click", () => {
                p.return("Install!", false);
                install.disabled = true;
                cancel.disabled = true;
            });
            cancel.addEventListener("click", () => {
                p.close();
            });
            if (updatePlatform !== "win")
                install.remove();
            return p.promise.then((v) => __awaiter(this, void 0, void 0, function* () {
                if (v == null) {
                    return;
                }
                let installationPath = process.env.HOME ? path.resolve(process.env.HOME + "/.ffmpeg/ffmpeg.exe")
                    : dialog.showSaveDialogSync(browserWindow, {
                        "buttonLabel": "Install here",
                        "message": "Select a place to install FFMPEG",
                        "properties": [
                            "showOverwriteConfirmation"
                        ],
                        "defaultPath": "ffmpeg.exe"
                    });
                let installationUrl = "https://toxen.net/download/extra/ffmpeg/win/ffmpeg.exe";
                if (fs.existsSync(installationPath)) {
                    p.headerText = "FFMPEG found";
                    p.setContent("FFMPEG found and applied");
                    Settings.current.ffmpegPath = installationPath;
                    yield Settings.current.saveToFile();
                    Settings.current.applySettingsToPanel();
                    p.clearButtons();
                    p.close(2000);
                    return true;
                }
                else {
                    if (installationPath === null) {
                        p.close();
                        new Prompt("Unable to install", "No suitable location found." /* Change this to ask for location later */)
                            .addButtons("Close", "fancybutton", true);
                        return;
                    }
                    fs.mkdirSync(path.dirname(installationPath), { recursive: true });
                    let dl = new ion.Download(installationUrl, installationPath);
                    dl.start();
                    dl.onData = () => {
                        p.setContent(`Downloading FFMPEG... ${dl.downloadPercent().toFixed(2)}%`);
                    };
                    dl.onEnd = () => __awaiter(this, void 0, void 0, function* () {
                        p.addContent(`Download Finished! You can now use FFMPEG functionality with Toxen`);
                        Settings.current.ffmpegPath = installationPath;
                        yield Settings.current.saveToFile();
                        Settings.current.applySettingsToPanel();
                        p.clearButtons();
                        p.close(2000);
                    });
                }
                return false;
            })).catch(err => { console.error(err); return false; });
        });
    }
    static on(event, callback) {
        Toxen.eventEmitter.on(event, callback);
    }
    static emit(event, ...args) {
        if (Array.isArray(args)) {
            Toxen.eventEmitter.emit(event, ...args);
        }
        else {
            Toxen.eventEmitter.emit(event);
        }
    }
    /**
     * @param {string} src
     */
    static setStyleSource(src) {
        Toxen.extraStyle.href = src + (src ? "?" + Debug.generateRandomString(3) : "");
    }
}
exports.Toxen = Toxen;
Toxen.eventEmitter = new events_1.EventEmitter(
// {
//   "captureRejections": true
// }
);
/**
 * Object of generator objects using Toxen styling.
 */
Toxen.generate = {
    /**
     * Generate an input.
     * @param {object} opts
     * @param {(obj: HTMLInputElement) => void} opts.modify Modify this object using a function. This will always happen before the other options get applied.
     * @param {string} opts.id Id for this item.
     *
     * @param {string} opts.value Default value for the input.
     * @param {string} opts.placeholder Default placeholder for the input.
     */
    input(opts = {}) {
        if (opts !== null && typeof opts === "object") {
            let obj = document.createElement("input");
            obj.classList.add("fancyinput");
            // Apply opts (Globals)
            if (typeof opts.modify == "function")
                opts.modify(obj);
            if (typeof opts.id == "string")
                obj.id = opts.id;
            // Apply opts (Local)
            if (typeof opts.value == "string")
                obj.value = opts.value;
            if (typeof opts.placeholder == "string")
                obj.placeholder = opts.placeholder;
            return obj;
        }
    },
    /**
     * Generate a button.
     * @param {object} opts
     * @param {(obj: HTMLButtonElement) => void} opts.modify Modify this object using a function. This will always happen before the other options get applied.
     * @param {string} opts.id Id for this item.
     *
     * @param {string} opts.text Text to be displayed on the button. Supports HTML.
     * @param {string} opts.backgroundColor Background color in CSS.
     * @param {(ev: MouseEvent) => void} opts.click Function to execute on the click of this button.
     */
    button(opts = {}) {
        if (opts !== null && typeof opts === "object") {
            let obj = document.createElement("button");
            obj.classList.add("fancybutton");
            // Apply opts (Globals)
            if (typeof opts.modify == "function")
                opts.modify(obj);
            if (typeof opts.id == "string")
                obj.id = opts.id;
            // Apply opts (Local)
            if (typeof opts.text == "string")
                obj.innerHTML = opts.text;
            if (typeof opts.backgroundColor == "string")
                obj.style.backgroundColor = opts.backgroundColor;
            if (typeof opts.click == "function")
                obj.addEventListener("click", opts.click);
            return obj;
        }
    },
};
class Settings {
    constructor(doNotReplaceCurrent = false) {
        // 
        // All Settings
        // @settings
        // 
        /**
         * Percentage to dim the background.
         */
        this.backgroundDim = 50;
        /**
         * Audio volume.
         */
        this.volume = 100;
        /**
         * Full path to the current song folder.
         */
        this.songFolder = null;
        /**
         * List of full paths to the song folders.
         */
        this.songFolderList = [];
        /**
         * Intensity of the audio visualizer.
         */
        this.visualizerIntensity = 15;
        /**
         * Direction of the audio visualizer.
         */
        this.visualizerDirection = 0;
        /**
         * Whether or not the visualizer is enabled.
         */
        this.visualizer = true;
        /**
         * Whether or not the storyboard is enabled.
         */
        this.storyboard = true;
        /**
         * Show video as the background if it's available.
         */
        this.video = true;
        /**
         * `true` Displays the advanced options.
         * `false` Keep the advanced options hidden.
         */
        this.advanced = false;
        /**
         * Visualizer Colors RGB
         */
        this.visualizerColor = {
            red: 0,
            green: 255,
            blue: 100
        };
        /**
         * Visualizer Style ID
         */
        this.visualizerStyle = 3;
        /**
         * If the visualizer should freeze while the song is paused.
         */
        this.freezeVisualizer = false;
        /**
         * Which style the songs should be grouped in.
         */
        this.songGrouping = 0;
        /**
         * Repeat the same song.
         */
        this.repeat = false;
        /**
         * Only play songs that are visible in the song panel.
         *
         * (i.e doesn't have `display: none`)
         */
        this.onlyVisible = false;
        /**
         * Shuffle to a random song instead of the next in the list.
         */
        this.shuffle = true;
        /**
         * Detail to sort by
         */
        this.sortBy = "artist";
        /**
         * `true` Set the song menu on the right hand side.
         * `false` Keep the song menu on the left hand side.
         */
        this.songMenuToRight = false;
        /**
         * `true` Lock the song panel in place and don't make it fade away.
         * `false` Only show the panel when hovered over.
         */
        this.songMenuLocked = false;
        /**
         * `0` Doesn't show thumbnails.
         * `1` Shows backgrounds as a thumbnail for the songs with a custom background.
         * `2` Shows backgrounds as a background on the music panel for the songs with a custom background.
         */
        this.thumbnails = 2;
        /**
         * Display the details of the current song playing in Discord Presence.
         * Details include Artist, Title, and current time.
         */
        this.discordPresenceShowDetails = true;
        /**
         * Hue Bridge: IP Address / Host
         */
        this.hueBridgeIp = null;
        /**
         * Hue Bridge: Username
         */
        this.hueBridgeUser = null;
        /**
         * Hue Bridge: Client Key
         */
        this.hueBridgeClientKey = null;
        /**
         * Currently selected playlist.
         * (`null`) if none is selected.
         */
        this.playlist = null;
        /**
         * All selected playlist.
         * @type {string[]}
         */
        this.playlists = [];
        /**
         * Display the tutorial the first time toxen launches.
         */
        this.showTutorialOnStart = true;
        /**
         * Custom path to the user's FFMPEG file.
         */
        this.ffmpegPath = null;
        /**
         * Toggle light theme on Toxen.
         *
         * Why would anyone do that..?
         */
        this.lightThemeBase = false;
        /**
         * `0` Progress bar stays inside of of the song menu and is only visible when the song menu is.
         * `1` Progress bar stays at the top of the screen and is visible at all times.
         * `2` Progress bar stays at the bottom of the screen and is visible at all times.
         */
        this.progressBarSpot = 0;
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
        }
        catch (error) {
            console.error("Unable to parse settings file.", error);
        }
    }
    loadFromFile(fileLocation = "./data/settings.json") {
        try {
            if (!fs.existsSync(path.dirname(fileLocation))) {
                fs.mkdirSync(path.dirname(fileLocation), { recursive: true });
            }
            if (!fs.existsSync(fileLocation)) {
                fs.writeFileSync(fileLocation, "{}");
            }
            let stgs = JSON.parse(fs.readFileSync(fileLocation, "utf8"));
            for (const key in stgs) {
                if (this.hasOwnProperty(key)) {
                    this[key] = stgs[key];
                }
            }
        }
        catch (error) {
            console.error("Unable to parse settings file.", error);
        }
    }
    saveToFile(fileLocation = "./data/settings.json") {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs.existsSync(path.dirname(fileLocation))) {
                fs.mkdirSync(path.dirname(fileLocation), { recursive: true });
            }
            fs.writeFileSync(fileLocation, JSON.stringify(this, null, 2));
        });
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
                    let element = document.getElementById(key.toLowerCase() + "=" + value);
                    if (element != null && element instanceof HTMLInputElement) {
                        if (element.type == "radio") {
                            element.checked = true;
                        }
                        else {
                            element.value = value;
                        }
                        continue;
                    }
                    element = document.getElementById(key.toLowerCase() + "Value");
                    if (element != null && element instanceof HTMLInputElement) {
                        element.value = value;
                        continue;
                    }
                }
                if (typeof value == "object") {
                    for (const keyName in value) {
                        if (value.hasOwnProperty(keyName)) {
                            const VALUE = value[keyName];
                            let element = document.getElementById(key.toLowerCase() + "." + keyName.toLowerCase() + "=" + VALUE);
                            if (element != null && element instanceof HTMLInputElement) {
                                if (element.type == "radio") {
                                    element.checked = true;
                                }
                                else {
                                    element.value = VALUE;
                                }
                                continue;
                            }
                            element = document.getElementById(key.toLowerCase() + "." + keyName.toLowerCase() + "Value");
                            if (element != null && element instanceof HTMLInputElement) {
                                element.value = VALUE;
                                continue;
                            }
                        }
                    }
                }
                if (typeof value == "boolean") {
                    let element = document.getElementById(key.toLowerCase() + "Toggle");
                    if (element != null && element instanceof HTMLInputElement) {
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
    /**
     *
     * @param {boolean} newInstance If `true`, returns a new instance of a playlist and without the "No playlist selected" option.
     */
    reloadPlaylists(newInstance = false) {
        let selection;
        // Add "None"
        if (newInstance == true) {
            selection = document.createElement("select");
            selection.classList.add("fancyselect");
        }
        else {
            selection = document.querySelector("#playlistselection");
            selection.innerHTML = ""; // clear
            let opt = document.createElement("option");
            opt.innerText = "No Playlist Selected";
            opt.value = "%null%";
            selection.appendChild(opt);
        }
        for (let i = 0; i < this.playlists.length; i++) {
            const playlist = this.playlists[i];
            let opt = document.createElement("option");
            opt.innerText = playlist;
            opt.value = playlist;
            selection.appendChild(opt);
        }
        if (newInstance == false)
            Menu.setApplicationMenu((menu = reloadMenu()));
        if (this.playlist) {
            selection.value = this.playlist;
        }
        else {
            selection.value = "%null%";
        }
        return selection;
    }
    /**
     * @param {string} playlist
     */
    selectPlaylist(playlist) {
        Settings.current.playlist = playlist == "%null%" ? null : playlist;
        if (document.querySelector("#playlistselection").value != playlist) {
            document.querySelector("#playlistselection").value = playlist;
        }
        Settings.current.reloadPlaylists();
        new Prompt("", "Switched to playlist " + (playlist != "%null%" ? "\"" + playlist + "\"" : "None") + "").close(1000);
        SongManager.search();
    }
    /**
     * @param {string} name
     */
    addPlaylist() {
        let inpName = document.createElement("input");
        inpName.classList.add("fancyinput");
        let p = new Prompt("New Playlist", [inpName]);
        let [create, close] = p.addButtons(["Create", "Close"], "fancybutton", true);
        inpName.addEventListener("keydown", (e) => {
            if (e.key == "Enter") {
                create.click();
            }
            if (e.key == "Escape") {
                close.click();
            }
        });
        inpName.focus();
        inpName.addEventListener("input", () => {
            if (!Array.isArray(this.playlists)) {
                this.playlists = [];
            }
            if (inpName.value == "%null%" || inpName.value == "" || this.playlists.includes(inpName.value)) {
                create.disabled = true;
                create.title = "Playlist already exists or is a reserved string.";
            }
            else {
                create.title = "Create playlist!";
                create.disabled = false;
            }
        });
        create.classList.add("color-green");
        create.addEventListener("click", () => {
            this.playlists.push(inpName.value);
            this.reloadPlaylists();
            this.saveToFile();
            p.close();
            new Prompt("", "Successfully created playlist \"" + inpName.value + "\"").close(1000);
        });
    }
    // TODO: removePlaylist
    selectSongFolder() {
        return __awaiter(this, void 0, void 0, function* () {
            let self = this;
            dialog.showOpenDialog(remote.getCurrentWindow(), {
                "buttonLabel": "Select Folder",
                "properties": [
                    "openDirectory"
                ],
                "message": "Select your song folder"
            })
                .then((value) => __awaiter(this, void 0, void 0, function* () {
                if (value.filePaths.length == 0) {
                    return;
                }
                self.songFolder = path.resolve(value.filePaths[0]);
                document.querySelector("input#songfolderValue").value = self.songFolder;
                if (fs.existsSync(self.songFolder + "/db.json")) {
                    yield SongManager.loadFromFile();
                }
                else {
                    SongManager.scanDirectory();
                }
                self.saveToFile();
                // Toxen.reload();
                SongManager.search();
                setTimeout(() => {
                    SongManager.playRandom();
                }, 10);
            }));
        });
    }
    /**
     * @param {boolean} force
     */
    toggleVideo(force) {
        if (typeof force == "boolean") {
            Settings.current.video = force;
        }
        else {
            Settings.current.video = SongManager.player.hidden;
        }
        SongManager.player.hidden = !Settings.current.video;
        return Settings.current.video;
    }
    /**
     * @param {boolean} force
     */
    toggleSongPanelLock(force) {
        const element = document.getElementById("lockPanel");
        if (typeof force == "boolean") {
            this.songMenuLocked = !force;
        }
        if (this.songMenuLocked == false) {
            element.innerText = "🔒";
            element.style.opacity = "1";
            this.songMenuLocked = true;
        }
        else {
            element.innerText = "🔓";
            element.style.opacity = "0.5";
            this.songMenuLocked = false;
        }
        document.getElementById("songmenusidebar").toggleAttribute("open", this.songMenuLocked);
        this.saveToFile();
        return this.songMenuLocked;
    }
    revealSongPanel() {
        if (!this.songMenuLocked) {
            let self = this;
            document.getElementById("songmenusidebar").toggleAttribute("open", true);
            var _a = function () {
                if (!self.songMenuLocked) {
                    document.getElementById("songmenusidebar").toggleAttribute("open", false);
                }
                document.getElementById("songmenusidebar").removeEventListener("mouseover", _a);
            };
            document.getElementById("songmenusidebar").addEventListener("mouseover", _a);
        }
    }
    /**
     * @param {boolean} force
     */
    toggleSettingsPanelLock(force) {
        let locked = document.getElementById("settingsmenusidebar").hasAttribute("open");
        if (typeof force == "boolean") {
            locked = !force;
        }
        document.getElementById("settingsmenusidebar").toggleAttribute("open", !locked);
        return locked;
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
    selectFFMPEGPath() {
        let self = this;
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            "buttonLabel": "Select File",
            "properties": [
                "openFile"
            ],
            "message": "Select FFMPEG executable"
        })
            .then((value) => __awaiter(this, void 0, void 0, function* () {
            if (value.filePaths.length == 0) {
                return;
            }
            self.ffmpegPath = path.resolve(value.filePaths[0]);
            document.querySelector("input#ffmpegpathValue").value = self.ffmpegPath;
            self.saveToFile();
        }));
    }
    /**
     * @param {Settings["lightThemeBase"]} base
     */
    setThemeBase(base) {
        Settings.current.lightThemeBase = base;
        // browserWindow.setIcon(Settings.current.lightThemeBase ? "./iconlight.ico" : "./icon.ico");
        if (Settings.current.lightThemeBase) {
            Toxen.setStyleSource("./light.theme.css");
        }
        else {
            Toxen.setStyleSource("");
        }
    }
    /**
     * Set the progress bar spot.
     * @param {number} spotid
     */
    setProgressBarSpot(spotid) {
        this.progressBarSpot = spotid;
        let bar = document.getElementById("progress");
        switch (this.progressBarSpot) {
            case 0:
                document.getElementById("progressbarspot1").appendChild(bar);
                document.querySelector("#songmenusidebar").style.height = "";
                document.querySelector("#settingsmenusidebar").style.height = "";
                document.querySelector("p#subtitles").style.top = "";
                document.querySelector("#songmenusidebar").style.top = "";
                document.querySelector("#settingsmenusidebar").style.top = "";
                break;
            case 1:
                document.getElementById("progressbarspot2").appendChild(bar);
                document.getElementById("progressbarspot2").style.top = "0";
                document.getElementById("progressbarspot2").style.bottom = "";
                document.querySelector("#songmenusidebar").style.height = "calc(100vh - " + bar.clientHeight + "px)";
                document.querySelector("#settingsmenusidebar").style.height = "calc(100vh - " + bar.clientHeight + "px)";
                document.querySelector("p#subtitles").style.top = "64px";
                document.querySelector("#songmenusidebar").style.top = "";
                document.querySelector("#settingsmenusidebar").style.top = "";
                break;
            case 2:
                document.getElementById("progressbarspot2").appendChild(bar);
                document.getElementById("progressbarspot2").style.top = "";
                document.getElementById("progressbarspot2").style.bottom = "0";
                document.querySelector("#songmenusidebar").style.height = "calc(100vh - " + bar.clientHeight + "px)";
                document.querySelector("#settingsmenusidebar").style.height = "calc(100vh - " + bar.clientHeight + "px)";
                document.querySelector("p#subtitles").style.top = "";
                document.querySelector("#songmenusidebar").style.top = "0";
                document.querySelector("#settingsmenusidebar").style.top = "0";
                break;
            default:
                break;
        }
    }
    /**
     * Returns whether or not the `songFolder` is a remote URL or not.
     */
    get remote() {
        return /^(?:http|https):\/\//g.test(this.songFolder);
    }
    ;
}
exports.Settings = Settings;
Settings.current = null;
class Song {
    constructor() {
        this.songId = 0;
        this.click = function () { };
        /**
         * Relative path for this song / Folder name
         */
        this.path = null;
        /**
         * Relative path to the song mp3/mp4.
         */
        this.songPath = null;
        /**
         * Relative path to the song's SRT file (if any).
         */
        this.subtitlePath = null;
        /**
         * Relative path to the song's TXN script file (if any).
         */
        this.txnScript = null;
        /**
         * Relative path to the song's background image (if any).
         */
        this.background = null;
        /**
         * Detailed information about this song (if applied)
         */
        this.details = {
            artist: null,
            title: null,
            album: null,
            source: null,
            sourceLink: null,
            language: null,
            tags: [],
            playlists: [],
            songLength: 0,
        };
        this.element = null;
        /**
         * A randomly generated hash to cache files correctly.
         */
        this.hash = "";
        let self = this;
        const div = document.createElement("div");
        this.setElement(div);
        this.element.className = "musicitem";
        const innerDiv = document.createElement("div");
        innerDiv.className = "innermusicitem";
        this.element.appendChild(innerDiv);
        this.element.addEventListener("click", function (e) {
            e.preventDefault();
            if (e.ctrlKey) {
                self.toggleSelect();
            }
            else {
                SongManager.getSelectedSongs().forEach(s => s.deselect());
                self.click();
            }
        });
        this.element.addEventListener("contextmenu", function (e) {
            e.preventDefault();
            e.stopPropagation();
            let selectedSongs = SongManager.getSelectedSongs();
            if (selectedSongs.length == 0) {
                menus.songMenu.items.forEach((i) => {
                    i.songObject = self;
                });
                menus.songMenu.popup({
                    "x": e.clientX,
                    "y": e.clientY
                });
            }
            else {
                menus.selectedSongMenu.items.forEach((i) => {
                    i.songObject = self;
                });
                menus.selectedSongMenu.popup({
                    "x": e.clientX,
                    "y": e.clientY
                });
            }
        });
    }
    get selected() {
        return this.element.hasAttribute("selectedsong");
    }
    set selected(value) {
        this.element.toggleAttribute("selectedsong", value);
    }
    select() {
        this.selected = true;
    }
    deselect() {
        this.selected = false;
    }
    toggleSelect() {
        this.selected = !this.selected;
    }
    trim() {
        if (Toxen.ffmpegAvailable()) {
            ffmpeg.setFfmpegPath(Toxen.ffmpegPath());
        }
        else {
            Toxen.ffmpegDownload();
            return;
        }
        let start = document.createElement("input");
        start.classList.add("fancyinput");
        start.value = "0";
        start.placeholder = "Seconds or timestamp (HH:MM:SS)";
        let end = document.createElement("input");
        end.classList.add("fancyinput");
        end.value = ToxenScriptManager.convertSecondsToDigitalClock(this.details.songLength ? this.details.songLength : 60);
        end.placeholder = "Seconds or timestamp (HH:MM:SS)";
        let setCurStart = document.createElement("button");
        setCurStart.classList.add("fancybutton");
        setCurStart.innerText = "Use current time";
        let setCurEnd = document.createElement("button");
        setCurEnd.classList.add("fancybutton");
        setCurEnd.innerText = "Use current time";
        setCurStart.addEventListener("click", () => {
            start.value = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.currentTime);
        });
        setCurEnd.addEventListener("click", () => {
            end.value = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.currentTime);
        });
        /**
         * @param {string} timestamp
         */
        function verify(timestamp) {
            try {
                ToxenScriptManager.timeStampToSeconds(timestamp, true);
                return true;
            }
            catch (_c) {
                return false;
            }
        }
        let p = new Prompt("Trim song", [
            "You're about to trim \"" + this.parseName() + "\"<br><sup style='color: red'>This is going to make physical changes to your original file.</sup>",
            "When should the song start?",
            start,
            setCurStart,
            "When should it end?",
            end,
            setCurEnd,
        ]);
        let [trim, close] = p.addButtons(["Trim", "Close"], "fancybutton", true);
        start.addEventListener("input", () => {
            let valid = verify(start.value);
            if (valid) {
                start.style.color = "inherit";
                trim.disabled = false;
            }
            else {
                start.style.color = "red";
                trim.disabled = true;
            }
        });
        end.addEventListener("input", () => {
            let valid = verify(end.value);
            if (valid) {
                end.style.color = "inherit";
                trim.disabled = false;
            }
            else {
                end.style.color = "red";
                trim.disabled = true;
            }
        });
        trim.addEventListener("click", () => {
            start.disabled = true;
            end.disabled = true;
            trim.disabled = true;
            close.disabled = true;
            p.return(true, false);
            let sp = this.getFullPath("songPath");
            let fc = ffmpeg(sp);
            let tmpPath = path.resolve(path.dirname(sp) + "/tmp_" + path.basename(sp));
            let ss = ToxenScriptManager.timeStampToSeconds(start.value);
            let se = ToxenScriptManager.timeStampToSeconds(end.value) - ss;
            fc.setStartTime(ss)
                .addOption("-to " + se)
                .saveToFile(tmpPath)
                .on("start", () => {
                p.headerText = "Trimming Song";
                p.setContent("Starting FFMPEG...");
                p.clearButtons();
            })
                .on("progress", (progress) => {
                p.setContent(`Trimming song...<br>${((ToxenScriptManager.timeStampToSeconds(progress.timemark) / se) * 100).toFixed(2)}%`);
            })
                .on("end", () => {
                p.setContent(`Trimmed song!`);
                let curSong = SongManager.getCurrentlyPlayingSong();
                if (curSong && curSong.songId === this.songId) {
                    SongManager.clearPlay();
                }
                rimraf(sp, (err) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    fs.rename(tmpPath, sp, () => {
                        this.hash = Debug.generateRandomString(3);
                        this.play();
                    });
                });
                fc.kill("");
                p.close(2000);
            })
                .on("error", (err) => {
                console.error(err);
                fc.kill("");
            });
            console.log(sp);
            console.log(tmpPath);
            console.log(fc._getArguments().join(" "));
            // ffmpeg -ss 6.118 -i C:\Users\Lucas\Music\Nhato_-_Bad_Apple\audio.mp3 -y -to 9.528 C:\Users\Lucas\Music\Nhato_-_Bad_Apple\tmp_audio.mp3
        });
    }
    /**
     * Returns the full name for this song with parsed markdown, if any.
     *
     * This is just a shortcut for:
     * ```js
     * Imd.MarkDownToHTML(this.details.artist) + " - " + Imd.MarkDownToHTML(this.details.title)
     * ```
     */
    parseName() {
        return ionMarkDown_1.Imd.MarkDownToHTML(this.details.artist) + " - " + ionMarkDown_1.Imd.MarkDownToHTML(this.details.title);
    }
    /**
     * Zip the entire song folder and save it as a `txs`.
     *
     * if `location` is defined, no prompt for selecting location will appear, and will just export to the set location
     * @param {string} location Location to save to.
     */
    export(location = null) {
        let txs = this.createTxs();
        let ans = typeof location === "string" ? location : dialog.showSaveDialogSync(browserWindow, {
            "title": "Save Toxen Song File",
            "buttonLabel": "Save Song",
            "defaultPath": this.path + ".txs"
        });
        if (typeof ans == "string") {
            txs.writeZip(ans);
            shell.showItemInFolder(ans);
        }
    }
    createTxs() {
        let txs = new Zip();
        txs.addLocalFolder(this.getFullPath("path"));
        return txs;
    }
    refreshElement() {
        this.element.children[0].innerHTML = (() => {
            switch (Settings.current.songGrouping) {
                case 1:
                    return "<p>" + ionMarkDown_1.Imd.MarkDownToHTML(this.details.title) + "</p>";
                default:
                    return "<p>" + ionMarkDown_1.Imd.MarkDownToHTML(this.details.artist + " - " + this.details.title) + "</p>";
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
            this.element.style.background = "linear-gradient(to right,  rgba(0, 0, 0, 1), rgba(0, 0, 0, 0) ), "
                + `url("${_path}"),` + "center center / cover no-repeat fixed";
        }
        else {
            this.element.style.background = "";
        }
        this.click = function () {
            this.play();
        };
    }
    getListIndex() {
        return SongManager.songList.findIndex(s => s.songId === this.songId);
    }
    getPlayableListIndex() {
        return SongManager.playableSongs.findIndex(s => s.songId === this.songId);
    }
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
    play(hash = this.hash) {
        if (typeof hash == "string" && hash.length > 0)
            hash = "?" + hash;
        let fp = this.getFullPath("songPath");
        let id = this.songId;
        let cur = SongManager.getCurrentlyPlayingSong();
        if (cur != null)
            cur.element.toggleAttribute("playing", false);
        else
            SongManager.songList.forEach(s => s.element.toggleAttribute("playing", false));
        this.element.toggleAttribute("playing", true);
        this.focus();
        // if (SongManager.player.getAttribute("songid") != id) {
        if (cur == null || cur.songId != id) {
            Toxen.emit("play", this);
            SongManager.player.setAttribute("songid", id.toString());
            if (this.isVideo) {
                let source = SongManager.player.querySelector("source");
                if (source == null) {
                    source = document.createElement("source");
                }
                source.src = fp + hash;
                SongManager.player.removeAttribute("src");
                SongManager.player.appendChild(source);
                SongManager.player.load();
            }
            else {
                if (SongManager.player.querySelector("source") != null) {
                    SongManager.player.innerHTML = "";
                }
                if (fp.toLowerCase().endsWith(".mp3")) {
                    SongManager.player.src = fp + hash;
                }
                else if ([
                    "wma",
                    "ogg"
                ].find(a => fp.toLowerCase().endsWith("." + a)) != null) {
                    let newSrc;
                    fs.readdirSync(this.getFullPath("path")).forEach(f => {
                        if (f.toLowerCase().endsWith(".mp3")) {
                            newSrc = this.getFullPath("path") + "/" + f;
                        }
                    });
                    if (newSrc != undefined) {
                        SongManager.player.src = newSrc + hash;
                    }
                    else {
                        if (Toxen.ffmpegAvailable()) {
                            ffmpeg.setFfmpegPath(Toxen.ffmpegPath());
                        }
                        else {
                            Toxen.ffmpegDownload();
                            return;
                        }
                        const format = fp.split(".")[fp.split(".").length - 1];
                        let src;
                        try {
                            src = ffmpeg(fp);
                        }
                        catch (error) {
                            console.error(error);
                            return;
                        }
                        let newName = fp.substring(0, fp.length - format.length) + "mp3";
                        let p = new Prompt("First Time Convertion", "This song is in a different format than supported, "
                            + "so it is being converted to a usable format.<br>Please allow a moment until it has been converted...");
                        p.addButtons("Close", null, true);
                        var duration;
                        src.toFormat("mp3").saveToFile(newName).once("end", () => {
                            SongManager.player.src = newName + hash;
                            p.close();
                            new Prompt("Convertion Completed.").close(2000);
                            SongManager.clearPlay();
                            this.play();
                        })
                            .once("codecData", (data) => {
                            duration = ToxenScriptManager.timeStampToSeconds(data.duration);
                        })
                            .on("progress", (progress) => {
                            if (duration != null) {
                                // p.setContent(`Converting...<br>${progress.targetSize}%`);
                                // p.setContent(`Converting...<br>${duration}%`);
                                p.setContent(`Converting...<br>${(ToxenScriptManager.timeStampToSeconds(progress.timemark) / duration * 100).toFixed(2)}%`);
                            }
                        })
                            .once("error", (err) => {
                            console.error(err);
                        });
                        return;
                    }
                }
            }
            SongManager.player.play().catch(err => console.error(err));
            Storyboard.setBackground(this.getFullPath("background"));
            const _d = document.createElement("div");
            _d.innerHTML = ionMarkDown_1.Imd.MarkDownToHTML(this.details.artist + " - " + this.details.title);
            document.title = _d.innerText;
            ToxenScriptManager.loadCurrentScript();
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
    }
    ;
    /**
     * Get the full path to a file. (Default is `songPath`)
     * @param itemToFind
     */
    getFullPath(itemToFind = "songPath") {
        if (typeof this[itemToFind] !== "string") {
            console.error("Could not find \"" + itemToFind + "\"");
            return null;
        }
        if (!(Settings.current instanceof Settings)) {
            console.error("There is no current settings file.");
            return null;
        }
        // let fp = Settings.current.songFolder + "/" + this[itemToFind];
        let fp;
        if (Settings.current.remote)
            fp = Settings.current.songFolder + "/" + this[itemToFind];
        else
            fp = path.resolve(Settings.current.songFolder, this[itemToFind]);
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
            let p = panel.querySelector('p[name="' + name + '"]');
            /**
             * @type {HTMLInputElement}
             */
            let input = panel.querySelector('input[name="' + name + '"]');
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
                p.innerHTML = `${title}: `.bold() + ionMarkDown_1.Imd.MarkDownToHTML(self.details[detailsItemName].join(", "));
                input.onsearch = function (e) {
                    e.preventDefault();
                    self.details[detailsItemName] = input.value.split(`${isArraySeparatedBy}`).map(v => v = v.trim());
                    self.saveDetails();
                    input.blur();
                    p.innerHTML = "Tags: ".bold() + self.details[detailsItemName].join(`${isArraySeparatedBy} `);
                    input.value = self.details[detailsItemName].join(`${isArraySeparatedBy} `);
                    self.refreshElement();
                };
            }
            else {
                p.innerHTML = `${title}: `.bold() + ionMarkDown_1.Imd.MarkDownToHTML(self.details[detailsItemName]);
                input.onsearch = function (e) {
                    e.preventDefault();
                    self.details[detailsItemName] = input.value;
                    self.saveDetails();
                    input.blur();
                    p.innerHTML = `${title}: `.bold() + ionMarkDown_1.Imd.MarkDownToHTML(input.value);
                    self.refreshElement();
                };
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
        }
        catch (error) {
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
        setTimeout(() => {
            this.element.scrollIntoViewIfNeeded();
        }, 0);
    }
    addToPlaylist() {
        let list = Settings.current.reloadPlaylists(true);
        list.style.display = "block";
        list.style.width = "95%";
        list.style.margin = "auto";
        let p = new Prompt("Add to Playlist", [
            `Add "${this.details.artist} - ${this.details.title}" to playlist:`,
            list
        ]);
        if (!Array.isArray(this.details.playlists)) {
            this.details.playlists = [];
        }
        // Removing already in.
        for (let i = 0; i < list.childNodes.length; i++) {
            const c = list.childNodes[i];
            if (this.details.playlists.includes(c.value)) {
                list.removeChild(c);
                i--;
            }
        }
        let [add] = p.addButtons(["Add to playlist", "Close"], "fancybutton", true);
        if (list.childNodes.length == 0) {
            p.headerText = "Cannot add to a playlist";
            p.contentElement.innerText = "Already in every playlist. Create new ones in the settings menu!";
            add.parentElement.removeChild(add);
            return;
        }
        list.value = list.childNodes[0].value;
        add.classList.add("color-green");
        add.addEventListener("click", () => {
            this.details.playlists.push(list.value);
            this.saveDetails();
            SongManager.saveToFile();
            p.close();
        });
    }
    removeFromPlaylist() {
        // TODO: Implement removeFromPlaylist
        // see addToPlaylist above for reference.
    }
    delete() {
        while (SongManager.getCurrentlyPlayingSong().songId === this.songId && SongManager.playableSongs.length > 1) {
            SongManager.playRandom();
        }
        if (SongManager.getCurrentlyPlayingSong().songId === this.songId) {
            SongManager.player.src = "";
        }
        SongManager.songList = SongManager.songList.filter(s => s.songId !== this.songId);
        SongManager.saveToFile();
        SongManager.refreshList();
        let self = this;
        function _removeSong() {
            rimraf.sync(self.getFullPath("path"));
        }
        try {
            _removeSong();
        }
        catch (error) {
            console.error("Failed to deleting song... retrying in 1s... " + path, error);
            setTimeout(() => {
                try {
                    _removeSong();
                }
                catch (error) {
                    console.error("Failed to delete " + path, error);
                }
            }, 1000);
        }
    }
}
exports.Song = Song;
class SongManager {
    /**
     * If `Settings.onlyVisible` is `true`, returns only the physically visible songs in the song list.
     *
     * If `Settings.onlyVisible` is `false`, returns the full `SongManager.playableSongs` list
     */
    static onlyVisibleSongList() {
        return Settings.current.onlyVisible && Settings.current.songGrouping > 0 ? SongManager.playableSongs.filter(s => s.getGroup() == null || s.getGroup().collapsed == false) : SongManager.playableSongs;
    }
    /**
     * Export every song into a folder.
     * @param {string} location
     * @param {Song[]} songList
     */
    static exportAll(location = null, songList = null) {
        return __awaiter(this, void 0, void 0, function* () {
            let songs = Array.isArray(songList) ? songList : SongManager.songList;
            let ans = typeof location === "string" ? location : dialog.showSaveDialogSync(browserWindow, {
                "title": `Zip ${songs.length} Toxen song file${songs.length > 1 ? "s" : ""}`,
                "buttonLabel": `Zip Song${songs.length > 1 ? "s" : ""}`,
                "defaultPath": `toxen_song${songs.length > 1 ? "s" : ""}.zip`
            });
            if (typeof ans == "string") {
                let zip = new Zip();
                let p = new Prompt(`Exporting ${songs.length} songs...`, "This can take a while depending on how many songs you're exporting and your computer's speed.");
                setTimeout(() => {
                    for (let i = 0; i < songs.length; i++) {
                        const song = songs[i];
                        zip.addFile(song.path + ".txs", song.createTxs().toBuffer());
                    }
                    zip.writeZip(ans);
                    p.close();
                    p = new Prompt(`All songs zipped and exported!`);
                    p.close(2000);
                    shell.showItemInFolder(ans);
                }, 10);
            }
        });
    }
    /**
     * Return all the song object that has selected enabled
     */
    static getSelectedSongs() {
        return SongManager.songList.filter(s => s.element.hasAttribute("selectedsong"));
    }
    /**
     * Stops playing music and unoccupy the music files
     */
    static clearPlay() {
        SongManager.player.pause();
        SongManager.player.removeAttribute("songid");
        SongManager.player.src = "";
        SongManager.player.innerHTML = "";
    }
    /**
     * Refresh the list with optional sorting.
     * @param sortBy Optional Sorting
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
            let sortFunc = (a, b) => { return 0; };
            try {
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
                    case "length":
                        sortFunc = (a, b) => {
                            if (typeof a.details.songLength == "number" && typeof b.details.songLength == "number" && a.details.songLength > b.details.songLength) {
                                return 1;
                            }
                            if (typeof a.details.songLength == "number" && typeof b.details.songLength == "number" && a.details.songLength < b.details.songLength) {
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
            }
            catch (error) {
            }
            /**
             * @param {Song} a
             * @param {Song} b
             */
            var _sort = function (a, b) {
                // Make order reversable
                return sortFunc(a, b);
            };
            SongManager.songList.sort(_sort);
            let nList = SongManager.songList;
            let opened = SongGroup.getAllGroupNames(false);
            opened = [...new Set(opened)];
            SongManager.songListElement.innerHTML = "";
            let noGrouping = false;
            // Group Songs
            if (typeof Settings.current.songGrouping == "number" && Settings.current.songGrouping > 0 && Settings.current.songGrouping <= 6) {
                /**
                 * @type {{[key: string]: Song[]}}
                 */
                let groups = {};
                /**
                 * @param {string} name
                 * @param {Song} song
                 */
                let addToGroup = function (name, song, missingText = "No group set") {
                    if (name == null || (typeof name == "string" && name.trim() == "")) {
                        name = missingText;
                    }
                    if (groups.hasOwnProperty(name)) {
                        groups[name].push(song);
                    }
                    else {
                        groups[name] = [song];
                    }
                };
                switch (Settings.current.songGrouping) {
                    case 1:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.artist, s, "No artist set");
                        });
                        break;
                    case 2:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.album, s, "No album set");
                        });
                        break;
                    case 3:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.source, s, "No source set");
                        });
                        break;
                    case 4:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.language, s, "No language set");
                        });
                        break;
                    case 5:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.artist[0].toUpperCase(), s, "!Missing Artist!");
                        });
                        break;
                    case 6:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.title[0].toUpperCase(), s, "!Missing Title!");
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
            console.error("No div element applied to SongManager.songListElement", "SongManager.songListElement is " + typeof SongManager.songListElement);
        }
    }
    /**
     * @param {string} search Search for a string
     */
    static search(search = document.querySelector("#search").value) {
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
            ].concat(s.details.tags);
            if (Settings.current.playlist) {
                if (Array.isArray(s.details.playlists) && s.details.playlists.includes(Settings.current.playlist) && match(searchTags)) {
                    s.element.hidden = false;
                    nSearch.push(s);
                }
                else {
                    s.element.hidden = true;
                }
            }
            else {
                if (match(searchTags)) {
                    s.element.hidden = false;
                    nSearch.push(s);
                }
                else {
                    s.element.hidden = true;
                }
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
                if (search != "" && search.length > 2 && len - 1 == hiddenElements) {
                    g.collapsed = false;
                }
            }
        }
    }
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
                        if (
                        // Audios
                        item.endsWith(".mp3") // Standard
                            || item.endsWith(".wma")
                            || item.endsWith(".ogg")
                            // Videos
                            || item.endsWith(".mp4") // Standard
                        ) {
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
                        if (item.endsWith(".png") || item.endsWith(".jpg") || item.endsWith(".jpeg") || item.endsWith(".gif")) {
                            song.background = file.name + "/" + item;
                        }
                        if (item == "details.json") {
                            try {
                                /**
                                 * @type {Song["details"]}
                                 */
                                let info = JSON.parse(fs.readFileSync(songDir + item, "utf8"));
                                song.details = info;
                            }
                            catch (error) {
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
            let resolvedLocation = path.resolve(location);
            if (Settings.current.songFolder != resolvedLocation) {
                Settings.current.songFolder = resolvedLocation;
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
    static loadFromFile(fileLocation = Settings.current.songFolder + "/db.json") {
        return __awaiter(this, void 0, void 0, function* () {
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
                }
                catch (error) {
                    console.error("Unable to parse database file... Rescanning.", error);
                    SongManager.scanDirectory();
                }
            }
            // Fix
            else {
                try {
                    /**
                     * @type {Song[]}
                     */
                    let songList = yield (yield fetch(fileLocation)).json();
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
                }
                catch (error) {
                    console.error("Unable to parse settings file.", error);
                }
            }
        });
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
     * @param id Song ID
     */
    static getSong(id) {
        return SongManager.songList.find(s => s.songId == id);
    }
    static getCurrentlyPlayingSong() {
        return SongManager.getSong(+SongManager.player.getAttribute("songid"));
    }
    static moveToTime(timeInSeconds) {
        if (isNaN(timeInSeconds))
            return false;
        try {
            SongManager.player.currentTime = timeInSeconds;
            return true;
        }
        catch (error) {
            console.error(error, timeInSeconds);
            return false;
        }
    }
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
        let _songs = SongManager.onlyVisibleSongList();
        if (_songs.length == 0 && (_songs = SongManager.playableSongs).length == 0) {
            console.warn("No songs to play. SongManager.playableSongs is empty.");
            return;
        }
        let song = _songs[Math.floor(Math.random() * _songs.length)];
        let curSong = SongManager.getCurrentlyPlayingSong();
        while (curSong && song.songId === curSong.songId && _songs.length > 1) {
            song = _songs[Math.floor(Math.random() * _songs.length)];
        }
        if (song instanceof Song)
            song.play();
        else
            console.error("No songs are playable");
    }
    static playNext() {
        const song = SongManager.getCurrentlyPlayingSong();
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
            let _songs = SongManager.onlyVisibleSongList();
            let id = _songs.findIndex(s => s.songId === song.songId);
            if (_songs.length == 0) {
                let g = song.getGroup();
                if (g)
                    g.collapsed = false;
                if (SongManager.playableSongs.length > 0)
                    SongManager.playNext();
                return;
            }
            if (typeof id == "number" && _songs.length > id + 1) {
                _songs[id + 1].play();
            }
            else {
                _songs[0].play();
            }
        }
    }
    static playPrev() {
        let song = SongManager.getCurrentlyPlayingSong();
        let _songs = SongManager.onlyVisibleSongList();
        let id = _songs.findIndex(s => s.songId === song.songId);
        if (_songs.length == 0) {
            let g = song.getGroup();
            if (g)
                g.collapsed = false;
            if (SongManager.playableSongs.length > 0)
                SongManager.playPrev();
            return;
        }
        if (id - 1 >= 0) {
            _songs[id - 1].play();
        }
        else {
            _songs[_songs.length - 1].play();
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
    /**
     * @param {boolean} force
     */
    static toggleOnlyVisible(force) {
        /**
         * @type {HTMLButtonElement}
         */
        const element = document.getElementById("toggleOnlyvisible");
        if (typeof force == "boolean") {
            Settings.current.onlyVisible = !force;
        }
        if (Settings.current.onlyVisible == false) {
            element.classList.replace("color-red", "color-green");
            Settings.current.onlyVisible = true;
        }
        else {
            element.classList.replace("color-green", "color-red");
            Settings.current.onlyVisible = false;
        }
        Settings.current.saveToFile();
        return Settings.current.onlyVisible;
    }
    static addSong() {
        let p = new Prompt("Add song");
        p.addContent("Add a song to your library");
        p.addContent((function () {
            // Create
            let main = document.createElement("div");
            let text = document.createElement("p");
            let top = document.createElement("div");
            // Fuse
            main.appendChild(text);
            main.appendChild(top);
            // Main
            main.style.backgroundColor = "#4b4b4b";
            main.style.opacity = "0.75";
            main.style.position = "relative";
            main.style.width = "256px";
            main.style.height = "256px";
            // Text
            text.innerHTML = "Drag <code>mp3/mp4/txs</code> files here or click to select";
            text.style.textAlign = "center";
            text.style.boxSizing = "borderbox";
            text.style.paddingTop = "calc(128px - 1em)";
            text.style.paddingBottom = "128px";
            // Top area
            top.style.position = "absolute";
            top.style.width = "256px";
            top.style.height = "256px";
            top.style.top = "0";
            top.classList.add("draganddrop");
            top.addEventListener('dragenter', function () { }, false);
            top.addEventListener('dragleave', function () { }, false);
            top.addEventListener('dragover', function (event) {
                event.stopPropagation();
                event.preventDefault();
            }, false);
            let validExtensions = [
                "mp3",
                "mp4",
                "txs"
            ];
            top.addEventListener("drop", (e) => {
                e.preventDefault();
                e.stopPropagation();
                let files = e.dataTransfer.files;
                for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                    const file = files[fileIndex];
                    importFile(file, fileIndex == files.length - 1);
                }
                setTimeout(() => {
                    SongManager.scanDirectory();
                    // SongManager.saveToFile();
                    // SongManager.refreshList();
                }, 100);
            }, false);
            top.addEventListener("click", () => {
                dialog.showOpenDialog(browserWindow, { "properties": [
                        "multiSelections"
                    ], "filters": [
                        {
                            "name": "",
                            "extensions": validExtensions
                        }
                    ] }).then(ans => {
                    if (ans.canceled) {
                        return;
                    }
                    let files = ans.filePaths;
                    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                        const file = {
                            name: files[fileIndex].split(/\\|\//g).pop(),
                            path: files[fileIndex]
                        };
                        importFile(file, fileIndex == files.length - 1);
                    }
                    setTimeout(() => {
                        SongManager.scanDirectory();
                        // SongManager.saveToFile();
                        // SongManager.refreshList();
                    }, 100);
                });
            });
            /**
             * @param {File} file
             */
            function importFile(file, playOnDone = true) {
                const song = new Song();
                let ext;
                let fileNoExt = (function () {
                    let a = file.name.split(".");
                    ext = a.pop();
                    return a.join(".");
                })();
                if (!validExtensions.includes(ext)) {
                    new Prompt("Invalid File", [
                        "You can only select files with the following extension:",
                        validExtensions.join(", ")
                    ]);
                    return;
                }
                let songPath = Settings.current.songFolder + "/" + fileNoExt;
                let surfix = 0;
                while (fs.existsSync(songPath)) {
                    let len = surfix.toString().length + 3;
                    if (surfix == 0) {
                        songPath += ` (${surfix.toString()})`;
                    }
                    else {
                        songPath = songPath.substring(0, songPath.length - len) + ` (${surfix.toString()})`;
                    }
                    surfix++;
                }
                fs.mkdirSync(songPath, { recursive: true });
                // let ws = fs.createWriteStream(songPath + "/" + file.name);
                fs.copyFileSync(file.path, songPath + "/" + file.name);
                song.songId = SongManager.songList.length;
                while (SongManager.songList.find(s => s.songId == song.songId)) {
                    song.songId++;
                }
                song.path = fileNoExt;
                song.songPath = song.getFullPath("path") + "/" + file.name;
                let parts = fileNoExt.split(" - ");
                if (parts.length == 1) {
                    song.details.artist = "Unknown";
                    song.details.title = parts[0];
                }
                else if (parts.length >= 2) {
                    song.details.artist = parts.shift();
                    song.details.title = parts.join(" - ");
                }
                if (ext.toLowerCase() == "txs") {
                    let zip = new Zip(file.path);
                    zip.extractAllTo(songPath + "/", true);
                    fs.unlinkSync(file.path);
                    fs.unlinkSync(songPath + "/" + file.name);
                }
                SongManager.songList.push(song);
                // song.saveDetails();
                if (playOnDone) {
                    // song.focus();
                    SongManager.refreshList();
                    p.close();
                    setTimeout(() => {
                        song.focus();
                    }, 10);
                }
            }
            return main;
        })());
        p.addContent("or other options:");
        let youtubeBtn = document.createElement("button");
        youtubeBtn.innerText = "Download YouTube Audio";
        youtubeBtn.onclick = function () {
            p.close();
            SongManager.addSongYouTube();
        };
        let close = document.createElement("button");
        close.innerText = "Close";
        close.classList.add("color-red");
        close.onclick = function () {
            p.close();
        };
        p.addButtons([youtubeBtn, close], "fancybutton");
    }
    static addSongLocal() {
        dialog.showOpenDialog(browserWindow, {
            "title": "Add a supported audio/video file",
            "buttonLabel": "Add file",
            "filters": [
                {
                    "name": "",
                    "extensions": [
                        "mp3",
                        "mp4"
                    ]
                }
            ]
        });
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
        p.closeOnEscape();
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
        ytInput.addEventListener("keydown", e => {
            if (e.key == "Enter" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                downloadYouTube.click();
            }
        });
        p.addContent(ytInputArtist);
        ytInputArtist.addEventListener("keydown", e => {
            if (e.key == "Enter" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                downloadYouTube.click();
            }
        });
        p.addContent(ytInputTitle);
        ytInputTitle.addEventListener("keydown", e => {
            if (e.key == "Enter" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                downloadYouTube.click();
            }
        });
        p.addContent(ytProgressBar);
        ytInput.focus();
        var downloadYouTube = document.createElement("button");
        downloadYouTube.innerText = "Download";
        downloadYouTube.classList.add("color-green");
        downloadYouTube.onclick = function () {
            return __awaiter(this, void 0, void 0, function* () {
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
                let dl = new ion.Download("https://i.ytimg.com/vi/" + ytdl.getURLVideoID(url) + "/maxresdefault.jpg", song.getFullPath("background"));
                dl.start(); // Download BG image
                let ws = new fs.WriteStream(song.getFullPath("songPath"));
                let cancelledByUser = false;
                audio.pipe(ws)
                    .on("finish", () => {
                    if (cancelledByUser == true) {
                        return;
                    }
                    SongManager.songList.push(song);
                    SongManager.refreshList();
                    song.play();
                    song.saveDetails();
                    p.close();
                    ws.close();
                    new ElectronNotification({
                        "title": song.path + " finished downloading.",
                        "body": ""
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
                });
                audio.on("progress", (chunk, downloaded, total) => {
                    // const percent = downloaded / total;
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
                    cancel.onclick = function () {
                        cancelledByUser = true;
                        audio.destroy();
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
            });
        };
        let close = document.createElement("button");
        close.innerText = "Close";
        close.classList.add("color-red");
        close.onclick = function () {
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
                        "png",
                        "gif"
                    ],
                    "name": ""
                }
            ]
        })
            .then(handler);
        /**
         * @param {string} pathObject
         */
        function handler(pathObject) {
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
        }
    }
    static selectBackgroundFromURL(song = SongManager.getCurrentlyPlayingSong()) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = Toxen.generate.input({
                "placeholder": "https://example.com/image.jpg",
                modify(obj) {
                    obj.style.width = "100%";
                    obj.addEventListener("input", () => {
                        if (/https?:\/\/.*/g.test(obj.value)) {
                            dlBg.disabled = false;
                        }
                        else {
                            dlBg.disabled = true;
                        }
                    });
                }
            });
            let dlBg = Toxen.generate.button({
                "text": "Download Background",
                "backgroundColor": "green",
                click() {
                    p.return(url.value);
                }
            });
            let p = new Prompt("Download Background", [
                url
            ]);
            p.addButtons([dlBg, "Close"], "fancybutton", true);
            /**
             * @type {string}
             */
            let imageUrl = yield p.promise;
            if (imageUrl == null) {
                return;
            }
            let _ext = path.extname(imageUrl);
            let _path = song.getFullPath("path") + "/background" + (_ext != "" ? _ext : "") + ".tmp";
            let dl = new ion.Download(imageUrl, _path);
            dl.onEnd = function () {
                handler(_path);
            };
            dl.start();
            function handler(pathObject) {
                if (song.background) {
                    try {
                        fs.unlinkSync(song.getFullPath("background"));
                    }
                    catch (_c) { }
                }
                let newPath = pathObject.substring(0, pathObject.length - 4);
                fs.renameSync(pathObject, newPath);
                song.background = song.path + "/" + path.relative(song.getFullPath("path"), newPath);
                Storyboard.setBackground(song.getFullPath("background"));
                SongManager.saveToFile();
            }
        });
    }
    static selectSubtitles(song = SongManager.getCurrentlyPlayingSong()) {
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            "buttonLabel": "Select SRT Subtitle file",
            "filters": [
                {
                    "extensions": [
                        "srt"
                    ],
                    "name": ""
                }
            ]
        })
            .then(handler);
        function handler(pathObject) {
            if (pathObject.filePaths.length == 0) {
                return;
            }
            if (song.subtitlePath) {
                fs.unlinkSync(song.getFullPath("subtitlePath"));
            }
            let newPath = song.getFullPath("path") + "/" + pathObject.filePaths[0].replace(/\\+/g, "/").split("/").pop();
            fs.copyFileSync(pathObject.filePaths[0], newPath);
            song.subtitlePath = song.path + "/" + path.relative(song.getFullPath("path"), newPath);
            if (song.subtitlePath) {
                Subtitles.renderSubtitles(song.getFullPath("subtitlePath"));
            }
            else {
                Subtitles.current = [];
            }
            SongManager.saveToFile();
        }
    }
    static selectStoryboard(song = SongManager.getCurrentlyPlayingSong()) {
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            "buttonLabel": "Select Toxen Storyboard file",
            "filters": [
                {
                    "extensions": [
                        "txn"
                    ],
                    "name": "Toxen Storyboard file"
                }
            ]
        })
            .then(handler);
        function handler(pathObject) {
            if (pathObject.filePaths.length == 0) {
                return;
            }
            if (song.txnScript) {
                fs.unlinkSync(song.getFullPath("txnScript"));
            }
            let newPath = song.getFullPath("path") + "/" + pathObject.filePaths[0].replace(/\\+/g, "/").split("/").pop();
            fs.copyFileSync(pathObject.filePaths[0], newPath);
            song.txnScript = song.path + "/" + path.relative(song.getFullPath("path"), newPath);
            ToxenScriptManager.loadCurrentScript();
            SongManager.saveToFile();
        }
    }
    static selectDefaultBackground() {
        let extensions = [
            "jpg",
            "jpeg",
            "png",
            "gif"
        ];
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            "buttonLabel": "Select Toxen Storyboard file",
            "filters": [
                {
                    "extensions": extensions,
                    "name": "Image files"
                }
            ]
        })
            .then(handler);
        function handler(pathObject) {
            if (pathObject.filePaths.length == 0) {
                return;
            }
            let _path = Settings.current.songFolder + "/default" + path.extname(pathObject.filePaths[0]);
            for (let i = 0; i < extensions.length; i++) {
                const ext = extensions[i];
                if (fs.existsSync(Settings.current.songFolder + "/default." + ext))
                    fs.unlinkSync(Settings.current.songFolder + "/default." + ext);
            }
            fs.copyFileSync(pathObject.filePaths[0], _path);
            SongManager.saveToFile();
            try {
                Storyboard.setBackground(SongManager.getCurrentlyPlayingSong().getFullPath("background"));
            }
            catch (_c) { }
        }
    }
}
exports.SongManager = SongManager;
/**
 * Full list of available songs.
 */
SongManager.songList = [];
/**
 * List of playable songs from a search.
 */
SongManager.playableSongs = [];
/**
 * @type {HTMLDivElement}
 */
SongManager.songListElement = null;
SongManager.player = null;
/**
 * This should be set by the client.
 */
SongManager.onplay = function (song) { };
class SongGroup {
    /**
     * @param {string} name Name for this group container.
     */
    constructor(name) {
        /**
         * @type {Song[]}
         */
        this.songList = [];
        /**
         * @type {string}
         */
        this.name = null;
        /**
         * @type {HTMLSongGroupElement}
         */
        this.element = null;
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
        let self = this;
        this.element.addEventListener("contextmenu", function (e) {
            e.stopPropagation();
            e.preventDefault();
            menus.songGroupMenu.items.forEach((i) => {
                i.songGroup = self;
            });
            menus.songGroupMenu.popup({
                "x": e.clientX,
                "y": e.clientY
            });
        });
    }
    refreshList() {
        this.element.innerHTML = "";
        let inner = document.createElement("div");
        inner.classList.add("songgrouphead");
        inner.innerHTML = (() => {
            let p = document.createElement("p");
            p.classList.add("songgrouphead");
            p.innerHTML = (this.collapsed ? "►" : "▼") + ionMarkDown_1.Imd.MarkDownToHTML(this.name);
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
    set collapsed(value) {
        let res = this.element.toggleAttribute("collapsed", value);
        try {
            if (res) {
                this.element.firstChild.firstChild.innerHTML = "►" + ionMarkDown_1.Imd.MarkDownToHTML(this.name);
            }
            else {
                this.element.firstChild.firstChild.innerHTML = "▼" + ionMarkDown_1.Imd.MarkDownToHTML(this.name);
            }
        }
        catch (_c) { }
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
    focus() {
        this.element.scrollIntoViewIfNeeded();
        Settings.current.revealSongPanel();
    }
    /**
     * @param {boolean} collapsedCondition Whether it should return all with collapsed true, or collapsed false. Omit to ignore and return all.
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
        // Removes duplicates
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
exports.SongGroup = SongGroup;
/**
 * @type {SongGroup[]}
 */
SongGroup.songGroups = [];
const menus = {
    "songMenu": Menu.buildFromTemplate([
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
            label: "Select/Deselect",
            click: (menuItem) => {
                /**
                 * @type {Song}
                 */
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.toggleSelect();
                }
            }
        },
        {
            label: "Add to playlist...",
            click: (menuItem) => {
                /**
                 * @type {Song}
                 */
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.addToPlaylist();
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
            label: "Set Background",
            click(menuItem) {
                /**
                 * @type {Song}
                 */
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    SongManager.selectBackground(song);
                }
            }
        },
        {
            label: "Set Background from URL",
            click(menuItem) {
                /**
                 * @type {Song}
                 */
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    SongManager.selectBackgroundFromURL(song);
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
                    // if (song.txnScript != null && fs.existsSync(song.getFullPath("txnScript"))) {
                    // }
                    ScriptEditor.open(song);
                    browserWindow.webContents.send("updatediscordpresence");
                }
            }
        },
        {
            type: "separator"
        },
        {
            label: "Export song",
            click: (menuItem) => {
                /**
                 * @type {Song}
                 */
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.export();
                }
            }
        },
        {
            label: "Trim song",
            click: (menuItem) => {
                /**
                 * @type {Song}
                 */
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.trim();
                }
            }
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
                    let ans = dialog.showMessageBoxSync(remote.getCurrentWindow(), {
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
                    song.delete();
                }
            }
        },
        { type: "separator" },
        {
            label: "Focus currently playing song.",
            click: () => {
                Settings.current.revealSongPanel();
                SongManager.getCurrentlyPlayingSong().focus();
            }
        },
    ]),
    "selectedSongMenu": Menu.buildFromTemplate([
        {
            label: "Export songs",
            click: (menuItem) => {
                /**
                 * @type {Song[]}
                 */
                const songs = SongManager.getSelectedSongs();
                SongManager.exportAll(null, songs);
            }
        },
        {
            label: "Delete songs",
            click: (menuItem) => {
                /**
                 * @type {Song[]}
                 */
                const songs = SongManager.getSelectedSongs();
                let ans = dialog.showMessageBoxSync(remote.getCurrentWindow(), {
                    "buttons": [
                        "Delete all",
                        "Cancel"
                    ],
                    "message": "Delete the following songs?:" + `${(function () {
                        let text = "";
                        for (let i = 0; i < songs.length; i++) {
                            const song = songs[i];
                            text += `\n"${song.details.artist} - ${song.details.title}"`;
                        }
                        return text;
                    })()}`,
                    "defaultId": 1,
                    "noLink": true
                });
                if (ans !== 0) {
                    return;
                }
                for (let i = 0; i < songs.length; i++) {
                    songs[i].delete();
                }
            }
        },
        { type: "separator" },
        {
            label: "Select/Deselect",
            click: (menuItem) => {
                /**
                 * @type {Song}
                 */
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.toggleSelect();
                }
            }
        },
        {
            label: "Deselect all",
            click: (menuItem) => {
                SongManager.getSelectedSongs().forEach(s => s.deselect());
            }
        },
        { type: "separator" },
        {
            label: "Focus currently playing song.",
            click: () => {
                Settings.current.revealSongPanel();
                SongManager.getCurrentlyPlayingSong().focus();
            }
        },
    ]),
    "songGroupMenu": Menu.buildFromTemplate([
        {
            label: "Toggle group",
            click: (menuItem) => {
                /**
                 * @type {SongGroup}
                 */
                const songGroup = menuItem.songGroup;
                if (songGroup instanceof SongGroup) {
                    songGroup.collapse();
                }
            }
        },
        {
            label: "Open only this group",
            click: (menuItem) => {
                /**
                 * @type {SongGroup}
                 */
                const songGroup = menuItem.songGroup;
                if (songGroup instanceof SongGroup) {
                    SongGroup.getAllGroups(false).forEach(sg => sg.collapsed = true);
                    songGroup.collapsed = false;
                    songGroup.focus();
                    Effect.flashElement(songGroup.element);
                }
            }
        },
        {
            type: "separator"
        },
        {
            label: "Open all groups",
            click: (menuItem) => {
                /**
                 * @type {SongGroup}
                 */
                const songGroup = menuItem.songGroup;
                SongGroup.getAllGroups(true).forEach(sg => sg.collapsed = false);
                if (songGroup instanceof SongGroup) {
                    songGroup.focus();
                    Effect.flashElement(songGroup.element);
                }
            }
        },
        {
            label: "Close all groups",
            click: (menuItem) => {
                SongGroup.getAllGroups(false).forEach(sg => sg.collapsed = true);
                /**
                 * @type {SongGroup}
                 */
                const songGroup = menuItem.songGroup;
                if (songGroup instanceof SongGroup) {
                    songGroup.focus();
                    Effect.flashElement(songGroup.element);
                }
            }
        },
        {
            type: "separator"
        },
        {
            label: "Focus currently playing song.",
            click: () => {
                Settings.current.revealSongPanel();
                SongManager.getCurrentlyPlayingSong().focus();
            }
        },
    ]),
    "selectBackgroundMenu": Menu.buildFromTemplate([
        {
            label: "Select from file",
            click() {
                SongManager.selectBackground();
            }
        },
        {
            label: "Select from URL",
            click() {
                SongManager.selectBackgroundFromURL();
            }
        }
    ])
};
/**
 * Electron Menu
 * @type {Electron.Menu}
 */
var menu = reloadMenu();
function reloadMenu() {
    let menu = Menu.buildFromTemplate([
        {
            label: "File",
            submenu: [
                {
                    label: "Restart Toxen",
                    click() {
                        Toxen.restart();
                    },
                    accelerator: "CTRL + F5"
                },
                {
                    type: "separator"
                },
                {
                    label: "Statistics",
                    click() {
                        Statistics.current.display();
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Exit",
                    click() {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: "Song Manager",
            submenu: [
                {
                    label: "Add Song",
                    click() {
                        SongManager.addSong();
                    }
                },
                {
                    label: "Set Background for current song",
                    click() {
                        SongManager.selectBackground();
                    }
                },
                { type: "separator" },
                {
                    "label": "Next Song",
                    click() {
                        local_playNext();
                    },
                    "accelerator": "CTRL + Right"
                },
                {
                    "label": "Previous Song",
                    click() {
                        SongManager.playPrev();
                    },
                    "accelerator": "CTRL + Left"
                },
                {
                    "label": "Next Random",
                    click() {
                        SongManager.playRandom();
                    },
                },
                { type: "separator" },
                {
                    "label": "Toggle Shuffle",
                    click() {
                        SongManager.toggleShuffle();
                    },
                },
                { type: "separator" },
                {
                    label: "Select Playlist",
                    submenu: (function () {
                        let menus = (Settings && Settings.current && Array.isArray(Settings.current.playlists) ? Settings.current.playlists.map(playlist => {
                            return new remote.MenuItem({
                                "label": playlist,
                                click() {
                                    Settings.current.selectPlaylist(playlist);
                                },
                                "type": "radio",
                                "checked": Settings.current.playlist && Settings.current.playlist == playlist ? true : false
                            });
                        }) : []);
                        menus.unshift(({
                            "label": "No Playlist Selected",
                            click() {
                                Settings.current.selectPlaylist("%null%");
                            },
                            "type": "radio",
                            "checked": Settings && Settings.current && Settings.current.playlist ? false : true
                        }));
                        return Menu.buildFromTemplate(menus);
                    })(),
                    id: "playlists"
                },
                {
                    label: "New playlist...",
                    click() {
                        Settings.current.addPlaylist();
                    }
                },
                {
                    label: "Show currently playing song",
                    click() {
                        Settings.current.revealSongPanel();
                        SongManager.getCurrentlyPlayingSong().focus();
                    },
                    "accelerator": "CTRL + SHIFT + F"
                },
            ]
        },
        {
            label: "Window",
            submenu: [
                {
                    label: "Reload Window",
                    click() {
                        browserWindow.reload();
                    },
                    accelerator: "F5"
                },
                {
                    label: "Toggle Fullscreen",
                    click() {
                        let mode = !browserWindow.isFullScreen();
                        browserWindow.setFullScreen(mode);
                        browserWindow.setMenuBarVisibility(!mode);
                    },
                    accelerator: "F11"
                }
            ]
        },
        {
            label: "Developer Tools",
            click() {
                browserWindow.webContents.toggleDevTools();
            },
            accelerator: "F12"
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Tutorial",
                    click() {
                        showTutorial();
                    }
                },
                {
                    label: "Toxen.net Website",
                    click() {
                        // Open Toxen.net
                        shell.openExternal("https://toxen.net/");
                    }
                },
                {
                    label: "Official Discord",
                    click() {
                        // Open Discord Page
                        shell.openExternal("https://discord.gg/TCDWjJS");
                    }
                },
            ]
        },
    ]);
    return menu;
}
// Menu.setApplicationMenu(menu);
class Storyboard {
    /**
     * Fade into a RGB color.
     * @param {number} red
     * @param {number} green
     * @param {number} blue
     */
    static rgb(red = Storyboard.red, green = Storyboard.green, blue = Storyboard.blue) {
        if (!isNaN(red) && typeof red != "number") {
            Storyboard.red;
        }
        if (!isNaN(green) && typeof green != "number") {
            Storyboard.green;
        }
        if (!isNaN(blue) && typeof blue != "number") {
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
     * @param image The path to the image
     * @param queryString An extra query string for updating cache.
     * @param reset If true, removes background.
     */
    static setBackground(image, queryString, reset) {
        if (queryString == undefined) {
            try {
                queryString = fs.statSync(image).ctimeMs.toString();
            }
            catch (e) {
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
            if (curBG != null)
                curBG = curBG.replace(/\\/g, "/");
            if (Settings.current.remote && curBG != "" && curBG != null) {
                Storyboard.currentBackground = image;
                body.style.background = "url(\"" + curBG + "\") no-repeat center center fixed black";
                body.style.backgroundSize = "cover";
            }
            else if (curBG != "" && curBG != null) {
                Storyboard.currentBackground = image;
                body.style.background = "url(\"" + curBG + "?" + queryString + "\") no-repeat center center fixed black";
                body.style.backgroundSize = "cover";
            }
            else {
                var defImg = Settings.current.lightThemeBase ? "../iconlight.png" : "../icon.png";
                Storyboard.currentBackground = defImg;
                if (!Settings.current.remote) {
                    let valid = [
                        "jpg",
                        "png",
                        "jpeg",
                        "gif"
                    ];
                    for (let i = 0; i < valid.length; i++) {
                        const item = valid[i];
                        if (fs.existsSync(Settings.current.songFolder + "/default." + item)) {
                            defImg = Settings.current.songFolder + "/default." + item;
                            Storyboard.currentBackground = defImg;
                            body.style.background = "url(\"" + defImg.replace(/\\/g, "/") + "?" + queryString + "\") no-repeat center center fixed black";
                            body.style.backgroundSize = "cover";
                            break;
                        }
                    }
                }
                else {
                    Storyboard.currentBackground = defImg;
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
    static setAnalyserFftLevel(size) {
        Storyboard.setAnalyserFftSize(Math.pow(size, 2));
    }
    static setAnalyserFftSize(size) {
        Storyboard.analyser.fftSize = Debug.clamp(size, 32, 32768);
        Storyboard.bufferLength = Storyboard.analyser.frequencyBinCount / 2;
        Storyboard.dataArray = new Uint8Array(Storyboard.bufferLength);
    }
}
exports.Storyboard = Storyboard;
Storyboard.red = 25;
Storyboard.green = 0;
Storyboard.blue = 250;
Storyboard.toRed = 25;
Storyboard.toGreen = 0;
Storyboard.toBlue = 250;
Storyboard.visualizerIntensity = 15;
Storyboard.visualizerStyle = 0;
Storyboard.visualizerDirection = 0;
/**
 * @readonly
 * The currently shown background dim value.
 * **Note:** This is often different from the ``Settings.backgroundDim`` setting, as this is dynamic.
 * @type {number}
 */
Storyboard.currentBackgroundDim = 0;
Storyboard.currentBackground = "";
Storyboard.analyser = null;
Storyboard.bufferLength = 256;
Storyboard.dataArray = null;
Storyboard._fadingEnabled = false;
class Subtitles {
    static parseSrt(srtPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var srtText;
                if (Settings.current.remote) {
                    srtText = yield (yield fetch(srtPath)).text();
                }
                else {
                    srtText = fs.readFileSync(srtPath, "utf8");
                }
            }
            catch (e) {
                console.error(e);
                return null;
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
                        newSub.text += ionMarkDown_1.Imd.MarkDownToHTML(lines[i]) + "\n";
                        i++;
                    }
                    subData.push(newSub);
                }
            }
            //Returning
            return subData;
        });
    }
    static renderSubtitles(srtFile) {
        return __awaiter(this, void 0, void 0, function* () {
            Subtitles.current = yield Subtitles.parseSrt(srtFile);
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
        });
    }
}
/**
 * @type {{ id: number, startTime: number, endTime: number, text: string }[]}
 */
Subtitles.current = [];
Subtitles.isRendering = false;
//#region ToxenScript Objects
/**
 * ToxenScript: Background Pulse
 */
class Pulse {
    constructor() {
        /**
         * @type {Pulse[]}
         */
        this.allPulses = [];
        /**
         * @type {HTMLDivElement}
         */
        this.left = null;
        /**
         * @type {HTMLDivElement}
         */
        this.right = null;
        this._width = 0;
        this.lastPulse = 0;
        this.interval = setInterval(() => {
            if (this.width > 0) {
                this.width -= Math.max(Math.min(this.width, 1), (this.width / Storyboard.visualizerIntensity) * 2);
                let opacity = (this.width / this.lastPulse);
                this.left.style.opacity = opacity;
                this.right.style.opacity = opacity;
            }
        }, 10);
        const leftDiv = document.createElement("div");
        leftDiv.style.position = "absolute";
        leftDiv.style.top = "0";
        leftDiv.style.left = "0";
        leftDiv.style.background = "linear-gradient(-90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.8) 100%)";
        leftDiv.style.height = "100vh";
        this.left = leftDiv;
        const rightDiv = document.createElement("div");
        rightDiv.style.position = "absolute";
        rightDiv.style.top = "0";
        rightDiv.style.right = "0";
        rightDiv.style.background = "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.8) 100%)";
        rightDiv.style.height = "100vh";
        this.right = rightDiv;
        this.allPulses.push(this);
        setTimeout(() => {
            SongManager.player.parentElement.insertBefore(leftDiv, SongManager.player);
            SongManager.player.parentElement.insertBefore(rightDiv, SongManager.player);
        }, 0);
    }
    set width(value) {
        this._width = value;
        this.left.style.width = this._width + "px";
        this.right.style.width = this._width + "px";
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
    destroy() {
        this.left.parentElement.removeChild(this.left);
        this.right.parentElement.removeChild(this.right);
        clearInterval(this.interval);
    }
}
/**
 * ToxenScript: Storyboard Object
 */
class StoryboardObject {
    /**
     * Create a new Storyboard object.
     * @param name Identifier of this object
     * @param x Starting X Position
     * @param y Starting Y Position
     * @param fill Either a HEX color or an image URL. If it starts with a poundsign (`#`), it's used as HEX, URL otherwise.
     */
    constructor(name, x, y, fill) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.fill = fill;
    }
}
/**
 * @type {{[name: string]: StoryboardObject}}
 */
StoryboardObject.objects = {};
/**
 * This is temporary plz
 * @type {Pulse}
 */
var testPulse;
window.addEventListener("load", () => testPulse = new Pulse());
/**
 * Toxen Script Manager
 *
 * Controls and manages Toxen's storyboard scripting.
 * All event types are stored in `eventFunctions` as an object.
 */
class ToxenScriptManager {
    /**
     * Loads or reloads the script for the currently playing song.
     */
    static loadCurrentScript() {
        return __awaiter(this, void 0, void 0, function* () {
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
            Storyboard.rgb(Settings.current.visualizerColor.red, Settings.current.visualizerColor.green, Settings.current.visualizerColor.blue);
            let song = SongManager.getCurrentlyPlayingSong();
            if (Settings.current.remote && song.txnScript) {
                ToxenScriptManager.scriptParser(song.getFullPath("txnScript"));
            }
            else if (song.txnScript && fs.existsSync(song.getFullPath("txnScript"))) {
                ToxenScriptManager.scriptParser(song.getFullPath("txnScript"));
            }
        });
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
     * Parses ToxenScript files for storyboard effects and applies them to the current storyboard.
     * @param {string} scriptFile Path to script file.
     */
    static scriptParser(scriptFile) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ToxenScriptManager.isRunning === false) {
                // Too many unnecessary updates
                // ToxenScriptManager.isRunning = setInterval(() => {
                //   if (ToxenScriptManager.events.length > 0 && Settings.current.storyboard) {
                //     for (let i = 0; i < ToxenScriptManager.events.length; i++) {
                //       /**
                //        * @type {ToxenEvent}
                //        */
                //       const e = ToxenScriptManager.events[i];
                //       if (SongManager.player.currentTime >= e.startPoint && SongManager.player.currentTime <= e.endPoint) {
                //         e.fn();
                //       }
                //     }
                //   }
                // }, 0);
                // Updates only when required.
                ToxenScriptManager.isRunning = true;
                let _gl = function () {
                    if (Settings.current.storyboard && ToxenScriptManager.events.length > 0) {
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
                    requestAnimationFrame(_gl);
                };
                requestAnimationFrame(_gl);
            }
            // Watching file for changes.
            fs.unwatchFile(ToxenScriptManager.currentScriptFile);
            if (!Settings.current.remote) {
                fs.watchFile(scriptFile, () => {
                    ToxenScriptManager.loadCurrentScript();
                });
            }
            ToxenScriptManager.currentScriptFile = scriptFile;
            let data;
            if (Settings.current.remote) {
                data = (yield (yield fetch(scriptFile)).text()).split("\n");
            }
            else {
                data = fs.readFileSync(scriptFile, "utf8").split("\n");
            }
            for (let i = 0; i < data.length; i++) {
                const line = data[i].trim().replace(/(#|\/\/).*/g, "");
                if (typeof line == "string" && line != "") {
                    let fb = lineParser(line);
                    if (fb == undefined)
                        continue;
                    // Failures
                    if (typeof fb == "string") {
                        setTimeout(() => {
                            new Prompt("Parsing error", ["Failed parsing script:", "\"" + scriptFile + "\"", "Error at line " + (i + 1), (typeof fb == "string" ? fb : "")])
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
                ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint = ToxenScriptManager.timeStampToSeconds("4:00:00");
            }
            if (ToxenScriptManager.events[ToxenScriptManager.events.length - 1] && isNaN(ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint)) {
                ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint = ToxenScriptManager.timeStampToSeconds("4:00:00");
            }
            /**
             * Checks a line and parses it.
             * @param line Current line of the script.
             */
            function lineParser(line) {
                try { // Massive trycatch for any error.
                    let maxPerSecond = 0;
                    const checkVariable = /(?<=^\s*)(\$\w+)\s*(=>?|:)\s*"(.*?[^\\])"/g;
                    if (checkVariable.test(line)) {
                        line.replace(checkVariable, function (item, $1, $2) {
                            $2 = $2.replace(/\\"/g, "\"");
                            $2 = ToxenScriptManager.applyVariables($2);
                            ToxenScriptManager.variables[$1] = $2;
                            return "";
                        });
                        return;
                    }
                    const checkRawVariable = /(?<=^\s*)(@\w+)\s*(?:=>?|:)\s*(.*)/g;
                    if (checkRawVariable.test(line)) {
                        line.replace(checkRawVariable, function (item, $1, $2) {
                            // $2 = $2.replace(/\\"/g, "\"");
                            $2 = ToxenScriptManager.applyVariables($2);
                            ToxenScriptManager.variables[$1] = $2;
                            return "";
                        });
                        return;
                    }
                    // Replace variables
                    line = ToxenScriptManager.applyVariables(line);
                    const checkMaxPerSecond = /^\b(once|twice|thrice|quad)\b/g;
                    const checkMaxPerSecondAlt = /^\b(\d+)\/(\d+)\b/g;
                    if (checkMaxPerSecond.test(line)) {
                        line.replace(checkMaxPerSecond, function (item) {
                            switch (item) {
                                case "once":
                                    maxPerSecond = 1;
                                    break;
                                case "twice":
                                    maxPerSecond = 2;
                                    break;
                                case "thrice":
                                    maxPerSecond = 3;
                                    break;
                            }
                            return "";
                        });
                    }
                    else if (checkMaxPerSecondAlt.test(line)) {
                        var returnError = "";
                        line.replace(checkMaxPerSecondAlt, function (item, num1, num2) {
                            if (+num1 > 0 && +num2 > 0)
                                maxPerSecond = 1 / (+num1 / +num2);
                            else
                                returnError = "Limiter prefix cannot include a 0.";
                            return "";
                        });
                        if (returnError !== "")
                            return returnError;
                    }
                    // Check if non-time function
                    const checkFunction = /^\s*:(\S*?)\s*(=>?|:)s*.*/g;
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
                    const typeReg = /(?<=\[.+\s*-\s*\S+\]\s*)\S*(?=\s*(=>?|:))/g;
                    const argReg = /(?<=\[.+\s*-\s*\S+\]\s*\S*\s*(=>?|:)\s*).*/g;
                    // Variables
                    var startPoint = 0;
                    var endPoint = 0;
                    var args = [];
                    var fn = (args = []) => { };
                    // Parsing...
                    var timeRegResult = line.match(timeReg)[0];
                    timeRegResult = timeRegResult.replace(/\s/g, "");
                    var tP = timeRegResult.split("-");
                    startPoint = tP[0];
                    endPoint = tP[1];
                    if (startPoint != "$") { // Maybe add this as a features just like endPoint...
                        startPoint = ToxenScriptManager.timeStampToSeconds(tP[0]);
                    }
                    else {
                        startPoint = ToxenScriptManager.events[ToxenScriptManager.events.length - 1] ? ToxenScriptManager.events[ToxenScriptManager.events.length - 1].startPoint : 0;
                    }
                    if (endPoint != "$") {
                        endPoint = ToxenScriptManager.timeStampToSeconds(tP[1]);
                    }
                    // else {
                    //   endPoint = "$";
                    // }
                    let backwards = 1;
                    let curEvent;
                    while ((curEvent = ToxenScriptManager.events[ToxenScriptManager.events.length - backwards])) {
                        if (curEvent.endPoint == "$" && curEvent.startPoint < startPoint) {
                            curEvent.endPoint = startPoint;
                            break;
                        }
                        backwards++;
                    }
                    // if (ToxenScriptManager.events[ToxenScriptManager.events.length - 1] && ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint == "$") {
                    //   ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint = startPoint;
                    // }
                    if (startPoint >= endPoint) { // Catch error if sP is higher than eP
                        return "startPoint cannot be higher than endPoint";
                    }
                    var type = line.match(typeReg)[0].toLowerCase();
                    if (typeof type != "string") {
                        return "Invalid type format.";
                    }
                    // only compatible with "once"
                    if (maxPerSecond == 0 && /\b(huecolor|hueandvisualizercolor)\b/g.test(type)) {
                        return "Invalid type compatibility.\n" + type + " is required to use a limiter prefix.";
                    }
                    // incompatible compatible with "once"
                    if (maxPerSecond > 0 && /\b(bpmpulse)\b/g.test(type)) {
                        console.warn("Irrelevant limiter.\n" + type + " cannot use a limiter prefix and has been ignored.");
                    }
                    let _matches = line.match(argReg);
                    if (_matches == null) {
                        _matches = [];
                    }
                    var argString = _matches[0];
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
                    if (typeof argString == "string")
                        args = parseArgumentsFromString(argString.trim());
                    else
                        args = [];
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
                        for (let i = 0; i < beatCount; i++) {
                            let st = +(startPoint + (i * (mspb / 1000))).toFixed(3);
                            let et = +(startPoint + ((i + 1) * (mspb / 1000))).toFixed(3);
                            let cmd = `[${st} - ${et}] Pulse => "${intensity}"`;
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
                                ToxenScriptManager.eventFunctions[type](args, currentEvent);
                            }
                            catch (error) {
                                console.error(error, type, args, currentEvent);
                            }
                            setTimeout(() => {
                                currentEvent.hasRun = false;
                            }, (1000 / maxPerSecond));
                        }
                        else if (maxPerSecond == 0 && !type.startsWith(":")) {
                            try {
                                ToxenScriptManager.eventFunctions[type](args, currentEvent);
                            }
                            catch (error) {
                                console.error(error, type, args, currentEvent);
                            }
                        }
                        else if (type.startsWith(":") && currentEvent.hasRun == false) {
                            try {
                                ToxenScriptManager.eventFunctions[type](args, currentEvent);
                            }
                            catch (error) {
                                console.error(error, type, args, currentEvent);
                            }
                        }
                        currentEvent.hasRun = true;
                    };
                    currentEvent.fn = fn;
                    currentEvent.type = type;
                    if (typeof ToxenScriptManager.eventFunctions[type] == undefined) {
                        return `Type "${type.toLowerCase()}" is not valid.`;
                    }
                }
                catch (error) { // Catch any error
                    return {
                        "success": false,
                        "error": error
                    };
                }
            }
        });
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
                "function": function ($0, $1) {
                    if (!/[^\s\d]/g.test($1)) {
                        return `<span class=toxenscript_number>${$0}</span>`;
                    }
                    return `<span class=toxenscript_string>${$0}</span>`;
                }
            },
            "$var": {
                "expression": /\$\w+/g,
                "function": function ($0, $1) {
                    return `<span class=toxenscript_var>${$0}</span>`;
                }
            },
            "@rawvar": {
                "expression": /@\w+/g,
                "function": function ($0, $1) {
                    return `<span class=toxenscript_rawvar>${$0}</span>`;
                }
            },
            "limiter": {
                "expression": /(?<=\s*)(once|twice|thrice|quad|(\d+)\/(\d+))/gm,
                "function": function ($0) {
                    return `<span class=toxenscript_limiter>${$0}</span>`;
                }
            },
            "event": {
                "expression": /((?<=\[.*\]\s*)[A-z]+)|:[A-z]+/g,
                "function": function ($0) {
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
                "function": function ($0, $1, $2) {
                    if ($2 && ToxenScriptManager.timeStampToSeconds($1) > ToxenScriptManager.timeStampToSeconds($2)) {
                        return `<span class=toxenscript_timinginvalid>${$0}</span>`;
                    }
                    return `<span class=toxenscript_timing>${$0}</span>`;
                }
            },
            "comment": {
                "expression": /(#|\/\/).*/g,
                "function": function ($0) {
                    let d = document.createElement("div");
                    d.innerHTML = $0;
                    $0 = d.innerText;
                    return `<span class=toxenscript_comment>${$0}</span>`;
                }
            },
            "link": {
                "expression": /https?:\/\/(.*\.)*.*\.[^\s<>]*/g,
                "function": function ($0) {
                    // $0 = $0.replace(/<\/?.*?>/g, "");
                    return `<a class=toxenscript_number title='${$0}' onclick='shell.openExternal(this.title)' style='pointer-events:all;'>${$0}</a>`;
                }
            },
        };
        for (const key in regex) {
            if (regex.hasOwnProperty(key)) {
                const obj = regex[key];
                code = code.replace(obj.expression, obj.function);
            }
        }
        return code;
    }
    /**
     * Convert a timestamp into seconds.
     * @param timestamp Time in format "hh:mm:ss".
     */
    static timeStampToSeconds(timestamp, throwError = false) {
        if (typeof timestamp !== "string")
            timestamp = timestamp + "";
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
            if (!throwError) {
                var p = new Prompt("Music Script Error", "Unable to convert timestamp \"" + timestamp + "\" to a valid timing point.");
                const btn = p.addButtons("welp, fuck", "fancybutton");
                btn.addEventListener("click", () => {
                    p.closeOnEscape();
                    p.close();
                });
            }
            else {
                throw error;
            }
            return null;
        }
    }
    /**
     * Convert seconds to digital time format.
     * @param {number} seconds
     */
    static convertSecondsToDigitalClock(seconds, trim = false) {
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
            time += "0" + (curNumber) + ".";
        }
        else {
            time += curNumber + ".";
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
        while (trim == true && time.startsWith("00:")) {
            time = time.substring(3);
        }
        return time;
    }
}
exports.ToxenScriptManager = ToxenScriptManager;
ToxenScriptManager.currentScriptFile = "";
ToxenScriptManager.isRunning = false;
/**
 * @type {{[$name: string]: string}}
 */
ToxenScriptManager.variables = {};
/**
 * Default variable set.
 * @type {{[$name: string]: string}}
 */
ToxenScriptManager.defaultVariables = {
    "$end": function () {
        try {
            let s = SongManager.getCurrentlyPlayingSong();
            if (s.details.songLength > 0) {
                return s.details.songLength.toString();
            }
            return "100000";
        }
        catch (error) {
            return "100000";
        }
    }
};
/**
 * Function Types for ToxenScript.
 */
ToxenScriptManager.eventFunctions = {
    /**
     * Change the image of the background.
     * @param {[string]} args Arguments.
     */
    background: function (args) {
        let song = SongManager.getCurrentlyPlayingSong();
        let _path = song.getFullPath("path") + "/" + args[0];
        if (Storyboard.currentBackground != _path) {
            Storyboard.setBackground(_path, "");
        }
    },
    /**
     * Change the color of the visualizer
     * @param {[string | number, string | number, string | number]} args Arguments
     */
    visualizercolor: function (args, event) {
        if (!isNaN(args[0])) {
            for (let i = 1; i < 3; i++) {
                if (isNaN(args[i]))
                    args[i] = 0;
            }
        }
        else {
            try {
                let rgb = args[0].toLowerCase() == "default" ? Settings.current.visualizerColor : Debug.cssColorToRgb(args[0]);
                args[0] = rgb.red;
                args[1] = rgb.green;
                args[2] = rgb.blue;
            }
            catch (error) {
                args[0] = Settings.current.visualizerColor.red;
                args[1] = Settings.current.visualizerColor.green;
                args[2] = Settings.current.visualizerColor.blue;
                console.warn(error);
            }
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
        if (!isNaN(args[1])) {
            for (let i = 2; i < 4; i++) {
                if (isNaN(args[i]))
                    args[i] = 0;
            }
        }
        else {
            try {
                let rgb = args[1].toLowerCase() == "default" ? Settings.current.visualizerColor : Debug.cssColorToRgb(args[1]);
                args[4] = args[2];
                args[1] = rgb.red;
                args[2] = rgb.green;
                args[3] = rgb.blue;
            }
            catch (error) {
            }
        }
        let brightness = 100;
        let lights = args[0].split(",");
        if (args[4] !== undefined) {
            brightness = +args[4];
        }
        brightness = 100 - Storyboard.currentBackgroundDim;
        if (exports.hueApi)
            for (let i = 0; i < lights.length; i++)
                exports.hueApi.lights.setLightState(+lights[i], new node_hue_api_1.v3.lightStates.LightState().on(true).rgb(+args[1], +args[2], +args[3]).brightness(brightness));
    },
    /**
     * Change the color of a Hue Light and Visualizer.
     */
    hueandvisualizercolor: function (args) {
        if (!isNaN(args[1])) {
            for (let i = 2; i < 4; i++) {
                if (isNaN(args[i]))
                    args[i] = 0;
            }
        }
        else {
            try {
                let rgb = args[1].toLowerCase() == "default" ? Settings.current.visualizerColor : Debug.cssColorToRgb(args[1]);
                args[4] = args[2];
                args[1] = rgb.red;
                args[2] = rgb.green;
                args[3] = rgb.blue;
            }
            catch (error) {
            }
        }
        Storyboard.rgb(+args[1], +args[2], +args[3]);
        let brightness = 100;
        let lights = args[0].split(",");
        if (args[4] !== undefined) {
            brightness = +args[4];
        }
        brightness = 100 - Storyboard.currentBackgroundDim;
        if (exports.hueApi)
            for (let i = 0; i < lights.length; i++)
                exports.hueApi.lights.setLightState(+lights[i], new node_hue_api_1.v3.lightStates.LightState().on(true).rgb(+args[1], +args[2], +args[3]).brightness(brightness));
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
    bpmpulse: function () {
        // This function doesn't do anything.
        // BPMPulse is converted to Pulses when parsed.
    },
    log: function () {
        console.log([...arguments[0]]);
    },
    // :Functions
    /**
     * Connect to a hue bridge.
     */
    ":hueconnect": function ([type, ip, user, clientKey]) {
        return __awaiter(this, void 0, void 0, function* () {
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
                exports.hueApi = yield node_hue_api_1.v3.api.createInsecureLocal(ipAddress).connect(hueUser.username, hueUser.clientKey);
                console.log("Hue is now connected.");
            }
            else {
                console.error("Missing arguments. Please make sure all the data is correct.\n" +
                    `ipAddress: ${ipAddress}\nhueUser.username: ${hueUser.username}\nhueUser.clientkey: ${hueUser.clientKey}`);
            }
        });
    },
    ":log": function () {
        console.log([...arguments[0]]);
    },
    ":createobject": function ([name], event) {
        // let o = new StoryboardObject();
        // StoryboardObject.objects[name] = o;
    }
};
/**
 * Function Types for ToxenScript
 * @type {{[eventName: string]: string}}
 */
ToxenScriptManager.eventDocs = {};
/**
 * List of events in order for the current song.
 */
ToxenScriptManager.events = [];
class ToxenEvent {
    /**
     * Create a new Event
     * @param {number} startPoint Starting point in seconds.
     * @param {number} endPoint Ending point in seconds.
     * @param fn Function to run at this interval.
     */
    constructor(startPoint, endPoint, fn) {
        this.hasRun = false;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.fn = fn;
    }
}
class Debug {
    static updateCSS() {
        let links = document.querySelectorAll("link");
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (/\.css(\?.*)?$/g.test(link.href)) {
                if (link.href.includes("?")) {
                    link.href = link.href.replace(/(?<=.+)\?.*/g, "?" + Debug.generateRandomString());
                }
                else {
                    link.href += "?" + Debug.generateRandomString();
                }
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
    // Yeeted from StackOverflow
    // https://stackoverflow.com/a/5624139/8614415
    /**
     * @param {number} c
     */
    static componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
    static rgbToHex(red, green, blue) {
        return "#" + Debug.componentToHex(red) + Debug.componentToHex(green) + Debug.componentToHex(blue);
    }
    /**
     * @typedef {{"red": number, "green": number, "blue": number}} RGB
     * @param {string} hex
     */
    static hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        /**
         * @type {RGB}
         */
        let rgb = {
            red: 0,
            green: 0,
            blue: 0,
        };
        let retrn = result ? (rgb = {
            red: parseInt(result[1], 16),
            green: parseInt(result[2], 16),
            blue: parseInt(result[3], 16)
        }) : null;
        return retrn;
    }
    /**
     * @param {string} str
     */
    static cssColorToHex(str) {
        var ctx = document.createElement("canvas").getContext("2d");
        ctx.fillStyle = str;
        return ctx.fillStyle;
    }
    /**
     * @param {string} str
     */
    static cssColorToRgb(str) {
        return Debug.hexToRgb(Debug.cssColorToHex(str));
    }
    /**
     * Wait `ms` milliseconds.
     * @param {number} ms
     */
    static wait(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            var resolve;
            setTimeout(() => {
                resolve();
            }, ms);
            return new Promise((res => {
                resolve = res;
            }));
        });
    }
    /**
     * Clamp a value inclusively in between a min and max value.
     * @param value The value to clamp
     * @param min Min value
     * @param max Max value
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    ;
}
exports.Debug = Debug;
class Prompt {
    /**
     *
     * @param title
     * @param description
     */
    constructor(title = null, description = null) {
        this.main = null;
        this.headerElement = null;
        this.contentElement = null;
        this.buttonsElement = null;
        /**
         * @param returnValue Return this value and resolve the promise stored in `Prompt.promise`
         * @param close If set to `false`, the prompt won't close on return.
         * If set to a number, it acts as milliseconds before it closes.
         */
        this.return = (returnValue, close = true) => {
            // Do nothing initially.
            // Set inside of @constructor
        };
        this.main = document.createElement("div");
        this.main.classList.add("promptmain");
        this.headerElement = document.createElement("h1");
        this.contentElement = document.createElement("div");
        this.buttonsElement = document.createElement("div");
        if (title != null)
            this.headerElement.innerText = title;
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
        this.main.style.zIndex = "10000";
        this.main.style.transition = "all 0.1s ease-in-out";
        this.main.style.maxWidth = "95vw";
        this.main.style.maxHeight = "95vh";
        this.main.style.overflow = "auto";
        document.body.appendChild(this.main);
        this.main.prompt = this;
        // Promise based
        this.promise = new Promise((res, rej) => {
            this._res = res;
            this._rej = rej;
            this.return = (returnValue, close) => {
                this._res(returnValue);
                if (close === true || close === undefined) {
                    this.close();
                }
                if (typeof close === "number") {
                    this.close(close);
                }
            };
        });
    }
    set name(value) {
        this.main.setAttribute("promptname", value);
    }
    get name() {
        return this.main.getAttribute("promptname");
    }
    set id(value) {
        this.main.setAttribute("promptid", value);
    }
    get id() {
        return this.main.getAttribute("promptid");
    }
    get headerText() {
        return this.headerElement.innerText;
    }
    set headerText(value) {
        this.headerElement.innerText = value;
    }
    /**
     * Removes everything inside the content field and appends `content`.
     *
     * `Identical to Prompt.addContent, but it clears the content first.`
     * @param {HTMLElement | string} content
     * @param {boolean} textAsHTML If `content` is a string, set to `false` to disable HTML parsing.
     */
    setContent(content, textAsHTML = true) {
        this.clearContent();
        this.addContent(content, textAsHTML);
    }
    clearContent() {
        this.contentElement.innerHTML = "";
    }
    clearButtons() {
        this.buttonsElement.innerHTML = "";
    }
    /**
     * Append content to the content field.
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
        return this;
    }
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
        }
        return button;
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
     * Close the prompt.
     *
     * `Automatically resolves promise with null`
     * @param {number} ms Optionally, close in `ms` milliseconds.
     */
    close(ms = 0) {
        if (typeof ms == "number" && ms > 0) {
            setTimeout(() => {
                if (typeof this.main == "object" && this.main.parentElement) {
                    this.main.parentElement.removeChild(this.main);
                }
            }, ms);
        }
        else {
            if (typeof this.main == "object" && this.main.parentElement) {
                this.main.parentElement.removeChild(this.main);
            }
        }
        this._res(null);
        // this._rej("Prompt closed");
        return this;
    }
    /**
     * Close a prompt or more prompts using a `promptname`.
     *
     * You can set a prompts name by setting `Prompt.name` to a string.
     */
    static close(name) {
        let ps = document.querySelectorAll(`div[promptname="${name}"]`);
        for (let i = 0; i < ps.length; i++) {
            const p = ps[i];
            if (p.hasOwnProperty("prompt")) {
                p.prompt.close();
            }
        }
    }
    /**
     * Run this to make this prompt close next time the user presses the escape key.
     *
     * `Note: Only works if the prompt is focused somehow, be it an input field or something else.`
     */
    closeOnEscape() {
        this.main.addEventListener("keydown", e => {
            if (e.key == "Escape" && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                this.close();
            }
        });
        this.main.focus();
        return this;
    }
}
exports.Prompt = Prompt;
class Update {
    /**
     *
     * @param {number} currentVersion Current version number.
     * It is formatted as a 12 digit timestamp, starting from the year and onwards to the minute.
     * `M` is Month and `m` is minute
     * `YYYYMMDDHHmm`
     */
    static check(currentVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            document.getElementById("currentversion").innerText = "vers. " + currentVersion + `${updatePlatform != null ? ` (${updatePlatform})` : ""}`;
            /**
             * @type {HTMLButtonElement}
             */
            let btn = document.querySelector("#updatetoxen");
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
                    btn.onclick = function () {
                        Update.downloadLatest();
                        btn.disabled = true;
                        btn.innerText = "Downloading latest...";
                        btn.classList.add("color-blue");
                    };
                    new ElectronNotification({
                        "title": "New Toxen Update is available",
                        "body": "Go to settings and press Download Latest Update to update."
                    }).show();
                }
                else {
                    btn.classList.remove("color-blue");
                    btn.innerText = "Check for updates";
                    btn.onclick = function () {
                        Update.check(currentVersion);
                    };
                }
            });
        });
    }
    static downloadLatest() {
        return __awaiter(this, void 0, void 0, function* () {
            if (updatePlatform == null) {
                dialog.showErrorBox("Unidentified release", "No release found for your current operating system (" + process.platform + ")");
                return;
            }
            let toxenGetLatestURL = `https://toxen.net/download/latest.php?platform=${updatePlatform}&get=url`;
            let toxenLatestURL = yield fetch(toxenGetLatestURL).then(res => res.text());
            let dl = new ion.Download("https://" + toxenLatestURL, "./latest.zip");
            let dlText = document.createElement("p");
            dlText.innerText = "If it doesn't show any progress here for more than a minute, please restart the program and try again.";
            let p = new Prompt("Started downloading...", dlText);
            p.addButtons("Close", "fancybutton color-red").addEventListener("click", () => {
                p.close();
            });
            dl.start();
            dl.onData = function () {
                let pr = +dl.downloadPercent().toFixed(2);
                dlText.innerText = pr + "%";
            };
            dl.onEnd = function () {
                // p.close();
                p.headerText = "Extracting update...";
                p.contentElement.innerText = "Toxen will be frozen for a bit and restart automatically when finished.";
                p.clearButtons();
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    let file = new Zip(path.resolve("./latest.zip"));
                    try {
                        file.getEntries().forEach((e) => {
                            try {
                                if (!e.isDirectory) {
                                    file.extractEntryTo(e, "./", true, true);
                                }
                            }
                            catch (error) { /* Ignored */ }
                        });
                    }
                    catch (err) {
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
                }), 10);
            };
            dl.onError = function (err) {
                console.error(err);
            };
        });
    }
}
exports.Update = Update;
ipcRenderer.on("editor.save", () => {
    ToxenScriptManager.loadCurrentScript();
});
ipcRenderer.on("editor.request.currenttime", () => {
    ScriptEditor.window.webContents.send("editor.response.currenttime", SongManager.player.currentTime);
});
ipcRenderer.on("editor.request.data", () => {
    let element = ScriptEditor.currentSong.element;
    let txnScript = ScriptEditor.currentSong.txnScript;
    ScriptEditor.currentSong.txnScript = ScriptEditor.currentSong.getFullPath("txnScript");
    ScriptEditor.currentSong.element = null;
    ScriptEditor.window.webContents.send("editor.response.data", JSON.stringify(ScriptEditor.currentSong), ToxenScriptManager.getEventNames());
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
            fs.writeFileSync(song.getFullPath("txnScript"), "# Start writting your storyboard code here!\n" +
                "# Go to https://toxen.net/toxenscript\n" +
                "# for documentation on ToxenScript\n\n");
        }
        if (ScriptEditor.window == null) {
            ScriptEditor.window = ScriptEditor.makeWindow();
            ScriptEditor.window.once("closed", () => {
                ScriptEditor.window = null;
                browserWindow.webContents.send("updatediscordpresence");
            });
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
    static sendCommand(value) {
        ScriptEditor.window.webContents.send("editor.command", value);
    }
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
}
exports.ScriptEditor = ScriptEditor;
ScriptEditor.listening = false;
// static sendJavaScript(value) {
//   ScriptEditor.window.webContents.send("editor.command", value);
// }
ScriptEditor.command = null;
/**
 * @type {Song}
 */
ScriptEditor.currentSong = null;
class Effect {
    /**
     * Highlight an element with a flash that lasts 2 seconds.
     * @param {HTMLElement} element HTML Element to highlight with a flash.
     * @param {string} color CSS color to flash with.
     * @param {number} ms Total time in millseconds it should be visible. (Including fade in and out)
     */
    static flashElement(element, color = "#fff", ms = 2000) {
        let ef = document.createElement("div");
        ef.style.pointerEvents = "none";
        ef.style.zIndex = "1000";
        ef.style.backgroundColor = color;
        let opacity = 0;
        // let add = 0.005;
        let add = 10 / ms;
        let int = setInterval(() => {
            if (opacity < 0)
                opacity = 0;
            if (opacity <= 0.5)
                opacity += add;
            if (opacity >= 0.5)
                opacity = 0.5;
            ef.style.opacity = (opacity).toString();
            ef.style.position = "absolute";
            let boundingBox = element.getBoundingClientRect();
            ef.style.left = boundingBox.left + "px";
            ef.style.top = boundingBox.top + "px";
            ef.style.width = element.clientWidth + "px";
            ef.style.height = element.clientHeight + "px";
        }, 10);
        setTimeout(() => {
            add *= -1;
        }, ms / 2);
        setTimeout(() => {
            clearInterval(int);
            ef.parentElement.removeChild(ef);
        }, ms);
        document.body.appendChild(ef);
    }
}
exports.Effect = Effect;
class ToxenModule {
    /**
     * Create a manageable Module
     * @param {string} moduleName
     */
    constructor(moduleName) {
        // relative
        /**
         * Public functions that can be used by other modules to interact with this module.
         */
        this.publicFunctions = {};
        try {
            this.moduleName = moduleName;
            if (!fs.existsSync(ToxenModule.moduleFolder + "/" + moduleName + "/module.json")) {
                fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/module.json", JSON.stringify({
                    "main": "index.js",
                    "active": true,
                }, null, 2));
            }
            this.module = JSON.parse(fs.readFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/module.json", "utf8"));
            this.function = require("../" + ToxenModule.moduleFolder + "/" + moduleName + "/" + (this.module.main ? this.module.main : "index.js")).toxenModule;
        }
        catch (error) {
            let p = new Prompt("Module Error", [
                `Unable to load module "${moduleName}"`,
                "Please check the Developer Tools console for more information."
            ]);
            let [openDevTools] = p.addButtons(["Open Dev. Tools", "Close"], "fancybutton", true);
            openDevTools.addEventListener("click", () => {
                browserWindow.webContents.openDevTools();
            });
            console.error(error);
        }
    }
    /**
     * Activate or deactivate the module
     */
    activation(active = undefined) {
        if (active === undefined && this.module && typeof this.module.active == "boolean") {
            active = !this.module.active;
        }
        if (fs.existsSync(ToxenModule.moduleFolder + "/" + this.moduleName + "/module.json")) {
            let data = JSON.parse(fs.readFileSync(ToxenModule.moduleFolder + "/" + this.moduleName + "/module.json", "utf8"));
            data.active = active;
            fs.writeFileSync(ToxenModule.moduleFolder + "/" + this.moduleName + "/module.json", JSON.stringify(data, null, 2));
        }
        else {
            fs.writeFileSync(ToxenModule.moduleFolder + "/" + this.moduleName + "/module.json", JSON.stringify({
                "main": "index.js",
                "active": active
            }, null, 2));
        }
    }
    /**
     * Initialize folders
     */
    static initialize() {
        if (!fs.existsSync(ToxenModule.moduleFolder)) {
            fs.mkdirSync(ToxenModule.moduleFolder, { recursive: true });
        }
    }
    static createModule(moduleName, language = "js") {
        if (!fs.existsSync(moduleName)) {
            fs.mkdirSync(ToxenModule.moduleFolder + "/" + moduleName, { recursive: true });
            // JavaScript
            if (language == "js")
                fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/index.js", `/**
 * JavaScript Module.
 * Your main function is required to be exported as \`exports.toxenModule\`.  
 * Otherwise, your module will not work.
 * @param {import("../../src/declarations/toxenCore")} Core
 */
exports.toxenModule = (Core) => {
  // You can export specific functionality from the Toxen Core if you'll be using them often
  const {
    // SongManager
  } = Core;

  // Your code goes here

}`);
            // TypeScript
            if (language == "ts") {
                fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/index.ts", `/**
 * TypeScript Module.
 * Your main function is required to be exported as \`export var toxenModule\`.  
 * Otherwise, your module will not work.
 */
export var toxenModule = (Core: typeof import("../../src/declarations/toxenCore")) => {
  // You can export specific functionality from the Toxen Core if you'll be using them often
  const {
    // SongManager
  } = Core;

  // Your code goes here

}`);
                let tsconfig = {
                    "compilerOptions": {
                        "module": "commonjs",
                        "target": "ES6",
                    },
                    "exclude": [
                        "node_modules"
                    ]
                };
                fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/tsconfig.json", JSON.stringify(tsconfig, null, 2));
            }
            let module = {
                "author": "Anonymous",
                "name": moduleName,
                "main": "index.js",
                "description": "A Toxen Module",
                "active": true,
            };
            fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/module.json", JSON.stringify(module, null, 2));
        }
        else {
            console.error("This module already exists");
        }
    }
    static listModules() {
        return fs.readdirSync(ToxenModule.moduleFolder);
    }
    static loadAllModules(activate = true) {
        ToxenModule.installedModules = [];
        let modules = ToxenModule.listModules().map(m => new ToxenModule(m));
        /**
         * @type {HTMLDivElement}
         */
        let panel = document.getElementById("moduleActivation");
        panel.innerHTML = "";
        modules.forEach(m => {
            let randName = `module_${m.moduleName}_` + Debug.generateRandomString(3);
            let div = document.createElement("div");
            let input = document.createElement("input");
            input.type = "checkbox";
            let label = document.createElement("label");
            label.innerText = (m.module.name ? m.module.name : m.moduleName);
            div.appendChild(input);
            input.id = randName;
            div.appendChild(label);
            label.setAttribute("for", randName);
            if (m.module.description) {
                let sup = document.createElement("sup");
                sup.innerText = m.module.description;
                div.appendChild(sup);
            }
            div.appendChild(document.createElement("br"));
            panel.appendChild(div);
            input.addEventListener("click", () => {
                m.activation(input.checked);
                Effect.flashElement(document.getElementById("restartToxenButton"), "green", 500);
            });
            if (activate === true) {
                if (!m.module.active === false && typeof m.function == "function") {
                    m.function(exports);
                    console.log("[Module: \"" + m.moduleName + "\"] Loaded");
                    input.checked = true;
                }
                else if (m.module.active === false) {
                    console.log("[Module: \"" + m.moduleName + "\"] Inactive, not loaded");
                }
                else {
                    console.error("[Module: \"" + m.moduleName + "\"] Invalid module function");
                }
            }
        });
        ToxenModule.installedModules = modules;
        return modules;
    }
    /**
     * Load a module in the toxenModules folder.
     */
    static loadModule(moduleName) {
        return new ToxenModule(moduleName);
    }
    /**
     * Returns an array of the names of the available public functions.
     *
     * Helpful for other modules' debugging.
     */
    getPublicFunctions() {
        let names = [];
        for (const name in this.publicFunctions) {
            if (Object.prototype.hasOwnProperty.call(this.publicFunctions, name)) {
                names.push(name);
            }
        }
        return names;
    }
}
exports.ToxenModule = ToxenModule;
ToxenModule.installedModules = [];
ToxenModule.moduleFolder = "toxenModules";
class Statistics {
    /**
     * Initialize a new statistics object.
     */
    constructor(object = {}) {
        /**
         * The total time spend listening to songs in seconds.
         */
        this.secondsPlayed = 0;
        /**
         * Total count of songs played
         */
        this.songsPlayed = 0;
        for (const key in this) {
            if (this.hasOwnProperty(key) && object.hasOwnProperty(key)) {
                this[key] = object[key];
            }
        }
        Statistics.current = this;
    }
    /**
     * Save the statistics to the `stats.json` file.
     */
    save(statsFile = "./data/stats.json") {
        fs.writeFileSync(statsFile, JSON.stringify(this));
    }
    /**
     * Load the statistics from the `stats.json` file and return new object.
     */
    static loadFromFile(statsFile = "./data/stats.json") {
        if (!fs.existsSync(path.dirname(statsFile))) {
            fs.mkdirSync(path.dirname(statsFile), { recursive: true });
        }
        if (!fs.existsSync(statsFile)) {
            console.log("No existing statistics file! Creating file.");
            let s = new Statistics({});
            s.save();
            return s;
        }
        return new Statistics(JSON.parse(fs.readFileSync(statsFile, "utf-8")));
    }
    /**
     * Load the statistics from the `stats.json` file.
     */
    load(statsFile = "./data/stats.json") {
        if (!fs.existsSync(statsFile)) {
            console.error("No existing file! Creating file");
            this.save();
            return;
        }
        let object = JSON.parse(fs.readFileSync(statsFile, "utf-8"));
        for (const key in this) {
            if (this.hasOwnProperty(key) && object.hasOwnProperty(key)) {
                this[key] = object[key];
            }
        }
    }
    display() {
        let p = new Prompt("Statistics", [
            `Songs: ${this.songCount}`,
            `Song length: ${this.collectiveSongLengthAsStamp}`,
            `Songs played: ${this.songsPlayed}`,
            `Modules installed: ${this.modulesInstalled}`,
            `Modules enabled: ${this.modulesEnabled}`
        ]);
        p.closeOnEscape();
        p.addButtons("Close", "fancybutton", true);
    }
    /**
     * Start saving statistics every minute.
     */
    startSaveTimer() {
        this.stopSaveTimer();
        let int = setInterval(() => {
            this.save();
        }, 60000);
        this.stopSaveTimer = () => {
            clearInterval(int);
            this.stopSaveTimer = function () {
                // Do nothing again
            };
        };
    }
    stopSaveTimer() {
        // Do nothing initially
    }
    /**
     * Gets the song total count.
     */
    get songCount() {
        return SongManager.songList.length;
    }
    /**
     * Gets the total length of all of the songs in your library.
     *
     * `Note: A song must have been played at least once before it adds to this total`
     */
    get collectiveSongLength() {
        let time = 0;
        SongManager.songList.forEach(s => {
            time += typeof s.details.songLength == "number" ? s.details.songLength : 0;
        });
        return time;
    }
    ;
    /**
     * Gets the total length of all of the songs in your library as timestamp format.
     *
     * `Note: A song must have been played at least once before it adds to this total`
     */
    get collectiveSongLengthAsStamp() {
        return ToxenScriptManager.convertSecondsToDigitalClock(this.collectiveSongLength);
    }
    ;
    /**
     * Returns the total amount of installed modules.
     */
    get modulesInstalled() {
        return ToxenModule.listModules().length;
    }
    /**
     * Returns the amount of enabled modules.
     */
    get modulesEnabled() {
        return ToxenModule.installedModules.filter(m => m.module.active !== false).length;
    }
}
exports.Statistics = Statistics;
class Theme {
    /**
     * CSS File this theme belongs to.
     */
    constructor(file) {
        /**
         * Themeable objects referring to one specific object.
         */
        this.objects = {
            "songPanel": new Themeable("#songmenusidebar"),
            "settingsPanel": new Themeable("#settingsmenusidebar"),
        };
        /**
         * Themeable classes. Can refer to multiple objects.
         */
        this.classes = {};
        /**
         * A string of custom CSS to apply after the object create CSS.
         *
         * Anything you can write in CSS, you can write to this.
         */
        this.customCSS = "";
        this.file = file;
    }
    /**
     * Generate CSS markup from themeable objects in this object.
     * @returns CSS string
     */
    generateCSS() {
        // Generate CSS markup
        return "";
    }
}
exports.Theme = Theme;
class Themeable {
    constructor(element, selector = null) {
        /**
         * @type {ThemeableConstructor}
         */
        this.getStyle = () => {
            return this.element.style;
        };
        if (typeof element == "string") {
            this.selector = element;
            element = document.querySelector(element);
        }
        else {
            this.selector = selector;
        }
        this.element = element;
    }
    /**
     * Return the styling as a CSS string.
     */
    toString() {
        return this.element.style + "";
    }
}
class Tooltip {
}
/**
 * Start the tutorial prompts
 */
function showTutorial() {
    // Tutorial Preperation
    let currentStep = 0;
    let prompt = new Prompt("Welcome to Toxen!", [
        "Would you like to get a walkthrough of how Toxen works?"
    ]);
    let [next, end] = prompt.addButtons(["Next", "End Tutorial"], "fancybutton");
    next.classList.add("color-green");
    end.classList.add("color-red");
    next.addEventListener("click", () => {
        showStep(++currentStep);
    });
    end.addEventListener("click", () => {
        Settings.current.showTutorialOnStart = false;
        Settings.current.toggleSongPanelLock(false);
        Settings.current.toggleSettingsPanelLock(false);
        prompt.close();
    });
    function clearContent() {
        prompt.contentElement.innerHTML = "";
    }
    function clearButtons() {
        prompt.buttonsElement.innerHTML = "";
    }
    // Steps
    function showStep(step = currentStep) {
        switch (step) {
            case 0:
                showStep(1);
                break;
            case 1:
                clearContent();
                prompt.headerText = "The Song Panel";
                Settings.current.toggleSongPanelLock(true);
                prompt.addContent("This is your song panel.");
                prompt.addContent(`You can get the song panel out by hovering your mouse to the <b>${Settings.current.songMenuToRight ? "right" : "left"}</b> side of the app.`);
                prompt.addContent(`Here you'll see a list of all the songs you have.<br>They can be sorted and grouped, as you'll see later in the tutorial.`);
                prompt.addContent(`You can lock and unlock the song panel by pressing on the Pad Lock🔒 (or press <b>CTRL + L</b>).<br>This will prevent it from disappearing when your mouse moves away.`);
                // prompt.addContent(`Continue by pressing on the padlock`);
                if (Settings.current.songMenuToRight) {
                    prompt.main.style.marginLeft = "-15%";
                    // prompt.main.style.marginRight = "10%";
                }
                else {
                    prompt.main.style.marginLeft = "10%";
                }
                Effect.flashElement(SongManager.songListElement);
                break;
            // Songs
            case 2:
                clearContent();
                prompt.headerText = "The Song Panel: Adding Songs";
                Settings.current.toggleSongPanelLock(true);
                if (SongManager.songList.length == 0) {
                    prompt.addContent("Though... your song list does look a bit empty now, doesn't it? Let's change that!");
                }
                else {
                    prompt.addContent("It seems like you already have music in your library, but I'll still tell you how to add new songs, if you forgot.");
                }
                prompt.addContent("You can add one from your computer or download one from a YouTube URL, directly within Toxen.");
                prompt.addContent("Press on the <b>Add Song</b> button to add a new song now if you'd like.");
                document.getElementById("addsongbutton").scrollIntoView();
                Effect.flashElement(document.getElementById("addsongbutton"), "#0f0");
                // prompt.main.style.marginLeft = "0%";''
                break;
            // Backgrounds
            case 3:
                clearContent();
                Settings.current.toggleSongPanelLock(true);
                prompt.headerText = "The Song Panel: Adding Backgrounds";
                prompt.addContent("When you're listening to a song, you can press the <b>Set Background</b> to give the song you're currently listening to, a background.");
                Effect.flashElement(document.getElementById("setbackgroundbutton"), "#0f0");
                break;
            // Settings panel
            case 4:
                clearContent();
                Settings.current.toggleSongPanelLock(false);
                Settings.current.toggleSettingsPanelLock(true);
                prompt.headerText = "Settings Panel";
                prompt.addContent("This is your settings panel.");
                prompt.addContent(`You can get the settings panel out by hovering your mouse to the <b>${Settings.current.songMenuToRight ? "left" : "right"}</b> side of the app.`);
                prompt.addContent(`Here you can customize Toxen however you like.<br>Take a look at the settings and set your preferences!`);
                // prompt.addContent(`Continue by pressing on the padlock`);
                if (Settings.current.songMenuToRight) {
                    prompt.main.style.marginLeft = "10%";
                }
                else {
                    prompt.main.style.marginLeft = "-15%";
                }
                Effect.flashElement(document.getElementById("settingsmenusidebar"));
                for (let i = 0; i < document.getElementById("settingsmenusidebar").clientHeight; i++) {
                    setTimeout(() => {
                        document.getElementById("settingsmenusidebar").scrollTop += 2;
                    }, i * 5);
                }
                break;
            default:
                clearContent();
                Settings.current.toggleSongPanelLock(false);
                Settings.current.toggleSettingsPanelLock(false);
                prompt.main.style.marginLeft = "0%";
                prompt.headerText = "Enjoy using Toxen";
                prompt.addContent("Add some songs and make the experience you want.");
                prompt.addContent("If you need more help, go to https://toxen.net to learn more.");
                next.parentElement.removeChild(next);
                break;
        }
    }
}
exports.showTutorial = showTutorial;
