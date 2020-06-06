const fs = require("fs");
const { Popup } = require("ionlib");
const electron = require("electron");
const { remote, shell, ipcRenderer } = electron;
const { Menu, dialog, Notification } = remote;
const { ScriptEditor, Song } = require("../toxenCore.js");
const browserWindow = remote.getCurrentWindow();

/**
 * @type {Song}
 */
var song;

/**
 * @type {Editor}
 */
var editor;


window.addEventListener("load", () => {
  browserWindow.getParentWindow().webContents.send("editor.request.data", true);
});

ipcRenderer.on("editor.song",
/**
 * @param {string} _song
 */
(e, _song) => {
  song = JSON.parse(_song);
  document.getElementById("info").innerHTML = song.details.artist + " - " + song.details.title + "<br>" + `<code>${song.txnScript}</code>`;
  editor = new Editor(document.getElementById("editor"), song.txnScript);
  browserWindow.on("close", () => {
    editor.save();
  });
  editor.text = fs.readFileSync(song.txnScript, "utf8");
  editor.textarea.disabled = false;
  editor.updateOverlay();
  editor.focus();
});

// ipcRenderer.on("editor.response.data", (e, data) => {
//   editor.text = data;
//   editor.textarea.disabled = false;
// });

class Editor {
  /**
   * @param {HTMLTextAreaElement} input 
   * @param {string} saveLocation 
   */
  constructor(input, saveLocation) {
    this.textarea = input;
    this.saveLocation = saveLocation;
    this.overlay = document.getElementById("overlay") ? document.getElementById("overlay"): document.createElement("div");
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
      this.updateOverlay();
    });
    window.addEventListener("resize", () => {
      self.updateOverlay();
    });

    this.textarea.addEventListener("keydown", e => {
      if (e.ctrlKey && e.key.toLowerCase() == "s") {
        e.preventDefault();
        this.save();
      }
      if (e.ctrlKey && e.key.toLowerCase() == "w") {
        e.preventDefault();
        browserWindow.close();
      }
    });
  }

  focus() {
    this.textarea.focus();
  }

  updateOverlay() {
    this.overlay.style.left = this.textarea.offsetLeft + "px";
    this.overlay.style.top = this.textarea.offsetTop + "px";
    this.overlay.style.width = this.textarea.clientWidth + "px";
    this.overlay.style.height = this.textarea.clientHeight + "px";
    this.textarea.rows = this.lineCount + 1;
    this.textarea.cols = this.longestLong() + 1;
    this.overlay.innerHTML = parse(this.text);
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

/**
 * Parse ToxenScript into HTML Highlighting
 * @param {string} code
 */
function parse(code) {
  /**
   * @type {{[key: string]: {"expression": RegExp, "function": ($0: string, ...$n: string[]) => string}}}
   */
  const regex = {
    "value": {
      "expression": /"(.*?)"/g,
      "function": function($0, $1) {
        if (!/[^\s\d]/g.test($1)) {
          return `<span class=number>${$0}</span>`;
        }
        return `<span class=string>${$0}</span>`;
      }
    },
    "link": {
      "expression": /https?:\/\/(.*\.)*.*\.\S*/g,
      "function": function($0) {
        return `<a class=number title='${$0}' onclick='shell.openExternal(this.title)' href='javascript:void' style='pointer-events: all;'>${$0}</a>`;
      }
    },
    "comment": {
      "expression": /#.*/g,
      "function": function($0) {
        return `<span class=comment>${$0}</span>`;
      }
    },
    "limiter": {
      "expression": /(?<=\s*)(once|twice)/gm,
      "function": function($0) {
        return `<span class=limiter>${$0}</span>`;
      }
    },
    "event": {
      "expression": /((?<=\[.*\]\s*)[A-z]+)|:[A-z]+/g,
      "function": function($0) {
        return `<span class=event>${$0}</span>`;
      }
    },
    "timing": {
      "expression": /(?<=\[\s*)(\d+:)*(\d+)(\.\d+)*\s*(-\s*(\d+:)*(\d+)(\.\d+)*)*(?=\s*\])/g,
      "function": function($0) {
        return `<span class=timing>${$0}</span>`;
      }
    },
  }

  for (const key in regex) {
    if (regex.hasOwnProperty(key)) {
      const obj = regex[key];
      code = code.replace(obj.expression, obj.function);
      // console.log("Checking " + obj.expression.source);
    }
  }

  return code;
}