/// <reference types="node" />
export declare let hueApi: import("node-hue-api/lib/api/Api");
import * as Electron from "electron";
import * as Zip from "adm-zip";
import { EventEmitter } from "events";
interface HTMLElementScroll extends HTMLElement {
    scrollIntoViewIfNeeded(): void;
}
declare type AnalyserFftSizeIndex = 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384;
/**
 * General Toxen functionality.
 *
 * Primarily used for events.
 */
export declare class Toxen {
    static initialize(): void;
    static toggleFullScreen(): void;
    static toggleFullScreen(mode: boolean): void;
    static updatePlatform: "win" | "linux" | "mac";
    static inactivityState: boolean;
    /**
     * Restarts Toxen immediately.
     */
    static restart(): void;
    /**
     * Reloads the Toxen window immediately.
     */
    static reload(): void;
    static ffmpegAvailable(): boolean;
    static ffmpegPath(): string;
    /**
     * Prompts you for installation of ffmpeg to your system.
     *
     * Windows: `\Users\%User%\.ffmpeg`
     * Linux && Mac: `/home/%user%/.ffmpeg`
     */
    static ffmpegDownload(): Promise<boolean>;
    static eventEmitter: EventEmitter;
    /**
     * Listen for an event.
     */
    static on(event: string, callback: (...any: any[]) => void): void;
    static on(event: "play", callback: (song: Song) => void): void;
    static on(event: "pause", callback: () => void): void;
    static on(event: "unpause", callback: () => void): void;
    static on(event: "songpanelopen", callback: () => void): void;
    static on(event: "songpanelclose", callback: () => void): void;
    static on(event: "settingspanelopen", callback: () => void): void;
    static on(event: "settingspanelclose", callback: () => void): void;
    static on(event: "inactive", callback: () => void): void;
    static on(event: "active", callback: () => void): void;
    static on(event: "toggleshuffle", callback: (toggle: boolean) => void): void;
    static on(event: "togglerepeat", callback: (toggle: boolean) => void): void;
    /**
     * Emit an event.
     */
    static emit(event: string, ...args: any[]): void;
    static emit(event: "play", song: Song): void;
    static emit(event: "pause"): void;
    static emit(event: "unpause"): void;
    static emit(event: "songpanelopen"): void;
    static emit(event: "songpanelclose"): void;
    static emit(event: "settingspanelopen"): void;
    static emit(event: "settingspanelclose"): void;
    static emit(event: "inactive"): void;
    static emit(event: "active"): void;
    static emit(event: "toggleshuffle", toggle: boolean): void;
    static emit(event: "togglerepeat", toggle: boolean): void;
    static extraStyle: HTMLLinkElement;
    static setStyleSource(src: string): void;
    /**
     * Object of generator objects using Toxen styling.
     */
    static generate: {
        /**
         * Generate an input.
         * @param {object} opts
         * @param {(obj: HTMLInputElement) => void} opts.modify Modify this object using a function. This will always happen before the other options get applied.
         * @param {string} opts.id Id for this item.
         *
         * @param {string} opts.value Default value for the input.
         * @param {string} opts.placeholder Default placeholder for the input.
         */
        input(opts?: {
            modify?: Function;
            id?: string;
            value?: string;
            placeholder?: string;
        }): HTMLInputElement;
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
        button(opts?: {
            modify?: Function;
            id?: string;
            text?: string;
            backgroundColor?: string;
            click?: (this: HTMLButtonElement, ev: MouseEvent) => any;
        }): HTMLButtonElement;
    };
}
export declare class Settings {
    static current: Settings;
    constructor(doNotReplaceCurrent?: boolean);
    /**
     * Default settings.json file location relative to your OS.
     */
    static get defaultLocation(): string;
    static createFromFile(fileLocation?: string): Settings;
    loadFromFile(fileLocation?: string): void;
    saveToFile(fileLocation?: string): Promise<void>;
    /**
     * Set the media's volume.
     * @param value Volume value.
     */
    setVolume(value: number): void;
    applySettingsToPanel(): void;
    /**
     * @param newInstance If `true`, returns a new instance of a playlist and without the "No playlist selected" option.
     */
    reloadPlaylists(newInstance?: boolean): HTMLSelectElement;
    selectPlaylist(playlist: string): void;
    addPlaylist(): void;
    selectSongFolder(): Promise<void>;
    toggleVideo(force: boolean): boolean;
    toggleSongPanelLock(force?: boolean): boolean;
    revealSongPanel(): void;
    /**
     * @param force
     */
    toggleSettingsPanelLock(force?: boolean): boolean;
    toggleSongPanelToRight(force: boolean): boolean;
    selectFFMPEGPath(): void;
    /**
     * @param base
     */
    setThemeBase(base: boolean): void;
    /**
     * Set the progress bar spot.
     */
    setProgressBarSpot(spotid: number): void;
    /**
     * Percentage to dim the background.
     */
    backgroundDim: number;
    /**
     * Audio volume.
     */
    volume: number;
    /**
     * Full path to the current song folder.
     */
    songFolder: string;
    /**
     * Returns whether or not the `songFolder` is a remote URL or not.
     */
    get remote(): boolean;
    /**
     * List of full paths to the song folders.
     */
    songFolderList: string[];
    /**
     * Intensity of the audio visualizer.
     */
    visualizerIntensity: number;
    /**
     * Direction of the audio visualizer.
     */
    visualizerDirection: number;
    /**
     * Whether or not the visualizer is enabled.
     */
    visualizer: boolean;
    /**
     * Whether or not the storyboard is enabled.
     */
    storyboard: boolean;
    /**
     * Show video as the background if it's available.
     */
    video: boolean;
    /**
     * `true` Displays the advanced options.
     * `false` Keep the advanced options hidden.
     */
    advanced: boolean;
    /**
     * Visualizer Colors RGB
     */
    visualizerColor: {
        red: number;
        green: number;
        blue: number;
    };
    /**
     * Visualizer Style ID
     */
    visualizerStyle: number;
    /**
     * If the visualizer should freeze while the song is paused.
     */
    freezeVisualizer: boolean;
    /**
     * Which style the songs should be grouped in.
     */
    songGrouping: number;
    /**
     * Repeat the same song.
     */
    repeat: boolean;
    /**
     * Only play songs that are visible in the song panel.
     *
     * (i.e doesn't have `display: none`)
     */
    onlyVisible: boolean;
    /**
     * Shuffle to a random song instead of the next in the list.
     */
    shuffle: boolean;
    /**
     * Detail to sort by
     */
    sortBy: "artist" | "title" | "length";
    /**
     * `true` Set the song menu on the right hand side.
     * `false` Keep the song menu on the left hand side.
     */
    songMenuToRight: boolean;
    /**
     * `true` Lock the song panel in place and don't make it fade away.
     * `false` Only show the panel when hovered over.
     */
    songMenuLocked: boolean;
    /**
     * `0` Doesn't show thumbnails.
     * `1` Shows backgrounds as a thumbnail for the songs with a custom background.
     * `2` Shows backgrounds as a background on the music panel for the songs with a custom background.
     */
    thumbnails: number;
    /**
     * Display the details of the current song playing in Discord Presence.
     * Details include Artist, Title, and current time.
     */
    discordPresenceShowDetails: boolean;
    /**
     * Hue Bridge: IP Address / Host
     */
    hueBridgeIp: string;
    /**
     * Hue Bridge: Username
     */
    hueBridgeUser: string;
    /**
     * Hue Bridge: Client Key
     */
    hueBridgeClientKey: string;
    /**
     * Currently selected playlist.
     * (`null`) if none is selected.
     */
    playlist: string;
    /**
     * All selected playlist.
     */
    playlists: string[];
    /**
     * Display the tutorial the first time toxen launches.
     */
    showTutorialOnStart: boolean;
    /**
     * Custom path to the user's FFMPEG file.
     */
    ffmpegPath: string;
    /**
     * Toggle light theme on Toxen.
     *
     * Why would anyone do that..?
     */
    lightThemeBase: boolean;
    /**
     * `0` Progress bar stays inside of of the song menu and is only visible when the song menu is.
     * `1` Progress bar stays at the top of the screen and is visible at all times.
     * `2` Progress bar stays at the bottom of the screen and is visible at all times.
     */
    progressBarSpot: number;
    /**
     * `true` Panel buttons are activated by hovering over them.
     * `false` Panel buttons are activated by clicking over them.
     */
    buttonActivationByHover: boolean;
    /**
     * The current version.
     */
    version: number;
}
/**
 * Custom HTML Song Element that extends div.
 * Every `musicitem` is this.
 */
