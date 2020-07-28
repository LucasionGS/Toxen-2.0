# Toxen Next
Features I want to implement (This will be updated as I get more ideas and remember to write them down)  
(Post-release) means it's a feature I will work on after the official release and will be added as future updates.
- Defineable actions that are callable in ToxenScript. (Post-release)
  - An idea could be something like this
  ```js
  :ActionStart("redblue")
  // Times inside actions will be relative to the execution time instead of the song.
  [0] VisualizerColor("red")
  [1] VisualizerColor("blue");
  :ActionEnd();

  // Usage
  1/1 [5-8] Action("redblue") // It will repeat from 5 seconds to 8 seconds, repeating the action in "redblue" every 1/1th of a second (each second)
  ```
- Custom Themes
- Graphical Storyboard Editor Interface (Post-release)
- Built-in Graphical SRT(subtitle) creator (Post-release)
- Better and more media conversions to supported files.
- Better song info editing
  - Multi-song info editing
- Remove playlist feature
- Multi-add to playlist
- Visualizer Quanity Customizer (Interface buttons for `Storyboard`.`setAnalyserFftLevel` and `Storyboard`.`setAnalyserFftSize`)
- Music Playback Rate Changer (Like the first version of Toxen used to have)

- [Toxen.net](https://toxen.net/) website
  - Hub for downloading modules, storyboards, subtitles, custom themes, etc...
    - https://toxen.net/listings/SUBJECT
  - A Toxen forum where you can ask questions or suggest ideas for future updates.

- Smoother Redesign (Check ref)
  - More panels
    - Song Panel
    - Setting Panel
    - Song specifics settings
    - Information about Toxen and the credits (Patch notes?)
  - Song Wheel(?)
    - Songs could be pushed further out towards the center (and more visible) the closer it goes to the center of the visible part song list.
  - Draggable buttons(?)
    - The ability to move the buttons on the main interface around to whichever corner you prefer.
  - Better sorting in settings. Possibly a top menu for categories.
  - An info page with all shortcuts (God damn it then I need to remember them all >_>)

# Toxen Change Logs
Features and changes that has already been made to Toxen.

## Current WIP Update
- Added support for OGG files to be imported and converted in Toxen.

## 202007272153
- New stuff
  - Added imported songs now attempting to import metadata if it's already available on the media file. It will also import any pictures the media file has stored.
  - Added drag & drop for for all media types! Simply drag an audio/video/image into Toxen and it'll import it as either a new song or the background to the currently playing song.
    - If you drag in 2 files, a media file and an image file, it'll be added together.
  - Added `(Paused)` to Discord Rich Presence when the song is paused.
  - Added toggling colors for Shuffle and Repeat buttons in the center.
  - Added more sorting methods: `By Genre` and `By Year`
  - Added `Time listened` statistics that you can view in the statistics prompt. (Press in the top right `File` then press `Statistics`)
  - Added new shortcuts
    - `Ctrl + A` now selects all **visible** songs. (i.e it selects the ones that are in an open group or everything if not songs aren't grouped)
    - `Ctrl + Escape` now deselects every song you have selected. (Including songs that are not visible)
  - Added an import metadata button in the song panel to import data from the current song.
    - You can also import data by right-clicking on the song in the panel and pressing `Import metadata`.
    - If you have multiple songs selected you can also multi-import metadata by right-clicking and pressing `Import metadata from selected songs`
  - If Toxen crashes during the start up process, you'll get an option to send the bug report to me directly. It'll be an anonymous report and it'll help me find the source of the bug, so pressing the send button would be appreciated.
  You'll be shown what will be sent in the error panel if you want to know what is going to be sent. (It opens automatically when something happens, and is pointed out to you)
  If you are highly against it, you can choose not to send the report.

- Changes
  - Change the default music folder for new users from `~/Music` to `~/Music/ToxenMusic`. This doesn't effect existing users.

- House keeping
  - Removed version numbering from Discord Rich Presence. (I'm not even entirely sure why I considered it a good idea in the first place)
  - Removed old song panel toggle buttons in favor of the new centered buttons.

## 202007252047
- Added select/deselect all songs in a group
- ToxenScript now understands more common ways of executing a function, e.g using `()`
  - On top of all the other ways of pointing to parameters, you can now write functions like this
  ```js
  // New added way of using a function. You don't NEED the ending bracket, but it makes the code look cleaner.
  [0] VisualizerColor("red")
  // Old ways. All are still valid
  [0] VisualizerColor => "red"
  [0] VisualizerColor = "red"
  [0] VisualizerColor: "red"
  ```
- Added artist name quick-select in the YouTube Downloader for if you are downloading a song from an artist you already have other songs from.  
![youtubeArtistQuickSelect.gif](https://toxen.net/media/youtubeArtistQuickSelect.gif)
- Added Video download to the YouTube Downloader (Tick `Download Video` to download the video)
- Added buttons to pull out the side panels.  
- Added a centered set of buttons to `Go to previous, next, play/pause, shuffle` and `repeat` functions. As of now, they haven't fully replaced the old methods, but are also possible.
  You'll need to click on the buttons in the corners to open the panels, but you can change it to only hover over in the settings by ticking `Button Activation By Hover` on.  
  ![panelButtons.pngs](https://toxen.net/media/panelButtons.png)
- Fixed the progress bar not being sticky to the top of the visible song panel.
- The mouse and on-screen buttons hide after 5 seconds of inactivity. Becomes visible again after moving the mouse.
- Added multiple new icons to the interface to make it look less bland with pure text. (Thanks [Bootstrap Icons](https://icons.getbootstrap.com/))
- Added shortcuts `CTRL + Arrow up` to turn audio up by 5% and `CTRL + Arrow down` to turn audio down by 5%
- Added improvements to the Toxen Module system.
- Moved Toxen user data like settings, stats, and modules to `%appdata%/ToxenData` instead of in the installation. (`~/.toxendata` on Linux)
- Removed the progress bar being able to be in the bottom of the screen due to overlaps.


## 202007150445
- Added import subtitle file for current song
- Added import storyboard file for current song
- Added import default background image. (Songs without a background will show a custom picture instead of the Toxen logo if they don't have their own background set.
- Added Progress bar customization
  - You can now customize where the progress bar is position in the `settings` panel. You can select between the default `Side menu` position, `Top of screen`, or `Bottom of screen`

  ![progressBarCustomization.png](https://toxen.net/media/progressBarCustomization.png)
- Fixed Storyboard failing when using timestamps over 1 hour in scripts.

- **NOTICE: It is recommended to delete the "Toxen 2.0.exe" file from the installation if you had the update prior to this one and updated to this. It's a waste of space to have 2 exe files. Keep the "Toxen.exe" file**

## 202006040235
<ul>
  <li>Auto Updator!</li>
  <li>Song Grouping</li>
  <li>In-app editable Song Details: Artist, Title, Album, Source, Source Link, Language, and other Tags</li>
  <li>Background Dim adjustments</li>
  <li>New thumbnail option: Background Image</li>
</ul>

## 202005310640
<ul>
  <li>Added YouTube Download feature
    <ul>
      <li>
        Press on the <code>Add Song</code> button and press <code>Download YouTube Audio</code> when the prompt appears.<br>
        Insert the required information such as URL and title. The required fields are marked with <code>*</code> in the placeholders.
      </li>
    </ul>
  </li>
  <li>Added <code>Discord Presense: Show Details</code> setting in <code>Advanced Settings</code></li>
  <li>Added <code>Delete song</code> to the song context menu</li>
  <li>Re-styled the text fields and progress bars, including the <code>Song Progress</code> bar</li>
</ul>

## 202005281449
<ul>
  <li>Added <code>Set Background</code> functionality</li>
  <li>Added <code>Song Info</code> to song context menu and editable information</li>
  <li>Fixed <code>Currently playing</code> being deselected on <code>Update Music Library</code></li>
</ul>

## 202005280316
<ul>
  <li>Added Change notes under <code>Settings</code></li>
  <li>Added multiple new settings along with descriptions
    <ul>
      <li>Volume Bar</li>
      <li>Song Folder Selector</li>
      <li>Right-hand Song Menu</li>
    </ul>
  </li>
</ul>