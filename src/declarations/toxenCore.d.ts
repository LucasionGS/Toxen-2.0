/// <reference types="node" />
import { InteractiveProgressBar } from "./toxenStyle";
export declare let hueApi: import("node-hue-api/lib/api/Api");
import * as Electron from "electron";
import * as Zip from "adm-zip";
import { EventEmitter } from "events";
import * as rpc from "discord-rpc";
interface HTMLElementScroll extends HTMLElement {
    scrollIntoViewIfNeeded(): void;
}
declare type AnalyserFftSizeIndex = 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384;
/**
 * General Toxen functionality.
 */
export declare class Toxen {
    static initialize(): void;
    /**
     * Clear characters windows filesystem or Toxen doesn't understand.
     */
    static clearIllegalCharacters(filename: string): string;
    /**
     * Show an error prompt and a button to send it to the developer for troubleshooting.
     * @param err Error message
     */
    static errorPrompt(err: any): void;
    /**
     * Show an error prompt and a button to send it to the developer for troubleshooting.
     * @param err Error message
     * @param explanation An explanation of what went wrong to show to the user.
     */
    static errorPrompt(err: any, explanation: string): void;
    /**
     * Show an error prompt and a button to send it to the developer for troubleshooting.
     * @param err Error message
     * @param explanation An explanation of what went wrong to show to the user.
     * @param cause The cause of the problem. What was happening when the user hit this error.
     */
    static errorPrompt(err: any, explanation: string, cause: string): void;
    static sendReport(reportMessage: string): Promise<boolean>;
    static sendReport(reportMessage: string, logRequest: boolean): Promise<boolean>;
    /**
     * Sets the menu in the top bar and global shortcuts.
     */
    static setMenu(menu: Electron.Menu): void;
    /**
     * A list of all valid media extension (Including audio and video)
     */
    static get mediaExtensions(): string[];
    /**
     * Set the title of the document.
     */
    static set title(value: string);
    /**
     * A list of valid audio extension
     */
    static readonly audioExtensions: string[];
    /**
     * A list of valid video extension
     */
    static readonly videoExtensions: string[];
    /**
     * A list of valid media extension
     */
    static readonly imageExtensions: string[];
    /**
     * Current stored version of Toxen.
     *
     * `Note: This should be set by the Client`
     */
    static version: number;
    static toggleFullScreen(): void;
    static toggleFullScreen(mode: boolean): void;
    static updatePlatform: "win" | "linux" | "mac";
    static interactiveProgressBar: Toxen.ProgressBar;
    static inactivityState: boolean;
    /**
     * Restarts Toxen immediately.
     */
    static restart(): void;
    /**
     * Reloads the Toxen window immediately.
     */
    static reload(): void;
    /**
     * Close the Toxen application immediately.
     */
    static close(): void;
    static discordConnect(): Promise<void | rpc.Client>;
    static discordDisconnect(): Promise<void>;
    /**
     * Update Discord presence
     */
    static updateDiscordPresence(): Promise<void>;
    static updateDiscordPresence(song: Song): Promise<void>;
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
    static on(event: "updated", callback: () => void): void;
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
    static emit(event: "updated"): void;
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
         */
        input(opts?: {
            /**
             * Modify this object using a function. This will always happen before the other options get applied.
             */
            modify?: (input: HTMLInputElement) => void;
            /**
             * Id for this item.
             */
            id?: string;
            /**
             * Default value for the input.
             */
            value?: string;
            /**
             * Default placeholder for the input.
             */
            placeholder?: string;
        }): HTMLInputElement;
        /**
         * Generate a button.
         */
        button(opts?: {
            /**
             * Modify this object using a function. This will always happen before the other options get applied.
             */
            modify?: (button: HTMLButtonElement) => void;
            /**
             * Id for this item.
             */
            id?: string;
            /**
             * Text to be displayed on the button. Supports HTML.
             */
            text?: string;
            /**
             * Background color in CSS.
             */
            backgroundColor?: string;
            /**
             * Function to execute on the click of this button.
             */
            click?: (this: HTMLButtonElement, ev: MouseEvent) => any;
        }): HTMLButtonElement;
    };
}
export declare namespace Toxen {
    type CleanOptions = "emptyStrings" | "null" | "duplicates" | "number" | "string" | "boolean";
    export class TArray<ArrayType> extends Array<ArrayType> {
        constructor();
        constructor(array: ArrayType[]);
        /**
         * Creates a copy of the TArray and cleans it up with your chosen options.
         */
        cleanArray(itemsToClean: (CleanOptions[])): TArray<ArrayType>;
        /**
         * Remove the first instance of an item from the array and returns the removed elements.
         * @param item Item to find and remove
         */
        remove(item: ArrayType): TArray<ArrayType>;
        /**
         * Remove the first instance of an item from the array and returns the removed elements.
         * @param items Items to find and remove
         */
        remove(...items: ArrayType[]): TArray<ArrayType>;
        /**
         * Remove all instances of an item from the array and returns them.
         * @param items Items to find and remove
         */
        /**
         * Returns the elements of an array that meet the condition specified in a callback function.
         * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the array.
         * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
         */
        filter<S extends ArrayType>(callbackfn: (value: ArrayType, index: number, array: ArrayType[]) => value is S, thisArg?: any): S[];
        /**
         * Returns the elements of an array that meet the condition specified in a callback function.
         * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the array.
         * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
         */
        filter(callbackfn: (value: ArrayType, index: number, array: TArray<ArrayType>) => unknown, thisArg?: any): TArray<ArrayType>;
        /**
         * Return a regular array.
         */
        toArray(): this[number][];
        /**
         * Iterates through each element and uses the callback to return a boolean value.
         *
         * Returns `true` if every callback returns `true`, and returns `false` if **any** callback returns `false`.
         */
        equals(callbackfn: (value: ArrayType, index: number, array: TArray<ArrayType>) => boolean): boolean;
    }
    export class ProgressBar extends InteractiveProgressBar.InteractiveProgressBar {
        constructor(width?: string | number, height?: string | number);
    }
    export {};
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
    applySongFolderListToSelect(): void;
    setSongFolder(): Promise<void>;
    toggleVideo(force: boolean): boolean;
    toggleSongPanelLock(force?: boolean): boolean;
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
    toggleDiscordPresence(force?: boolean): void;
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
     * Quantity of the audio visualizer. (The higher the number, the more and thinner bars)
     */
    visualizerQuantity: number;
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
     * Discord presence
     */
    discordPresence: boolean;
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
    prompt: Prompt;
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
     * Detailed information about this song.
     *
     * This is stored on the user's disk in each song folder as `details.json`
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
         * The year this song was released.
         */
        year: string;
        /**
         * The genre of this song
         */
        genre: string;
        /**
         * List of tags to better help find this song in searches.
         */
        tags: string[];
        /**
         * A custom group that songs can be grouped by.
         */
        customGroup: string;
        /**
         * List of playlists this song belongs in.
         */
        playlists: string[];
        /**
         * Default Visualizer color for this specific song.
         */
        visualizerColor: {
            red: number;
            green: number;
            blue: number;
        };
        /**
         * The length of the song in seconds.
         * **Note:** This value is automatically updated if it doesn't match the song's duration.
         * @readonly
         */
        songLength: number;
    };
    element: HTMLSongElement;
    setElement(elm: HTMLDivElement | HTMLSongElement): void;
    /**
     * Executes when a song is played.
     */
    onplay(song: Song): void;
    /**
     * A randomly generated hash to reload cached files.
     */
    hash: string;
    /**
     * Play this song.
     */
    play(): void;
    play(hash: string): void;
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
    setBackground(filePath: string): void;
    setStoryboard(filePath: string): void;
    setSubtitles(filePath: string): void;
    /**
     * Get the parent group if it belongs to one. Returns `null` if not grouped.
     */
    getGroup(): SongGroup;
    /**
     * Scroll to the element and reveal it.
     */
    focus(delay?: number): void;
    /**
     * Return all playlists as a keyvalue pair object.
     */
    getPlaylistsStatus(): {
        [playlist: string]: boolean;
    };
    addToPlaylist(): void;
    addToPlaylist(playlist: string): void;
    managePlaylists(): void;
    removeFromPlaylist(playlist: string): void;
    removeFromCurrentPlaylist(): void;
    delete(): void;
    importMetadata(): Promise<void>;
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
     * Song History
     */
    static history: {
        historyIndex: number;
        items: Song[];
        next(): Song;
        previous(): Song;
        insert(song: Song): void;
        /**
         * Clear the history.
         */
        clear(): void;
        /**
         * Clear the history.
         */
        clearAndPrompt(): void;
    };
    /**
     * The playback speed the song is playing at. Default is `1`
     */
    static get playbackRate(): number;
    static set playbackRate(v: number);
    static resetPlaybackRate(): void;
    static multiManagePlaylists(songs?: Song[]): void;
    /**
     * If `Settings.onlyVisible` is `true`, returns only the physically visible songs in the song list.
     *
     * If `Settings.onlyVisible` is `false`, returns the full `SongManager.playableSongs` list
     */
    static onlyVisibleSongList(forceOnlyVisible?: boolean): Song[];
    /**
     * Export every song into a folder.
     */
    static exportAll(location?: string, songList?: Song[]): Promise<void>;
    static importMediaFile(file: File, playOnDone?: boolean): Promise<Song>;
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
     * @param search Search for a string
     */
    static search(search?: string): void;
    /**
     * The div element containing all of the songs elements.
     */
    static songListElement: HTMLDivElement;
    /**
     * Toxen's Media Player.
     */
    static player: HTMLVideoElement;
    /**
     * Reveal the song panel.
     */
    static revealSongPanel(): void;
    /**
     * Scan a song folder.
     */
    static scanDirectory(): Song[];
    /**
     * Scan a song folder.
     * @param location Location to scan. Defaults to current song folder if omitted.
     */
    static scanDirectory(location: string): Song[];
    static loadFromFile(fileLocation?: string): Promise<void>;
    static saveToFile(fileLocation?: string): void;
    /**
     * Get a song based on it's ID
     * @param id Song ID
     */
    static getSong(id: number): Song;
    /**
     * Get a song based on it's relative folder path from the music folder.
     * Should like use a song instance's `path` property.
     * ```js
     * let mySong = new Song();
     * getSongWithPath(mySong.path);
     * ```
     * @param songFolderName Song folder name. Something like `Song.path`
     */
    static getSongWithPath(songFolderName: string): Song;
    /**
     * Get a song based on another song instance's relative folder path from the music folder.
     * Should like use a song instance's `path` property.
     * ```js
     * let mySong = new Song();
     * getSongWithPath(mySong.path);
     * ```
     * @param song Song to use the path from.
     */
    static getSongWithPath(song: Song): Song;
    static getCurrentlyPlayingSong(): Song;
    static moveToTime(timeInSeconds: number): boolean;
    static playSongById(id: number): void;
    static playSong(song: Song): void;
    static playRandom(): Song;
    static playNext(): Song;
    static playPrev(): Song;
    static toggleShuffle(force?: boolean): boolean;
    static toggleRepeat(force?: boolean): boolean;
    static toggleOnlyVisible(force?: boolean): boolean;
    static addSong(): void;
    static addSongLocal(): void;
    static addSongYouTube(): void;
    static importCurrentMetadata(): void;
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
     */
    songGroup?: SongGroup;
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
    name: string;
    element: HTMLSongGroupElement;
    set collapsed(value: boolean);
    get collapsed(): boolean;
    /**
     * Toggle collapse on this container.
     */
    collapse(): void;
    focus(): void;
    /**
     * Return all of the song groups.
     */
    static getAllGroups(): SongGroup[];
    /**
     * Return all of the song groups.
     * @param collapsedCondition Whether it should return all with collapsed true, or collapsed false. Omit to ignore and return all.
     */
    static getAllGroups(collapsedCondition: boolean): SongGroup[];
    /**
     * @param collapsedCondition Omit to ignore and return all
     */
    static getAllGroupNames(collapsedCondition?: boolean): string[];
}
export declare const toxenMenus: {
    songMenu: Electron.Menu;
    selectedSongMenu: Electron.Menu;
    songGroupMenu: Electron.Menu;
    selectBackgroundMenu: Electron.Menu;
};
/**
 * Electron Menu.
 */