interface HTMLSongElement extends HTMLDivElement {
    /**
     * Song object that belongs to this element.
     */
    song?: Song;
}
interface HTMLPromptElement extends HTMLDivElement {
    /**
     * Prompt object that belongs to this element.
     */
    prompt?: Prompt;
}
export declare class Song {
    constructor();
    get selected(): boolean;
    set selected(value: boolean);
    select(): void;
    deselect(): void;
    toggleSelect(): void;
    trim(): void;
    /**
     * Returns the full name for this song with parsed markdown, if any.
     *
     * This is just a shortcut for:
     * ```js
     * Imd.MarkDownToHTML(this.details.artist) + " - " + Imd.MarkDownToHTML(this.details.title)
     * ```
     */
    parseName(): string;
    /**
     * Zip the entire song folder and save it as a `txs`.
     *
     * if `location` is defined, no prompt for selecting location will appear, and will just export to the set location
     * @param location Location to save to.
     */
    export(location?: string): void;
    createTxs(): Zip;
    refreshElement(): void;
    songId: number;
    getListIndex(): number;
    getPlayableListIndex(): number;
    click: () => void;
    /**
     * Relative path for this song / Folder name
     */
    path: string;
    /**
     * Relative path to the song mp3/mp4.
     */
    songPath: string;
    /**
     * Relative path to the song's SRT file (if any).
     */
    subtitlePath: string;
    /**
     * Relative path to the song's TXN script file (if any).
     */
    txnScript: string;
    /**
     * Relative path to the song's background image (if any).
     */
    background: string;
    /**
     * Detailed information about this song (if applied)
     */
    details: {
        /**
         * The artist who made this song.
         */
        artist: string;
        /**
         * The title for this song.
         */
        title: string;
        /**
         * Album this song belongs to, if any.
         */
        album: string;
        /**
         * Source for this song. If it's from a game, series, or sites, state them here.
         */
        source: string;
        /**
         * Source link for this song. If you got this from somewhere online originally, you can link it here.
         */
        sourceLink: string;
        /**
         * Main language for this song.
         */
        language: string;
        /**
         * List of tags to better help find this song in searches.
         */
        tags: string[];
        /**
         * List of playlists this song belongs in.
         */
        playlists: string[];
        /**
         * The length of the song in seconds.
         * **Note:** This value is automatically updated if it doesn't match the song's duration.
         * @readonly
         */
        songLength: number;
    };
    element: HTMLSongElement;
    /**
     * @param {HTMLDivElement | HTMLSongElement} elm
     */
    setElement(elm: any): void;
    /**
     * Executes when a song is played.
     * @param {Song} song
     */
    onplay(song: any): void;
    /**
     * A randomly generated hash to cache files correctly.
     */
    hash: string;
    /**
     * Play this song.
     */
    play(hash?: string): void;
    get isVideo(): boolean;
    /**
     * Get the full path to a file. (Default is `songPath`)
     * @param itemToFind
     */
    getFullPath(itemToFind?: "path" | "songPath" | "subtitlePath" | "background" | "txnScript"): string;
    /**
     * Display the details the song has stored.
     */
    displayInfo(): void;
    saveDetails(): boolean;
    setBackground(): void;
    /**
     * Get the parent group if it belongs to one. Returns `null` if not grouped.
     */
    getGroup(): any;
    /**
     * Scroll to the element and reveal it.
     */
    focus(): void;
    addToPlaylist(): void;
    removeFromPlaylist(): void;
    delete(): void;
}
export declare class SongManager {
    /**
     * Full list of available songs.
     */
    static songList: Song[];
    /**
     * List of playable songs from a search.
     */
    static playableSongs: Song[];
    /**
     * If `Settings.onlyVisible` is `true`, returns only the physically visible songs in the song list.
     *
     * If `Settings.onlyVisible` is `false`, returns the full `SongManager.playableSongs` list
     */
    static onlyVisibleSongList(): Song[];
    /**
     * Export every song into a folder.
     * @param {string} location
     * @param {Song[]} songList
     */
    static exportAll(location?: any, songList?: any): Promise<void>;
    /**
     * Return all the song object that has selected enabled
     */
    static getSelectedSongs(): Song[];
    /**
     * Stops playing music and unoccupy the music files
     */
    static clearPlay(): void;
    static refreshList(): void;
    static refreshList(sortBy: Settings["sortBy"]): void;
    /**
     * @param {string} search Search for a string
     */
    static search(search?: string): void;
    static songListElement: HTMLDivElement;
    static player: HTMLVideoElement;
    static scanDirectory(location?: string): void | any[];
    static loadFromFile(fileLocation?: string): Promise<void>;
    static saveToFile(fileLocation?: string): void;
    /**
     * @param id Song ID
     */
    static getSong(id: number): Song;
    static getCurrentlyPlayingSong(): Song;
    static moveToTime(timeInSeconds: number): boolean;
    static playSongById(id: number): void;
    static playSong(song: Song): void;
    static playRandom(): void;
    static playNext(): void;
    static playPrev(): void;
    /**
     * @param {boolean} force
     */
    static toggleShuffle(force?: boolean): boolean;
    /**
     * @param {boolean} force
     */
    static toggleRepeat(force?: boolean): boolean;
    /**
     * @param {boolean} force
     */
    static toggleOnlyVisible(force?: boolean): boolean;
    static addSong(): void;
    static addSongLocal(): void;
    static addSongYouTube(): void;
    static selectBackground(song?: Song): void;
    static selectBackgroundFromURL(song?: Song): Promise<void>;
    static selectSubtitles(song?: Song): void;
    static selectStoryboard(song?: Song): void;
    static selectDefaultBackground(): void;
    static getAllArtists(): string[];
    /**
     * This should be set by the client.
     */
    static onplay: (song: Song) => void;
}
/**
 * Custom HTML Song Container Element that extends div.
 * Every `songContainer` is this.
 */
