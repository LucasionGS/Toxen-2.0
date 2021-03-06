"use strict";
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
exports.showTutorial = exports.Assets = exports.Sync = exports.PanelManager = exports.SelectList = exports.Statistics = exports.ToxenModule = exports.Effect = exports.ScriptEditor = exports.Update = exports.Prompt = exports.Tools = exports.ToxenScriptManager = exports.StoryboardObject = exports.Storyboard = exports.toxenHeaderMenu = exports.toxenMenus = exports.SongGroup = exports.SongManager = exports.Song = exports.SettingsPanel = exports.Settings = exports.Toxen = exports.hueApi = void 0;
// FS takes files relative to the root "Resources" directory.
// It is NOT relative to the HTML file or script file.
//@@ts-expect-error
const fs = require("fs");
const rimraf = require("rimraf");
const toxenStyle_1 = require("./toxenStyle");
const node_hue_api_1 = require("node-hue-api");
exports.hueApi = null;
const ionMarkDown_1 = require("./ionMarkDown");
const Electron = require("electron");
const { remote, shell, ipcRenderer, webFrame } = Electron;
const { Menu, dialog, Notification: ElectronNotification, app, Tray } = remote;
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const ytpl = require("ytpl");
const ytdl = require("ytdl-core");
const yt_search_1 = require("yt-search");
const ion = require("ionodelib");
const Zip = require("adm-zip");
const events_1 = require("events");
const mm = require("music-metadata");
const util = require("util");
const axios_1 = require("axios");
const browserWindow = remote.getCurrentWindow();
const commandExists = require("command-exists");
const rpc = require("discord-rpc");
const child_process_1 = require("child_process");
const tree = require("directory-tree");
const user_1 = require("./auth/models/user");
var appIcon = null;
// import Git, {SimpleGit} from "simple-git";
// Discord RPC
var discordClient;
/**
 * Toxen Discord Client ID
 */
const discordClientId = '647178364511191061';
let discordReady = false;
/**
 * General Toxen functionality.
 */
class Toxen {
    static initialize() {
        // Update interval
        setInterval(() => {
            Update.check(Toxen.version);
        }, 1800000);
        Toxen.on("updated", () => {
            if (!app.isPackaged)
                new Prompt("Toxen updated", `You're now running version ${Toxen.version}`).setInteractive(false).close(2000);
        });
        let songmenusidebar = document.querySelector("#songmenusidebar");
        let settingsmenusidebar = document.querySelector("#settingsmenusidebar");
        // Emit events
        songmenusidebar.addEventListener("mouseenter", () => {
            if (!Settings.current.songMenuLocked)
                Toxen.emit("songpanelopen");
        });
        songmenusidebar.addEventListener("mouseleave", () => {
            if (!Settings.current.songMenuLocked)
                Toxen.emit("songpanelclose");
        });
        settingsmenusidebar.addEventListener("mouseenter", () => {
            Toxen.emit("settingspanelopen");
        });
        settingsmenusidebar.addEventListener("mouseleave", () => {
            Toxen.emit("settingspanelclose");
        });
        let inactivityTimer = 0;
        let inactivityLimit = 3;
        setInterval(() => {
            // To prevent making more intervals, add 1 second to the statistics if the song is unpaused.
            if (!SongManager.player.paused)
                Statistics.current.secondsPlayed++;
            if (inactivityTimer < inactivityLimit)
                inactivityTimer++;
            else if (inactivityTimer == inactivityLimit)
                Toxen.emit("inactive");
        }, 1000);
        document.body.addEventListener("mousemove", e => {
            if (inactivityTimer == inactivityLimit) {
                Toxen.emit("active");
            }
            if (inactivityTimer > 0)
                inactivityTimer = 0;
        });
        document.body.addEventListener("click", e => {
            if (inactivityTimer == inactivityLimit) {
                Toxen.emit("active");
            }
            if (inactivityTimer > 0)
                inactivityTimer = 0;
        });
        Toxen.on("active", () => {
            Toxen.inactivityState = false;
            inactivityTimer = 0;
            document.body.style.cursor = "";
            let btns = document.querySelectorAll(".hideoninactive");
            for (let i = 0; i < btns.length; i++) {
                const btn = btns[i];
                btn.style.opacity = "1";
            }
        });
        Toxen.on("inactive", () => {
            Toxen.inactivityState = true;
            inactivityTimer = inactivityLimit;
            document.body.style.cursor = "none";
            let btns = document.querySelectorAll(".hideoninactive");
            for (let i = 0; i < btns.length; i++) {
                const btn = btns[i];
                btn.style.opacity = "0";
            }
        });
        // ThumbarButtons
        Toxen.resetThumbarButtons();
    }
    static resetThumbarButtons() {
        remote.getCurrentWindow().setThumbarButtons([
            {
                icon: Electron.remote.nativeImage.createFromPath(SongManager.player.paused ? Tools.prodPath("./src/icons/play.png") : Tools.prodPath("./src/icons/pause.png")),
                click() {
                    SongManager.getCurrentlyPlayingSong().play();
                }
            }
        ]);
    }
    static resetTray() {
        // appIcon
        if (appIcon)
            appIcon.destroy();
        try {
            var contextMenu = remote.Menu.buildFromTemplate([
                {
                    label: "Songs" + (Settings.current.playlist ? ` (${Settings.current.playlist})` : ""),
                    submenu: SongManager.playableSongs.map(song => {
                        return {
                            label: Tools.stripHTML(song.parseName()),
                            click() {
                                song.play();
                            }
                        };
                    })
                },
                {
                    label: "Playlists",
                    submenu: (function () {
                        let pls = Settings.current.playlists.map(playlist => {
                            return {
                                label: playlist,
                                type: "radio",
                                checked: Settings.current.playlist == playlist,
                                click() {
                                    Settings.current.selectPlaylist(playlist);
                                }
                            };
                        });
                        pls.unshift({
                            label: "No playlist",
                            type: "radio",
                            checked: Settings.current.playlist == null,
                            click() {
                                Settings.current.selectPlaylist("%null%");
                            }
                        });
                        return pls;
                    })()
                },
                {
                    label: "Volume",
                    submenu: (function () {
                        let res = [];
                        for (let i = 0; i <= 20; i++) {
                            res.push({
                                label: (i * 5) + "%",
                                click() {
                                    Settings.current.setVolume(i * 5);
                                }
                            });
                        }
                        return res;
                    })()
                },
                {
                    label: "Play/Pause",
                    click() {
                        SongManager.getCurrentlyPlayingSong().play();
                    }
                },
                {
                    label: "Next",
                    click() {
                        SongManager.playNext();
                    }
                },
                {
                    label: "Previous",
                    click() {
                        SongManager.playPrev();
                    }
                },
                // {
                //   label: "Show",
                //   type: "radio",
                //   checked: browserWindow.isVisible(),
                //   click() {
                //     browserWindow.show();
                //   }
                // },
                // {
                //   label: "Hide",
                //   type: "radio",
                //   checked: !browserWindow.isVisible(),
                //   click() {
                //     browserWindow.hide();
                //   }
                // },
                {
                    label: "Restart",
                    click() {
                        remote.app.relaunch();
                        remote.app.quit();
                    }
                },
                {
                    label: "Quit",
                    click() {
                        remote.app.quit();
                    }
                }
            ]);
            appIcon = new Tray(Tools.prodPath("./icon.ico"));
            appIcon.setToolTip("Toxen♫");
            appIcon.setContextMenu(contextMenu);
            appIcon.on("click", () => {
                browserWindow.isVisible() ? browserWindow.hide() : browserWindow.show();
                // Toxen.resetTray();
            });
        }
        catch (error) {
            console.error(error);
        }
        // setTimeout(() => {
        //   Toxen.resetThumbarButtons();
        // }, 100);
    }
    static zoomIn() {
        webFrame.setZoomFactor(Tools.clamp(webFrame.getZoomFactor() + 0.10, 0.20, 5));
        localStorage.setItem("zoom", webFrame.getZoomFactor().toString());
    }
    static zoomOut() {
        webFrame.setZoomFactor(Tools.clamp(webFrame.getZoomFactor() - 0.10, 0.20, 5));
        localStorage.setItem("zoom", webFrame.getZoomFactor().toString());
    }
    static zoomReset() {
        webFrame.setZoomFactor(1);
        localStorage.setItem("zoom", webFrame.getZoomFactor().toString());
    }
    /**
     * Clear characters windows filesystem or Toxen doesn't understand.
     */
    static clearIllegalCharacters(filename) {
        return filename.replace(/[/\\?%*:|"<>#]/g, '-');
    }
    static errorPrompt(err, explanation, cause = "Unknown") {
        // console.clear();
        const errReport = util.inspect(err, true);
        console.warn("⬇⬇⬇ This error caused Toxen to be unable to complete the task ⬇⬇⬇ -----------------------------\n⬇⬇⬇ Send this error message to the developer ⬇⬇⬇ ------------------------");
        console.error(err);
        console.warn("⬆⬆⬆ This error caused Toxen to be unable to complete the task ⬆⬆⬆ -----------------------------\n⬆⬆⬆ Send this error message to the developer ⬆⬆⬆ ------------------------");
        let p = new Prompt("Toxen ran into an error.", explanation ? explanation : "Please check the <span style='color: red'>Console</span> log for error messages");
        p.addButtons([
            Toxen.generate.button({
                text: "Send anonymous error report",
                click() {
                    Toxen.sendReport(`Cause: ${cause}\n\n` + errReport, true).then(b => {
                        if (b) {
                            this.innerText = "Report sent!";
                            this.disabled = true;
                        }
                        else {
                            this.innerText = "Report failed to send";
                        }
                    }).catch(reason => {
                        console.error(reason);
                        this.innerText = "Report failed to send";
                    });
                }
            }),
            Toxen.generate.button({
                text: "Open Dev. Tools",
                click() {
                    browserWindow.webContents.openDevTools();
                },
                modify(b) {
                    b.title = "You can get further details on the error by clicking here. It's not necessary to look here, it's just for those who care.";
                }
            }),
            Toxen.generate.button({
                text: "Restart Toxen",
                click() {
                    Toxen.restart();
                },
                modify(b) {
                    b.classList.add("svg_reload_white");
                }
            }),
            "Close"
        ], "fancybutton", true);
    }
    static sendReport(reportMessage, logRequest = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (logRequest)
                console.log("Sending report...");
            let body = new FormData();
            body.set("reportmessage", reportMessage);
            return axios_1.default.post("http://toxen.net/internal/report.php", body, {
                "headers": { "Content-Type": "multipart/form-data" }
            })
                .then(r => {
                if (typeof r == "boolean")
                    return r;
                let res = r.data;
                if (logRequest)
                    console.log("Response:", res);
                return res.success;
            }).catch(reason => {
                console.error(reason);
                if (logRequest)
                    console.error("Error Reason:", reason);
                return false;
            });
        });
    }
    /**
     * Sets the menu in the top bar and global shortcuts.
     */
    static setMenu(menu) {
        Menu.setApplicationMenu(menu);
        let sm = document.getElementById("system-menu");
        sm.innerHTML = "";
        // `<div class="button" id="smb-file">File</div>`
        let div = document.createElement("div");
        div.classList.add("button");
        div.innerText = "Toxen";
        div.addEventListener("click", () => {
            let divRect = div.getBoundingClientRect();
            menu.popup({
                x: divRect.x,
                y: divRect.bottom
            });
        });
        sm.appendChild(div);
        // let ttt = document.getElementById("toxen-title-text");
        // ttt.style.width = "";
    }
    /**
     * A list of all valid media extension (Including audio and video)
     */
    static get mediaExtensions() {
        return this.audioExtensions.map(a => a).concat(this.videoExtensions).concat("txs");
    }
    ;
    /**
     * Set the title of the document.
     */
    static set title(value) {
        document.getElementById("toxen-title-text").innerHTML = value;
        let plain = Tools.stripHTML(value);
        document.title = plain + " | Toxen";
    }
    static toggleFullScreen(mode = !browserWindow.isFullScreen()) {
        browserWindow.setFullScreen(mode);
        browserWindow.setMenuBarVisibility(!mode);
        // Settings.current.reloadProgressBarSpot();
        document.getElementById("titlebar").style.opacity = mode ? "0" : "1";
        // document.getElementById("mainbody").style.marginTop = mode ? "0px" : "32px";
        // document.getElementById("mainbody").style.height = mode ? "calc(100vh - 32px)" : "100vh";
        let c = document.querySelector("#storyboard");
        c.style.top = (mode ? "0" : "32px");
        c.style.height = (mode ? "100vh" : "calc(100vh - 32px)");
        c.height = mode ? window.innerHeight : window.innerHeight - 32;
        if (mode) {
            document.querySelector("#songmenusidebar").style.height = "100vh";
            document.querySelector("#settingsmenusidebar").style.height = "100vh";
            setTimeout(() => {
                Toxen.emit("inactive");
            }, 100);
        }
        else {
            document.querySelector("#songmenusidebar").style.height = "calc(100vh - 32px)";
            document.querySelector("#settingsmenusidebar").style.height = "calc(100vh - 32px)";
        }
    }
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
    /**
     * Close the Toxen application immediately.
     */
    static close() {
        app.exit();
    }
    static discordConnect() {
        return __awaiter(this, void 0, void 0, function* () {
            discordReady = false;
            console.log("Connecting to Discord...");
            if (discordClient instanceof rpc.Client) {
                discordClient.destroy();
            }
            discordClient = new rpc.Client({ "transport": "ipc" });
            discordClient.once("ready", () => {
                console.log('Discord RPC Connected');
                discordReady = true;
                Toxen.updateDiscordPresence();
            });
            return discordClient.login({ clientId: discordClientId }).then(a => a).catch(reason => {
                console.error(reason);
            });
        });
    }
    static discordDisconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Disconnected from Discord");
            discordClient.destroy();
        });
    }
    static updateDiscordPresence(song = SongManager.getCurrentlyPlayingSong()) {
        return __awaiter(this, void 0, void 0, function* () {
            let attemptCount = 0;
            while (true) {
                if (attemptCount > 30) {
                    break;
                }
                if (isNaN(SongManager.player.duration) || !discordReady) {
                    attemptCount++;
                    yield Tools.wait(100);
                }
                else {
                    let options = {
                        "details": `${ScriptEditor.window != null ? "Editing a storyboard" : song.isVideo ? "Watching a video" : "Listening to a song"}`,
                        "largeImageKey": Settings.current.lightThemeBase ? "toxenlight" : "toxen",
                        "largeImageText": app.isPackaged ? "Toxen Vers. " + Toxen.version : "Toxen Developer Mode"
                    };
                    if (Settings.current.discordPresenceShowDetails) {
                        // options["startTimestamp"] = Date.now(); // For Time left
                        // options["endTimestamp"] = Date.now() + (SongManager.player.duration - SongManager.player.currentTime) * 1000; // For Time left
                        if (!SongManager.player.paused)
                            options["startTimestamp"] = Date.now() - (SongManager.player.currentTime * 1000); // For Time Elapsed
                        options["details"] = (SongManager.player.paused ? "(Paused) " : "")
                            + (`${ScriptEditor.window != null ? "Editing "
                                : song.isVideo ? "Watching "
                                    : "Listening to "}`)
                            + `${Tools.stripHTML(song.parseName())}`;
                        if (song.details.source)
                            options["state"] = `\nFrom ${Tools.decodeHTML(song.details.source)}`;
                    }
                    discordClient.setActivity(options);
                    break;
                }
            }
        });
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
            p.addContent(Toxen.updatePlatform === "win" ?
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
            if (Toxen.updatePlatform !== "win")
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
    static setStyleSource(src) {
        Toxen.extraStyle.href = src + (src ? "?" + Tools.generateRandomString(3) : "");
    }
}
exports.Toxen = Toxen;
Toxen.User = user_1.default;
/**
 * A list of valid audio extension
 */
Toxen.audioExtensions = [
    /**
     * Standard Music File
     */
    "mp3",
    /**
     * Convertable music file
     */
    "wma",
    /**
     * Convertable music file
     */
    "ogg",
    /**
     * Convertable music file
     */
    "m4a",
];
/**
 * A list of valid video extension
 */
Toxen.videoExtensions = [
    /**
     * Standard Video File
     */
    "mp4",
];
/**
 * A list of valid media extension
 */
Toxen.imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif"
];
/**
 * Current stored version of Toxen.
 *
 * `Note: This should be set by the Client`
 */