export declare var toxenHeaderMenu: Electron.Menu;
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
    static visualizerQuantity: number;
    /**
     * The offset value for the song.
     * Default is 0;
     */
    static timingPoint: number;
    /**
     * Background dim value.
     */
    static backgroundDim: number;
    /**
     * @readonly
     * The currently shown background dim value.
     * **Note:** This is often different from the ``Settings.backgroundDim`` setting, as this is dynamic.
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
     */
    static setIntensity(value: number): void;
    static analyser: AnalyserNode;
    static bass: GainNode;
    static setAnalyserFftLevel(size: number): void;
    static setAnalyserFftSize(size: AnalyserFftSizeIndex): void;
    static bufferLength: number;
    static dataArray: Uint8Array;
    static _fadingEnabled: boolean | number | NodeJS.Timeout;
}
/**
 * ToxenScript: Storyboard Object
 */
export declare class StoryboardObject {
    static objects: {
        name: string;
        object: StoryboardObject;
    }[];
    static getObject(name: string): StoryboardObject;
    static getObjectIndex(name: string): number;
    static widthDefault: number;
    static heightDefault: number;
    static widthRatio: number;
    static heightRatio: number;
    static get ratio(): number;
    static drawObjects(ctx: CanvasRenderingContext2D): void;
    /**
     * Create a new Storyboard object.
     * @param name Identifier of this object
     * @param x Starting X Position
     * @param y Starting Y Position
     * @param fill Either a HEX color or an image URL. If it starts with a poundsign (`#`), it's used as HEX, URL otherwise.
     */
    constructor(name: string, fill?: string, type?: "square" | "circle" | "image");
    /**
     * Identifier of this object.
     */
    name: string;
    /**
     * X Position.
     */
    x: number;
    /**
     * Y Position.
     */
    y: number;
    /**
     * Either a HEX color or an Image Element.
     */
    fill: string | HTMLImageElement;
    /**
     * X Position.
     */
    width: number;
    /**
     * Y Position.
     */
    height: number;
    type: "square" | "circle" | "image";
    /**
     * A number between `0` and `1`. `1` being fully visible.
     */
    opacity: number;
    rotation: number;
    pivotX: number;
    pivotY: number;
    /**
     * @param value If it starts with a poundsign (`#`), it's used as HEX, Image URL otherwise.
     */
    setFill(value: string, newWidth?: number, newHeight?: number): void;
    draw(ctx: CanvasRenderingContext2D): void;
    /**
     * Convert a string that is formatted as a percentage (The `%` can be included in the end of the string) to a pixel number value
     */
    static widthPercent(w: string): number;
    /**
     * Convert a string that is formatted as a percentage (The `%` can be included in the end of the string) to a pixel number value
     */
    static heightPercent(h: string): number;
}
/**
 * ToxenScript Manager
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
     * Alterable variables.
     */
    static variables: {
        [$name: string]: string;
    };
    /**
     * Default variable set.
     */
    static defaultVariables: {
        [$name: string]: string | (() => string);
    };
    /**
     * Apply the variables to the text.
     */
    static applyVariables(text: string): string;
    /**
     * Parses ToxenScript files for storyboard effects and applies them to the current storyboard.
     * @param scriptFile Path to script file.
     */
    static scriptParser(scriptFile: string): Promise<void>;
    static getEventNames(): string[];
    /**
     * Function Types for ToxenScript.
     */
    static eventFunctions: {
        [eventName: string]: (args: string[], event: ToxenEvent) => void;
    };
    static _curAction: {
        name: string;
        startPoint: number;
        endPoint: number;
        events: ToxenEvent[];
    };
    static actions: (typeof ToxenScriptManager._curAction)[];
    static curBlock: {
        startPoint: number;
        endPoint: number;
    };
    /**
     * Function Types for ToxenScript
     */
    static eventDocs: {
        [eventName: string]: string;
    };
    /**
     * Parse ToxenScript into HTML Highlighting
     * @param code Raw code string to highlight with HTML.
     */
    static syntaxHighlightToxenScript(code: string, validEventNames?: string[]): string;
    /**
     * Convert a timestamp into seconds.
     * @param timestamp Time in format "hh:mm:ss".
     */
    static timeStampToSeconds(timestamp: string | number, throwError?: boolean): number;
    /**
     * Convert seconds to digital time format.
     * @param trim Whether or not to cut off 0 values on the endings
     * @param removeDecimals Whether or not to remove the decimals from the time.
     * `Note: Removing decimals lowers the accuracy if you want to re-convert it back to seconds.`
     */
    static convertSecondsToDigitalClock(seconds: number, trim?: boolean, removeDecimals?: boolean): string;
    /**
     * List of events in order for the current song.
     */
    static events: ToxenEvent[];
}
declare class ToxenEvent {
    /**
     * Create a new Event
     * @param startPoint Starting point in seconds.
     * @param endPoint Ending point in seconds.
     * @param fn Function to run at this interval.
     */
    constructor(startPoint: number, endPoint: number, fn: (this: ToxenEvent, args: any[]) => void);
    startPoint: number;
    endPoint: number;
    fn: (this: ToxenEvent, args?: any[]) => void;
    hasRun: boolean;
    type: string;
    /**
     * A floating point number representing the current percentage this event is between it's starting point and it's end point.
     *
     * 100% would return `1`, 50% would return `0.5`, and so on.
     */
    get percent(): number;
}
export declare class Tools {
    static updateCSS(): void;
    static isNumber(value: any): boolean;
    static refreshOnChange(exceptions?: string[]): void;
    static generateRandomString(length?: number): string;
    static randomInt(max: number, min?: number): number;
    static componentToHex(c: number): string;
    static rgbToHex(red: number, green: number, blue: number): string;
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
    /**
     * Decodes all HTML text from one or more strings.
     * @param html HTML code string
     */
    static decodeHTML(html: string): string;
    /**
     * Decodes all HTML text from one or more strings.
     * @param html HTML code strings
     */
    static decodeHTML(...html: string[]): string[];
    /**
     * Encodes all HTML text from one or more strings.
     * @param html HTML code string
     */
    static encodeHTML(html: string): string;
    /**
     * Encodes all HTML text from one or more strings.
     * @param html HTML code strings
     */
    static encodeHTML(...html: string[]): string[];
    /**
     * @param object
     * @param text Preformatted string or function that outputs a string.
     * @param HTMLSupport Whether or not to allow HTML to be parsed or use as raw.
     */
    static hoverMenu(object: HTMLElement, text: string | ((div: HTMLDivElement) => string), HTMLSupport: boolean): void;
    /**
     * @param json JSON Object.
     */
    static hoverMenuJSON(object: HTMLElement, json: any): void;
    static closeAllHoverMenus(): void;
    /**
     * Highlight a JSON string.
     * @param json Can be either a already converted string JSON or an object.
     */
    static syntaxHighlight(json: any): string;
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
    moveable: boolean;
    contentElement: HTMLDivElement;
    buttonsElement: HTMLDivElement;
    /**
     * Removes everything inside the content field and appends `content`.
     *
     * `Identical to Prompt.addContent, but it clears the content first.`
     * @param textAsHTML If `content` is a string, set to `false` to disable HTML parsing.
     */
    setContent(content: HTMLElement | string, textAsHTML?: boolean): void;
    clearContent(): void;
    clearButtons(): void;
    setInteractive(mode: boolean): this;
    /**
     * Append content to the content field.
     * @param textAsHTML If `content` is a string, set to `false` to disable HTML parsing.
     */
    addContent(content: HTMLElement | string, textAsHTML?: boolean): this;
    /**
     * Add buttons to this prompt.
     * @param useDefault Attempts to use default buttons for certain strings
     */
    addButtons(button: string, btnClass?: string, useDefault?: boolean): HTMLButtonElement;
    addButtons(button: HTMLButtonElement, btnClass?: string, useDefault?: boolean): HTMLButtonElement;
    addButtons(button: (string | HTMLButtonElement)[], btnClass?: string, useDefault?: boolean): HTMLButtonElement[];
    get width(): string | number;
    set width(value: string | number);
    get height(): string | number;
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
     * @param currentVersion Current version number.
     * It is formatted as a 12 digit timestamp, starting from the year and onwards to the minute.
     * `M` is Month and `m` is minute
     * `YYYYMMDDHHmm`
     */
    static check(currentVersion: number): Promise<void>;
    static downloadLatest(): Promise<void>;
    static runUpdateScript(path: string): void;
}
export declare class ScriptEditor {
    static open(song: Song): Electron.BrowserWindow;
    static listening: boolean;
    static sendCommand(value: any): void;
    static command: any;
    static window: import("electron").BrowserWindow;
    static makeWindow(): Electron.BrowserWindow;
    static currentSong: Song;
}
export declare class Effect {
    /**
     * Highlight an element with a white color, with a flash that lasts 2 seconds.
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
     * Highlight an element with a flash that lasts for `ms` milliseconds.
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
    static defaults(): void;
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
