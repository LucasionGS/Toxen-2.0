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

    textarea.addEventListener("keydown", (e) => {
      const {
        key,
        ctrlKey,
        altKey,
        shiftKey
      } = e;

      if (key == "Tab" && typeof (this.currentSuggestion = this.suggest()) == "string") {
        e.preventDefault();
        e.stopPropagation();
        let word = this.getWord();
        this.insert(this.currentSuggestion, word.start, word.end);
        this.emit("finish", this.currentSuggestion);
        this.currentSuggestion = null;
        return;
      }

      this.currentSuggestion = this.suggest();
      console.log(this.currentSuggestion);
    });
  }

  /**
   * @typedef { "finish", "suggestion" } TextEditorEvents
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

    console.log(word, start, end);
    

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
   * @param {string} text Text to insert.
   * @param {number} start Where to insert the text.
   * @param {number} end If higher than `start`, it'll cut out some part of the textbox string.
   */
  insert(text, start, end = start) {
    let value = this.value;
    let part1 = value.substring(0, start);
    let part2 = value.substring(end, value.length);

    this.value = part1 + text + part2;
    this.textarea.setSelectionRange(start + text.length, start + text.length);
  }
}