# ToxenScript/Storyboard Documentation
## What is this?
Toxen supports custom storyboards to spice up the background of your song. It understands a custom scripting language, creatively called `ToxenScript`.

## How do I get started making a storyboard?
ToxenScript files are files ending with `.txn` as the extension. To get started you should navigate to the song you want to add a storyboard to
(You can right-click on a song in Toxen and press `Open song folder`) and create a file called `storyboard.txn`.



## Syntax/How the code should be written
Most of the commands in the script have the same structure, namely these `3 parts` to create a command.  
*(Full list of commands can be found at the bottom of the page)*  
[`Timing`] `EventName` => "`Parameters`"

### Example
```js
[0 - 30.5] VisualizerColor => "255", "255", "0"
```
### Explanation
#### `Timing`
`[0 - 30.5]` means **between the timestamps `0 seconds` and `30.5 seconds`**.  
Each `timestamp` can be written as either `seconds`, `minutes:seconds`, or `hours:minutes:seconds`.  
Examples  
`45` would be `45` seconds  
`125` would be `2` minutes and `5` seconds  
`2:05` would also be `2` minutes and `5` seconds  
`1:05:00` would be `1` hour, `5` minutes and `0` seconds


It is possible to write decimal points on `seconds`.  
This means that if you write `2:30.5` it would be `2` minutes and `30 and a half` seconds.  
You can be specific down to quite a few decimals.

#### `EventName`
The `EventName` is the name of the event to execute (obviously). It cannot include any spaces.  
*(Full list of commands can be found at the bottom of the page)*

#### `Parameters`
`Parameters` are the values you're telling `EventName` to change to.  
Each `EventName` has it's own `Parameters`, and each `Parameter` is surrounded by `"double-quotes"`.  
`Parameters` can be numbers or text, but will always need `double-quotes` around them.  
You don't need to add a `comma,` like in the examples, but it's recommended for better readability.

## Full Command List
```php
# Change the color of the audio visualizer to a RGB value.
# 0 is the least amount of color, and 255 is the highest.
[ VisualizerColor => "red (0 - 255)", "green (0 - 255)", "blue (0 - 255)"

# Change the intensity (height) of the audio visualizer.
# 0 is the least intense, and 40 is the most intense.
# Optionally, you can add a second parameter with "smooth" to make a smooth transition into the next intensity.
VisualizerIntensity => "Intensity (0 - 40)"

# Change the style of the audio visualizer.
# This can either be a number or text. Here's a comma-separated list of valid values:
# bottom, 0, top, 1, identical, 2, center, 3, alternating, 4
VisualizerStyle => "Style (name or id)";

# Change the direction of the audio visualizer.
# Can be either "left" or "right". Default is "right"
VisualizerDirection => "Direction (left or right)"

# Change the background image of the song.
# The only parameter should be the relative path to the image you want to change to.
# This doesn't change the background permanently.
Background => "path/to/file/relative/to/songfolder/image.jpg"

# Fire a pulse effect from the sides of the screen once on the timing point.
# Intensity Multiplier is only recommended to only be around 1-3.
Pulse => "Intensity Multiplier"

# Fire a pulse effect from the sides of the screen every beat, starting from the timing point.
# Optionally, you can add a second parameter with Intensity Multiplier.
# Intensity Multiplier, if included is only recommended to only be around 1-3.
BPMPulse => "BPM"
```