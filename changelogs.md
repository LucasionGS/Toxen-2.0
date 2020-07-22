# Toxen Next
Features I want to implement (This will be updated as i get more ideas and remember to write them down):
- Defineable actions that are callable in ToxenScript.
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
- Graphical Storyboard Editor Interface
- Built-in Graphical SRT(subtitle) creator
- Proper module support with prebuilds for JS and TS
- Better and more media conversions to supported files.
- Better song info editing
  - Multi-song info editing
- Auto-import data from media files (Things like artist, album, etc...)
- Remove playlist feature
- Visualizer Quanity Customizer (Interface buttons for `Storyboard`.`setAnalyserFftLevel` and `Storyboard`.`setAnalyserFftSize`)
- Music Playback Rate Changer (Like the first version of Toxen used to have)
- [Toxen.net](https://toxen.net/) website
  - Hub for downloading modules, storyboards, subtitles, custom themes, etc...
    - https://toxen.net/listings/SUBJECT
  - A Toxen forum where you can ask questions or suggest ideas for future updates.

- Smoother Redesign (Check ref)
  - Different way of accessing panels
  - More panels
    - Song Panel
    - Setting Panel
    - Song specifics settings
    - Information about Toxen and the credits (Patch notes?)
  - Song Wheel(?)
    - Songs could be pushed further out towards the center (and more visible) the closer it goes to the center of the visible part song list.
  - Draggable buttons(?)
    - The ability to move the buttons on the main interface around to whichever corner you prefer.
  - Functionality and panel buttons should have icons instead of blocks of text.
  - Center menu with Pause/Play, Repeat, Shuffle, Next and Previous (Icons)
    - Should be revealed when the mouse goes near them/hover over the icons' container.

# Toxen Change Logs
Features and changes that has already been made to Toxen.

## Current WIP Update
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
- Added buttons to pull out the side panels. (Sprites are still placeholders, will likely be replaced)  
  You'll need to click on the buttons to open the panels, but you can change it to only hover over in the settings by ticking `Button Activation By Hover` on  
![panelButtons.pngs](https://toxen.net/media/panelButtons.png)
- Fixed the progress bar not being sticky to the top of the visible song panel.
- The mouse and on-screen buttons hide after 5 seconds of inactivity. Becomes visible again after moving the mouse.
- Added multiple new icons to the interface to make it look less bland with pure text. (Thanks [Bootstrap Icons](https://icons.getbootstrap.com/))


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