interface HTMLSongGroupElement extends HTMLElementScroll {
    /**
     * Song Group object that belongs to this element.
     * @type {SongGroup}
     */
    songGroup?: any;
}
export declare class SongGroup {
    static songGroups: SongGroup[];
    /**
     * @param name Name for this group container.
     */
    constructor(name: string);
    /**
     * List of songs in this group
     */
    songList: Song[];
    refreshList(): void;
    /**
     * @type {string}
     */
    name: any;
    /**
     * @type {HTMLSongGroupElement}
     */
    element: HTMLSongGroupElement;
    set collapsed(value: boolean);
    get collapsed(): boolean;
    /**
     * Toggle collapse on this container.
     */
    collapse(): void;
    focus(): void;
    /**
     * @param {boolean} collapsedCondition Whether it should return all with collapsed true, or collapsed false. Omit to ignore and return all.
     */
    static getAllGroups(collapsedCondition?: any): SongGroup[];
    /**
     * @param {boolean} collapsedCondition Omit to ignore and return all
     */
    static getAllGroupNames(collapsedCondition?: any): any[];
}
export declare class Storyboard {
    static red: number;
    static green: number;
    static blue: number;
    static toRed: number;
    static toGreen: number;
    static toBlue: number;
    static visualizerIntensity: number;
    static visualizerStyle: number;
    static visualizerDirection: number;
    /**
     * @readonly
     * The currently shown background dim value.
     * **Note:** This is often different from the ``Settings.backgroundDim`` setting, as this is dynamic.
     * @type {number}
     */
    static currentBackgroundDim: number;
    /**
     * Fade into a RGB color.
     */
    static rgb(red?: number, green?: number, blue?: number): {
        red: number;
        green: number;
        blue: number;
    };
    /**
     * Instantly set the RGB value
     */
    static rgbInstant(red?: number, green?: number, blue?: number): {
        red: number;
        green: number;
        blue: number;
    };
    static currentBackground: string;
    /**
     * Change the current background image.
     * @param image The path to the image
     * @param queryString An extra query string for updating cache.
     * @param reset If true, removes background.
     */
    static setBackground(image: string, queryString?: string, reset?: boolean): void;
    /**
     * Set the intensity of the visualizer.
     * @param {number} value
     */
    static setIntensity(value: any): void;
    static analyser: AnalyserNode;
    static setAnalyserFftLevel(size: number): void;
    static setAnalyserFftSize(size: AnalyserFftSizeIndex): void;
    static bufferLength: number;
    static dataArray: Uint8Array;
    static _fadingEnabled: boolean | number | NodeJS.Timeout;
}
/**
 * Toxen Script Manager
 *
 * Controls and manages Toxen's storyboard scripting.
 * All event types are stored in `eventFunctions` as an object.
 */
