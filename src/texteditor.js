/**
 * @typedef {{"word": string,"start": number,"end": number}} Word;
 */

exports.TextEditor = class TextEditor {
  /**
   * @param {HTMLTextAreaElement | HTMLInputElement} textarea 
   */
  constructor(textarea = document.createElement("textarea")) {
    if (!textarea) {
      throw "textarea needs to be declared";
    }

    this.textarea = textarea;

    textarea.addEventListener("keydown", ( /** @type {KeyboardEvent} */e) => {
      const {
        key,
        ctrlKey,
        altKey,
        shiftKey
      } = e;

      let cursor = this.getCursor();
      
      if (key == "Tab" && typeof (this.currentSuggestion = this.suggest()) == "string") {
        e.preventDefault();
        e.stopPropagation();
        let word = this.getWord();
        this.insert(this.currentSuggestion, word.start, word.end);
        this.emit("finish", this.currentSuggestion);
        this.currentSuggestion = null;
        return;
      }
      else if (!ctrlKey && shiftKey && altKey && key.toLowerCase() == "arrowdown") {
        let lines = this.getCurrentLines();
        let text = lines.map(l => l.text).join("\n");
        this.insert("\n"+text, lines[0].end);
      }
      else if (!ctrlKey && shiftKey && altKey && key.toLowerCase() == "arrowup") {
        let lines = this.getCurrentLines();
        let text = lines.map(l => l.text).join("\n");
        this.insert("\n"+text, lines[0].start - 1);
      }
      else if (ctrlKey && !shiftKey && !altKey && key.toLowerCase() == "'") {
        let lines = this.getCurrentLines();
        let endPlus = 0;
        let text = lines.map(
          l => l.text.startsWith("# ") ? (function(){ endPlus -= 2; return l.text.substring(2); })()
          : l.text.startsWith("#") ? (function(){ endPlus -= 2; return l.text.substring(1); })()
          : (function(){ endPlus += 2; return "# "+l.text; })()).join("\n");
        this.insert(text, lines[0].start, lines[lines.length - 1].end);
        this.setCursor(endPlus > 0 ? lines[0].start + 2 : lines[0].start, lines[lines.length - 1].end + endPlus);
      }
      else if (cursor.start < cursor.end && [
        "[",
        "{",
        "(",
        "\""
      ].find(t => key.toLowerCase() == t)) {
        e.preventDefault();
        // textEditor.insert();
        let lines = this.getCurrentLines();
        let text = lines.map(l => l.text).join("\n");
        
        switch (key) {
          case "[":
            this.insert(["[", "]"], cursor.start, cursor.end);
            break;
          case "(":
            this.insert(["(", ")"], cursor.start, cursor.end);
            break;
          case "{":
            this.insert(["{", "}"], cursor.start, cursor.end);
            break;
          case "\"":
            this.insert(["\"", "\""], cursor.start, cursor.end);
            break;
        
          default:
            break;
        }
      }

      this.currentSuggestion = this.suggest();
      // console.log(this.currentSuggestion);
    });
  }

  /**
   * @typedef { "finish" | "suggestion" | "dupeline" | "insertA" } TextEditorEvents
   * @type {{[eventName: string]: ((...any) => void)[]}}
   */
  _events = [];

  /**
   * Listen for an event
   * @param {TextEditorEvents} event 
   * @param {(...any) => void} cb 
   */
  on(event, cb) {
    if (Array.isArray(this._events[event])) {
      this._events[event].push(cb);
    }
    else {
      this._events[event] = [cb];
    }
    return this;
  }

  /**
   * Emit an event
   * @param {TextEditorEvents} event 
   * @param  {...any} args 
   */
  emit(event, ...args) {
    if (Array.isArray(this._events[event])) {
      for (let i = 0; i < this._events[event].length; i++) {
        const cb = this._events[event][i];
        cb(...args);
      }
    }
    return this;
  }
  
  get isTextarea() {
    return this.textarea.tagName === "TEXTAREA";
  }
  get isInput() {
    return this.textarea.tagName === "INPUT";
  }

  get value() {
    return this.textarea.value;
  }
  set value(text) {
    this.textarea.value = text;
  }

  getCursor() {
    return {
      "start": this.textarea.selectionStart,
      "end": this.textarea.selectionEnd
    };
  }
  /**
   * @param {number}} start 
   * @param {number} end 
   * @param {"forward" | "backward" | "none"} direction 
   */
  setCursor(start, end = start, direction = "none") {
    this.textarea.setSelectionRange(start, end, direction)
  }

  getCurrentLines() {
    let cursor = this.getCursor();
    let charIndex = 0;
    let allLines = this.getAllLines();
    /**
     * List of line texts
     * @type {{"text": string, "index": number, "start": number, "end": number}[]}
     */
    let lines = [];
    // let t = this.value;
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      charIndex += line.length;
      if (i > 0) charIndex++;
      if (charIndex >= cursor.start && charIndex < cursor.end) {
        lines.push({
          "text": line,
          "index": i + 1,
          "start": charIndex - line.length,
          "end": charIndex
        });
      }
      else if (charIndex >= cursor.end) {
        lines.push({
          "text": line,
          "index": i + 1,
          "start": charIndex - line.length,
          "end": charIndex
        });
        return lines;
      }
    }
    return lines;
  }

  /**
   * Get a line by index.
   * @param {number} lineIndex 
   */
  getLine(lineIndex) {
    return this.getAllLines()[lineIndex];
  }

  getAllLines() {
    return this.value.split("\n");
  }

  /**
   * @type {string[]}
   */
  suggestions = [];

  getWord() {
    let ss = this.textarea.selectionStart;
    let se = this.textarea.selectionEnd;
    let text = this.value;
    if (ss == se) {
      // Starting
      if (/[\s]/g.test(text[ss])) ss--;
      while(ss > 0 && /[\S]/g.test(text[ss])) {
        ss--;
      }
      if (/[\s]/g.test(text[ss])) {
        ss++;
      }
      
      // Ending
      while(se > ss && se < text.length && /[\S]/g.test(text[se])) {
        se++;
      }
      // if (/[\s]/g.test(text[se])) {
      //   se--;
      // }

      /**
       * @type {Word}
       */
      let word = {
        "word": text.substring(ss, se),
        "start": ss,
        "end": se,
      };

      return word;
    }
    else {
      /**
       * @type {Word}
       */
      let word = {
        "word": text.substring(ss, se),
        "start": ss,
        "end": se,
      };

      return word;
    }
  }

  suggest() {
    let {
      word,
      start,
      end
    } = this.getWord();
    

    if (word == "") {
      return null;
    }

    for (let i = 0; i < this.suggestions.length; i++) {
      const suggestion = this.suggestions[i];
      if (suggestion.toLowerCase().startsWith(word.toLowerCase())) {
        this.emit("suggestion", suggestion)
        return suggestion;
      }
    }

    return null;
  }

  /**
   * If `string`, `TAB` action is cancelled and will autocomplete suggestion.
   * 
   * If `null`, `TAB` does the default action.
   * @type {string}
   */
  currentSuggestion = null;

  /**
   * Insert a string into a spot
   * @param {string | [string, string]} text Text to insert. If an array with 2 strings, surround selection with one on each side.
   * @param {number} start Where to insert the text.
   * @param {number} end If higher than `start`, it'll cut out some part of the textbox string.
   */
  insert(text, start, end = start) {
    let value = this.value;
    let part1 = value.substring(0, start);
    let part2 = value.substring(end, value.length);

    if (Array.isArray(text) && text.length == 2) {
      this.value = part1 + text[0] + value.substring(start, end) + text[1] + part2;
      this.textarea.setSelectionRange(start + text[0].length, end + text[1].length);
    }
    else if (typeof text == "string" || typeof text == "number") {
      this.value = part1 + text + part2;
      this.textarea.setSelectionRange(start + text.length, start + text.length);
    }
    else {
      return;
    }
    this.emit("insert", text);
  }
}