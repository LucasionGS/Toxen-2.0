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
const fs = require("fs");
const ToxenCore = require("./toxenCore");
const { Toxen, Settings, Song, SongManager, Storyboard, ToxenScriptManager, Debug, Prompt, Update, ScriptEditor, ToxenModule, Statistics, showTutorial, } = ToxenCore;
// bruh
// const process = require("process");
const rpc = require("discord-rpc");
// const Imd = require("./ionMarkDown").Imd;
const version = require("./version.json");
const { remote, ipcRenderer, shell } = require("electron");
let debugMode = !remote.app.isPackaged;
// Discord RPC
const discord = new rpc.Client({ "transport": "ipc" });
const clientId = '647178364511191061';
let discordReady = false;
discord.on("ready", () => {
    // console.log('Logged in as', discord.application.name);
    discordReady = true;
});
discordApplicationLogin();
function discordApplicationLogin(attempts = 3) {
    let tries = 0;
    _login();
    function _login() {
        discord.login({ clientId }).catch(reason => {
            console.error(reason);
            tries++;
            if (tries < attempts) {
                console.error(`Login attempt ${tries + 1}...`);
                _login();
            }
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
function initialize() {
    return __awaiter(this, void 0, void 0, function* () {
        // Load settings (IMPORTANT TO BE DONE FIRST)
        settings.loadFromFile();
        if (settings.songFolder == null) {
            switch (process.platform) {
                case "win32":
                    settings.songFolder = process.env.HOMEDRIVE + process.env.HOMEPATH + "/Music/";
                    break;
                case "linux":
                case "darwin":
                    settings.songFolder = process.env.HOME + "/Music/";
                    break;
            }
        }
        if (settings.showTutorialOnStart) {
            showTutorial();
        }
        stats.load();
        stats.startSaveTimer();
        Toxen.extraStyle = document.querySelector("#extracss");
        settings.setThemeBase(settings.lightThemeBase);
        // Check for update
        Update.check(version);
        // Initialize onplay & Discord RPC
        SongManager.onplay = function (song) {
            return __awaiter(this, void 0, void 0, function* () {
                // Song Info
                song.displayInfo();
                // Discord Rich Presence
                updateDiscordPresence(song);
                while (isNaN(SongManager.player.duration)) {
                    yield Debug.wait(1);
                }
                if (song.details.songLength != SongManager.player.duration) {
                    song.details.songLength = SongManager.player.duration;
                    song.saveDetails();
                }
            });
        };
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
        if (!settings.remote && !fs.existsSync(settings.songFolder + "/db.json")) {
            SongManager.scanDirectory();
        }
        else {
            yield SongManager.loadFromFile();
        }
        // SongManager.playableSongs = SongManager.songList;
        settings.toggleSongPanelToRight(settings.songMenuToRight);
        SongManager.player.addEventListener("ended", function () {
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
            let cur = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.currentTime);
            let dur = ToxenScriptManager.convertSecondsToDigitalClock(SongManager.player.duration);
            let progressText = document.querySelector("div#progress label#progresstext");
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
            document.querySelector("div#progress progress#progressbar").max = SongManager.player.duration;
        });
        //#region Initialize Audio visualizer
        (function () {
            var _context = new AudioContext();
            var _src;
            _src = _context.createMediaElementSource(document.querySelector("#musicObject"));
            let _analyser = _context.createAnalyser();
            _src.connect(_analyser);
            _analyser.connect(_context.destination);
            Storyboard.analyser = _analyser;
            console.log("Visualizer is now ready.");
            initializeVisualizer();
        })();
        //#endregion
        let search = document.querySelector("#search");
        search.addEventListener("keydown", e => {
            let songs;
            if (e.key == "Enter" && (songs = SongManager.onlyVisibleSongList()).length == 1 && songs[0].songId != SongManager.getCurrentlyPlayingSong().songId) {
                songs[0].play();
                search.blur();
            }
        });
        // Shortcuts
        window.addEventListener("keydown", function (e) {
            let { key, ctrlKey: ctrl, shiftKey: shift, altKey: alt, } = e;
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
                settings.revealSongPanel();
                search.focus();
                search.setSelectionRange(0, search.value.length);
                search.scrollIntoViewIfNeeded();
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
        });
        window.addEventListener("resize", (e) => {
            let c = document.querySelector("#storyboard");
            c.width = window.innerWidth;
            c.height = window.innerHeight;
        });
        window.addEventListener("mouseup", function (e) {
            if (e.button == 0 && document.querySelector("#progressbar").clicking == true) {
                document.querySelector("#progressbar").clicking = false;
                updateDiscordPresence();
            }
        });
        document.getElementById("progressbar").addEventListener("click", function (e) {
            const p = document.querySelector("#progressbar");
            let percent = (e.clientX - p.clientLeft) / p.clientWidth;
            percent = Math.min(Math.max(0, percent), 1);
            SongManager.moveToTime(SongManager.player.duration * percent);
            updateDiscordPresence();
        });
        window.addEventListener("mousemove", function (e) {
            const p = document.querySelector("#progressbar");
            if (p.clicking === true) {
                let percent = (e.clientX - p.clientLeft) / p.clientWidth;
                percent = Math.min(Math.max(0, percent), 1);
                SongManager.moveToTime(SongManager.player.duration * percent);
            }
        });
        document.getElementById("progressbar").addEventListener("mousedown", function (e) {
            e.preventDefault();
            if (e.button == 0)
                document.querySelector("#progressbar").clicking = true;
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
        (function () {
            let red = +document.getElementById("visualizercolor.redValue").value;
            let green = +document.getElementById("visualizercolor.greenValue").value;
            let blue = +document.getElementById("visualizercolor.blueValue").value;
            document.querySelector("#redColorBlock").style.backgroundColor = `rgb(${red}, 0, 0)`;
            document.querySelector("#greenColorBlock").style.backgroundColor = `rgb(0, ${green}, 0)`;
            document.querySelector("#blueColorBlock").style.backgroundColor = `rgb(0, 0, ${blue})`;
            document.querySelector("#redColorBlock").firstElementChild.innerText = red.toString();
            document.querySelector("#greenColorBlock").firstElementChild.innerText = green.toString();
            document.querySelector("#blueColorBlock").firstElementChild.innerText = blue.toString();
            document.querySelector("#colorPicker").value = Debug.rgbToHex(red, green, blue);
        })();
        // Load modules
        ToxenModule.initialize();
        ToxenModule.loadAllModules();
        // Create "on" events.
        Toxen.on("play", () => {
            stats.songsPlayed++;
        });
        // Finish
        settings.reloadPlaylists();
        SongManager.playRandom();
    });
}
ipcRenderer.on("updatediscordpresence", () => {
    updateDiscordPresence();
});
/**
 * Update Discord presence
 */
function updateDiscordPresence(song = SongManager.getCurrentlyPlayingSong()) {
    return __awaiter(this, void 0, void 0, function* () {
        let attemptCount = 0;
        while (true) {
            if (attemptCount > 30) {
                break;
            }
            if (isNaN(SongManager.player.duration) || !discordReady) {
                attemptCount++;
                yield Debug.wait(100);
            }
            else {
                let options = {
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
    });
}
var avg = 0;
var avgSec = 0;
var dim = 0;
/**
 * Run once to activate the visualizer.
 */
function initializeVisualizer() {
    dim = settings.backgroundDim;
    var canvas = document.querySelector("#storyboard");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx = canvas.getContext("2d");
    Storyboard.setAnalyserFftSize(512);
    function renderFrame() {
        requestAnimationFrame(renderFrame);
        if (settings.freezeVisualizer && SongManager.player.paused)
            return;
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
        ctx.fillStyle = "rgba(0, 0, 0, " + (dim / 100) + ")";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        var intensity = Storyboard.visualizerIntensity / 10;
        if (settings.visualizer) {
            avg = 0;
            if (Storyboard.visualizerDirection == 0)
                Storyboard.dataArray = Storyboard.dataArray.reverse();
            for (var i = 0; i < Storyboard.bufferLength; i++) {
                barHeight = (Storyboard.dataArray[i] * intensity - (10 * intensity));
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
