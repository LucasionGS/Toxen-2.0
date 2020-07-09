import * as fs from "fs";
import * as Electron from "electron";
import { TextEditor } from "../texteditor";
import { ScriptEditor, Song, ToxenScriptManager } from "../toxenCore.js";
import {Imd} from "../../src/ionMarkDown";
const { remote, shell, ipcRenderer } = Electron;
const { Menu, dialog } = remote;
const browserWindow = remote.getCurrentWindow();

var song: Song;

var editor: Editor;

var textEditor: TextEditor;

window.addEventListener("load", () => {
  browserWindow.getParentWindow().webContents.send("editor.request.data", true);
});

var saveOnQuit = true;

ipcRenderer.on("editor.response.data",
/**
 * @param {string} _song
 * @param {string[]} validSyntax
 */
(e, _song, validSyntax) => {
  let _eventFunctions = {};
  validSyntax.forEach(v => {
    _eventFunctions[v] = null;
  });

  
  ToxenScriptManager.eventFunctions = _eventFunctions;
  song = JSON.parse(_song);
  document.getElementById("info").innerHTML = Imd.MarkDownToHTML(song.details.artist + " - " + song.details.title) + "<br>" + `<code>${song.txnScript}</code>`;
  editor = new Editor(document.getElementById("editor") as unknown as HTMLTextAreaElement, song.txnScript);
  browserWindow.on("close", () => {
    if (saveOnQuit) {
      editor.save();
    }
  });
  editor.text = fs.readFileSync(song.txnScript, "utf8");
  editor.textarea.disabled = false;
  editor.updateOverlay();
  editor.focus();

  // Audio Completer
  textEditor = new TextEditor(editor.textarea);

  textEditor.suggestions = validSyntax;

  let updateAfterZero = () => {
    setTimeout(() => {
      editor.updateOverlay();
    }, 1);
  };

  textEditor.on("finish", updateAfterZero);
  // textEditor.on("dupeline", updateAfterZero);
  textEditor.on("insert", updateAfterZero);
  textEditor.on("undo", updateAfterZero);
  textEditor.on("redo", updateAfterZero);

  // Create Menu
  browserWindow.setMenu(Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Save script",
          click: function() {
            editor.save();
          },
          accelerator: "Ctrl + s",
        },
        {
          label: "Show script in explorer",
          click: function() {
            shell.showItemInFolder(song.txnScript);
          }
        },
        {type: "separator"},
        {
          label: "Save and Close Editor",
          click: function() {
            browserWindow.close();
          },
          accelerator: "Ctrl + w",
        },
        {
          label: "Reload Window",
          click: function() {
            browserWindow.reload();
          },
          accelerator: "Ctrl + r",
        },
        {
          label: "Close Editor",
          click: function() {
            saveOnQuit = false;
            browserWindow.close();
          },
          accelerator: "Ctrl + Shift + w",
        },
      ]
    },
    {
      label: "Tools",
      submenu: [
        {
          label: "Toggle Developer Tools",
          click: function() {
            browserWindow.webContents.toggleDevTools();
          },
          "accelerator": "F12"
        }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "ToxenScript Documentation",
          click: function() {
            shell.openExternal("https://toxen.net/toxenscript");
          }
        },
      ]
    },
  ]));
});

class Editor {
  constructor(input: HTMLTextAreaElement, public saveLocation: string) {
    this.textarea = input;
    this.numline = input.previousElementSibling && input.previousElementSibling.tagName == "TEXTAREA" ? input.previousElementSibling as unknown as HTMLTextAreaElement : null;
    this.saveLocation = saveLocation;
    this.overlay = document.getElementById("overlay") ? document.getElementById("overlay") as HTMLDivElement: document.createElement("div");
    this.overlay.id = "overlay";
    this.overlay.style.position = "absolute";
    this.overlay.style.whiteSpace = "pre";
    this.overlay.style.fontSize = this.textarea.style.fontSize;
    this.overlay.style.fontFamily = this.textarea.style.fontFamily;
    this.overlay.style.boxSizing = "border-box";
    this.overlay.style.padding = "3px";
    this.overlay.style.pointerEvents = "none";
    this.overlay.style.wordBreak = "break-all";
    this.overlay.style.wordWrap = "break-word";
    this.overlay.style.display = "inline";
    // this.overlay.style.maxWidth = "99vw";
    // this.overlay.style.maxHeight = "99vw";
    document.body.appendChild(this.overlay);
    let self = this;

    this.textarea.addEventListener("input", e => {
      self.updateOverlay();
    });
    window.addEventListener("resize", () => {
      self.updateOverlay();
    });

    this.textarea.addEventListener("keydown", e => {
      if (e.key.toLowerCase() == "t" && e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        browserWindow.getParentWindow().webContents.send("editor.request.currenttime", true);

        ipcRenderer.once("editor.response.currenttime", (e, time: number) => {
          let c = textEditor.getCursor();
          let text = ToxenScriptManager.convertSecondsToDigitalClock(time, true);
          textEditor.insert(text, c.start, c.end);
          textEditor.setCursor(c.start, c.start + text.length);
        });
      }
    });
  }

  textarea: HTMLTextAreaElement;
  numline: HTMLTextAreaElement;
  overlay: HTMLDivElement;

  focus() {
    this.textarea.focus();
  }

  updateOverlay() {
    this.overlay.style.left = this.textarea.offsetLeft + "px";
    this.overlay.style.top = this.textarea.offsetTop + "px";
    this.overlay.style.width = this.textarea.clientWidth + "px";
    this.overlay.style.height = this.textarea.clientHeight + "px";
    let lc = this.lineCount;
    this.textarea.rows = lc + 1;
    if (this.numline != null) {
      if (this.numline.rows != this.textarea.rows) {
        this.numline.rows = this.textarea.rows;
        const txt = [...Array(this.numline.rows).keys()].slice(1);
        this.numline.value = txt.join("\n");
      }
    }
    this.textarea.cols = this.longestLong() + 1;
    this.overlay.innerHTML = ToxenScriptManager.syntaxHighlightToxenScript(this.text);
  }

  save() {
    fs.writeFileSync(this.saveLocation, this.text);
    browserWindow.getParentWindow().webContents.send("editor.save", true);
  }

  get text() {
    return this.textarea.value;
  }

  set text(value) {
    this.textarea.value = value;
  }

  get lineCount() {
    return this.text.split("\n").length;
  }

  longestLong() {
    let lines = this.text.split("\n");
    let length = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (length < line.length) length = line.length;
    }
    return length;
  }
}