export declare class ToxenScriptManager {
    static currentScriptFile: string;
    static isRunning: boolean;
    /**
     * Loads or reloads the script for the currently playing song.
     */
    static loadCurrentScript(): Promise<void>;
    /**
     * @type {{[$name: string]: string}}
     */
    static variables: {};
    /**
     * Default variable set.
     * @type {{[$name: string]: string}}
     */
    static defaultVariables: {
        $end: () => string;
    };
    /**
     * Apply the variables to the text.
     * @param {string} text
     */
    static applyVariables(text: any): any;
    /**
     * Parses ToxenScript files for storyboard effects and applies them to the current storyboard.
     * @param scriptFile Path to script file.
     */
    static scriptParser(scriptFile: string): Promise<void>;
    static getEventNames(): any[];
    /**
     * Function Types for ToxenScript.
     */
    static eventFunctions: {
        [eventName: string]: (args: string[], event: ToxenEvent) => void;
    };
    /**
     * Function Types for ToxenScript
     * @type {{[eventName: string]: string}}
     */
    static eventDocs: {};
    /**
     * Parse ToxenScript into HTML Highlighting
     * @param {string} code
     */
    static syntaxHighlightToxenScript(code: any, validEventNames?: any[]): any;
    /**
     * Convert a timestamp into seconds.
     * @param timestamp Time in format "hh:mm:ss".
     */
    static timeStampToSeconds(timestamp: string | number, throwError?: boolean): number;
    /**
     * Convert seconds to digital time format.
     * @param {number} seconds
     */
    static convertSecondsToDigitalClock(seconds: any, trim?: boolean): string;
    /**
     * List of events in order for the current song.
     */
    static events: ToxenEvent[];
}
declare class ToxenEvent {
    /**
     * Create a new Event
     * @param {number} startPoint Starting point in seconds.
     * @param {number} endPoint Ending point in seconds.
     * @param fn Function to run at this interval.
     */
    constructor(startPoint: any, endPoint: any, fn: (args: any[]) => void);
    startPoint: number;
    endPoint: number;
    fn: Function;
    hasRun: boolean;
    type: string;
}
export declare class Debug {
    static updateCSS(): void;
    /**
     *
     * @param {string[]} exceptions
     */
    static refreshOnChange(exceptions?: any[]): void;
    static generateRandomString(length?: number): string;
    /**
     * @param {number} max
     * @param {number} min
     */
    static randomInt(max: any, min?: number): number;
    /**
     * @param {number} c
     */
    static componentToHex(c: any): any;
    static rgbToHex(red: any, green: any, blue: any): string;
    static hexToRgb(hex: string): {
        red: number;
        green: number;
        blue: number;
    };
    static cssColorToHex(str: string): string;
    static cssColorToRgb(str: string): {
        red: number;
        green: number;
        blue: number;
    };
    /**
     * Wait `ms` milliseconds.
     */
    static wait(ms: number): Promise<unknown>;
    /**
     * Clamp a value inclusively in between a min and max value.
     * @param value The value to clamp
     * @param min Min value
     * @param max Max value
     */
    static clamp(value: number, min: number, max: number): number;
    /**
     * Strips all HTML tags from one or more strings.
     * @param html HTML code string
     */
    static stripHTML(html: string): string;
    /**
     * Strips all HTML tags from one or more strings.
     * @param html HTML code strings
     */
    static stripHTML(...html: string[]): string[];
}
export declare class Prompt {
    /**
     *
     * @param title
     * @param description
     */
    constructor(title?: string, description?: HTMLElement | (string | HTMLElement)[] | string);
    promise: Promise<any>;
    private _res;
    private _rej;
    set name(value: string);
    get name(): string;
    set id(value: string);
    get id(): string;
    main: HTMLPromptElement;
    headerElement: HTMLHeadingElement;
    get headerText(): string;
    set headerText(value: string);
    contentElement: HTMLDivElement;
    buttonsElement: HTMLDivElement;
    /**
     * Removes everything inside the content field and appends `content`.
     *
     * `Identical to Prompt.addContent, but it clears the content first.`
     * @param {HTMLElement | string} content
     * @param {boolean} textAsHTML If `content` is a string, set to `false` to disable HTML parsing.
     */
    setContent(content: any, textAsHTML?: boolean): void;
    clearContent(): void;
    clearButtons(): void;
    /**
     * Append content to the content field.
     * @param {HTMLElement | string} content
     * @param {boolean} textAsHTML If `content` is a string, set to `false` to disable HTML parsing.
     */
    addContent(content: any, textAsHTML?: boolean): this;
    /**
     *
     * @param {string | HTMLButtonElement | (string | HTMLButtonElement)[]} button
     * @param {string} btnClass
     * @param {boolean} useDefault Attempts to use default buttons for certain strings
     * @returns {HTMLButtonElement | HTMLButtonElement[]}
     */
    addButtons(button: string, btnClass?: string, useDefault?: boolean): HTMLButtonElement;
    addButtons(button: HTMLButtonElement, btnClass?: string, useDefault?: boolean): HTMLButtonElement;
    addButtons(button: (string | HTMLButtonElement)[], btnClass?: string, useDefault?: boolean): HTMLButtonElement[];
    get width(): string | number;
    /**
     * @param {number | string} value
     */
    set width(value: string | number);
    get height(): string | number;
    /**
     * @param {number | string} value
     */
    set height(value: string | number);
    close(): this;
    close(ms: number): this;
    /**
     * Close a prompt or more prompts using a `promptname`.
     *
     * You can set a prompts name by setting `Prompt.name` to a string.
     */
    static close(name: string): void;
    /**
     * @param returnValue Return this value and resolve the promise stored in `Prompt.promise`
     * @param close If set to `false`, the prompt won't close on return.
     * If set to a number, it acts as milliseconds before it closes.
     */
    return: ((returnValue: any) => void) | ((returnValue: any, close?: boolean | number) => void);
    /**
     * Run this to make this prompt close next time the user presses the escape key.
     *
     * `Note: Only works if the prompt is focused somehow, be it an input field or something else.`
     */
    closeOnEscape(): this;
}
export declare class Update {
    /**
     *
     * @param {number} currentVersion Current version number.
     * It is formatted as a 12 digit timestamp, starting from the year and onwards to the minute.
     * `M` is Month and `m` is minute
     * `YYYYMMDDHHmm`
     */
    static check(currentVersion: any): Promise<void>;
    static downloadLatest(): Promise<void>;
}
export declare class ScriptEditor {
    /**
     * @param {Song} song
     */
    static open(song: any): any;
    static listening: boolean;
    static sendCommand(value: any): void;
    static command: any;
    /**
     * @type {import("electron").BrowserWindow}
     */
    static window: any;
    static makeWindow(): Electron.BrowserWindow;
    /**
     * @type {Song}
     */
    static currentSong: any;
}
export declare class Effect {
    /**
     * Highlight an element with a flash that lasts 2 seconds.
     * @param element HTML Element to highlight with a flash.
     */
    static flashElement(element: HTMLElement): void;
    /**
     * Highlight an element with a flash that lasts 2 seconds.
     * @param element HTML Element to highlight with a flash.
     * @param color CSS color to flash with.
     */
    static flashElement(element: HTMLElement, color: string): void;
    /**
     * Highlight an element with a flash that lasts 2 seconds.
     * @param element HTML Element to highlight with a flash.
     * @param color CSS color to flash with.
     * @param ms Total time in millseconds it should be visible. (Including fade in and out)
     */
    static flashElement(element: HTMLElement, color: string, ms: number): void;
}
interface ToxenModule_data {
    "main"?: string;
    "active"?: boolean;
    "name": string;
    "description"?: string;
    "author"?: string;
}
export declare class ToxenModule {
    /**
     * Create a manageable Module
     */
    constructor(moduleName: string);
    moduleName: string;
    module: ToxenModule_data;
    function: (ToxenCore: unknown) => void;
    static installedModules: ToxenModule[];
    /**
     * Activate or deactivate the module
     */
    activation(active?: boolean): void;
    static moduleFolder: string;
    /**
     * Initialize folders
     */
    static initialize(): void;
    static createModule(moduleName: string): void;
    static createModule(moduleName: string, language: "js" | "ts"): void;
    static listModules(): string[];
    /**
     * Loads and activate all of the modules.
     */
    static loadAllModules(): ToxenModule[];
    /**
     * Loads all of the modules.
     * If `activate` is set to `false`, the modules won't be activated, and only returned.
     */
    static loadAllModules(activate: boolean): ToxenModule[];
    /**
     * Load a module in the toxenModules folder.
     */
    static loadModule(moduleName: string): ToxenModule;
    /**
     * Public functions that can be used by other modules to interact with this module.
     */
    publicFunctions: {
        [name: string]: ((...any: any[]) => any);
    };
    /**
     * Returns an array of the names of the available public functions.
     *
     * Helpful for other modules' debugging.
     */
    getPublicFunctions(): string[];
}
export declare class Statistics {
    /**
     * Initialize a new statistics object.
     */
    constructor(object?: {});
    static current: Statistics;
    /**
     * Default stats.json file location relative to your OS.
     */
    static get defaultLocation(): string;
    /**
     * Save the statistics to the `stats.json` file.
     */
    save(statsFile?: string): void;
    /**
     * Load the statistics from the `stats.json` file and return new object.
     */
    static loadFromFile(statsFile?: string): Statistics;
    /**
     * Load the statistics from the `stats.json` file.
     */
    load(statsFile?: string): void;
    display(): void;
    /**
     * Start saving statistics every minute.
     */
    startSaveTimer(): void;
    stopSaveTimer(): void;
    /**
     * Gets the song total count.
     */
    get songCount(): number;
    /**
     * Gets the total length of all of the songs in your library.
     *
     * `Note: A song must have been played at least once before it adds to this total`
     */
    get collectiveSongLength(): number;
    /**
     * Gets the total length of all of the songs in your library as timestamp format.
     *
     * `Note: A song must have been played at least once before it adds to this total`
     */
    get collectiveSongLengthAsStamp(): string;
    /**
     * The total time spend listening to songs in seconds.
     */
    secondsPlayed: number;
    /**
     * Total count of songs played
     */
    songsPlayed: number;
    /**
     * Returns the total amount of installed modules.
     */
    get modulesInstalled(): number;
    /**
     * Returns the amount of enabled modules.
     */
    get modulesEnabled(): number;
}
export declare class Theme {
    /**
     * CSS File this theme belongs to.
     */
    constructor(file: string);
    file: string;
    /**
     * Themeable objects referring to one specific object.
     */
    objects: {
        songPanel: Themeable;
        settingsPanel: Themeable;
    };
    /**
     * Themeable classes. Can refer to multiple objects.
     */
    classes: {};
    /**
     * Generate CSS markup from themeable objects in this object.
     * @returns CSS string
     */
    generateCSS(): string;
    /**
     * A string of custom CSS to apply after the object create CSS.
     *
     * Anything you can write in CSS, you can write to this.
     */
    customCSS: string;
}
declare class Themeable {
    /**
     * @param selector Unique CSS selector for this DOM element.
     */
    constructor(selector: string);
    /**
     * @param element DOM Element
     * @param selector Unique CSS selector for this DOM element.
     */
    constructor(element: HTMLElement, selector: string);
    selector: string;
    element: HTMLElement;
    /**
     * @type {ThemeableConstructor}
     */
    getStyle: () => CSSStyleDeclaration;
    /**
     * Return the styling as a CSS string.
     */
    toString(): string;
}
interface SelectListItem<ValueType> {
    "text": string;
    "value": ValueType;
}
interface HTMLSelectListOptionElement<ValueType> extends HTMLOptionElement {
    "itemValue": ValueType;
    "selectListItem": SelectListItem<ValueType>;
}
export interface SelectList<SelectItemValueType = any> {
    /**
     * Triggers when the user has selected an option.
     */
    on(event: "select", listener: (selectItem: SelectListItem<SelectItemValueType>) => void): this;
    /**
     * Triggers the `select` event.
     */
    emit(event: "select", selectItem: SelectListItem<SelectItemValueType>): boolean;
}
export declare class SelectList<SelectItemValueType = any> extends EventEmitter {
    items: SelectListItem<SelectItemValueType>[];
    closeAutomatically: boolean;
    constructor(items: SelectListItem<SelectItemValueType>[], closeAutomatically?: boolean);
    element: HTMLDivElement;
    selectElement: HTMLSelectElement;
    optionElements: HTMLSelectListOptionElement<SelectItemValueType>[];
    value: Promise<SelectListItem<SelectItemValueType>>;
    close(): void;
    open(x: number, y: number, width: number): void;
    setSelectPlaceholder(placeholder: string): void;
}
export declare class PanelManager {
    static initialize(): void;
    static hideButtons(): void;
    static showButtons(): void;
    static songPanelButton: HTMLDivElement;
    static settingsPanelButton: HTMLDivElement;
}
/**
 * List of assets used in Toxen.
 *
 * A custom asset list can be imported by themes.
 */
export declare var Assets: {};
/**
 * Start the tutorial prompts
 */
export declare function showTutorial(): void;
export {};
