# Toxen Next
Features I want to implement (This will be updated as I get more ideas and remember to write them down)  
(Post-release) means it's a feature I will work on after the official release and will be added as future updates.
- Custom Themes
- Graphical Storyboard Editor Interface (Post-release)
- Built-in Graphical SRT(subtitle) creator (Post-release)
- Better and more media conversions to supported files.
- Better song info editing
  - Multi-song info editing
- Multi-add to playlist
- Remove a playlist
- Visualizer Quanity Customizer (Interface buttons for `Storyboard`.`setAnalyserFftLevel` and `Storyboard`.`setAnalyserFftSize`)
- Music Playback Rate Changer (Like the first version of Toxen used to have)
- Custom mini-notice for small, not super important and temporary notifications that doesn't require to be shoved in your face.

- [Toxen.net](https://toxen.net/) website
  - Hub for downloading modules, storyboards, subtitles, custom themes, etc...
    - https://toxen.net/listings/SUBJECT
  - A Toxen forum where you can ask questions or suggest ideas for future updates.

- Smoother Redesign (Check refs from Jiri & Ruby)
  - Single side panel visible while not idle.
    - Side panel will have the buttons for Music Panel, Settings, and other panels.
    - VSCode has something very similar to this concept, use it for inspiration.
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

- Known bugs to fix
  - None in mind right now, please notify me if you find something!

# Toxen Change Logs
Features and changes that has already been made to Toxen.

## Current WIP Update
General
- Added a drag feature to popup prompts in the very top of the prompt. Click and drag the popup around anywhere on the screen.
- Added custom checkboxes and radio buttons (single select buttons) for future customizability.
- Added a small prompt when Toxen has updated to a newer version.
- Added Multi-Song Folder list Quick Select! Whenever you select a song folder in the settings panel, it gets added to a quickselect list that you can choose between.
- Removed Light theme. (This will be replaced later with a custom theming system later)
- Removed swapping the panels' positions.

ToxenScript
- Added new storyboard functions such as `VisualizerColor_transition` and `VisualizerIntensity_transition`.
- When sizing an object using `object_size` or `object_size_transition`, you can now write values like `100%` to get 100% of either the width or height of the screen, depending on which parameter it's given to.
- Added custom `actions`! You can now define a custom sequence of timing functions to execute at any given time. `Actions` repeat themselves if the timing point has a larger gap than the first and last timing point inside the `Action`. Check example and exceptions below.
  - Exceptions: `BPMPulse` and using another `Action` inside of an `Action` definition, will not work as expected.
```js
:ActionStart("rainbow") // This tells Toxen that this is the beginning of a new Action. It'll store all timing functions between here and the next :ActionEnd()
  // Times inside actions will be relative to the execution time instead of the song.
  // This sequence will in 6 seconds cycle through a standard color wheel and transition between them on the visualizer.
  [0] visualizercolor_transition("blue", "aqua") // Fades from `blue` to `aqua`
  [1] visualizercolor_transition("aqua", "lime") // Fades from `aqua` to `lime`
  [2] visualizercolor_transition("lime", "yellow") // Fades from ...
  [3] visualizercolor_transition("yellow", "red") // Fades from ...
  [4] visualizercolor_transition("red", "fuchsia") // Fades from ...
  [5 + 1] visualizercolor_transition("fuchsia", "blue") // Fades from ...
:ActionEnd() // This tells Toxen that this is the ending of the current Action.

// Usage
[5-16] Action("rainbow") // It will repeat from 5 seconds to 16 seconds, repeating the action in "rainbow" each time it finishes
```
## 202008070313
- General
  - Added automatically checking for updates every 30 minutes.
  - Optimized subtitle rendering to be frame based instead of ms based, since trying to render mid frame is pointless.
  - Added optional automatic trimming of subtitles when trimming a song.
  - While in fullscreen, a small, faded notice with the song artist and title will appear in the top for 2 seconds and disappear automatically.
  - Implemented history feature! Going back and forth now remembers which song you had playing previously and goes forward to the same one you went backwards from.
  - Added an animation on the popups when they enter and exit.
  - Automatically hiding the UI when going fullscreen with `F11` if the mouse stays still when toggling.
  - Removed Toxen only looping through songs that was visible in the search list even with "Only visible" enabled.
  - Added a progress indication on the taskbar icon the Toxen when doing something that takes a longer time, like downloading and trimming.
  - Added support for dragging and dropping both `txn` files (Storyboard scripts) and `srt` files (Subtitle file)

- YouTube Downloader
  - Added automatically filling out YouTube artist and title details when inserting a URL. They can still be manually edited before pressing download.
  - Added tinting to the `artist` field, indicating with a light green tint if you already have a song from the same artist. This makes it easier to tell if you have spelled it correctly with the correct caps and such if you already have the artist in your library.
  - Optional subtitle download when downloading audio/videos.

- ToxenScript
  - Added full auto suggestions for available functions. Press tab while typing a word to get suggestions on what to complete it to. You can also press `CTRL + Enter` to get the suggestion field to show suggestions even without typing something first.
  - Added support for HEX values to be used as a color in scripting.
  - Added support for a timing point duration!
    - You can now also use a `+` in timing points. Using a plus makes the second parameter into the duration of the event. The event will execute from `startPoint` until `startPoint` + `endPoint`. This means if you write [`15 + 5`], the event will begin at `15` and end at `20`
  - Added Dynamic objects! (Experimental)
    - You can add a dynamic object by using the `:CreateObject` function. Give it 2 parameters, a `name` to refer to later, and `fill`, which is what the object should look like. This can be either a HEX color (Use a poundsign (`#`) as the first symbol in the string to indicate a HEX color) or write in a path to an image. This path should be relative to the song's folder, just like the `background` function does.
    - A bunch of commands which will be documented in detail in the future. Hopefully very soon:tm:


## 202008042032
- Replaced the background dim slider with the new custom slider.
- Optimized Toxen more for new users
- Updated the Tutorial to be more up to date with the new layout.
- Changed positioning of the popup notifications to not be overlapping the top bar.

## 202008022155
- Added `Custom Group` as a details each song can have. You can group songs by this new detail to sort them in a custom group that's only meant for grouping songs together
- Swapped around the `Artist` detail field and the `Title` detail field. Now `Artist` is above `Title`
- Reskinned and reformatted the main layout.
  - Progress bar has changed look and is now in the bottom of the screen along with the center buttons.
  - Changed the center buttons to look less blocky.
  - Progress bar now hides when inactive.
  - Changed the position of the `current time/duration` text to right above the new Progress bar.
  - Removed the volume adjuster in the settings menu in favor of the new, prettier volume adjuster in the center of the screen.

## 202008010520
- Added support for OGG files to be imported and converted in Toxen.
- Added a custom header to better fit the theme.
  - Press on the Toxen text next to the icon in the top left to open up more options that used to be in the top bar.
- Added `BackgroundDim` function for ToxenScript.
  - `BackgroundDim` takes `1` parameter. A number between `0` and `100`. `0` is no background dim, and `100` is maximum dim, i.e completely black.
  ```js
  [0 - $end] BackgroundDim("75") // This would be 75 percent
  ```
- Added `VisualizerQuantity` function for ToxenScript and `visualizerQuantity` to the settings file.
  - `VisualizerQuantity` takes `1` parameter. A number between `1` and `11`. `1` is the least amount of, and thickest visualizer bars, and `11` is maximum dim. (The higher this is, the harder it'll hit the performance)
  ```js
  [0 - $end] VisualizerQuantity("6") // This would set the VisualizerQuantity to level 6 (The default is 5)
  ```
- Added [`always`] as a valid timestamp in ToxenScript.
  - Using `always` is identical to using `0 - $end` as a timing point.
  ```js
  [always] VisualizerColor("lightblue") // This will always set the visualizer's color to light blue
  ```
- Added support for whole integers in ToxenScript to be used without needing quotes.
  - Now you can write for example: `5` instead of `"5"`, but if you want to use a float you still need to use quotes like this `"5.2"`
  - Changed how playlist management works. You can now select and deselect playlists easily!

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