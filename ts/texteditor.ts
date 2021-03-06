import {
  SelectList
} from "./toxenCore"
type Word = {"word": string,"start": number,"end": number};
type CursorPosition = {"start": number,"end": number};

export class TextEditor {
  /**
   * @param {HTMLTextAreaElement | HTMLInputElement} textarea 
   */
  constructor(textarea: HTMLTextAreaElement | HTMLInputElement = document.createElement("textarea")) {
    if (!textarea) {
      throw "textarea needs to be declared";
    }

    this.textarea = textarea;

    (textarea as HTMLInputElement).addEventListener("keydown", (e: KeyboardEvent) => {
      const {
        key,
        ctrlKey,
        altKey,
        shiftKey
      } = e;

      let cursor = this.getCursor();
      let word = this.getWord();

      if (document.getElementById("jdksaklajdklajkkadjkldkkjdksla")) {
        document.getElementById("jdksaklajdklajkkadjkldkkjdksla").remove();
        this.textarea.focus();
        this.setCursor(cursor.start, cursor.end);
      }
      
      if ((key == "Tab" && typeof (this.currentSuggestion = this.suggest()) == "string") || ctrlKey && key == " ") {
        e.preventDefault();
        e.stopPropagation();
        let self = this;
        
        let as = self.allSuggestions(!word.word);
        if (as.length == 1) {
          self.textarea.focus();
          self.insert(as[0], word.start, word.end);
          self.emit("finish", as[0]);
          self.currentSuggestion = null;
        }
        else if (as.length > 0) {
          let sl = new SelectList(as.map(s => {
            return {
              text: s,
              value: s
            }
          })).on("select", si => {
            self.textarea.focus();
            self.insert(si.value, word.start, word.end);
            self.emit("finish", si.value);
            self.currentSuggestion = null;
          });
          let size = self.textarea.getBoundingClientRect();
          let x = size.x;
          let y = size.y + (self.getCurrentLines()[0].index * 20);
          sl.element.style.position = "fixed";
          sl.element.style.zIndex = "1000";
          sl.element.style.left = x + "px";
          sl.element.style.top = y + "px";
          sl.element.id = "jdksaklajdklajkkadjkldkkjdksla";
          document.body.appendChild(sl.element);
          sl.selectElement.focus();
          sl.value.catch(reason => {
            this.textarea.focus();
            this.setCursor(cursor.start, cursor.end);
          });
        }
      }
      else if (key == "Tab" && !ctrlKey && !shiftKey && !altKey) {
        e.preventDefault();
        e.stopPropagation();
        let c = this.getCursor();
        let lines = this.getCurrentLines();
        if (lines.length == 1) {
          this.insert("  ", c.start);
        }
        else if (lines.length > 1) {
          let cu = this.getCursor();
          lines.forEach(l => {
            this.insert("  ", l.start, l.start);
          });
          this.setCursor(cu.start + 2, cu.end + 2);
        }
      }
      else if (key == "Tab" && !ctrlKey && shiftKey && !altKey) {
        e.preventDefault();
        e.stopPropagation();
        let c = this.getCurrentLines();
        let cu = this.getCursor();
        let thisLine = c.find(l => l.start >= cu.start && cu.end <= l.end);
        let cursorForward = thisLine.text.substring(0, 2) == "  " ? 2 : thisLine.text.substring(0, 1) == " " ? 1 : 0;
        c.forEach(l => {
          if (this.value.substring(l.start, l.start + 2) == "  ") {
            this.insert("", l.start, l.start + 2);
            // this.setCursor(cu.start - 2, cu.end - 2);
          }
          else if (this.value.substring(l.start, l.start + 1) == " ") {
            this.insert("", l.start, l.start + 1);
          }
        });
        this.setCursor(cu.start - cursorForward, cu.end - cursorForward);
      }
      else if (key.toLowerCase() == "arrowdown" && !ctrlKey && shiftKey && altKey) {
        let lines = this.getCurrentLines();
        let text = lines.map(l => l.text).join("\n");
        this.insert("\n"+text, lines[0].end);
      }
      else if (key.toLowerCase() == "arrowup" && !ctrlKey && shiftKey && altKey) {
        let lines = this.getCurrentLines();
        let text = lines.map(l => l.text).join("\n");
        this.insert("\n"+text, lines[0].start - 1);
      }
      else if (key.toLowerCase() == "'" && ctrlKey && !shiftKey && !altKey) {
        let lines = this.getCurrentLines();
        let endPlus = 0;
        let text = lines.map(
          l => l.text.startsWith("# ") ? (function(){ endPlus -= 2; return l.text.substring(2); })()
          : l.text.startsWith("#") ? (function(){ endPlus -= 2; return l.text.substring(1); })()
          : (function(){ endPlus += 2; return "# "+l.text; })()).join("\n");
        this.insert(text, lines[0].start, lines[lines.length - 1].end);
        this.setCursor(endPlus > 0 ? lines[0].start + 2 : lines[0].start, lines[lines.length - 1].end + endPlus);
      }
      else if ([
        "]",
        "}",
        ")",
        "\""
      ].find((t, i, obj) => key.toLowerCase() == t && t == this.value.substring(cursor.start, cursor.start + 1))) {
        e.preventDefault();

        switch (key) {
          case "]":
          case "}":
          case ")":
          case "\"":
            this.setCursor(cursor.start + 1);
            break;
        
          default:
            break;
        }
      }
      else if ([
        "[",
        "{",
        "(",
        "\""
      ].find(t => key.toLowerCase() == t)) {
        e.preventDefault();
        
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
      

      if (key.toLowerCase() == "z" && ctrlKey) {
        e.preventDefault();
        this.undo();
      }
      else if (key.toLowerCase() == "y" && ctrlKey) {
        e.preventDefault();
        this.redo();
      }
      else {
        setTimeout(() => {
          this.addStack({
            "text": this.value,
            "cursor": this.getCursor()
          });
        }, 0);
      }
    });

    this.stack = [
      {
        "text": this.value,
        "cursor": {
          "start": 0,
          "end": 0
        }
      }
    ];

    // this.stackIndex = 0;
  }

  textarea: HTMLTextAreaElement | HTMLInputElement;

  stack: {"cursor": CursorPosition, "text": string}[] = [];
  /**
   * @type {number}
   */
  stackIndex = 0;

  /**
   * 
   * @param {TextEditor["stack"][0]} data 
   */
  addStack(data) {
    if (this.stack[this.stackIndex] == null || this.stack[this.stackIndex].text !== this.value) {
      this.stack.splice(++this.stackIndex);
      this.stack.push(data);
    }
  }

  undo() {
    if (this.stackIndex > 0) {
      let {cursor, text} = this.stack[--this.stackIndex];
      this.value = text;
      this.setCursor(cursor.start, cursor.end)
      // --this.stackIndex;
    }
    this.emit("undo");
  }

  redo() {
    if (this.stackIndex < this.stack.length - 1) {
      let {cursor, text} = this.stack[++this.stackIndex];
      this.value = text;
      this.setCursor(cursor.start, cursor.end)
      // ++this.stackIndex;
    }
    this.emit("redo");
  }

  /**
   * @typedef { "finish" | "suggestion" | "dupeline" | "insert" | "undo" | "redo" } TextEditorEvents
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
   * @param start 
   * @param end 
   * @param direction 
   */
  setCursor(start: number, end = start, direction: "forward" | "backward" | "none" = "none") {
    this.textarea.setSelectionRange(start, end, direction)
  }

  getCurrentLines() {
    let cursor = this.getCursor();
    let charIndex = 0;
    let allLines = this.getAllLines();
    /**
     * List of line texts
     */
    let lines: {"text": string, "index": number, "start": number, "end": number}[] = [];
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
   * 
   * This is a 1-based index, so the first line is `1`.
   * @param {number} lineIndex 1-based index
   */
  getLine(lineIndex) {
    lineIndex--;
    let charIndex = 0;
    let lines = this.getAllLines();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      charIndex += line.length;
      if (i > 0) charIndex++;
      if (i == lineIndex) {
        return {
          "text": line,
          "start": charIndex - line.length,
          "end": charIndex,
          "index": i + 1
        }
      }
    }
  }

  /**
   * Get lines by indexes.
   * 
   * This is a 1-based index, so the first line is `1`.
   * @param {number[]} lineIndexes Array of 1-based indexes
   */
  getLines(lineIndexes) {
    lineIndexes = lineIndexes.map(i => --i);
    let charIndex = 0;
    let lines = this.getAllLines();
    /**
     * @type {{
          "text": string,
          "start": number,
          "end": number,
          "index": number
        }[]}
     */
    let returnLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      charIndex += line.length;
      if (i > 0) charIndex++;
      if (lineIndexes.includes(i)) {
        returnLines.push({
          "text": line,
          "start": charIndex - line.length,
          "end": charIndex,
          "index": i + 1
        });
      }
    }

    return returnLines;
  }

  /**
   * Get a line by index.
   * 
   * This is a 1-based index, so the first line is `1`.
   * @param {number} lineIndex 1-based index
   * @param {string} newText
   */
  setLine(lineIndex, newText) {
    let line = this.getLine(lineIndex);
    this.insert(newText, line.start, line.end);
  }

  getAllLines() {
    return this.value.split("\n");
  }

  suggestions: string[] = [];

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

      let word: Word = {
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
  
  allSuggestions(getAll = false) {
    if (getAll == true) return this.suggestions;
    
    let {
      word,
      start,
      end
    } = this.getWord();

    if (word == "") {
      return null;
    }

    let suggestions: string[] = [];

    for (let i = 0; i < this.suggestions.length; i++) {
      const suggestion = this.suggestions[i];
      if (suggestion.toLowerCase().startsWith(word.toLowerCase())) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
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
   * @param text Text to insert. If an array with 2 strings, surround selection with one on each side.
   * @param start Where to insert the text.
   * @param end If higher than `start`, it'll cut out some part of the textbox string.
   */
  insert(text: string | [string, string], start: number, end: number = start) {
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