Toxen.version = 0;
Toxen.inactivityState = false;
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
switch (process.platform) {
    case "win32":
        Toxen.updatePlatform = "win";
        break;
    case "linux":
        Toxen.updatePlatform = "linux";
        break;
    case "darwin":
        Toxen.updatePlatform = "mac";
        break;
    default:
        Toxen.updatePlatform = null;
        break;
}
(function (Toxen) {
    class TArray extends Array {
        constructor(array = []) {
            super();
            if (Array.isArray(array))
                this.push(...array);
        }
        /**
         * Creates a copy of the TArray and cleans it up with your chosen options.
         */
        cleanArray(itemsToClean) {
            let a = new TArray(this);
            let itc = new TArray(itemsToClean);
            if (itc.includes("duplicates")) {
                a = new TArray([...new Set(a)]);
                itc.remove("duplicates");
            }
            a = a.filter(v => {
                for (let i = 0; i < itc.length; i++) {
                    const it = itc[i];
                    switch (it) {
                        case "emptyStrings": {
                            if (typeof v == "string" && v === "")
                                return false;
                            break;
                        }
                        case "null": {
                            if (v === undefined || v === null)
                                return false;
                            break;
                        }
                        case "number": {
                            if (typeof v == "number")
                                return false;
                            break;
                        }
                        case "string": {
                            if (typeof v == "string")
                                return false;
                            break;
                        }
                        case "boolean": {
                            if (typeof v == "boolean")
                                return false;
                            break;
                        }
                    }
                }
                return true;
            });
            return a;
        }
        remove(...items) {
            let values = new TArray();
            for (let i2 = 0; i2 < items.length; i2++) {
                const item = items[i2];
                for (let i = 0; i < this.length; i++) {
                    const value = this[i];
                    if (item === value)
                        values.push(...this.splice(i--, 1));
                }
            }
            return values;
        }
        filter(callbackfn, thisArg) {
            return new TArray(this.toArray().filter(callbackfn));
        }
        /**
         * Return a regular array.
         */
        toArray() {
            return [...this];
        }
        /**
         * Iterates through each element and uses the callback to return a boolean value.
         *
         * Returns `true` if every callback returns `true`, and returns `false` if **any** callback returns `false`.
         */
        equals(callbackfn) {
            for (let i = 0; i < this.length; i++) {
                const item = this[i];
                if (!callbackfn(item, i, this))
                    return false;
            }
            return true;
        }
        ;
    }
    Toxen.TArray = TArray;
    // export interface InteractiveProgressBar {
    //   on(event: "click", listener: (value: number) => void): this;
    //   on(event: "drag", listener: (value: number) => void): this;
    //   on(event: "release", listener: (value: number) => void): this;
    //   emit(event: "click", value: number): boolean;
    //   emit(event: "drag", value: number): boolean;
    //   emit(event: "release", value: number): boolean;
    // }
    // export namespace ProgressBar {
    //   export interface HTMLInteractiveProgressBar extends HTMLDivElement {
    //     object: InteractiveProgressBar,
    //     thumb: HTMLDivElement
    //   }
    // }
    class ProgressBar extends toxenStyle_1.InteractiveProgressBar.InteractiveProgressBar {
        constructor(width, height) {
            super(width, height);
        }
    }
    Toxen.ProgressBar = ProgressBar;
})(Toxen = exports.Toxen || (exports.Toxen = {}));
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
        this.volume = 50;
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
         * Quantity of the audio visualizer. (The higher the number, the more and thinner bars)
         */
        this.visualizerQuantity = 5;
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
         * Discord presence
         */
        this.discordPresence = true;
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
        /**
         * `true` Panel buttons are activated by hovering over them.
         * `false` Panel buttons are activated by clicking over them.
         */
        this.buttonActivationByHover = false;
        /**
         * The current version.
         */
        this.version = 0;
        if (!doNotReplaceCurrent) {
            Settings.current = this;
        }
    }
    /**
     * Default settings.json file location relative to your OS.
     */
    static get defaultLocation() {
        return Toxen.updatePlatform == "win" ? process.env.APPDATA + "\\ToxenData\\data\\settings.json" : process.env.HOME + "/.toxendata/data/settings.json";
    }
    static createFromFile(fileLocation = Settings.defaultLocation) {
        let newSettings = new Settings();
        try {
            if (!fs.existsSync(fileLocation)) {
                if (!fs.existsSync(path.dirname(fileLocation))) {
                    fs.mkdirSync(path.dirname(fileLocation), { recursive: true });
                }
                // Moving over old files
                if (fs.existsSync("./data/settings.json"))
                    fs.renameSync("./data/settings.json", fileLocation);
                else
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
    loadFromFile(fileLocation = Settings.defaultLocation) {
        try {
            if (!fs.existsSync(path.dirname(fileLocation))) {
                fs.mkdirSync(path.dirname(fileLocation), { recursive: true });
            }
            if (!fs.existsSync(fileLocation)) {
                // Moving over old files
                if (fs.existsSync("./data/settings.json"))
                    fs.renameSync("./data/settings.json", fileLocation);
                else
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
    saveToFile(fileLocation = Settings.defaultLocation) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs.existsSync(path.dirname(fileLocation))) {
                fs.mkdirSync(path.dirname(fileLocation), { recursive: true });
            }
            return fs.writeFileSync(fileLocation, JSON.stringify(this, null, 2));
        });
    }
    /**
     * Set the media's volume.
     * @param value Volume value.
     */
    setVolume(value) {
        this.volume = value;
        SongManager.player.volume = value / 100;
        let volumeRange = document.querySelector("#audioadjusterbar");
        if (volumeRange.object.value != value)
            volumeRange.object.value = Math.ceil(value);
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
     * @param newInstance If `true`, returns a new instance of a playlist and without the "No playlist selected" option.
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
        this.playlists.sort();
        for (let i = 0; i < this.playlists.length; i++) {
            const playlist = this.playlists[i];
            let opt = document.createElement("option");
            opt.innerText = playlist;
            opt.value = playlist;
            selection.appendChild(opt);
        }
        if (newInstance == false) {
            Toxen.setMenu(exports.toxenHeaderMenu = reloadMenu());
        }
        if (this.playlist) {
            selection.value = this.playlist;
        }
        else {
            selection.value = "%null%";
        }
        return selection;
    }
    selectPlaylist(playlist) {
        Settings.current.playlist = playlist == "%null%" ? null : playlist;
        if (document.querySelector("#playlistselection").value != playlist) {
            document.querySelector("#playlistselection").value = playlist;
        }
        Settings.current.reloadPlaylists();
        new Prompt("", "Switched to playlist " + (playlist != "%null%" ? "\"" + playlist + "\"" : "None") + "").close(1000);
        SongManager.search();
        if (playlist == "%null%")
            document.querySelector("#playlistRenameButton").disabled = true;
        else
            document.querySelector("#playlistRenameButton").disabled = false;
        Toxen.resetTray();
    }
    renamePlaylist(playlist = Settings.current.playlist) {
        if (playlist == null)
            return;
        let newNameInput = Toxen.generate.input({
            placeholder: playlist,
            value: playlist,
        });
        let p = new Prompt("Rename playlist", [
            `Rename \"${playlist}\"`,
            newNameInput
        ]);
        newNameInput.focus();
        newNameInput.setSelectionRange(0, playlist.length);
        let [renameBtn] = p.addButtons(["Rename", "Close"], "fancybutton", true);
        renameBtn.classList.add("color-green");
        renameBtn.addEventListener("click", () => {
            var _c;
            let newName = newNameInput.value.trim();
            SongManager.songList.forEach(s => {
                var _c;
                let id = (_c = s.details.playlists) === null || _c === void 0 ? void 0 : _c.findIndex(pl => pl == playlist);
                if (id != null && id > -1) {
                    s.details.playlists[id] = newName;
                    s.saveDetails();
                }
            });
            let id = (_c = Settings.current.playlists) === null || _c === void 0 ? void 0 : _c.findIndex(pl => pl == playlist);
            if (id != null && id > -1) {
                Settings.current.playlists[id] = newName;
            }
            Settings.current.reloadPlaylists();
            Settings.current.selectPlaylist(newName);
            Settings.current.saveToFile();
            p.close();
        });
        newNameInput.addEventListener("keydown", e => {
            if (e.key == "Enter") {
                renameBtn.click();
            }
        });
        newNameInput.addEventListener("input", () => {
            if (newNameInput.value.trim() == "%null%") {
                renameBtn.disabled = true;
                renameBtn.title = "Playlist can't be named %null% for interal reasons.";
            }
            else if (newNameInput.value.trim() == "") {
                renameBtn.disabled = true;
                renameBtn.title = "Playlist can't be named nothing.";
            }
            else if (newNameInput.value.trim() != playlist && this.playlists.includes(newNameInput.value.trim())) {
                renameBtn.disabled = true;
                renameBtn.title = "Playlist already exists.";
            }
            else {
                renameBtn.title = "Rename playlist!";
                renameBtn.disabled = false;
            }
        });
    }
    addPlaylist() {
        let inpName = document.createElement("input");
        inpName.classList.add("fancyinput");
        let p = new Prompt("New Playlist", [inpName]);
        let [create, close] = p.addButtons(["Create", "Close"], "fancybutton", true);
        create.disabled = true;
        create.title = "Please write in a playlist name";
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
            if (inpName.value.trim() == "%null%") {
                create.disabled = true;
                create.title = "Playlist can't be named %null% for interal reasons.";
            }
            else if (inpName.value.trim() == "") {
                create.disabled = true;
                create.title = "Playlist can't be named nothing.";
            }
            else if (this.playlists.includes(inpName.value.trim())) {
                create.disabled = true;
                create.title = "Playlist already exists.";
            }
            else {
                create.title = "Create playlist!";
                create.disabled = false;
            }
        });
        create.classList.add("color-green");
        create.addEventListener("click", () => {
            this.playlists.push(inpName.value.trim());
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
                Settings.current.applySongFolderListToSelect();
                Settings.current.setSongFolder();
                this.applySongFolderListToSelect();
                this.setSongFolder();
            }));
        });
    }
    applySongFolderListToSelect() {
        let fList = new Toxen.TArray(this.songFolderList);
        fList.remove(...fList.filter(s => !fs.existsSync(s)));
        fList.remove(this.songFolder);
        fList.unshift(this.songFolder);
        let list = document.querySelector("select#songfolderValue");
        list.innerHTML = "";
        fList.forEach(v => {
            let opt = document.createElement("option");
            // opt.text = v.split("/").pop().split("\\").pop();
            opt.text = v;
            opt.value = v;
            list.appendChild(opt);
        });
        this.songFolderList = fList.toArray();
        list.value = this.songFolder;
    }
    setSongFolder() {
        return __awaiter(this, void 0, void 0, function* () {
            if (fs.existsSync(this.songFolder + "/db.json")) {
                yield SongManager.loadFromFile();
            }
            else {
                SongManager.scanDirectory();
            }
            this.saveToFile();
            SongManager.history.clear();
            SongManager.search();
            setTimeout(() => {
                SongManager.playRandom();
            }, 10);
        });
    }
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
    toggleSongPanelLock(force) {
        const element = document.getElementById("lockPanel");
        if (typeof force == "boolean") {
            this.songMenuLocked = !force;
        }
        if (this.songMenuLocked == false) {
            element.innerText = "🔒";
            element.style.opacity = "1";
            this.songMenuLocked = true;
            Toxen.emit("songpanelopen");
        }
        else {
            element.innerText = "🔓";
            element.style.opacity = "0.5";
            this.songMenuLocked = false;
            Toxen.emit("songpanelclose");
        }
        document.getElementById("songmenusidebar").toggleAttribute("open", this.songMenuLocked);
        // this.saveToFile();
        return this.songMenuLocked;
    }
    /**
     * @param force
     */
    toggleSettingsPanelLock(force) {
        let locked = document.getElementById("settingsmenusidebar").hasAttribute("open");
        if (typeof force == "boolean") {
            locked = !force;
        }
        document.getElementById("settingsmenusidebar").toggleAttribute("open", !locked);
        return locked;
    }
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
        setTimeout(() => {
            Toxen.emit("settingspanelopen");
            Toxen.emit("songpanelopen");
            Toxen.emit("settingspanelclose");
            Toxen.emit("songpanelclose");
        }, 10);
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
     * @param base
     */
    setThemeBase(base) {
        Settings.current.lightThemeBase = base;
        // browserWindow.setIcon(Settings.current.lightThemeBase ? "./iconlight.ico" : "./icon.ico");
        if (Settings.current.lightThemeBase) {
            Toxen.setStyleSource("./css/light.theme.css");
        }
        else {
            Toxen.setStyleSource("");
        }
    }
    toggleDiscordPresence(force = !Settings.current.discordPresence) {
        if (Settings.current.discordPresence = force)
            Toxen.discordConnect();
        else
            Toxen.discordDisconnect();
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
var SettingsPanel;
(function (SettingsPanel) {
    SettingsPanel.sections = {};
    class Section {
        constructor(name) {
            this.name = name;
            this.div = document.createElement("div");
            this.divContent = document.createElement("div");
            const h2 = document.createElement("h2");
            this.div.appendChild(h2);
            this.div.appendChild(this.divContent);
            this.div.appendChild(document.createElement("hr"));
        }
        addInput(html) {
            this.inputs.push(new SectionInput(html));
        }
    }
    SettingsPanel.Section = Section;
    class SectionInput {
        constructor(html) {
            this.html = html;
            this.div = document.createElement("div");
        }
    }
    function addSection(sectionName) {
        // Implement
        return new Section(sectionName);
    }
    SettingsPanel.addSection = addSection;
})(SettingsPanel = exports.SettingsPanel || (exports.SettingsPanel = {}));
class Song {
    constructor() {
        this.click = function () { };
        this.songId = 0;
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
         * Detailed information about this song.
         *
         * This is stored on the user's disk in each song folder as `details.json`
         */
        this.details = {
            artist: null,
            title: null,
            album: null,
            source: null,
            sourceLink: null,
            language: null,
            year: null,
            genre: null,
            tags: [],
            playlists: [],
            visualizerColor: null,
            songLength: 0,
            customGroup: null,
        };
        this.element = null;
        /**
         * A randomly generated hash to reload cached files.
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
                exports.toxenMenus.songMenu.items.forEach((i) => {
                    i.songObject = self;
                });
                exports.toxenMenus.songMenu.popup({
                    "x": e.clientX,
                    "y": e.clientY
                });
            }
            else {
                exports.toxenMenus.selectedSongMenu.items.forEach((i) => {
                    i.songObject = self;
                });
                exports.toxenMenus.selectedSongMenu.popup({
                    "x": e.clientX,
                    "y": e.clientY
                });
            }
            SongManager.revealSongPanel();
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
        let trimSubs = document.createElement("input");
        trimSubs.type = "checkbox";
        trimSubs.id = "trimsubtitlescheckbox";
        trimSubs.value = ToxenScriptManager.convertSecondsToDigitalClock(this.details.songLength ? this.details.songLength : 60);
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
         * Verify if timestamp is valid.
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
            "You're about to trim \"" + this.parseName() + "\"<br><strong style='color: red'>This is going to make physical changes to your original file. This cannot be undone once finished.</strong>",
            "When should the song start?",
            start,
            setCurStart,
            "When should it end?",
            end,
            setCurEnd,
            document.createElement("br"),
            trimSubs,
            (function () {
                let label = document.createElement("label");
                label.innerText = "Trim any subtitles to fit as well?";
                label.setAttribute("for", "trimsubtitlescheckbox");
                return label;
            })()
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
        trim.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
            start.disabled = true;
            end.disabled = true;
            trim.disabled = true;
            trimSubs.disabled = true;
            close.disabled = true;
            let trimSubsChecked = trimSubs.checked;
            p.return(true, false);
            let sp = this.getFullPath("songPath");
            let fc = ffmpeg(sp);
            let tmpPath = path.resolve(path.dirname(sp) + "/tmp_" + path.basename(sp));
            let ss = ToxenScriptManager.timeStampToSeconds(start.value);
            let se = ToxenScriptManager.timeStampToSeconds(end.value) - ss;
            // Trimming subtitles
            let srt = null;
            if (trimSubsChecked && this.subtitlePath) {
                let subs = yield Subtitles.parseSrt(this.getFullPath("subtitlePath"));
                for (let i = 0; i < subs.length; i++) {
                    const sub = subs[i];
                    sub.startTime -= ss;
                    sub.endTime -= ss;
                }
                srt = Subtitles.subToSRT(subs);
            }
            fc.setStartTime(ss)
                .addOption("-to " + se)
                .saveToFile(tmpPath)
                .on("start", () => {
                p.headerText = "Trimming Song";
                p.setInteractive(false);
                p.setContent("Starting trimming process...");
                p.clearButtons();
            })
                .on("progress", (progress) => {
                let prog = ToxenScriptManager.timeStampToSeconds(progress.timemark) / se;
                p.setContent(`${this.parseName()}\nTrimming song...<br>${(prog * 100).toFixed(2)}%`);
                browserWindow.setProgressBar(prog);
            })
                .on("end", () => {
                p.setContent(`Trimmed song!`);
                browserWindow.setProgressBar(-1);
                if (srt != null)
                    fs.writeFileSync(this.getFullPath("subtitlePath"), srt);
                let curSong = SongManager.getCurrentlyPlayingSong();
                if (curSong && curSong.songId == this.songId) {
                    SongManager.clearPlay();
                }
                rimraf(sp, (err) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    fs.rename(tmpPath, sp, () => {
                        this.hash = Tools.generateRandomString(3);
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
            // console.log(sp);
            // console.log(tmpPath);
            // console.log(fc._getArguments().join(" "));
        }));
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
     * @param location Location to save to.
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
                + `url("${_path}")`;
            this.element.style.backgroundSize = "cover";
        }
        else if (this.background != null && Settings.current.thumbnails == 3) {
            let _path = this.getFullPath("background");
            if (process.platform == "win32") {
                _path = _path.replace(/\\+/g, "/");
            }
            this.element.style.background = "linear-gradient(to right,  rgba(0, 0, 0, 1), rgba(0, 0, 0, 0) ), "
                + `url("${_path}")`;
            this.element.style.backgroundSize = "contain";
        }
        else {
            this.element.style.background = "";
        }
        this.click = () => {
            this.play();
        };
    }
    getListIndex() {
        return SongManager.songList.findIndex(s => s.songId === this.songId);
    }
    getPlayableListIndex() {
        return SongManager.playableSongs.findIndex(s => s.songId === this.songId);
    }
    setElement(elm) {
        this.element = elm;
        this.element.song = this;
    }
    /**
     * Executes when a song is played.
     */
    onplay(song) { }
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
        if (cur == null || cur.songId != id) {
            Toxen.emit("play", this);
            browserWindow.setOverlayIcon(remote.nativeImage.createFromPath(this.getFullPath("background")), "");
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
                else if (Toxen.audioExtensions.find(a => fp.toLowerCase().endsWith("." + a)) != null) {
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
                            browserWindow.setProgressBar(-1);
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
                                let prog = ToxenScriptManager.timeStampToSeconds(progress.timemark) / duration;
                                p.setContent(`Converting...<br>${(prog * 100).toFixed(2)}%`);
                                browserWindow.setProgressBar(prog);
                            }
                        })
                            .once("error", (err) => {
                            browserWindow.setProgressBar(-1);
                            console.error(err);
                        });
                        return;
                    }
                }
            }
            SongManager.player.play().catch(err => console.error(err));
            Storyboard.setBackground(this.getFullPath("background"));
            Toxen.title = this.parseName();
            ToxenScriptManager.loadCurrentScript();
            if (SongManager.history.historyIndex >= SongManager.history.items.length - 1 && SongManager.history.items[SongManager.history.historyIndex] != this)
                SongManager.history.insert(this);
            if (browserWindow.isFullScreen()) {
                Prompt.close("currentsongnamepopup_hjks798dsabd");
                let _p = new Prompt("", this.parseName())
                    .setInteractive(false)
                    .close(2000);
                _p.name = "currentsongnamepopup_hjks798dsabd";
            }
            if (this.subtitlePath) {
                Subtitles.renderSubtitles(this.getFullPath("subtitlePath"));
            }
            else {
                Subtitles.current = [];
            }
        }
        else {
            if (!SongManager.player.paused) {
                SongManager.player.pause();
                Toxen.emit("pause");
            }
            else {
                SongManager.player.play();
                Toxen.emit("play");
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
            console.warn("Could not find \"" + itemToFind + "\"");
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
    /**
     * Display the details the song has stored.
     */
    displayInfo() {
        let self = this;
        let panel = document.querySelector("div#songinfo");
        /**
         * @param name
         * @param title
         * @param detailsItemName
         * @param isArraySeparatedBy If this is set, the value is an array.
         */
        function makeElement(name, title, detailsItemName, isArraySeparatedBy = null) {
            let p = panel.querySelector('p[name="' + name + '"]');
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
                    p.innerHTML = `${title}: `.bold() + self.details[detailsItemName].join(`${isArraySeparatedBy} `);
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
        makeElement("year", "Year", "year");
        makeElement("genre", "Genre", "genre");
        makeElement("tags", "Tags", "tags", ",");
        makeElement("customGroup", "Custom Group", "customGroup");
    }
    saveDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.details.tags = this.details.tags.filter(t => t.trim() !== "");
                yield fs.promises.writeFile(this.getFullPath("path") + "/details.json", JSON.stringify(this.details, null, 2));
                SongManager.saveToFile();
                if (SongManager.getCurrentlyPlayingSong() == this) {
                    Toxen.title = this.parseName();
                }
                return true;
            }
            catch (error) {
                console.error(error);
                return false;
            }
        });
    }
    setBackground(filePath) {
        if (!fs.existsSync(filePath)) {
            console.error("File path doesn't exist:", filePath);
            return;
        }
        if (this.background) {
            try {
                fs.unlinkSync(this.getFullPath("background"));
            }
            catch (_c) {
                console.warn("No previous background file... ignoring");
            }
        }
        let newPath = this.getFullPath("path") + "/" + filePath.replace(/\\+/g, "/").split("/").pop();
        fs.copyFileSync(filePath, newPath);
        this.background = this.path + "/" + path.relative(this.getFullPath("path"), newPath);
        Storyboard.setBackground(this.getFullPath("background"));
        this.refreshElement();
        SongManager.saveToFile();
    }
    setStoryboard(filePath) {
        if (!fs.existsSync(filePath)) {
            console.error("File path doesn't exist:", filePath);
            return;
        }
        if (this.txnScript) {
            try {
                fs.unlinkSync(this.getFullPath("txnScript"));
            }
            catch (_c) {
                console.warn("No previous txnScript file... ignoring");
            }
        }
        let newPath = this.getFullPath("path") + "/" + filePath.replace(/\\+/g, "/").split("/").pop();
        fs.copyFileSync(filePath, newPath);
        this.txnScript = this.path + "/" + path.relative(this.getFullPath("path"), newPath);
        this.refreshElement();
        ToxenScriptManager.loadCurrentScript();
        SongManager.saveToFile();
    }
    setSubtitles(filePath) {
        if (!fs.existsSync(filePath)) {
            console.error("File path doesn't exist:", filePath);
            return;
        }
        if (this.subtitlePath) {
            try {
                fs.unlinkSync(this.getFullPath("subtitlePath"));
            }
            catch (_c) {
                console.warn("No previous subtitlePath file... ignoring");
            }
        }
        let newPath = this.getFullPath("path") + "/" + filePath.replace(/\\+/g, "/").split("/").pop();
        fs.copyFileSync(filePath, newPath);
        this.subtitlePath = this.path + "/" + path.relative(this.getFullPath("path"), newPath);
        this.refreshElement();
        Subtitles.renderSubtitles(this.getFullPath("subtitlePath"));
        SongManager.saveToFile();
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
    focus(delay = 0) {
        let cpp = this.getGroup();
        if (cpp != null) {
            cpp.collapsed = false;
        }
        setTimeout(() => {
            this.element.scrollIntoViewIfNeeded();
        }, delay);
    }
    /**
     * Return all playlists as a keyvalue pair object.
     */
    getPlaylistsStatus() {
        if (!Array.isArray(this.details.playlists)) {
            this.details.playlists = [];
        }
        let obj = {};
        let list = Settings.current.playlists;
        for (let i = 0; i < list.length; i++) {
            const pl = list[i];
            if (this.details.playlists.includes(pl)) {
                obj[pl] = true;
            }
            else {
                obj[pl] = false;
            }
        }
        return obj;
    }
    addToPlaylist(playlist) {
        if (playlist != undefined) {
            this.details.playlists.push(playlist);
            this.saveDetails();
            SongManager.saveToFile();
            return;
        }
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
    managePlaylists() {
        let list = document.createElement("div");
        list.style.display = "block";
        list.style.width = "95%";
        list.style.margin = "auto";
        let playlists = this.getPlaylistsStatus();
        let count = 0;
        for (const playlist in playlists) {
            if (Object.prototype.hasOwnProperty.call(playlists, playlist)) {
                count++;
                const checked = playlists[playlist];
                const div = document.createElement("div");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = checked;
                const label = document.createElement("label");
                label.innerText = playlist;
                let rndId = "checkbox_" + Tools.generateRandomString();
                checkbox.id = rndId;
                checkbox.addEventListener("click", () => {
                    playlists[playlist] = checkbox.checked;
                    let newPlaylist = [];
                    for (const _playlist in playlists) {
                        if (Object.prototype.hasOwnProperty.call(playlists, _playlist)) {
                            const _value = playlists[_playlist];
                            if (_value) {
                                newPlaylist.push(_playlist);
                            }
                        }
                    }
                    this.details.playlists = newPlaylist;
                    this.saveDetails();
                    SongManager.refreshList();
                });
                div.appendChild(checkbox);
                label.setAttribute("for", rndId);
                div.appendChild(label);
                div.appendChild(document.createElement("br"));
                list.appendChild(div);
            }
        }
        if (count == 0) {
            new Prompt("No playlists", "Create a playlist in the settings panel and then you can add the songs to them!").addButtons("Close", "fancybutton", true);
            return;
        }
        let p = new Prompt("Manage Playlists", [
            `Manage "${this.parseName()}"`,
            list
        ]);
        p.addButtons(["Close"], "fancybutton", true);
    }
    removeFromPlaylist(playlist) {
        let a = new Toxen.TArray(this.details.playlists);
        a.remove(playlist);
        this.details.playlists = a.toArray();
        Settings.current.reloadPlaylists(true);
    }
    removeFromCurrentPlaylist() {
        this.removeFromPlaylist(Settings.current.playlist);
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
        SongManager.revealSongPanel();
    }
    importMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            // Apply metadata
            let meta = yield mm.parseFile(this.getFullPath("songPath"));
            let _tags = this.details.tags;
            if (meta.common.artist) {
                this.details.artist = meta.common.artist;
            }
            if (meta.common.title) {
                this.details.title = meta.common.title;
            }
            if (!this.details.artist && !this.details.title) {
                let fileNoExt = (() => {
                    let a = path.basename(this.getFullPath("songPath")).split(".");
                    a.pop();
                    return a.join(".");
                })();
                let parts = fileNoExt.split(" - ");
                if (parts.length == 1) {
                    this.details.artist = "Unknown";
                    this.details.title = parts[0];
                }
                else if (parts.length >= 2) {
                    this.details.artist = parts.shift();
                    this.details.title = parts.join(" - ");
                }
            }
            else if (!this.details.artist) {
                this.details.artist = "Unknown";
            }
            if (!this.details.album && meta.common.album) {
                this.details.album = meta.common.album;
            }
            if (!this.details.language && meta.common.language) {
                this.details.language = meta.common.language;
            }
            if (!this.details.genre && meta.common.genre) {
                this.details.genre = meta.common.genre.join(", ");
            }
            if (!this.details.year && meta.common.year) {
                this.details.year = meta.common.year.toString();
            }
            if (!this.details.source && meta.common.tvShow) {
                this.details.source = meta.common.tvShow;
            }
            if (meta.common.artists) {
                if (!meta.common.artist && meta.common.artists.length == 1) {
                    this.details.artist = meta.common.artists[0];
                }
                if (meta.common.artists.length > 1 || meta.common.artists[0] != meta.common.artist) {
                    _tags.concat(meta.common.artists);
                }
            }
            if (meta.common.albumartist) {
                if (!meta.common.artist) {
                    this.details.artist = meta.common.albumartist;
                }
                else {
                    _tags.push(meta.common.albumartist);
                }
            }
            if (meta.common.composer) {
                if (meta.common.composer.length > 1) {
                    _tags.concat(meta.common.composer);
                }
            }
            if (meta.common.picture) {
                meta.common.picture.forEach((p, i) => {
                    fs.writeFile(this.getFullPath("path") + `/picture_${i}.` + (typeof p.format ? p.format.split("/").pop() : "jpg"), p.data, err => {
                        if (err)
                            console.error(err);
                    });
                });
            }
            // this.details.tags = [...new Set(_tags)];
            let t = new Toxen.TArray(_tags);
            this.details.tags = t.cleanArray([
                "duplicates",
                "emptyStrings"
            ]).toArray();
            this.saveDetails();
        });
    }
}
exports.Song = Song;
class SongManager {
    /**
     * The playback speed the song is playing at. Default is `1`
     */
    static get playbackRate() {
        return SongManager.player.playbackRate;
    }
    static set playbackRate(v) {
        if (SongManager.player)
            SongManager.player.playbackRate = v;
    }
    static resetPlaybackRate() {
        SongManager.playbackRate = 1;
    }
    static multiManagePlaylists(songs = SongManager.getSelectedSongs()) {
        let list = document.createElement("div");
        list.style.display = "block";
        list.style.width = "95%";
        list.style.margin = "auto";
        let playlists = {};
        Settings.current.playlists.map(p => {
            playlists[p] = false;
        });
        let count = 0;
        for (const playlist in playlists) {
            if (Object.prototype.hasOwnProperty.call(playlists, playlist)) {
                count++;
                const checked = playlists[playlist];
                const div = document.createElement("div");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = checked;
                const label = document.createElement("label");
                label.innerText = playlist;
                let rndId = "checkbox_" + Tools.generateRandomString();
                checkbox.id = rndId;
                checkbox.addEventListener("click", () => {
                    playlists[playlist] = checkbox.checked;
                    let newPlaylists = [];
                    for (const _playlist in playlists) {
                        if (Object.prototype.hasOwnProperty.call(playlists, _playlist)) {
                            const _value = playlists[_playlist];
                            if (_value) {
                                newPlaylists.push(_playlist);
                            }
                        }
                    }
                    songs.forEach(s => {
                        s.details.playlists = newPlaylists;
                        s.saveDetails();
                    });
                    SongManager.refreshList();
                });
                div.appendChild(checkbox);
                label.setAttribute("for", rndId);
                div.appendChild(label);
                div.appendChild(document.createElement("br"));
                list.appendChild(div);
            }
        }
        if (count == 0) {
            new Prompt("No playlists", "Create a playlist in the settings panel and then you can add the songs to them!").addButtons("Close", "fancybutton", true);
            return;
        }
        let p = new Prompt("Manage Playlists", [
            `Manage ${songs.length} songs`,
            list
        ]);
        p.addButtons(["Close"], "fancybutton", true);
    }
    /**
     * If `Settings.onlyVisible` is `true`, returns only the physically visible songs in the song list.
     *
     * If `Settings.onlyVisible` is `false`, returns the full `SongManager.playableSongs` list
     */
    static onlyVisibleSongList(forceOnlyVisible = Settings.current.onlyVisible) {
        if (Settings.current.playlist) {
            return forceOnlyVisible ? SongManager.songList
                .filter(s => (s.getGroup() == null || s.getGroup().collapsed == false)
                && !s.element.hidden
                && (Settings.current.playlist == null || (s.details.playlists && s.details.playlists.includes(Settings.current.playlist)))) : SongManager.songList.filter(s => (s.details.playlists && s.details.playlists.includes(Settings.current.playlist)));
        }
        return forceOnlyVisible ? SongManager.songList
            .filter(s => (s.getGroup() == null || s.getGroup().collapsed == false)
            && !s.element.hidden) : SongManager.songList;
        // // return Settings.current.onlyVisible && Settings.current.songGrouping > 0 ? SongManager.playableSongs.filter(s => s.getGroup() == null || s.getGroup().collapsed == false) : SongManager.playableSongs;
    }
    /**
     * Export every song into a folder.
     */
    static exportAllSongs(location = null, songList = null) {
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
                }, 250);
            }
        });
    }
    /**
     * Export every song into a folder.
     */
    static exportAllBackgrounds(location = null, songList = null) {
        return __awaiter(this, void 0, void 0, function* () {
            let songsWithBackgrounds;
            let allSongs = songsWithBackgrounds = (Array.isArray(songList) ? songList : SongManager.songList);
            songsWithBackgrounds = songsWithBackgrounds.filter(s => s.background != null);
            let ans = typeof location === "string" ? location : dialog.showSaveDialogSync(browserWindow, {
                "title": `Zip ${songsWithBackgrounds.length} Toxen background file${songsWithBackgrounds.length > 1 ? "s" : ""}`,
                "buttonLabel": `Zip Background${songsWithBackgrounds.length > 1 ? "s" : ""}`,
                "defaultPath": `toxen_background${songsWithBackgrounds.length > 1 ? "s" : ""}.zip`
            });
            if (typeof ans == "string") {
                let zip = new Zip();
                let p = new Prompt(`Exporting ${songsWithBackgrounds.length} backgrounds from ${allSongs.length} songs...`, "This can take a while depending on how many backgrounds you're exporting and your computer's speed.");
                setTimeout(() => {
                    for (let i = 0; i < songsWithBackgrounds.length; i++) {
                        const song = songsWithBackgrounds[i];
                        zip.addFile(Tools.stripHTML(song.parseName()) + `_${i}.` + path.extname(song.background), fs.readFileSync(song.getFullPath("background")));
                    }
                    zip.writeZip(ans);
                    p.close();
                    p = new Prompt(`All backgrounds zipped and exported!`);
                    p.close(2000);
                    shell.showItemInFolder(ans);
                }, 250);
            }
        });
    }
    static importMediaFile(file, playOnDone = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const song = new Song();
            let ext;
            let fileNoExt = (function () {
                let a = file.name.split(".");
                ext = a.pop();
                return a.join(".");
            })();
            if (!Toxen.mediaExtensions.includes(ext)) {
                new Prompt("Invalid File", [
                    "You can only select files with the following extension:",
                    Toxen.mediaExtensions.join(", ")
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
            song.path = path.basename(songPath);
            song.songPath = song.getFullPath("path") + "/" + file.name;
            if (ext.toLowerCase() == "txs") {
                let zip = new Zip(file.path);
                zip.extractAllTo(songPath + "/", true);
                fs.unlinkSync(file.path);
                fs.unlinkSync(songPath + "/" + file.name);
            }
            else {
                yield song.importMetadata();
            }
            let resolve;
            let promise = new Promise(res => {
                resolve = res;
            });
            SongManager.songList.push(song);
            // song.saveDetails();
            if (playOnDone) {
                SongManager.revealSongPanel();
            }
            else {
                resolve(song);
            }
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                // song.focus();
                // song.play();
                SongManager.scanDirectory();
                if (playOnDone) {
                    let _song = SongManager.getSongWithPath(song.path);
                    if (_song) {
                        _song.focus();
                        _song.play();
                        resolve(_song);
                    }
                    else {
                        resolve(song);
                    }
                }
            }), 10);
            return promise;
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
            if (typeof Settings.current.songGrouping == "number" && Settings.current.songGrouping > 0 && Settings.current.songGrouping <= 7) {
                let groups = {};
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
                            addToGroup(s.details.artist, s, "[No artist set]");
                        });
                        break;
                    case 2:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.album, s, "[No album set]");
                        });
                        break;
                    case 3:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.source, s, "[No source set]");
                        });
                        break;
                    case 4:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.language, s, "[No language set]");
                        });
                        break;
                    case 5:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.genre, s, "[No genre set]");
                        });
                        break;
                    case 6:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.year, s, "[No year set]");
                        });
                        break;
                    case 7:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.customGroup, s, "[No group set]");
                        });
                        break;
                    case 8:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.artist[0].toUpperCase(), s, "[No artist set]");
                        });
                        break;
                    case 9:
                        SongManager.songList.forEach(s => {
                            addToGroup(s.details.title[0].toUpperCase(), s, "[No title set]");
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
        Toxen.resetTray();
    }
    /**
     * @param search Search for a string
     */
    static search(search = document.querySelector("#search").value) {
        search = search.toLowerCase();
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
         * Escape the required characters in a RegExp string.
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
    /**
     * Reveal the song panel.
     */
    static revealSongPanel() {
        let self = Settings.current;
        if (!self.songMenuLocked) {
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
    static scanDirectory(location = Settings.current.songFolder + "/") {
        if (Settings.current.remote) {
            console.error("Cannot scan directory as it is a remote.");
            return [];
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
                        if (Toxen.mediaExtensions.filter(f => f != "txs").find(f => item.endsWith("." + f))) {
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
                        if (Toxen.imageExtensions.find(f => item.endsWith("." + f))) {
                            song.background = file.name + "/" + item;
                        }
                        if (item == "details.json") {
                            try {
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
     * Get a song based on it's ID
     * @param id Song ID
     */
    static getSong(id) {
        return SongManager.songList.find(s => s.songId == id);
    }
    static getSongWithPath(songFolderName) {
        if (songFolderName instanceof Song) {
            songFolderName = songFolderName.path;
        }
        return SongManager.songList.find(s => s.path === songFolderName);
    }
    static getCurrentlyPlayingSong() {
        if (SongManager.player == null) {
            return null;
        }
        try {
            if (SongManager.player.hasAttribute("src")) {
                return SongManager.getSongWithPath(path.basename(path.dirname(SongManager.player.getAttribute("src"))));
            }
            return SongManager.getSongWithPath(path.basename(path.dirname(SongManager.player.firstElementChild.getAttribute("src"))));
        }
        catch (error) {
            return null;
        }
        // return SongManager.getSong(+SongManager.player.getAttribute("songid"));
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
        return song;
    }
    static playNext() {
        if (SongManager.history.historyIndex < SongManager.history.items.length - 1) {
            return SongManager.history.next();
        }
        const song = SongManager.getCurrentlyPlayingSong();
        if (Settings.current.repeat) {
            SongManager.player.currentTime = 0;
            SongManager.player.play();
            setTimeout(() => {
                browserWindow.webContents.send("updatediscordpresence");
            }, 10);
        }
        else if (Settings.current.shuffle) {
            return SongManager.playRandom();
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
                    return SongManager.playNext();
            }
            if (typeof id == "number" && _songs.length > id + 1) {
                let s = _songs[id + 1];
                s.play();
                return s;
            }
            else {
                let s = _songs[0];
                s.play();
                return s;
            }
        }
    }
    static playPrev() {
        if (SongManager.history.historyIndex > 0) {
            return SongManager.history.previous();
        }
        let song = SongManager.getCurrentlyPlayingSong();
        let _songs = SongManager.onlyVisibleSongList();
        let id = _songs.findIndex(s => s.songId === song.songId);
        if (_songs.length == 0) {
            let g = song.getGroup();
            if (g)
                g.collapsed = false;
            if (SongManager.playableSongs.length > 0)
                return SongManager.playPrev();
            return;
        }
        if (id - 1 >= 0) {
            let _song = _songs[id - 1];
            _song.play();
            return _song;
        }
        else {
            let _song = _songs[_songs.length - 1];
            _song.play();
            return _song;
        }
    }
    static toggleShuffle(force) {
        const element = document.getElementById("smallshufflebutton");
        if (typeof force == "boolean") {
            Settings.current.shuffle = !force;
        }
        Toxen.emit("toggleshuffle", Settings.current.shuffle);
        if (Settings.current.shuffle == false) {
            element.firstElementChild.src = (element.firstElementChild).getAttribute("svgon");
            Settings.current.shuffle = true;
        }
        else {
            element.firstElementChild.src = (element.firstElementChild).getAttribute("svgoff");
            Settings.current.shuffle = false;
        }
        Settings.current.saveToFile();
        return Settings.current.shuffle;
    }
    static toggleRepeat(force) {
        // const element: HTMLButtonElement = document.getElementById("toggleRepeat") as HTMLButtonElement;
        const element = document.getElementById("smallrepeatbutton");
        if (typeof force == "boolean") {
            Settings.current.repeat = !force;
        }
        Toxen.emit("togglerepeat", Settings.current.repeat);
        if (Settings.current.repeat == false) {
            element.firstElementChild.src = (element.firstElementChild).getAttribute("svgon");
            Settings.current.repeat = true;
        }
        else {
            element.firstElementChild.src = (element.firstElementChild).getAttribute("svgoff");
            Settings.current.repeat = false;
        }
        Settings.current.saveToFile();
        return Settings.current.repeat;
    }
    static toggleOnlyVisible(force) {
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
            main.style.margin = "auto";
            // Text
            text.innerHTML = "Drag <code>" + Toxen.mediaExtensions.join("/") + "</code> files here or click to select";
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
                1;
                event.preventDefault();
            }, false);
            let validExtensions = Toxen.mediaExtensions;
            top.addEventListener("drop", (e) => {
                e.preventDefault();
                e.stopPropagation();
                let files = e.dataTransfer.files;
                for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                    const file = files[fileIndex];
                    SongManager.importMediaFile(file, fileIndex == files.length - 1);
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
                        SongManager.importMediaFile(file, fileIndex == files.length - 1);
                    }
                    setTimeout(() => {
                        SongManager.scanDirectory();
                    }, 100);
                });
            });
            return main;
        })());
        p.addContent("or other options:");
        let youtubeDLBtn = document.createElement("button");
        youtubeDLBtn.innerText = "Download YouTube Audio";
        youtubeDLBtn.onclick = function () {
            p.close();
            SongManager.addSongYouTube();
        };
        let youtubeSearchBtn = document.createElement("button");
        youtubeSearchBtn.innerText = "Search YouTube";
        youtubeSearchBtn.onclick = function () {
            p.close();
            SongManager.searchYouTube();
        };
        let close = document.createElement("button");
        close.innerText = "Close";
        close.classList.add("color-red");
        close.onclick = function () {
            p.close();
        };
        p.addButtons([youtubeDLBtn, youtubeSearchBtn, close], "fancybutton");
    }
    static addSongLocal() {
        dialog.showOpenDialog(browserWindow, {
            "title": "Add a supported audio/video file",
            "buttonLabel": "Add file",
            "filters": [
                {
                    "name": "Valid Toxen Media Files",
                    "extensions": Toxen.mediaExtensions
                }
            ]
        });
    }
    static addSongYouTube(autofill = {}) {
        let asyncable = Tools.promiseCreate();
        function isValid(str) {
            let reg = /[\\\/\:\*\?\"\<\>\|\#]/g;
            if (reg.test(str)) {
                str = str.replace(reg, "");
            }
            return str;
        }
        let audioTotal = 0;
        let videoTotal = 0;
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
        let ytInputSubs = document.createElement("select");
        ytInputSubs.classList.add("fancyselect");
        ytInputSubs.style.display = "block";
        ytInputSubs.style.width = "92%";
        ytInputSubs.style.margin = "auto";
        let _emptyOption = document.createElement("option");
        _emptyOption.text = "No subtitles available";
        _emptyOption.value = "";
        ytInputSubs.disabled = true;
        ytInputSubs.appendChild(_emptyOption);
        let ytVideoCheckContainer = document.createElement("div");
        let ytInputVideo = document.createElement("input");
        ytInputVideo.type = "checkbox";
        ytInputVideo.id = "_ytinputvideo";
        let _ytVideoCheckContainerText = document.createElement("label");
        _ytVideoCheckContainerText.setAttribute("for", "_ytinputvideo");
        _ytVideoCheckContainerText.style.display = "inline";
        _ytVideoCheckContainerText.innerText = "Download Video";
        ytVideoCheckContainer.style.width = "93%";
        ytVideoCheckContainer.style.margin = "auto";
        ytVideoCheckContainer.appendChild(ytInputVideo);
        ytVideoCheckContainer.appendChild(_ytVideoCheckContainerText);
        let sl = new SelectList(SongManager.getAllArtists().map(artist => {
            return {
                text: artist,
                value: artist
            };
        }), false);
        sl.setSelectPlaceholder("Quick-select Artist");
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
        const tags = (autofill === null || autofill === void 0 ? void 0 : autofill.tags) || [];
        ytInput.addEventListener("input", () => {
            let url = ytInput.value.trim();
            if (ytdl.validateURL(url)) {
                ytdl.getBasicInfo(url).then(info => {
                    ytInputArtist.value = info.videoDetails.media.artist ?
                        info.videoDetails.media.artist : info.videoDetails.title.split(/-|~/).length > 1 ?
                        info.videoDetails.title.split(/-|~/)[0].trim() : info.videoDetails.author.name;
                    ytInputTitle.value = info.videoDetails.media.song ?
                        info.videoDetails.media.song : info.videoDetails.title.split(/-|~/).length > 1 ?
                        info.videoDetails.title.split(/-|~/).filter((v, i) => i > 0).join("-").trim() : info.videoDetails.title;
                    let artists = SongManager.getAllArtists();
                    tags.push(info.videoDetails.author.name, info.videoDetails.title, ...info.videoDetails.keywords);
                    if (artists.includes(ytInputArtist.value.trim())) {
                        ytInputArtist.style.color = "lightgreen";
                    }
                    else {
                        ytInputArtist.style.color = "white";
                    }
                    if (info.player_response.captions) {
                        ytInputSubs.innerHTML = "";
                        let opt = document.createElement("option");
                        opt.text = "<Click to select Subtitles>";
                        opt.value = "";
                        ytInputSubs.appendChild(opt);
                        ytInputSubs.disabled = false;
                        for (let i = 0; i < info.player_response.captions.playerCaptionsTracklistRenderer.captionTracks.length; i++) {
                            const cap = info.player_response.captions.playerCaptionsTracklistRenderer.captionTracks[i];
                            let opt = document.createElement("option");
                            opt.text = cap.name.simpleText;
                            opt.value = cap.baseUrl;
                            ytInputSubs.appendChild(opt);
                            console.log(cap);
                        }
                    }
                    else {
                        ytInputSubs.innerHTML = "";
                        let _emptyOption = document.createElement("option");
                        _emptyOption.text = "No subtitles available";
                        _emptyOption.value = "";
                        ytInputSubs.value = "";
                        ytInputSubs.disabled = true;
                        ytInputSubs.appendChild(_emptyOption);
                    }
                })
                    .catch(err => Toxen.errorPrompt(err, "Something went wrong when trying to fetch youtube data.", "YTDL.getBasicInfo"));
            }
            else {
                ytInputSubs.innerHTML = "";
                let _emptyOption = document.createElement("option");
                _emptyOption.text = "No subtitles available";
                _emptyOption.value = "";
                ytInputSubs.value = "";
                ytInputSubs.disabled = true;
                ytInputSubs.appendChild(_emptyOption);
            }
        });
        ytInputArtist.addEventListener("input", e => {
            let artists = SongManager.getAllArtists();
            if (artists.includes(ytInputArtist.value.trim())) {
                ytInputArtist.style.color = "lightgreen";
            }
            else {
                ytInputArtist.style.color = "white";
            }
        });
        p.addContent(sl.element);
        sl.element.style.position = "relative";
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
        p.addContent(ytInputSubs);
        var isVideo = false;
        p.addContent(ytVideoCheckContainer);
        ytInputVideo.addEventListener("click", e => {
            isVideo = ytInputVideo.checked;
        });
        let progressText = document.createElement("p");
        progressText.style.display = "block";
        progressText.style.width = "93%";
        progressText.style.margin = "auto";
        p.addContent(progressText);
        p.addContent(ytProgressBar);
        ytInput.focus();
        var downloadYouTube = document.createElement("button");
        downloadYouTube.innerText = "Download";
        downloadYouTube.classList.add("color-green");
        downloadYouTube.onclick = function () {
            return __awaiter(this, void 0, void 0, function* () {
                if (Toxen.ffmpegAvailable())
                    ffmpeg.setFfmpegPath(Toxen.ffmpegPath());
                else
                    return Toxen.ffmpegDownload();
                // Start Downloading...
                p.headerText = "Downloading audio...";
                ytInput.disabled = true;
                ytInputArtist.disabled = true;
                ytInputTitle.disabled = true;
                downloadYouTube.disabled = true;
                let url = ytInput.value.trim();
                let artist = ytInputArtist.value.trim();
                let title = ytInputTitle.value.trim();
                let subsURL = ytInputSubs.value;
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
                song.details.tags = [];
                song.path = isValid(artist) == "" ? isValid(title) : isValid(artist) + " - " + isValid(title);
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
                // Rest of the details.
                song.songPath = song.path + "/audio.mp3";
                song.background = song.path + "/maxresdefault.jpg";
                song.details.artist = artist === "" ? null : artist;
                song.details.title = title;
                song.details.sourceLink = url;
                if (subsURL)
                    song.subtitlePath = song.path + "/"
                        + [...ytInputSubs.childNodes].find(o => o.value == subsURL).text + ".srt";
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
                let dlBg = new ion.Download("https://i.ytimg.com/vi/" + ytdl.getURLVideoID(url) + "/maxresdefault.jpg", song.getFullPath("background"));
                dlBg.start(); // Download BG image
                if (subsURL) {
                    let srt = Subtitles.convertXMLToSRT(yield (yield fetch(subsURL)).text());
                    fs.writeFile(song.getFullPath("subtitlePath"), srt, err => {
                        if (err)
                            console.error(err);
                    });
                    console.log(srt);
                }
                let ws = new fs.WriteStream(song.getFullPath("songPath"));
                let cancelledByUser = false;
                audio.pipe(ws)
                    .on("finish", () => {
                    browserWindow.setProgressBar(-1);
                    if (cancelledByUser == true) {
                        return;
                    }
                    ws.close();
                    if (!isVideo) {
                        SongManager.songList.push(song);
                        SongManager.refreshList();
                        song.play();
                        song.saveDetails();
                        p.close();
                        new ElectronNotification({
                            "title": song.path + " finished downloading.",
                            "body": ""
                        }).show();
                        asyncable.resolve(song);
                    }
                    else {
                        // Continue to download video
                        p.headerText = "Downloading video...";
                        let video = ytdl(url, {
                            "filter": "videoonly",
                            "quality": "highestvideo"
                        });
                        let audioPath = song.getFullPath("songPath");
                        let videoPath = song.getFullPath("songPath");
                        videoPath = videoPath.substring(0, videoPath.length - 3) + "mp4";
                        // let ws = new fs.WriteStream(videoPath as unknown);
                        p.headerText = "Merging audio and video...";
                        // let videoStream = fs.createWriteStream(song.getFullPath("path") + "/output.mp4");
                        let fcmd = ffmpeg(video);
                        fcmd.format("mp4");
                        fcmd.addInput(audioPath)
                            .audioCodec("aac")
                            .videoCodec("copy")
                            // .map("0:v:0")
                            // .map("1:a:0")
                            .save(song.getFullPath("path") + "/output.mp4");
                        video.on("finish", () => {
                            browserWindow.setProgressBar(-1);
                            // When everything has finished including downloading audio, downloading video, and merging:
                            ws.close();
                            try {
                                fs.unlink(song.getFullPath("songPath"), () => null);
                            }
                            catch (error) {
                                console.error("oopsi, it did the bad uwu");
                            }
                            song.songPath = song.path + "/output.mp4";
                            SongManager.songList.push(song);
                            SongManager.refreshList();
                            song.saveDetails();
                            p.close();
                            new ElectronNotification({
                                "title": song.path + " finished downloading.",
                                "body": ""
                            }).show();
                            setTimeout(() => {
                                song.play();
                                asyncable.resolve(song);
                            }, 100);
                        })
                            .on("error", (err) => {
                            browserWindow.setProgressBar(-1);
                            console.error(err);
                            dialog.showErrorBox("Unexpected Error", err.message);
                            ytInput.disabled = false;
                            ytInputArtist.disabled = false;
                            ytInputTitle.disabled = false;
                            downloadYouTube.disabled = false;
                            p.headerText = "Download YouTube Audio";
                            asyncable.reject(err.message);
                        })
                            .on("progress", (chunk, downloaded, total) => {
                            videoTotal = total;
                            ytProgressBar.max = total * 2;
                            ytProgressBar.value = (total * 1) + downloaded;
                            progressText.innerText = (ytProgressBar.value / ytProgressBar.max * 100).toFixed(2) + "%";
                            browserWindow.setProgressBar(ytProgressBar.value / ytProgressBar.max);
                        })
                            .on("error", (err) => {
                            browserWindow.setProgressBar(-1);
                            console.error(err);
                            dialog.showErrorBox("Unexpected Error", err.message);
                            ytInput.disabled = false;
                            ytInputArtist.disabled = false;
                            ytInputTitle.disabled = false;
                            downloadYouTube.disabled = false;
                            p.headerText = "Download YouTube Audio";
                            asyncable.reject(err.message);
                        });
                        // console.log(fcmd._getArguments());
                        // console.log("ffmpeg " + fcmd._getArguments().map(v => {
                        //   if (v.includes(" ")) {
                        //     return `"${v}"`;
                        //   }
                        //   return v;
                        // }).join(" "));
                    }
                })
                    .on("error", (err) => {
                    browserWindow.setProgressBar(-1);
                    ws.close();
                    console.error(err);
                    dialog.showErrorBox("Unexpected Error", err.message);
                    ytInput.disabled = false;
                    ytInputArtist.disabled = false;
                    ytInputTitle.disabled = false;
                    downloadYouTube.disabled = false;
                    p.headerText = "Download YouTube Audio";
                    asyncable.reject(err.message);
                });
                audio.on("progress", (chunk, downloaded, total) => {
                    audioTotal = total;
                    ytProgressBar.max = isVideo ? total * 2 : total;
                    ytProgressBar.value = downloaded;
                    progressText.innerText = (ytProgressBar.value / ytProgressBar.max * 100).toFixed(2) + "%";
                    browserWindow.setProgressBar(ytProgressBar.value / ytProgressBar.max);
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
                    asyncable.reject(err.message);
                });
                ytProgressBar.min = 0;
                if (p.buttonsElement.children.length < 3) {
                    let cancel = document.createElement("button");
                    cancel.innerText = "Cancel Download";
                    cancel.classList.add("color-red");
                    cancel.onclick = function () {
                        browserWindow.setProgressBar(-1);
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
            sl.close();
        };
        p.addButtons([downloadYouTube, close], "fancybutton");
        setTimeout(() => {
            let box = ytInputArtist.getBoundingClientRect();
            sl.element.style.width = box.width + "px";
            sl.element.style.display = "block";
            sl.element.style.width = "93%";
            sl.element.style.margin = "auto";
            sl.on("select", s => ytInputArtist.value = s.value);
        }, 0);
        setTimeout(() => {
            if (autofill === null || autofill === void 0 ? void 0 : autofill.url) {
                ytInput.value = autofill === null || autofill === void 0 ? void 0 : autofill.url;
                ytInput.disabled = true;
            }
            ytInputArtist.value = (autofill === null || autofill === void 0 ? void 0 : autofill.artist) || "";
            ytInputTitle.value = (autofill === null || autofill === void 0 ? void 0 : autofill.title) || "";
            if ((autofill === null || autofill === void 0 ? void 0 : autofill.autoRun) === true) {
                downloadYouTube.click();
                p.setInteractive(false);
            }
        }, 10);
        return asyncable.promise;
        // SongManager.addSongYouTube({
        //   url: "https://www.youtube.com/watch?v=Ong7DOBF07U",
        //   artist: "Miss Hentai Music",
        //   title: "Dernière",
        //   autoRun: true,
        // })
    }
    static searchYouTube() {
        class YouTubeEntry {
            constructor(videoData) {
                this.videoData = videoData;
                this.element = document.createElement("div");
                this.element.style.width = "100%";
                this.element.style.height = "fit-content";
                this.element.style.overflowY = "auto";
                this.element.style.background = `url("${videoData.thumbnail}") no-repeat center center black`;
                this.element.style.backgroundSize = "cover";
                this.element.title = "Click to open download prompt or CTRL + Click to instantly start download";
                this.artist = videoData.title.split(/-|~/).length > 1 ?
                    videoData.title.split(/-|~/)[0].trim() : videoData.author.name;
                this.title = videoData.title.split(/-|~/).length > 1 ?
                    videoData.title.split(/-|~/).filter((v, i) => i > 0).join("-").trim() : videoData.title;
                // let img = document.createElement("img");
                // img.src = videoData.thumbnail;
                // img.style.width = "25%";
                // img.style.height = "inherit";
                // img.style.display = "block";
                // img.style.float = "left";
                // this.element.appendChild(img);
                let details = document.createElement("div");
                // details.style.width = "75%";
                // details.style.width = "100%";
                // details.style.display = "block";
                // details.style.padding = "4px";
                // details.style.float = "left";
                // details.style.boxSizing = "border-box";
                // details.style.backgroundColor = "rgba(0, 0, 0, 1)";
                // details.style.opacity = "0.75";
                // details.style.transition = "opacity 0.2s ease-in-out";
                details.classList.add("ytEntryDetails");
                let title = document.createElement("h3");
                title.innerText = videoData.title;
                let info = document.createElement("p");
                info.innerHTML = videoData.duration.timestamp + "<br>" +
                    "<b>" + Tools.encodeHTML(videoData.author.name) + "</b><br>" +
                    (videoData.views >= 0 ? videoData.views.toLocaleString() : "Could not determined") + " views";
                details.appendChild(title);
                details.appendChild(info);
                this.element.appendChild(details);
                this.element.addEventListener("click", (e) => {
                    let opts = {
                        artist: this.artist,
                        title: this.title,
                        url: videoData.url,
                        tags: [
                            videoData.author.name,
                            videoData.title
                        ],
                        autoRun: e.ctrlKey
                    };
                    SongManager.addSongYouTube(opts);
                });
            }
            static search(search) {
                return __awaiter(this, void 0, void 0, function* () {
                    let sr = yield yt_search_1.search({
                        search: search,
                        userAgent: "Toxen",
                        pages: 5,
                    });
                    let plId = null;
                    if (sr.videos.length > 0)
                        return sr.videos.map(vsr => new YouTubeEntry(vsr));
                    else if (ytpl.validateID(plId = yield ytpl.getPlaylistID(search))) {
                        return (yield ytpl(plId, { limit: Infinity })).items.map(v => new YouTubeEntry(mapYTPLResultToVideoSearchResult(v)));
                    }
                    function mapYTPLResultToVideoSearchResult(data) {
                        return {
                            ago: "0",
                            author: {
                                name: data.author.name,
                                url: data.author.ref
                            },
                            description: "",
                            duration: {
                                seconds: 0,
                                timestamp: data.duration,
                                toString() {
                                    return data.duration;
                                }
                            },
                            image: data.thumbnail,
                            seconds: 0,
                            thumbnail: data.thumbnail,
                            timestamp: "",
                            title: data.title,
                            type: "video",
                            url: data.url,
                            videoId: data.id,
                            views: -1
                        };
                    }
                });
            }
        }
        let videoContainer = document.createElement("div");
        videoContainer.style.display = "flex";
        videoContainer.style.width = "50vw";
        videoContainer.style.maxHeight = "50vh";
        videoContainer.style.overflowY = "auto";
        let col1 = document.createElement("div");
        col1.style.width = "100%";
        videoContainer.appendChild(col1);
        let col2 = document.createElement("div");
        col2.style.width = "100%";
        videoContainer.appendChild(col2);
        let p = new Prompt("Search YouTube", [
            Toxen.generate.input({
                placeholder: "Search...",
                modify(input) {
                    input.type = "search";
                    input.addEventListener("search", () => {
                        if (input.value == "")
                            return;
                        col1.innerHTML = "Searching...";
                        col2.innerHTML = "";
                        YouTubeEntry.search(input.value).then(videos => {
                            col1.innerHTML = "";
                            videos.forEach((v, i) => {
                                if (i % 2 == 0)
                                    col1.appendChild(v.element);
                                else
                                    col2.appendChild(v.element);
                            });
                        });
                    });
                    setTimeout(() => {
                        input.focus();
                    }, 10);
                }
            }),
            videoContainer
        ]);
        p.addButtons("Close", "fancybutton", true);
    }
    static importCurrentMetadata() {
        let song = SongManager.getCurrentlyPlayingSong();
        song.importMetadata().then(() => {
            song.refreshElement();
            song.displayInfo();
        });
    }
    static selectBackground(song = SongManager.getCurrentlyPlayingSong()) {
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            "buttonLabel": "Select Image",
            "filters": [
                {
                    "extensions": Toxen.imageExtensions,
                    "name": ""
                }
            ]
        })
            .then(handler);
        function handler(pathObject) {
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
                    obj.style.boxSizing = "border-box";
                    obj.addEventListener("input", () => {
                        if (/https?:\/\/.*/g.test(obj.value)) {
                            dlBg.disabled = false;
                        }
                        else {
                            dlBg.disabled = true;
                        }
                        previewImage.src = obj.value;
                    });
                }
            });
            let previewImage = document.createElement("img");
            previewImage.style.display = "block";
            previewImage.style.margin = "auto";
            previewImage.style.maxWidth = "25vw";
            previewImage.style.maxHeight = "20vh";
            let dlBg = Toxen.generate.button({
                "text": "Download Background",
                "backgroundColor": "green",
                click() {
                    p.return(url.value);
                }
            });
            let p = new Prompt("Download Background", [url, previewImage]);
            p.addButtons([dlBg, "Close"], "fancybutton", true);
            if (ytdl.validateURL(song.details.sourceLink)) {
                let quickPics = document.createElement("div");
                quickPics.style.maxWidth = "25vw";
                quickPics.style.maxHeight = "20vh";
                quickPics.style.overflowY = "auto";
                p.addContent(quickPics);
                let ytid = ytdl.getURLVideoID(song.details.sourceLink);
                [
                    "maxresdefault.jpg",
                    "hqdefault.jpg",
                ].map(picName => {
                    let img = document.createElement("img");
                    img.src = "https://i.ytimg.com/vi/" + ytid + "/" + picName;
                    img.classList.add("suggestionImage");
                    img.title = "Click to quick-set image to this";
                    img.addEventListener("click", () => {
                        url.value = img.src;
                        dlBg.click();
                    });
                    return img;
                }).forEach(img => quickPics.appendChild(img));
            }
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
            let selectedPath = pathObject.filePaths[0];
            song.setStoryboard(selectedPath);
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
    static getAllArtists() {
        let artists = SongManager.songList.map(s => s.details.artist);
        return [...new Set(artists)];
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
 * Song History
 */
SongManager.history = new class History {
    constructor() {
        this.historyIndex = -1;
        this.items = [];
    }
    next() {
        this.historyIndex++;
        if (this.historyIndex >= this.items.length)
            this.historyIndex = this.items.length - 1;
        let song = this.items[this.historyIndex];
        song.play();
        return song;
    }
    previous() {
        this.historyIndex--;
        if (this.historyIndex < 0)
            this.historyIndex = 0;
        let song = this.items[this.historyIndex];
        song.play();
        return song;
    }
    insert(song) {
        // this.items.splice(this.historyIndex);
        this.historyIndex = this.items.push(song) - 1;
    }
    /**
     * Clear the history.
     */
    clear() {
        this.historyIndex = -1;
        this.items = [];
    }
    /**
     * Clear the history.
     */
    clearAndPrompt() {
        SongManager.history.clear();
        new Prompt("", "History cleared.").close(2000);
    }
};
/**
 * The div element containing all of the songs elements.
 */
SongManager.songListElement = null;
/**
 * Toxen's Media Player.
 */
SongManager.player = null;
/**
 * This should be set by the client.
 */
SongManager.onplay = function (song) { };
class SongGroup {
    /**
     * @param name Name for this group container.
     */
    constructor(name) {
        /**
         * List of songs in this group
         */
        this.songList = [];
        this.name = null;
        this.element = null;
        this.name = name;
        this.element = document.createElement("div");
        this.element.songGroup = this;
        this.element.classList.add("songgroup");
        this.element.toggleAttribute("collapsed", true);
        this.element.addEventListener("click", (e) => {
            let t = e.target;
            if (t && t.classList.contains("songgrouphead")) {
                this.collapse();
            }
        });
        let self = this;
        this.element.addEventListener("contextmenu", function (e) {
            e.stopPropagation();
            e.preventDefault();
            exports.toxenMenus.songGroupMenu.items.forEach((i) => {
                i.songGroup = self;
            });
            exports.toxenMenus.songGroupMenu.popup({
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
        SongManager.revealSongPanel();
    }
    static getAllGroups(collapsedCondition = null) {
        let _a = [...document.querySelectorAll(".songgroup")].map((e) => {
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
     * @param collapsedCondition Omit to ignore and return all
     */
    static getAllGroupNames(collapsedCondition = null) {
        let _a = [...document.querySelectorAll(".songgroup")].map((e) => {
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
SongGroup.songGroups = [];
exports.toxenMenus = {
    "songMenu": Menu.buildFromTemplate([
        {
            label: "Display info",
            click: (menuItem) => {
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
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.toggleSelect();
                }
            }
        },
        {
            label: "Manage playlists...",
            click: (menuItem) => {
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    // song.addToPlaylist();
                    song.managePlaylists();
                }
            }
        },
        // {
        //   label: "Remove from current playlist",
        //   click: (menuItem: ToxenElectronMenuItemSong) => {
        //     const song: Song = menuItem.songObject;
        //     if (song instanceof Song) {
        //       if (Settings.current.playlist !== null) {
        //         song.removeFromCurrentPlaylist();
        //         SongManager.refreshList();
        //         new Prompt("Removed from playlist", `Removed "${song.parseName()}" from "${Settings.current.playlist}"`).close(2000);
        //       }
        //       else {
        //         new Prompt("No playlist selected", `You need to have a playlist selected before you can remove it from one.`).close(3000);
        //       }
        //     }
        //   }
        // },
        {
            label: "Open song folder",
            click: (menuItem) => {
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
            label: "Import metadata",
            click(menuItem) {
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.importMetadata().then(() => {
                        SongManager.revealSongPanel();
                        song.refreshElement();
                        song.displayInfo();
                    });
                }
            }
        },
        {
            label: "Set Background...",
            click(menuItem) {
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    SongManager.selectBackground(song);
                }
            }
        },
        {
            label: "Set Background from URL...",
            click(menuItem) {
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    SongManager.selectBackgroundFromURL(song);
                }
            }
        },
        {
            label: "Edit Storyboard Script",
            click: (menuItem) => {
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
            label: "Export song...",
            click: (menuItem) => {
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.export();
                }
            }
        },
        {
            label: "Trim song...",
            click: (menuItem) => {
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    song.trim();
                }
            }
        },
        {
            label: "Delete song",
            click: (menuItem) => {
                const song = menuItem.songObject;
                if (song instanceof Song) {
                    // let path = song.getFullPath("path");
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
                SongManager.revealSongPanel();
                SongManager.getCurrentlyPlayingSong().focus();
            }
        },
    ]),
    "selectedSongMenu": Menu.buildFromTemplate([
        // {
        //   label: "Remove songs from current playlist",
        //   click: (menuItem) => {
        //     const songs: Song[] = SongManager.getSelectedSongs();
        //     if (Settings.current.playlist !== null) {
        //       songs.forEach(song => {
        //         song.removeFromCurrentPlaylist();
        //       });
        //       SongManager.refreshList();
        //       new Prompt("Removed from playlist", `Removed "${songs.length}" songs from "${Settings.current.playlist}"`).close(2000);
        //     }
        //     else {
        //       new Prompt("No playlist selected", `You need to have a playlist selected before you can remove songs from one.`).close(3000);
        //     }
        //   }
        // },
        {
            label: "Export songs",
            click: (menuItem) => {
                const songs = SongManager.getSelectedSongs();
                SongManager.exportAllSongs(null, songs);
            }
        },
        {
            label: "Export songs' backgrounds",
            click: (menuItem) => {
                const songs = SongManager.getSelectedSongs();
                SongManager.exportAllBackgrounds(null, songs);
            }
        },
        {
            label: "Import metadata from selected songs",
            click: (menuItem) => {
                const songs = SongManager.getSelectedSongs();
                songs.forEach((s) => __awaiter(void 0, void 0, void 0, function* () { yield s.importMetadata(); s.refreshElement(); }));
            }
        },
        {
            label: "Delete songs",
            click: (menuItem) => {
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
                SongManager.revealSongPanel();
                SongManager.getCurrentlyPlayingSong().focus();
            }
        },
    ]),
    "songGroupMenu": Menu.buildFromTemplate([
        {
            label: "Toggle group",
            click: (menuItem) => {
                const songGroup = menuItem.songGroup;
                if (songGroup instanceof SongGroup) {
                    songGroup.collapse();
                }
            }
        },
        {
            label: "Open only this group",
            click: (menuItem) => {
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
                const songGroup = menuItem.songGroup;
                if (songGroup instanceof SongGroup) {
                    songGroup.focus();
                    Effect.flashElement(songGroup.element);
                }
            }
        },
        {
            label: "Select all in group",
            click: (menuItem) => {
                const songGroup = menuItem.songGroup;
                if (songGroup instanceof SongGroup) {
                    songGroup.songList.forEach(s => s.selected = true);
                }
            }
        },
        {
            label: "Deselect all in group",
            click: (menuItem) => {
                const songGroup = menuItem.songGroup;
                if (songGroup instanceof SongGroup) {
                    songGroup.songList.forEach(s => s.selected = false);
                }
            }
        },
        {
            type: "separator"
        },
        {
            label: "Focus currently playing song.",
            click: () => {
                SongManager.revealSongPanel();
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
 * Electron Menu.
 */
exports.toxenHeaderMenu = reloadMenu();
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
                        SongManager.revealSongPanel();
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
                    label: "Minimize to tray",
                    click() {
                        browserWindow.hide();
                        Toxen.resetTray();
                    },
                    accelerator: "CTRL + SHIFT + H"
                },
                {
                    label: "Reload Window",
                    click() {
                        browserWindow.reload();
                    },
                    accelerator: "F5"
                },
                {
                    label: "Zoom in",
                    click() {
                        Toxen.zoomIn();
                    },
                    accelerator: "Ctrl + i"
                },
                {
                    label: "Zoom out",
                    click() {
                        Toxen.zoomOut();
                    },
                    accelerator: "Ctrl + o"
                },
                {
                    label: "Reset Zoom",
                    click() {
                        Toxen.zoomReset();
                    },
                    accelerator: "Ctrl + 0"
                },
                {
                    label: "Toggle Fullscreen",
                    click() {
                        Toxen.toggleFullScreen();
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
            label: "Tools",
            submenu: [
                {
                    label: "Statistics",
                    click() {
                        Statistics.current.display();
                    },
                    accelerator: "CTRL + Shift + S"
                },
                {
                    label: "YouTube Search (Experimental)",
                    click() {
                        SongManager.searchYouTube();
                    },
                    accelerator: "CTRL + Shift + Y"
                },
                {
                    label: "Find BPM... (Experimental)",
                    click() {
                        let bpmTally = document.createElement("h3");
                        bpmTally.innerText = "0 BPM";
                        bpmTally.style.textAlign = "center";
                        let tally = 0;
                        let startTime = 0;
                        let endTime = 0;
                        let bpm = 0;
                        let tap = Toxen.generate.button({
                            text: "Tap",
                            modify(e) {
                                e.style.margin = "auto";
                                e.style.display = "block";
                                e.addEventListener("mousedown", () => {
                                    tally++;
                                    if (startTime == 0)
                                        startTime = SongManager.player.currentTime;
                                    else
                                        endTime = SongManager.player.currentTime;
                                    updateBPM();
                                });
                            }
                        });
                        function updateBPM() {
                            let time = +((endTime - startTime).toFixed(1));
                            bpm = (1 / (time / tally)) * 60;
                            if (endTime > startTime)
                                bpmTally.innerText = bpm.toFixed(2) + " BPM";
                        }
                        let p = new Prompt("Find BPM", [
                            "Start tapping the \"Tap\" button and press to the beat",
                            bpmTally,
                            tap
                        ]);
                        p.addButtons([
                            Toxen.generate.button({
                                text: "Reset",
                                click() {
                                    SongManager.player.currentTime = tally = startTime = endTime = bpm = 0;
                                    SongManager.player.play();
                                    bpmTally.innerText = "0 BPM";
                                }
                            }),
                            "Close"
                        ], "fancybutton", true);
                    }
                },
                {
                    label: "ToxenScript Editor",
                    click() {
                        ScriptEditor.open(SongManager.getCurrentlyPlayingSong());
                    },
                    accelerator: "CTRL + E"
                },
            ]
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
                    label: "Change Notes",
                    click() {
                        // Open latest github change notes
                        shell.openExternal("https://github.com/LucasionGS/Toxen-2.0/blob/master/changelogs.md#" + Toxen.version);
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
     */
    static rgb(red = Storyboard.red, green = Storyboard.green, blue = Storyboard.blue) {
        if (!isNaN(red) && typeof red != "number") {
            red = Storyboard.red;
        }
        if (!isNaN(green) && typeof green != "number") {
            green = Storyboard.green;
        }
        if (!isNaN(blue) && typeof blue != "number") {
            blue = Storyboard.blue;
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
     * Instantly set the RGB value
     */
    static rgbInstant(red = Storyboard.red, green = Storyboard.green, blue = Storyboard.blue) {
        if (!isNaN(red) && typeof red != "number") {
            red = Storyboard.red;
        }
        if (!isNaN(green) && typeof green != "number") {
            green = Storyboard.green;
        }
        if (!isNaN(blue) && typeof blue != "number") {
            blue = Storyboard.blue;
        }
        Storyboard.red = red;
        Storyboard.green = green;
        Storyboard.blue = blue;
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
            // var body = document.getElementById("mainbody");
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
                            break;
                        }
                    }
                    Storyboard.currentBackground = defImg;
                    body.style.background = "url(\"" + defImg.replace(/\\/g, "/") + "?" + queryString + "\") no-repeat center center fixed black";
                    body.style.backgroundSize = "cover";
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
     */
    static setIntensity(value) {
        Storyboard.visualizerIntensity = value;
    }
    static setAnalyserFftLevel(size) {
        if (size < 1)
            size = 1;
        Storyboard.visualizerQuantity = Math.pow(2, size + 4);
        Storyboard.setAnalyserFftSize(Storyboard.visualizerQuantity);
    }
    static setAnalyserFftSize(size) {
        Storyboard.analyser.fftSize = Tools.clamp(size, 32, 32768);
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
Storyboard.visualizerQuantity = 5;
/**
 * The offset value for the song.
 * Default is 0;
 */
Storyboard.timingPoint = 0;
/**
 * Background dim value.
 */
Storyboard.backgroundDim = 0;
/**
 * @readonly
 * The currently shown background dim value.
 * **Note:** This is often different from the ``Settings.backgroundDim`` setting, as this is dynamic.
 */
Storyboard.currentBackgroundDim = 0;
/**
 * @readonly
 * The currently shown average visualizer intensity value.
 */
Storyboard.currentVisualizerIntensityAverage = 0;
Storyboard.currentBackground = "";
Storyboard.analyser = null;
Storyboard.bass = null;
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
                if (!isNaN(+lines[i])) {
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
                    if (lines[i] && lines[i].trim() != "") { // First
                        newSub.text += ionMarkDown_1.Imd.MarkDownToHTML(lines[i]) + "\n";
                        i++;
                    }
                    while (lines[i] && lines[i].trim() != "") { // Rest
                        newSub.text += "<br>" + ionMarkDown_1.Imd.MarkDownToHTML(lines[i]) + "\n";
                        i++;
                    }
                    subData.push(newSub);
                }
            }
            //Returning
            return subData;
        });
    }
    static getSubtitleElement() {
        return document.querySelector("p#subtitles");
    }
    static renderSubtitles(srtFile) {
        return __awaiter(this, void 0, void 0, function* () {
            Subtitles.current = yield Subtitles.parseSrt(srtFile);
            var subText = Subtitles.getSubtitleElement();
            if (subText && subText.innerHTML) {
                subText.innerHTML = "";
            }
            if (!Subtitles.current || Subtitles.isRendering !== false) {
                return;
            }
            Subtitles.isRendering = true;
            requestAnimationFrame(_gl);
            function _gl() {
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
                requestAnimationFrame(_gl);
            }
        });
    }
    static subToSRT(subs) {
        return subs.map(s => {
            return `${s.id}
${ToxenScriptManager.convertSecondsToDigitalClock(s.startTime).replace(".", ",")} --> ${ToxenScriptManager.convertSecondsToDigitalClock(s.endTime).replace(".", ",")}
${s.text}`;
        }).join("\n\n");
    }
    /**
     * Convert XML subtitles to SRT
     * @param xml XML code string
     */
    static convertXMLToSRT(xml) {
        let subs = [];
        let index = 1;
        let reg = /(?:<text start="(.+?)" dur="(.+?)">(.+?)<\/text>)/gs;
        xml.replace(reg, function ($0, $1, $2, $3) {
            subs.push({
                "id": index++,
                "startTime": +$1,
                "endTime": (+$1) + (+$2),
                "text": Tools.decodeHTML($3)
            });
            return $0;
        });
        return Subtitles.subToSRT(subs);
    }
}
Subtitles.current = [];
Subtitles.isRendering = false;
//#region ToxenScript Objects
/**
 * ToxenScript: Background Pulse
 */
class Pulse {
    constructor() {
        this.allPulses = [];
        this.left = null;
        this.right = null;
        this._width = 0;
        this.lastPulse = 0;
        this.interval = setInterval(() => {
            if (this.width > 0) {
                this.width -= Math.max(Math.min(this.width, 1), (this.width / Storyboard.visualizerIntensity) * 2);
                let opacity = (this.width / this.lastPulse);
                this.left.style.opacity = opacity + "";
                this.right.style.opacity = opacity + "";
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
        }, 1000);
    }
    set width(value) {
        this._width = value;
        this.left.style.width = this._width + "px";
        this.right.style.width = this._width + "px";
    }
    get width() {
        return this._width;
    }
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
    constructor(name, fill = "#fff", type = "square") {
        /**
         * X Position.
         */
        this.width = 128;
        /**
         * Y Position.
         */
        this.height = 128;
        this.type = "square";
        /**
         * A number between `0` and `1`. `1` being fully visible.
         */
        this.opacity = 1;
        this.rotation = 0;
        this.pivotX = 0;
        this.pivotY = 0;
        this.name = name;
        this.x = 0;
        this.y = 0;
        this.setFill(fill);
    }
    static getObject(name) {
        let o = StoryboardObject.objects.find(o => o.name === name);
        if (o) {
            return o.object;
        }
        return null;
    }
    static getObjectIndex(name) {
        let index = StoryboardObject.objects.findIndex(o => o.name === name);
        return index;
    }
    static get ratio() {
        return StoryboardObject.widthRatio < StoryboardObject.heightRatio ? StoryboardObject.widthRatio : StoryboardObject.heightRatio;
    }
    static drawObjects(ctx) {
        for (let i = 0; i < StoryboardObject.objects.length; i++) {
            const obj = StoryboardObject.objects[i].object;
            // const obj = StoryboardObject.getObject(name);
            ctx.globalAlpha = obj.opacity;
            let rotBy = obj.rotation * Math.PI / 180;
            let pivotX = (obj.x * StoryboardObject.widthRatio) + (obj.pivotX * StoryboardObject.ratio);
            let pivotY = (obj.y * StoryboardObject.heightRatio) + (obj.pivotY * StoryboardObject.ratio);
            // console.log(pivotX, pivotY);
            // console.log(obj.x * StoryboardObject.widthRatio, obj.y * StoryboardObject.heightRatio);
            ctx.translate(pivotX - obj.pivotX * StoryboardObject.ratio, pivotY - obj.pivotY * StoryboardObject.ratio);
            ctx.rotate(rotBy);
            ctx.translate(0 - pivotX, 0 - pivotY);
            obj.draw(ctx);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            // ctx.rotate(-rotBy);
            ctx.globalAlpha = 1;
        }
    }
    /**
     * @param value If it starts with a poundsign (`#`), it's used as HEX, Image URL otherwise.
     */
    setFill(value, newWidth = null, newHeight = null) {
        if (value.startsWith("#")) {
            let withPound = Tools.cssColorToHex(value);
            let withoutPound = Tools.cssColorToHex(value.substring(1));
            if (withoutPound == withPound) {
                value = withoutPound;
            }
            else {
                if (withoutPound == "#000000") {
                    value = withPound;
                }
                else {
                    value = withoutPound;
                }
            }
            if (this.type != "square" && this.type != "circle")
                this.type = "square";
            this.fill = value;
        }
        else {
            this.type = "image";
            let img = document.createElement("img");
            img.src = path.resolve(SongManager.getCurrentlyPlayingSong().getFullPath("path"), value);
            img.addEventListener("load", () => {
                this.fill = img;
                if (newWidth === null)
                    this.width = img.naturalWidth;
                if (newHeight === null)
                    this.height = img.naturalHeight;
            });
        }
    }
    draw(ctx) {
        switch (typeof this.fill) {
            case "undefined":
                return;
            case "string":
                ctx.fillStyle = this.fill;
                if (this.type == "square") {
                    ctx.fillRect(this.x * StoryboardObject.widthRatio, 
                    // 0,
                    this.y * StoryboardObject.heightRatio, 
                    // 0,
                    this.width * StoryboardObject.ratio, this.height * StoryboardObject.ratio);
                }
                else if (this.type == "circle") {
                    ctx.beginPath();
                    ctx.ellipse((this.x * StoryboardObject.widthRatio) + ((this.width * StoryboardObject.ratio) / 2), (this.y * StoryboardObject.heightRatio) + ((this.height * StoryboardObject.ratio) / 2), (this.width * StoryboardObject.ratio) / 2, (this.height * StoryboardObject.ratio) / 2, 0, 0, 2 * Math.PI);
                    // ctx.stroke();
                    ctx.fill();
                    // this.width * StoryboardObject.widthRatio,
                    // this.height * StoryboardObject.heightRatio
                }
                return;
            case "object":
                ctx.drawImage(this.fill, this.x * StoryboardObject.widthRatio, 
                // 0,
                this.y * StoryboardObject.heightRatio, 
                // 0,
                this.width * StoryboardObject.ratio, this.height * StoryboardObject.ratio);
                return;
            default:
                break;
        }
    }
    /**
     * Convert a string that is formatted as a percentage (The `%` can be included in the end of the string) to a pixel number value
     */
    static widthPercent(w) {
        return (((+w.substring(0, w.length - (w.endsWith("%") ? 1 : 0)) / 100) * StoryboardObject.widthDefault) * StoryboardObject.widthRatio / StoryboardObject.ratio);
    }
    /**
     * Convert a string that is formatted as a percentage (The `%` can be included in the end of the string) to a pixel number value
     */
    static heightPercent(h) {
        return (((+h.substring(0, h.length - (h.endsWith("%") ? 1 : 0)) / 100) * StoryboardObject.heightDefault) * StoryboardObject.heightRatio / StoryboardObject.ratio);
    }
}
exports.StoryboardObject = StoryboardObject;
StoryboardObject.objects = [];
StoryboardObject.widthDefault = 1920;
StoryboardObject.heightDefault = 1080;
StoryboardObject.widthRatio = 1;
StoryboardObject.heightRatio = 1;
/**
 * This is temporary plz.
 */
var testPulse;
window.addEventListener("load", () => {
    testPulse = new Pulse();
    // setTimeout(() => {
    // }, 1000);
});
/**
 * ToxenScript Manager
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
            Prompt.close("toxenscripterrormessage"); // Remove the last error, if any
            ToxenScriptManager.events = [];
            ToxenScriptManager.actions = [];
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
            let song = SongManager.getCurrentlyPlayingSong();
            // Resetting to the default values on reset.
            let subElm = Subtitles.getSubtitleElement();
            subElm.style.top = ""; // Reset Subtitle position
            subElm.style.fontSize = ""; // Reset Subtitle position
            StoryboardObject.objects = []; // Remove all previous objects
            Storyboard.setAnalyserFftLevel(Settings.current.visualizerQuantity); // Reset Analyser level for Visualizer
            Storyboard.backgroundDim = Settings.current.backgroundDim; // Reset background dim
            Storyboard.visualizerDirection = 0; // Reset visualizer direction
            Storyboard.timingPoint = 0; // Reset the offset timing point
            Storyboard.visualizerStyle = Settings.current.visualizerStyle; // Reset visualizer style.
            Storyboard.setIntensity(Settings.current.visualizerIntensity); // Reset visualizer intensity
            ToxenScriptManager.curBlock = null; // Clean up current timing block.
            if (song.details.visualizerColor) { // Reset colors to default app or default song
                Storyboard.rgb(song.details.visualizerColor.red, song.details.visualizerColor.green, song.details.visualizerColor.blue);
            }
            else {
                Storyboard.rgb(Settings.current.visualizerColor.red, Settings.current.visualizerColor.green, Settings.current.visualizerColor.blue);
            }
            if ((Settings.current.remote || fs.existsSync(song.getFullPath("txnScript"))) && song.txnScript) {
                ToxenScriptManager.scriptParser(song.getFullPath("txnScript"));
            }
            // if (Settings.current.remote && song.txnScript) {
            //   ToxenScriptManager.scriptParser(song.getFullPath("txnScript"));
            // }
            // else if (song.txnScript && fs.existsSync(song.getFullPath("txnScript"))) {
            //   ToxenScriptManager.scriptParser(song.getFullPath("txnScript"));
            // }
        });
    }
    /**
     * Apply the variables to the text.
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
     * @param scriptFile Path to script file.
     */
    static scriptParser(scriptFile) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ToxenScriptManager.isRunning === false) {
                // Updates only when required.
                ToxenScriptManager.isRunning = true;
                let _gl = function () {
                    if (Settings.current.storyboard && ToxenScriptManager.events.length > 0) {
                        for (let i = 0; i < ToxenScriptManager.events.length; i++) {
                            const e = ToxenScriptManager.events[i];
                            if (SongManager.player.currentTime >= e.startPoint && SongManager.player.currentTime <= e.endPoint) {
                                e.fn();
                            }
                            // else if (SongManager.player.currentTime < e.startPoint && i > 0) break;
                        }
                    }
                    // if (Settings.current.storyboard && ToxenScriptManager.events.length > 0) {
                    //   ToxenScriptManager.events
                    //   .filter(e => SongManager.player.currentTime >= e.startPoint && SongManager.player.currentTime <= e.endPoint)
                    //   .forEach(e => e.fn());
                    // }
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
                const line = data[i].trim().replace(/(^\s*#|\/\/).*/g, "");
                if (typeof line == "string" && line != "") {
                    let fb = lineParser(line);
                    if (fb == undefined)
                        continue;
                    // Failures
                    if (typeof fb == "string") {
                        setTimeout(() => {
                            let p = new Prompt("Parsing error", ["Failed parsing script:", "\"" + scriptFile + "\"", "Error at line " + (i + 1), (typeof fb == "string" ? fb : "")]);
                            p.addButtons("Close", null, true);
                            p.name = "toxenscripterrormessage";
                        }, 100);
                        throw "Failed parsing script. Error at line " + (i + 1) + "\n" + fb;
                    }
                    if (fb.success == false) {
                        setTimeout(() => {
                            let p = new Prompt("Parsing error", ["Failed parsing script:", "\"" + scriptFile + "\"", "Error at line " + (i + 1)]);
                            p.addButtons("Close", null, true);
                            p.name = "toxenscripterrormessage";
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
                    const checkVariable = /(?<=^\s*)(\$\w+)\s*(?:=>?|:|\()\s*((?:"(?:.*?(?<!\\))"|(?:-?\d*(?:\.?\d+))))/g;
                    if (checkVariable.test(line)) {
                        line.replace(checkVariable, function (item, $1, $2) {
                            if ($2.startsWith("\"") && $2.endsWith("\"")) {
                                $2 = $2.substring(1, $2.length - 1);
                            }
                            // console.log(item, $1, $2);
                            $2 = $2.replace(/\\"/g, "\"");
                            $2 = ToxenScriptManager.applyVariables($2);
                            ToxenScriptManager.variables[$1] = $2;
                            return "";
                        });
                        return;
                    }
                    const checkRawVariable = /(?<=^\s*)(@\w+)\s*(?:=>?|:|\()\s*(.*)/g;
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
                    const checkMaxPerSecondAlt = /^\b(\d*(?:\.?\d+))\/(\d*(?:\.?\d+))\b/g;
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
                    const checkFunction = /^\s*:(\S*?)\s*(=>?|:|\()\s*.*/g;
                    const checkTimingFunctionWithoutTime = /^(?<!\[.*?\])\s*(\w*?)\s*(=>?|:|\()\s*.*/g;
                    if (checkFunction.test(line)) {
                        // line = "[0 - 1]" + line;
                        line = "[always]" + line;
                    }
                    else if (checkTimingFunctionWithoutTime.test(line) && ToxenScriptManager.curBlock != null) {
                        line = `[${ToxenScriptManager.curBlock.startPoint} - ${ToxenScriptManager.curBlock.endPoint}]` + line;
                    }
                    // Check if no only start
                    const checkTimeEmpty = /(?<=\[)\s*(?=\])/g;
                    const checkTime = /(?<=\[)[^+-]*(?=\])/g;
                    if (checkTimeEmpty.test(line)) {
                        line = line.replace(checkTime, "always");
                    }
                    if (checkTime.test(line)) {
                        line = line.replace(checkTime, "$& - $");
                    }
                    // Regexes
                    const timeReg = /(?<=\[).*\s*(?:-|\+)\s*.*(?=\])/g;
                    const typeReg = /(?<=\[.*\s*(?:-|\+)\s*.*\]\s*)\S+?(?=\s*(=>?|:|\())/g;
                    const argReg = /(?<=\[.*\s*(?:-|\+)\s*.*\]\s*\S*\s*(=>?|:|\()\s*).*/g;
                    // const timeReg = /(?<=\[).+\s*(?:-|\+)\s*\S+(?=\])/g;
                    // const typeReg = /(?<=\[.+\s*(?:-|\+)\s*\S+\]\s*)\S+?(?=\s*(=>?|:|\())/g;
                    // const argReg = /(?<=\[.+\s*(?:-|\+)\s*\S+\]\s*\S*\s*(=>?|:|\()\s*).*/g;
                    // Variables
                    var startPoint = 0;
                    var endPoint = 0;
                    var args = [];
                    var fn;
                    // Parsing...
                    var timeRegResult = line.match(timeReg)[0];
                    timeRegResult = timeRegResult.replace(/\s/g, "");
                    if (timeRegResult.toLowerCase() == "always-$") {
                        startPoint = 0;
                        endPoint = ToxenScriptManager.defaultVariables["$end"]();
                    }
                    else if (timeRegResult.toLowerCase() == "-" && ToxenScriptManager.curBlock != null) {
                        startPoint = ToxenScriptManager.curBlock.startPoint;
                        endPoint = ToxenScriptManager.curBlock.endPoint;
                    }
                    else {
                        if (timeRegResult.includes("-")) {
                            const tP = timeRegResult.split("-");
                            startPoint = tP[0];
                            endPoint = tP[1];
                        }
                        else if (timeRegResult.includes("+")) {
                            const tP = timeRegResult.split("+");
                            startPoint = ToxenScriptManager.timeStampToSeconds(tP[0]);
                            endPoint = startPoint + ToxenScriptManager.timeStampToSeconds(tP[1]);
                        }
                        else {
                            const tP = timeRegResult;
                            startPoint = tP;
                            endPoint = "$";
                        }
                    }
                    if (startPoint != "$") {
                        startPoint = ToxenScriptManager.timeStampToSeconds(startPoint);
                    }
                    else {
                        if (ToxenScriptManager._curAction)
                            startPoint = ToxenScriptManager._curAction.events[ToxenScriptManager._curAction.events.length - 1] ? ToxenScriptManager._curAction.events[ToxenScriptManager._curAction.events.length - 1].endPoint : 0;
                        else
                            startPoint = ToxenScriptManager.events[ToxenScriptManager.events.length - 1] ? ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint : 0;
                    }
                    if (endPoint != "$") {
                        endPoint = ToxenScriptManager.timeStampToSeconds(endPoint);
                    }
                    else {
                        // endPoint = ToxenScriptManager.variables["$end"]
                    }
                    let backwards = 1;
                    let curEvent;
                    if (ToxenScriptManager._curAction) {
                        while (ToxenScriptManager._curAction.events.length - backwards >= 0 && (curEvent = ToxenScriptManager._curAction.events[ToxenScriptManager._curAction.events.length - backwards])) {
                            if (curEvent.endPoint == "$" && curEvent.startPoint < startPoint) {
                                console.log(`Changed ${curEvent.endPoint} to ${startPoint}`);
                                curEvent.endPoint = startPoint;
                                break;
                            }
                            backwards++;
                        }
                    }
                    else {
                        while ((curEvent = ToxenScriptManager.events[ToxenScriptManager.events.length - backwards])) {
                            if (curEvent.endPoint == "$" && curEvent.startPoint < startPoint) {
                                curEvent.endPoint = startPoint;
                                break;
                            }
                            backwards++;
                        }
                    }
                    // if (ToxenScriptManager.events[ToxenScriptManager.events.length - 1] && ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint == "$") {
                    //   ToxenScriptManager.events[ToxenScriptManager.events.length - 1].endPoint = startPoint;
                    // }
                    // By now, the startPoint and endPoint are numbers.
                    if (startPoint >= endPoint) { // Catch error if sP is higher than eP
                        return "startPoint cannot be higher than endPoint";
                    }
                    ToxenScriptManager.curBlock = {
                        "startPoint": startPoint,
                        "endPoint": endPoint,
                    };
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
                        _matches = [""];
                    }
                    var argString = _matches[0];
                    if (typeof argString != "string") {
                        return `Arguments are not in a valid format.`;
                    }
                    function parseArgumentsFromString(as) {
                        var argList = [];
                        argList = as.match(/(?:"(.*?)(?<!\\)"|-?\d*(?:\.?\d+%?))/g);
                        if (argList == null)
                            return [];
                        // argList.shift();
                        return argList.map(v => v.replace("\\\"", "\"").replace(/^"(.*)"$/g, function (_, $1) {
                            return $1;
                        }));
                    }
                    if (typeof argString == "string")
                        args = parseArgumentsFromString(argString.trim());
                    else
                        args = [];
                    // Special treatments
                    if (type == "bpmpulse") {
                        // BPM calculation
                        if (args[1] == undefined) {
                            args[1] = "1";
                        }
                        let bpm = +args[0], intensity = +args[1];
                        let bps = bpm / 60;
                        maxPerSecond = 1;
                        let mspb = 1000 / bps;
                        let beatCount = (endPoint - startPoint) * 1000 / mspb;
                        for (let i = 0; i < beatCount; i++) {
                            let st = +(startPoint + (i * (mspb / 1000))).toFixed(3);
                            let et = +(startPoint + ((i + 1) * (mspb / 1000))).toFixed(3);
                            let cmd = `2/1 [${st} - ${et}] Pulse => "${intensity}"`;
                            lineParser(cmd);
                        }
                        return {
                            "success": true
                        };
                    }
                    if (type == ":actionstart") {
                        ToxenScriptManager._curAction = {
                            name: args[0],
                            startPoint: null,
                            endPoint: null,
                            events: []
                        };
                        return {
                            "success": true
                        };
                    }
                    if (type == ":actionend") {
                        if (ToxenScriptManager._curAction)
                            ToxenScriptManager.actions.push(ToxenScriptManager._curAction);
                        ToxenScriptManager._curAction = null;
                        return {
                            "success": true
                        };
                    }
                    if (type == "action") {
                        let action = ToxenScriptManager.actions.find(a => a.name === args[0]);
                        if (action) {
                            if (endPoint == null || startPoint == null || action.endPoint == null || action.startPoint == null)
                                return "Some values were null. Internal Error.";
                            if (action.endPoint <= action.startPoint)
                                return "endPoint is lower or equal to startPoint in an Action. Internal Error.";
                            if (endPoint <= startPoint)
                                return "endPoint is lower or equal to startPoint. Syntax Error.";
                            let eventDuration = endPoint - startPoint;
                            let dur = action.endPoint - action.startPoint;
                            let repeatTimes = 0;
                            while (eventDuration > dur) {
                                repeatTimes++;
                                eventDuration -= dur;
                            }
                            repeatTimes++;
                            for (let i = 0; i < repeatTimes; i++) {
                                for (let i2 = 0; i2 < action.events.length; i2++) {
                                    const event = action.events[i2];
                                    let te = new ToxenEvent(event.startPoint + startPoint + (dur * i), event.endPoint + startPoint + (dur * i), event.fn);
                                    te.type = event.type;
                                    ToxenScriptManager.events.push(te);
                                }
                            }
                        }
                        else {
                            return `Cannot find event "${args[0]}"`;
                        }
                        return {
                            "success": true
                        };
                    }
                    let currentEvent = new ToxenEvent(startPoint, endPoint, function () {
                        if (maxPerSecond > 0 && !type.startsWith(":") && this.hasRun == false) {
                            try {
                                ToxenScriptManager.eventFunctions[type](args, this);
                            }
                            catch (error) {
                                console.error(error, type, args, this);
                            }
                            setTimeout(() => {
                                this.hasRun = false;
                            }, (1000 / maxPerSecond));
                        }
                        else if (maxPerSecond == 0 && !type.startsWith(":")) {
                            try {
                                ToxenScriptManager.eventFunctions[type](args, this);
                            }
                            catch (error) {
                                console.error(error, type, args, this);
                            }
                        }
                        else if (type.startsWith(":") && this.hasRun == false) {
                            try {
                                ToxenScriptManager.eventFunctions[type](args, this);
                            }
                            catch (error) {
                                console.error(error, type, args, this);
                            }
                        }
                        this.hasRun = true;
                    });
                    currentEvent.type = type;
                    if (ToxenScriptManager._curAction != null && !type.startsWith(":")) {
                        if (ToxenScriptManager._curAction.startPoint == null)
                            ToxenScriptManager._curAction.startPoint = currentEvent.startPoint;
                        if (ToxenScriptManager._curAction.endPoint == null || ToxenScriptManager._curAction.endPoint < currentEvent.endPoint)
                            ToxenScriptManager._curAction.endPoint = currentEvent.endPoint;
                        if (ToxenScriptManager._curAction.endPoint < ToxenScriptManager._curAction.startPoint || isNaN(ToxenScriptManager._curAction.endPoint))
                            ToxenScriptManager._curAction.endPoint = ToxenScriptManager._curAction.startPoint;
                        ToxenScriptManager._curAction.events.push(currentEvent);
                        return {
                            "success": true
                        };
                    }
                    ToxenScriptManager.events.push(currentEvent);
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
     * @param code Raw code string to highlight with HTML.
     */
    static syntaxHighlightToxenScript(code, validEventNames = ToxenScriptManager.getEventNames()) {
        const regex = {
            "htmlbrackets": {
                "expression": /[<>&]/g,
                "function": function ($0) {
                    switch ($0) {
                        case "<":
                            return "&lt;";
                        case ">":
                            return "&gt;";
                        case "&":
                            return "&amp;";
                    }
                }
            },
            "value": {
                "expression": /(?<!\[[^\]]*)(?:"(.*?)(?<!\\)"|-?\d*(?:\.?\d+%?))(?!\])/g,
                "function": function ($0, $1) {
                    // if (/^\d+$/g.test($1)) {
                    if (!isNaN(+$0) || /^-?\d*(?:\.?\d+%)$/g.test($0)) {
                        return `<span class=toxenscript_number>${$0}</span>`;
                    }
                    return `<span class=toxenscript_string>${$0}</span>`;
                }
            },
            "timing": {
                // This expression is long asf...
                // Use https://regexr.com for it to make any kind of sense.
                // Here's an explanation... It matches either:
                // 1 Timestamp or variable, 2 Timestamps or variables or mixed TS and vars, the word "always"
                "expression": /(?<=\[\s*)(?:((?:\d+:)*(?:\d+)(?:\.\d+)*|\$\w*|always)\s*(?:(?:-|\+)\s*((?:\d+:)*(?:\d+)(?:\.\d+)*|\$\w*))*)(?=\s*\])/g,
                "function": function ($0, $1, $2) {
                    if ($2 && !$0.includes("+") && ToxenScriptManager.timeStampToSeconds($1) > ToxenScriptManager.timeStampToSeconds($2)) {
                        return `<span class=toxenscript_timinginvalid>${$0}</span>`;
                    }
                    return `<span class=toxenscript_timing>${$0}</span>`;
                }
            },
            "$var": {
                "expression": /\$\w+/g,
                "function": function ($0) {
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
                "expression": /(?<=\s*)(once|twice|thrice|quad|(\d*(?:\.?\d+))\/(\d*(?:\.?\d+)))/gm,
                "function": function ($0) {
                    return `<span class=toxenscript_limiter>${$0}</span>`;
                }
            },
            "event": {
                "expression": /((?<=\[.*\])\s*[A-Za-z_]+)|^(?<=)\s*:?[A-Za-z_]+/gm,
                "function": function ($0) {
                    for (let i = 0; i < validEventNames.length; i++) {
                        const test = validEventNames[i];
                        if (test.toLowerCase() == $0.toLowerCase().trim()) {
                            return `<span class=toxenscript_event>${$0}</span>`;
                        }
                    }
                    return `<span class=toxenscript_eventinvalid>${$0}</span>`;
                }
            },
            "comment": {
                "expression": /(^\s*#|\/\/).*/gm,
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
     * @param trim Whether or not to cut off 0 values on the endings
     * @param removeDecimals Whether or not to remove the decimals from the time.
     * `Note: Removing decimals lowers the accuracy if you want to re-convert it back to seconds.`
     */
    static convertSecondsToDigitalClock(seconds, trim = false, removeDecimals = false) {
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
            time += "0" + (curNumber);
        }
        else {
            time += curNumber;
        }
        curNumber = 0;
        // Use rest as decimal
        if (!removeDecimals) {
            milliseconds = Math.round(milliseconds);
            if (milliseconds >= 100) {
                time += "." + milliseconds;
            }
            else if (milliseconds >= 10) {
                time += ".0" + milliseconds;
            }
            else if (milliseconds < 10) {
                time += ".00" + milliseconds;
            }
        }
        while (trim == true && time.startsWith("00:")) {
            time = time.substring(3);
        }
        if (trim == true && time.endsWith(".000")) {
            time = time.substring(0, time.length - 4);
        }
        return time;
    }
}
exports.ToxenScriptManager = ToxenScriptManager;
ToxenScriptManager.currentScriptFile = "";
ToxenScriptManager.isRunning = false;
/**
 * Alterable variables.
 */
ToxenScriptManager.variables = {};
/**
 * Default variable set.
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
     */
    background: function (args) {
        let song = SongManager.getCurrentlyPlayingSong();
        let _path = song.getFullPath("path") + "/" + args[0];
        if (Storyboard.currentBackground != _path) {
            Storyboard.setBackground(_path, "");
        }
    },
    subtitlesize: function ([size]) {
        if (!Tools.isNumber(size))
            size = 24 + "";
        let elm = Subtitles.getSubtitleElement();
        elm.style.fontSize = size + "px";
    },
    subtitleposition: function ([y, mode]) {
        if (y.endsWith("%"))
            y = (StoryboardObject.heightPercent(y) * StoryboardObject.ratio) + "";
        else if (y == "random")
            y = (Tools.randomInt(StoryboardObject.heightDefault, 32)) + "";
        else if (!Tools.isNumber(y))
            y = (32 * StoryboardObject.heightRatio) + "";
        let elm = Subtitles.getSubtitleElement();
        if (mode == "instant")
            elm.toggleAttribute("smooth", false);
        else
            elm.toggleAttribute("smooth", true);
        let elmH = elm.getBoundingClientRect().height;
        let min = 32, max = (Toxen.inactivityState ? window.innerHeight - elmH - 32 : window.innerHeight - elmH - 128);
        elm.style.top = Tools.clamp(+y - (elmH / 2), min, max) + "px";
    },
    /**
     * Change the color of the visualizer
     * @param args Arguments
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
                let rgb = args[0].toLowerCase() == "default" ? Settings.current.visualizerColor : Tools.cssColorToRgb(args[0]);
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
     * Change the color of the visualizer in a custom transition between times
     * @param args Arguments
     */
    visualizercolor_transition: function ([hex1, hex2], event) {
        ;
        let rgb1 = {
            red: 0,
            green: 0,
            blue: 0
        };
        let rgb2 = {
            red: 0,
            green: 0,
            blue: 0
        };
        let rgbC = {
            red: 0,
            green: 0,
            blue: 0
        };
        try {
            rgb1 = hex1.toLowerCase() == "default" ? Settings.current.visualizerColor : Tools.cssColorToRgb(hex1);
        }
        catch (error) {
            rgb1.red = Settings.current.visualizerColor.red;
            rgb1.green = Settings.current.visualizerColor.green;
            rgb1.blue = Settings.current.visualizerColor.blue;
            console.warn(error);
        }
        try {
            rgb2 = hex2.toLowerCase() == "default" ? Settings.current.visualizerColor : Tools.cssColorToRgb(hex2);
        }
        catch (error) {
            rgb2.red = Settings.current.visualizerColor.red;
            rgb2.green = Settings.current.visualizerColor.green;
            rgb2.blue = Settings.current.visualizerColor.blue;
            console.warn(error);
        }
        rgbC.red = +rgb1.red + ((+rgb2.red - +rgb1.red) * event.percent);
        rgbC.green = +rgb1.green + ((+rgb2.green - +rgb1.green) * event.percent);
        rgbC.blue = +rgb1.blue + ((+rgb2.blue - +rgb1.blue) * event.percent);
        if (Storyboard.red != rgbC.red)
            Storyboard.red = rgbC.red;
        if (Storyboard.green != rgbC.green)
            Storyboard.green = rgbC.green;
        if (Storyboard.blue != rgbC.blue)
            Storyboard.blue = rgbC.blue;
    },
    /**
     * Change the color of the visualizer instantly without transition.
     * @param args Arguments
     */
    visualizercolorinstant: function (args, event) {
        if (!isNaN(args[0])) {
            for (let i = 1; i < 3; i++) {
                if (isNaN(args[i]))
                    args[i] = 0;
            }
        }
        else {
            try {
                let rgb = args[0].toLowerCase() == "default" ? Settings.current.visualizerColor : Tools.cssColorToRgb(args[0]);
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
        Storyboard.rgbInstant(+args[0], +args[1], +args[2]);
    },
    /**
     * Change the intensity of the visualizer
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
    visualizerintensity_transition: function ([intensity, intensity2], event) {
        let dist = +intensity + ((+intensity2 - +intensity) * event.percent);
        Storyboard.visualizerIntensity = dist;
    },
    backgrounddim: function ([dim]) {
        if (dim == "default")
            dim = Settings.current.backgroundDim + "";
        if (!isNaN(+dim) && Storyboard.backgroundDim != +dim) {
            Storyboard.backgroundDim = +dim;
        }
    },
    backgrounddim_transition: function ([dim, dim2], event) {
        if (dim == "default")
            dim = Settings.current.backgroundDim + "";
        if (dim2 == "default")
            dim2 = Settings.current.backgroundDim + "";
        let distanceDim = +dim + ((+dim2 - +dim) * event.percent);
        Storyboard.backgroundDim = distanceDim;
    },
    visualizerquantity: function ([count]) {
        if (!isNaN(+count) && Storyboard.analyser.fftSize != Math.pow(2, +count + 4)) {
            Storyboard.setAnalyserFftLevel(+count);
        }
    },
    /**
     * Change the style of the visualizer
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
            case "alter":
            case "alternating":
                Storyboard.visualizerStyle = 4;
                break;
        }
    },
    /**
     * Change the direction of the visualizer. (Default is `right`)
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
                let rgb = args[1].toLowerCase() == "default" ? Settings.current.visualizerColor : Tools.cssColorToRgb(args[1]);
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
                let rgb = args[1].toLowerCase() == "default" ? Settings.current.visualizerColor : Tools.cssColorToRgb(args[1]);
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
    pulse: function ([intensity]) {
        if (!SongManager.player.paused && !isNaN(intensity)) {
            testPulse.pulse(Storyboard.visualizerIntensity * 32 * +intensity);
        }
    },
    /**
     * This function doesn't do anything.
     * BPMPulse is converted to Pulses when parsed.
     * Exists only for syntax
     */
    bpmpulse: function () { },
    log: function () {
        console.log([...arguments[0]]);
    },
    /**
     * Execute an action
     */
    action: function ([name], event) {
    },
    // Object manipulation.
    object_pivot: function ([name, x, y]) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (x == "left")
            x = 0 + "";
        else if (x == "center")
            x = (obj.width / 2) + "";
        else if (x == "right")
            x = obj.width + "";
        else if (!Tools.isNumber(x))
            x = obj.pivotX + "";
        if (y == "top")
            y = 0 + "";
        else if (y == "center")
            y = (obj.height / 2) + "";
        else if (y == "bottom")
            y = obj.height + "";
        else if (!Tools.isNumber(y))
            y = obj.pivotY + "";
        obj.pivotX = +x;
        obj.pivotY = +y;
    },
    object_pivot_transition: function ([name, x, y, x2, y2], event) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (x == "left")
            x = 0 + "";
        else if (x == "center")
            x = (obj.width / 2) + "";
        else if (x == "right")
            x = obj.width + "";
        else if (!Tools.isNumber(x))
            x = obj.pivotX + "";
        if (y == "top")
            y = 0 + "";
        else if (y == "center")
            y = (obj.height / 2) + "";
        else if (y == "bottom")
            y = obj.height + "";
        else if (!Tools.isNumber(y))
            y = obj.pivotY + "";
        if (x2 == "left")
            x2 = 0 + "";
        else if (x2 == "center")
            x2 = (obj.width / 2) + "";
        else if (x2 == "right")
            x2 = obj.width + "";
        else if (!Tools.isNumber(x2))
            x2 = obj.pivotX + "";
        if (y2 == "top")
            y2 = 0 + "";
        else if (y2 == "center")
            y2 = (obj.height / 2) + "";
        else if (y2 == "bottom")
            y2 = obj.height + "";
        else if (!Tools.isNumber(y2))
            y2 = obj.pivotY + "";
        let percent = event.percent;
        let distanceX = +x + ((+x2 - +x) * percent);
        let distanceY = +y + ((+y2 - +y) * percent);
        obj.pivotX = distanceX;
        obj.pivotY = distanceY;
    },
    object_fill: function ([name, fill]) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (fill != "current")
            obj.fill = fill;
        obj.setFill(fill);
    },
    object_type: function ([name, type]) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        obj.type = type;
    },
    object_move: function ([name, x, y]) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (x == "left")
            x = 0 + "";
        else if (x == "center")
            x = ((StoryboardObject.widthDefault) / 2) + "";
        else if (x == "right")
            x = (StoryboardObject.widthDefault) + "";
        else if (!Tools.isNumber(x))
            x = obj.x + "";
        if (y == "top")
            y = 0 + "";
        else if (y == "center")
            y = ((StoryboardObject.heightDefault) / 2) + "";
        else if (y == "bottom")
            y = (StoryboardObject.heightDefault) + "";
        else if (!Tools.isNumber(y))
            y = obj.y + "";
        if (obj.x != +x)
            obj.x = +x;
        if (obj.y != +y)
            obj.y = +y;
    },
    object_move_transition: function ([name, x, y, x2, y2], event) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (x == "left")
            x = 0 + "";
        else if (x == "center")
            x = ((StoryboardObject.widthDefault) / 2) + "";
        else if (x == "right")
            x = (StoryboardObject.widthDefault) + "";
        else if (!Tools.isNumber(x))
            x = obj.x + "";
        if (y == "top")
            y = 0 + "";
        else if (y == "center")
            y = ((StoryboardObject.heightDefault) / 2) + "";
        else if (y == "bottom")
            y = (StoryboardObject.heightDefault) + "";
        else if (!Tools.isNumber(y))
            y = obj.y + "";
        if (x2 == "left")
            x2 = 0 + "";
        else if (x2 == "center")
            x2 = ((StoryboardObject.widthDefault) / 2) + "";
        else if (x2 == "right")
            x2 = (StoryboardObject.widthDefault) + "";
        else if (!Tools.isNumber(x2))
            x2 = obj.x + "";
        if (y2 == "top")
            y2 = 0 + "";
        else if (y2 == "center")
            y2 = ((StoryboardObject.heightDefault) / 2) + "";
        else if (y2 == "bottom")
            y2 = (StoryboardObject.heightDefault) + "";
        else if (!Tools.isNumber(y2))
            y2 = obj.y + "";
        let percent = event.percent;
        let distanceX = +x + ((+x2 - +x) * percent);
        let distanceY = +y + ((+y2 - +y) * percent);
        obj.x = distanceX;
        obj.y = distanceY;
    },
    object_size: function ([name, w, h]) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (w.endsWith("%"))
            w = StoryboardObject.widthPercent(w) + "";
        else if (!Tools.isNumber(w))
            w = obj.width + "";
        if (h.endsWith("%"))
            h = StoryboardObject.heightPercent(h) + "";
        else if (!Tools.isNumber(h))
            h = obj.height + "";
        obj.width = +w;
        obj.height = +h;
    },
    object_size_transition: function ([name, w, h, w2, h2], event) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (w.endsWith("%"))
            w = StoryboardObject.widthPercent(w) + "";
        else if (!Tools.isNumber(w))
            w = obj.width + "";
        if (h.endsWith("%"))
            h = StoryboardObject.heightPercent(h) + "";
        else if (!Tools.isNumber(h))
            h = obj.height + "";
        if (w2.endsWith("%"))
            w2 = StoryboardObject.widthPercent(w2) + "";
        else if (!Tools.isNumber(w2))
            w2 = obj.width + "";
        if (h2.endsWith("%"))
            h2 = StoryboardObject.heightPercent(h2) + "";
        else if (!Tools.isNumber(h2))
            h2 = obj.height + "";
        let percent = event.percent;
        let distanceW = +w + ((+w2 - +w) * percent);
        let distanceH = +h + ((+h2 - +h) * percent);
        obj.width = distanceW;
        obj.height = distanceH;
    },
    object_opacity: function ([name, o]) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (!Tools.isNumber(o))
            o = obj.opacity + "";
        obj.opacity = +o;
    },
    object_opacity_transition: function ([name, o, o2], event) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (o == "current")
            o = obj.opacity + "";
        if (o2 == "current")
            o2 = obj.opacity + "";
        let percent = event.percent;
        let distanceO = +o + ((+o2 - +o) * percent);
        obj.opacity = distanceO;
    },
    object_rotate: function ([name, r]) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (!Tools.isNumber(r))
            r = obj.rotation + "";
        obj.rotation = +r;
    },
    object_rotate_transition: function ([name, r, r2], event) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        if (r == "current")
            r = obj.rotation + "";
        if (r2 == "current")
            r2 = obj.rotation + "";
        let percent = event.percent;
        let distanceR = +r + ((+r2 - +r) * percent);
        obj.rotation = distanceR;
    },
    object_color_transition: function ([name, hex1, hex2], event) {
        let obj = StoryboardObject.getObject(name);
        if (!obj)
            return;
        ;
        let rgb1 = {
            red: 0,
            green: 0,
            blue: 0
        };
        let rgb2 = {
            red: 0,
            green: 0,
            blue: 0
        };
        let rgbC = {
            red: 0,
            green: 0,
            blue: 0
        };
        try {
            rgb1 = Tools.cssColorToRgb(hex1);
        }
        catch (error) {
            rgb1.red = 0;
            rgb1.green = 0;
            rgb1.blue = 0;
            console.warn(error);
        }
        try {
            rgb2 = Tools.cssColorToRgb(hex2);
        }
        catch (error) {
            rgb2.red = 0;
            rgb2.green = 0;
            rgb2.blue = 0;
            console.warn(error);
        }
        rgbC.red = +rgb1.red + ((+rgb2.red - +rgb1.red) * event.percent);
        rgbC.green = +rgb1.green + ((+rgb2.green - +rgb1.green) * event.percent);
        rgbC.blue = +rgb1.blue + ((+rgb2.blue - +rgb1.blue) * event.percent);
        obj.fill = Tools.cssColorToHex(`rgb(${rgbC.red},${rgbC.green},${rgbC.blue})`);
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
    ":subtitleposition": function (args, event) {
        ToxenScriptManager.eventFunctions["subtitleposition"](args, event);
    },
    ":log": function () {
        console.log([...arguments[0]]);
    },
    ":timingpoint": function ([timing], event) {
        if (Tools.isNumber(timing)) {
            Storyboard.timingPoint = +timing;
        }
    },
    ":createobject": function ([name, fill = "#fff", type], event) {
        // if (typeof name != "string")
        let o = new StoryboardObject(name, fill);
        if (typeof type != "undefined")
            o.type = type;
        StoryboardObject.objects.push({
            "name": name,
            "object": o
        });
    },
    /**
     * Start creation of an action.
     */
    ":actionstart": function ([name]) {
        // Placeholder
    },
    /**
     * End creation of an action.
     */
    ":actionend": function ([name]) {
        // Placeholder
    },
};
ToxenScriptManager._curAction = null;
ToxenScriptManager.actions = [];
ToxenScriptManager.curBlock = null;
/**
 * Function Types for ToxenScript
 */
ToxenScriptManager.eventDocs = {};
/**
 * List of events in order for the current song.
 */
ToxenScriptManager.events = [];
class ToxenEvent {
    /**
     * Create a new Event
     * @param startPoint Starting point in seconds.
     * @param endPoint Ending point in seconds.
     * @param fn Function to run at this interval.
     */
    constructor(startPoint, endPoint, fn) {
        this.hasRun = false;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.fn = fn;
    }
    /**
     * A floating point number representing the current percentage this event is between it's starting point and it's end point.
     *
     * 100% would return `1`, 50% would return `0.5`, and so on.
     */
    get percent() {
        return Math.max(0, (SongManager.player.currentTime - this.startPoint) / (this.endPoint - this.startPoint));
    }
}
class Tools {
    /**
     * If the app is in development mode, it will return the string parsed through.
     *
     * If the app is in production mode, it will return the extended path.
     * @param pathToFile Path to return.
     */
    static prodPath(pathToFile) {
        if (app.isPackaged) {
            return path.resolve("./resources/app", pathToFile);
        }
        else {
            return path.resolve(pathToFile);
        }
    }
    static promiseCreate() {
        let resolve;
        let reject;
        let promise = new Promise((res, rej) => { resolve = res; reject = rej; });
        return {
            promise,
            resolve,
            reject,
        };
    }
    static updateCSS() {
        let links = document.querySelectorAll("link");
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (/\.css(\?.*)?$/g.test(link.href)) {
                if (link.href.includes("?")) {
                    link.href = link.href.replace(/(?<=.+)\?.*/g, "?" + Tools.generateRandomString());
                }
                else {
                    link.href += "?" + Tools.generateRandomString();
                }
            }
        }
    }
    static isNumber(value) {
        return !isNaN(value);
    }
    ;
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
            const char = chars[Tools.randomInt(len)];
            string += char;
        }
        return string;
    }
    static randomInt(max, min = 0) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    // Yeeted from StackOverflow
    // https://stackoverflow.com/a/5624139/8614415
    static componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
    static rgbToHex(red, green, blue) {
        return "#" + Tools.componentToHex(red) + Tools.componentToHex(green) + Tools.componentToHex(blue);
    }
    static hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
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
    static cssColorToHex(str) {
        var ctx = document.createElement("canvas").getContext("2d");
        ctx.fillStyle = str;
        return ctx.fillStyle;
    }
    static cssColorToRgb(str) {
        return Tools.hexToRgb(Tools.cssColorToHex(str));
    }
    /**
     * Wait `ms` milliseconds.
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
    static stripHTML(...html) {
        let _d = document.createElement("div");
        for (let i = 0; i < html.length; i++) {
            _d.innerHTML = html[i];
            html[i] = _d.innerText;
        }
        if (html.length == 1)
            return html[0];
        return html;
    }
    static decodeHTML(...html) {
        let _d = document.createElement("textarea");
        for (let i = 0; i < html.length; i++) {
            _d.innerHTML = html[i];
            html[i] = _d.childNodes.length === 0 ? "" : _d.childNodes[0].nodeValue;
        }
        if (html.length == 1)
            return html[0];
        return html;
    }
    static encodeHTML(...html) {
        for (let i = 0; i < html.length; i++) {
            html[i] = html[i].replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
                return '&#' + i.charCodeAt(0) + ';';
            });
        }
        if (html.length == 1)
            return html[0];
        return html;
    }
    /**
     * @param object
     * @param text Preformatted string or function that outputs a string.
     * @param HTMLSupport Whether or not to allow HTML to be parsed or use as raw.
     */
    static hoverMenu(object, text, HTMLSupport) {
        const div = document.createElement("div");
        const pre = document.createElement("pre");
        div.appendChild(pre);
        div.style.position = "absolute";
        div.style.pointerEvents = "none";
        div.style.backgroundColor = "#2b2b2b";
        div.style.border = "#1b1b1b solid 1px";
        div.style.borderRadius = "5px";
        div.style.opacity = "0.9";
        div.style.fontWeight = "bold";
        div.style.zIndex = "10000";
        div.className = "__hoverOverMenuPopUp";
        if (typeof text == "function") {
            text = text(div);
        }
        if (HTMLSupport === true) {
            pre.innerHTML = text;
        }
        else {
            pre.innerText = text;
        }
        object.addEventListener("mouseenter", function (e) {
            // div.style.left = e.clientX+"px";
            // div.style.top = e.clientY+"px";
            div.style.left = object.getBoundingClientRect().right + "px";
            div.style.top = object.getBoundingClientRect().top + "px";
            document.body.appendChild(div);
        });
        object.addEventListener("mouseleave", function (e) {
            try {
                div.parentElement.removeChild(div);
            }
            catch (_c) { }
        });
    }
    /**
     * @param json JSON Object.
     */
    static hoverMenuJSON(object, json) {
        Tools.hoverMenu(object, function (div) {
            const style = document.createElement("style");
            style.innerText =
                `pre {outline: 1px solid #ccc; padding: 5px; margin: 5px; }
      .string { color: green; }
      .number { color: darkorange; }
      .boolean { color: blue; }
      .null { color: magenta; }
      .key { color: red; }`;
            div.appendChild(style);
            return Tools.syntaxHighlight(json);
        }, true);
    }
    static closeAllHoverMenus() {
        let a = document.querySelectorAll(".__hoverOverMenuPopUp");
        for (let i = 0; i < a.length; i++) {
            a[i].parentElement.removeChild(a[i]);
        }
    }
    /**
     * Highlight a JSON string.
     * @param json Can be either a already converted string JSON or an object.
     */
    static syntaxHighlight(json) {
        if (typeof json == "object") {
            json = JSON.stringify(json, null, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                }
                else {
                    cls = 'string';
                }
            }
            else if (/true|false/.test(match)) {
                cls = 'boolean';
            }
            else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }
}
exports.Tools = Tools;
class Prompt {
    /**
     *
     * @param title
     * @param description
     */
    constructor(title = null, description = null) {
        this.main = null;
        this.headerElement = null;
        this.moveable = true;
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
        // Add moveable header
        let header = document.createElement("div");
        header.style.backgroundColor = "#1b1b1b";
        header.style.color = "#1b1b1b";
        header.style.height = "16px";
        header.style.width = "100%";
        header.style.cursor = "pointer";
        header.style.paddingLeft = "32px";
        header.style.paddingRight = "32px";
        header.style.transform = "translateX(-32px)";
        header.style.userSelect = "none";
        header.draggable = false;
        this.main.appendChild(header);
        let _clicking = false;
        let offset = {
            x: 0,
            y: 0
        };
        header.addEventListener("mousedown", e => {
            if (!_clicking) {
                e.preventDefault();
                _clicking = true;
                offset.x = e.offsetX;
                offset.y = e.offsetY;
            }
        });
        window.addEventListener("mousemove", e => {
            if (_clicking) {
                e.preventDefault();
                let x = e.x - offset.x;
                let y = e.y - offset.y;
                this.main.style.transform = "translateX(0)";
                this.main.style.transition = "none";
                let box = this.main.getBoundingClientRect();
                let top = 32;
                if (x < 0)
                    x = 0;
                if (x + box.width > window.innerWidth)
                    x = window.innerWidth - box.width;
                if (y < top)
                    y = top;
                if (y + box.height > window.innerHeight)
                    y = window.innerHeight - box.height;
                this.main.style.left = `${x}px`;
                this.main.style.top = `${y}px`;
            }
        });
        window.addEventListener("mouseup", () => {
            _clicking = false;
        });
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
        this.main.style.top = "100vh";
        this.main.style.left = "50vw";
        this.main.style.transform = "translateX(-50%)";
        this.main.style.border = "solid 2px #2b2b2b";
        this.main.style.borderRadius = "10px";
        this.main.style.backgroundColor = "#2b2b2b";
        this.main.style.paddingLeft = "32px";
        this.main.style.paddingRight = "32px";
        this.main.style.boxSizing = "border-box";
        this.main.style.zIndex = "10000";
        this.main.style.transition = "all 0.2s ease-in-out";
        this.main.style.maxWidth = "95vw";
        this.main.style.maxHeight = "95vh";
        this.main.style.overflow = "auto";
        document.body.appendChild(this.main);
        this.main.prompt = this;
        setTimeout(() => {
            this.main.style.top = "42px";
        }, 5);
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
     * @param textAsHTML If `content` is a string, set to `false` to disable HTML parsing.
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
    setInteractive(mode) {
        if (mode) {
            this.main.style.pointerEvents = "all";
            this.main.style.opacity = "1";
        }
        else {
            this.main.style.pointerEvents = "none";
            this.main.style.opacity = "0.5";
        }
        return this;
    }
    /**
     * Append content to the content field.
     * @param textAsHTML If `content` is a string, set to `false` to disable HTML parsing.
     */
    addContent(content, textAsHTML = true) {
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
    set width(value) {
        if (typeof value == "number") {
            value = `${value}px`;
        }
        this.main.style.width = value;
    }
    get height() {
        return this.main.clientHeight;
    }
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
     * @param ms Optionally, close in `ms` milliseconds.
     */
    close(ms = 0) {
        if (typeof ms == "number" && ms > 0) {
            setTimeout(() => {
                this.main.style.transition = "all 0.2s ease-in-out";
                this.main.style.top = -10 - this.main.clientHeight + "px";
                setTimeout(() => {
                    if (typeof this.main == "object" && this.main.parentElement) {
                        this.main.parentElement.removeChild(this.main);
                    }
                }, 200);
            }, ms);
        }
        else {
            this.main.style.transition = "all 0.2s ease-in-out";
            this.main.style.top = -10 - this.main.clientHeight + "px";
            setTimeout(() => {
                if (typeof this.main == "object" && this.main.parentElement) {
                    this.main.parentElement.removeChild(this.main);
                }
            }, 200);
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
     * @param currentVersion Current version number.
     * It is formatted as a 12 digit timestamp, starting from the year and onwards to the minute.
     * `M` is Month and `m` is minute
     * `YYYYMMDDHHmm`
     */
    static check(currentVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            document.getElementById("currentversion").innerText = "vers. " + currentVersion + `${Toxen.updatePlatform != null ? ` (${Toxen.updatePlatform})` : ""}`;
            let btn = document.querySelector("#updatetoxen");
            if (Toxen.updatePlatform == null) {
                btn.disabled = true;
                btn.innerText = "Undeterminable release";
                return;
            }
            btn.innerText = "Checking for updates...";
            let toxenGetLatestURL = `https://toxen.net/download/latest.php?platform=${Toxen.updatePlatform}&get=version`;
            if (true || Toxen.updatePlatform == "linux") { // remove `true ||` when using
                // Manual updator
                fetch(toxenGetLatestURL).then(res => res.text()).then(latest => {
                    if (+latest > currentVersion) {
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
            }
            else {
                // Squirrel updator
                Electron.autoUpdater.setFeedURL({
                    "url": "http://toxen.net/download/files/"
                });
            }
        });
    }
    static downloadLatest() {
        return __awaiter(this, void 0, void 0, function* () {
            if (Toxen.updatePlatform == null) {
                dialog.showErrorBox("Unidentified release", "No release found for your current operating system (" + process.platform + ")");
                return;
            }
            if (!remote.app.isPackaged) {
                dialog.showErrorBox("Cannot update in Developer mode", "Switch to a production release to update.");
                return;
            }
            let toxenGetLatestURL = `https://toxen.net/download/latest.php?platform=${Toxen.updatePlatform}&get=url`;
            let toxenLatestURL = yield fetch(toxenGetLatestURL).then(res => res.text());
            let latestPath = "./latest.zip";
            let dl = new ion.Download("https://" + toxenLatestURL, latestPath);
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
                    let file = new Zip(path.resolve(latestPath));
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
                    fs.unlinkSync(latestPath);
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
    static runUpdateScript(path) {
        let cp = child_process_1.fork(path);
        cp.on("message", (msg) => {
            console.log(msg);
        });
        cp.on("close", (code) => {
            console.log("Closed with", code);
        });
        cp.on("error", (err) => {
            console.log("Closed with", err);
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
    static open(song) {
        if (song.txnScript == null) {
            song.txnScript = song.path + "/storyboard.txn";
            SongManager.saveToFile();
        }
        if (!fs.existsSync(song.getFullPath("txnScript"))) {
            fs.writeFileSync(song.getFullPath("txnScript"), "// Start writting your storyboard code here!\n" +
                "// Go to https://toxen.net/toxenscript\n" +
                "// for documentation on ToxenScript\n\n");
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
        });
    }
}
exports.ScriptEditor = ScriptEditor;
ScriptEditor.listening = false;
// static sendJavaScript(value) {
//   ScriptEditor.window.webContents.send("editor.command", value);
// }
ScriptEditor.command = null;
ScriptEditor.currentSong = null;
class Effect {
    static flashElement(element, color = "#fff", ms = 2000) {
        let ef = document.createElement("div");
        ef.style.pointerEvents = "none";
        ef.style.zIndex = "1000";
        ef.style.backgroundColor = color;
        ef.style.borderRadius = "10px";
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
            ef.style.left = (boundingBox.left + 1) + "px";
            ef.style.top = (boundingBox.top + 1) + "px";
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
            this.function = require(ToxenModule.moduleFolder + "/" + moduleName + "/" + (this.module.main ? this.module.main : "index.js")).toxenModule;
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
        if (!fs.existsSync(ToxenModule.moduleFolder + "/" + moduleName)) {
            fs.mkdirSync(ToxenModule.moduleFolder + "/" + moduleName, { recursive: true });
            // JavaScript
            if (language == "js")
                fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/index.js", `/**
 * JavaScript Module.
 * Your main function is required to be exported as \`exports.toxenModule\`.  
 * Otherwise, your module will not work.
 * @param {import("../../declarations/toxenCore")} Core
 */
exports.toxenModule = (Core) => {
  // You can export specific functionality from the Toxen Core if you'll be using them often
  const {
    // SongManager
  } = Core;

  // Your code goes here

}`);
            // TypeScript
            else if (language == "ts") {
                fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/index.ts", `/**
 * TypeScript Module.
 * Your main function is required to be exported as \`export var toxenModule\`.  
 * Otherwise, your module will not work.
 */
export var toxenModule = (Core: typeof import("../../declarations/toxenCore")) => {
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
            else {
                throw `${language} is not a valid language for Toxen Modules.`;
            }
            let module = {
                "author": "Anonymous",
                "name": moduleName,
                "main": "index.js",
                "description": "A Toxen Module",
                "active": true,
            };
            fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/module.json", JSON.stringify(module, null, 2));
            fs.writeFileSync(ToxenModule.moduleFolder + "/" + moduleName + "/index.js", "exports.toxenModule = () => {} // The TS file has yet to be compiled, so this is a placeholder.");
            shell.openExternal(ToxenModule.moduleFolder + "/" + moduleName);
        }
        else {
            dialog.showErrorBox("Error creating module", "This module already exists");
            shell.openExternal(ToxenModule.moduleFolder + "/" + moduleName);
            console.error("This module already exists");
        }
    }
    static listModules() {
        return fs.readdirSync(ToxenModule.moduleFolder);
    }
    static loadAllModules(activate = true) {
        ToxenModule.installedModules = [];
        let modules = ToxenModule.listModules().map(m => new ToxenModule(m));
        let panel = document.getElementById("moduleActivation");
        panel.innerHTML = "";
        modules.forEach(m => {
            let div = document.createElement("div");
            let input = new toxenStyle_1.SelectBox.SelectBox((m.module.name ? m.module.name : m.moduleName));
            input.appendTo(div);
            if (m.module.description) {
                let sup = document.createElement("sup");
                sup.innerText = m.module.description;
                div.appendChild(sup);
            }
            div.appendChild(document.createElement("br"));
            panel.appendChild(div);
            input.on("change", () => {
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
ToxenModule.moduleFolder = Toxen.updatePlatform == "win" ? process.env.APPDATA + "\\ToxenData\\data\\toxenModules" : process.env.HOME + "/.toxendata/data/toxenModules";
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
     * Default stats.json file location relative to your OS.
     */
    static get defaultLocation() {
        return Toxen.updatePlatform == "win" ? process.env.APPDATA + "\\ToxenData\\data\\stats.json" : process.env.HOME + "/.toxendata/data/stats.json";
    }
    /**
     * Save the statistics to the `stats.json` file.
     */
    save(statsFile = Statistics.defaultLocation) {
        fs.writeFileSync(statsFile, JSON.stringify(this));
    }
    /**
     * Load the statistics from the `stats.json` file and return new object.
     */
    static loadFromFile(statsFile = Statistics.defaultLocation) {
        if (!fs.existsSync(path.dirname(statsFile))) {
            fs.mkdirSync(path.dirname(statsFile), { recursive: true });
        }
        if (!fs.existsSync(statsFile)) {
            if (fs.existsSync("./data/stats.json")) {
                fs.renameSync("./data/stats.json", statsFile);
            }
            else {
                console.log("No existing statistics file! Creating file.");
                let s = new Statistics({});
                s.save();
                return s;
            }
        }
        return new Statistics(JSON.parse(fs.readFileSync(statsFile, "utf-8")));
    }
    /**
     * Load the statistics from the `stats.json` file.
     */
    load(statsFile = Statistics.defaultLocation) {
        if (!fs.existsSync(path.dirname(statsFile))) {
            fs.mkdirSync(path.dirname(statsFile), { recursive: true });
        }
        if (!fs.existsSync(statsFile)) {
            if (fs.existsSync("./data/stats.json")) {
                fs.renameSync("./data/stats.json", statsFile);
            }
            else {
                console.error("No existing file! Creating file");
                this.save();
                return;
            }
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
            `Time listened: ${ToxenScriptManager.convertSecondsToDigitalClock(this.secondsPlayed, true)}`,
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
class SelectList extends events_1.EventEmitter {
    constructor(items, closeAutomatically = true) {
        super();
        this.items = items;
        this.closeAutomatically = closeAutomatically;
        this.optionElements = [];
        this.element = document.createElement("div");
        this.element.classList.add("selectlist");
        this.selectElement = document.createElement("select");
        this.element.appendChild(this.selectElement);
        let resolve;
        let reject;
        this.value = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        let placeholderOption = document.createElement("option");
        placeholderOption.innerText = "<Select value>";
        placeholderOption.style.color = "gray";
        placeholderOption.value = "-1";
        this.selectElement.appendChild(placeholderOption);
        let cancelOption = document.createElement("option");
        cancelOption.innerText = "<Cancel>";
        cancelOption.style.color = "red";
        cancelOption.value = "cancel";
        this.selectElement.appendChild(cancelOption);
        items.forEach((item, i) => {
            let option = document.createElement("option");
            this.optionElements.push(option);
            option.innerText = item.text;
            option.itemValue = item.value;
            option.selectListItem = item;
            option.value = i.toString();
            this.selectElement.appendChild(option);
        });
        this.selectElement.addEventListener("change", () => {
            if (this.selectElement.value != "-1" && this.selectElement.value != "cancel") {
                let option = this.optionElements.find(oe => oe.value == this.selectElement.value);
                resolve(option.selectListItem);
                this.emit("select", option.selectListItem);
                if (this.closeAutomatically)
                    this.close();
            }
            if (this.selectElement.value == "cancel") {
                this.close();
                reject("Cancelled");
            }
        });
        this.selectElement.addEventListener("keydown", (e) => {
            if (e.key == "Escape") {
                this.close();
                reject("Cancelled");
            }
        });
    }
    close() {
        this.element.remove();
    }
    open(x, y, width) {
        document.body.appendChild(this.element);
        this.element.style.left = x + "px";
        this.element.style.top = y + "px";
        this.element.style.width = width + "px";
    }
    setSelectPlaceholder(placeholder) {
        this.selectElement.firstChild.innerText = `<${placeholder}>`;
    }
}
exports.SelectList = SelectList;
class PanelManager {
    static initialize() {
        let songmenusidebar = document.querySelector("#songmenusidebar");
        let settingsmenusidebar = document.querySelector("#settingsmenusidebar");
        PanelManager.songPanelButton = document.querySelector("#songpanelbutton");
        PanelManager.settingsPanelButton = document.querySelector("#settingsbutton");
        // Set event listeners
        PanelManager.songPanelButton.addEventListener("mouseenter", () => {
            if (Settings.current.buttonActivationByHover)
                songmenusidebar.toggleAttribute("open", true);
        });
        PanelManager.songPanelButton.addEventListener("click", () => {
            songmenusidebar.toggleAttribute("open", true);
        });
        PanelManager.songPanelButton.addEventListener("mouseout", () => {
            songmenusidebar.toggleAttribute("open", false);
            document.querySelector("#songselection");
        });
        PanelManager.settingsPanelButton.addEventListener("mouseenter", () => {
            if (Settings.current.buttonActivationByHover)
                settingsmenusidebar.toggleAttribute("open", true);
        });
        PanelManager.settingsPanelButton.addEventListener("click", () => {
            settingsmenusidebar.toggleAttribute("open", true);
        });
        PanelManager.settingsPanelButton.addEventListener("mouseout", () => {
            settingsmenusidebar.toggleAttribute("open", false);
        });
        // Listen for events
        Toxen.on("songpanelopen", () => {
            PanelManager.defaults();
        });
        Toxen.on("songpanelclose", () => {
            PanelManager.defaults();
        });
        Toxen.on("settingspanelopen", () => {
            PanelManager.defaults();
        });
        Toxen.on("settingspanelclose", () => {
            PanelManager.defaults();
        });
        // Defaults
        PanelManager.defaults();
    }
    static defaults() {
        let songmenusidebar = document.querySelector("#songmenusidebar");
        let settingsmenusidebar = document.querySelector("#settingsmenusidebar");
        if (songmenusidebar.hasAttribute("open")) {
            if (Settings.current.songMenuToRight) {
                PanelManager.songPanelButton.style.bottom = "-128px";
                PanelManager.songPanelButton.style.right = "-128px";
                PanelManager.songPanelButton.style.opacity = "0";
            }
            else {
                PanelManager.songPanelButton.style.bottom = "-128px";
                PanelManager.songPanelButton.style.left = "-128px";
                PanelManager.songPanelButton.style.opacity = "0";
            }
        }
        else {
            if (Settings.current.songMenuToRight) {
                PanelManager.songPanelButton.style.bottom = "-18px";
                PanelManager.songPanelButton.style.right = "-18px";
                PanelManager.songPanelButton.style.opacity = "1";
            }
            else {
                PanelManager.songPanelButton.style.bottom = "-18px";
                PanelManager.songPanelButton.style.left = "-18px";
                PanelManager.songPanelButton.style.opacity = "1";
            }
        }
        if (settingsmenusidebar.hasAttribute("open")) {
            if (Settings.current.songMenuToRight) {
                PanelManager.settingsPanelButton.style.bottom = "-128px";
                PanelManager.settingsPanelButton.style.left = "-128px";
                PanelManager.settingsPanelButton.style.opacity = "0";
            }
            else {
                PanelManager.settingsPanelButton.style.bottom = "-128px";
                PanelManager.settingsPanelButton.style.right = "-128px";
                PanelManager.settingsPanelButton.style.opacity = "0";
            }
        }
        else {
            if (Settings.current.songMenuToRight) {
                PanelManager.settingsPanelButton.style.bottom = "-18px";
                PanelManager.settingsPanelButton.style.left = "-18px";
                PanelManager.settingsPanelButton.style.opacity = "1";
            }
            else {
                PanelManager.settingsPanelButton.style.bottom = "-18px";
                PanelManager.settingsPanelButton.style.right = "-18px";
                PanelManager.settingsPanelButton.style.opacity = "1";
            }
        }
    }
}
exports.PanelManager = PanelManager;
class Sync {
    static outputTree(tree) {
        fs.writeFileSync("./test.json", JSON.stringify(tree, null, 2));
    }
    static makeTree() {
        return tree(Settings.current.songFolder, {
            normalizePath: true
        });
    }
    static compare(oldData, newData) {
        // fs.writeFileSync("./comparedData.json", JSON.stringify(data, null, 2));
    }
}
exports.Sync = Sync;
/**
 * List of assets used in Toxen.
 *
 * A custom asset list can be imported by themes.
 */
exports.Assets = {};
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
                prompt.addContent(`You can get the song panel out by ${Settings.current.buttonActivationByHover ? "hovering" : "clicking"} your mouse over the music icon.`);
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
                    prompt.addContent("It seems like you already have music in your library, but I'll still tell you how to add new songs, in case you forgot.");
                }
                prompt.addContent("You can add one from your computer or download one from a YouTube URL directly within Toxen.");
                prompt.addContent("Press on the <b>Import Songs</b> button to add a new song now if you'd like.");
                document.getElementById("addsongbutton").scrollIntoView();
                Effect.flashElement(document.getElementById("addsongbutton"), "#0f0", 3000);
                // prompt.main.style.marginLeft = "0%";''
                break;
            // Backgrounds
            case 3:
                clearContent();
                Settings.current.toggleSongPanelLock(true);
                prompt.headerText = "The Song Panel: Adding Backgrounds";
                prompt.addContent("When you're listening to a song, you can press the <b>Set Background</b> to give the song you're currently listening to, a background.");
                Effect.flashElement(document.getElementById("setbackgroundbutton"), "#0f0", 3000);
                break;
            // Settings panel
            case 4:
                clearContent();
                Settings.current.toggleSongPanelLock(false);
                Settings.current.toggleSettingsPanelLock(true);
                prompt.headerText = "Settings Panel";
                prompt.addContent("This is your settings panel.");
                prompt.addContent(`You can get the settings panel out by ${Settings.current.buttonActivationByHover ? "hovering" : "clicking"} your mouse over the gear icon.`);
                prompt.addContent(`Here you can customize Toxen however you like.<br>Take a look at the settings and set your preferences!`);
                if (Settings.current.songMenuToRight) {
                    prompt.main.style.marginLeft = "10%";
                }
                else {
                    prompt.main.style.marginLeft = "-15%";
                }
                Effect.flashElement(document.getElementById("settingsmenusidebar"));
                for (let i = 0; i < document.getElementById("settingsmenusidebar").clientHeight; i++) {
                    setTimeout(() => {
                        if (currentStep == 4)
                            document.getElementById("settingsmenusidebar").scrollTop += 2;
                    }, i * 5);
                }
                break;
            // Specific settings
            case 5:
                clearContent();
                Settings.current.toggleSongPanelLock(false);
                Settings.current.toggleSettingsPanelLock(true);
                prompt.headerText = "Settings Panel: Grouping";
                prompt.addContent("You can group your music by a lot of fields.");
                prompt.addContent(`Selecting any of these options will regroup your songs or remove grouping entirely if you prefer that.`);
                document.querySelector("#songgroupinglabel").scrollIntoView();
                Effect.flashElement(document.querySelector("#songgroupinglabel"), "#0f0", 3000);
                [...document.querySelectorAll("[name=sgstyle]")].forEach(e => Effect.flashElement(e, "#0f0", 3000));
                break;
            case 6:
                clearContent();
                Settings.current.toggleSongPanelLock(false);
                Settings.current.toggleSettingsPanelLock(true);
                prompt.headerText = "Settings Panel: Visualizer Color";
                prompt.addContent("If you prefer to have the visualizer a certain color, you can change it here at any time!");
                prompt.addContent(`You can use the 3 sliders or press on the colored box with the white outline to use a color selector`);
                document.querySelector("#visualizercolorlabel").scrollIntoView();
                Effect.flashElement(document.querySelector("#visualizercolorflexbox"), "#0f0", 3000);
                break;
            default:
                clearContent();
                Settings.current.toggleSongPanelLock(false);
                Settings.current.toggleSettingsPanelLock(false);
                prompt.main.style.marginLeft = "0%";
                prompt.headerText = "Enjoy using Toxen";
                prompt.addContent("Add some songs and customize the experience you want.");
                prompt.addContent("If you need more help, go to https://toxen.net to learn more.");
                next.parentElement.removeChild(next);
                break;
        }
    }
}
exports.showTutorial = showTutorial;
