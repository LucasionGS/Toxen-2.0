declare type CursorPosition = {
    "start": number;
    "end": number;
};
export declare class TextEditor {
    /**
     * @param {HTMLTextAreaElement | HTMLInputElement} textarea
     */
    constructor(textarea?: HTMLTextAreaElement | HTMLInputElement);
    textarea: HTMLTextAreaElement | HTMLInputElement;
    stack: {
        "cursor": CursorPosition;
        "text": string;
    }[];
    /**
     * @type {number}
     */
    stackIndex: number;
    /**
     *
     * @param {TextEditor["stack"][0]} data
     */
    addStack(data: any): void;
    undo(): void;
    redo(): void;
    /**
     * @typedef { "finish" | "suggestion" | "dupeline" | "insert" | "undo" | "redo" } TextEditorEvents
     * @type {{[eventName: string]: ((...any) => void)[]}}
     */
    _events: any[];
    /**
     * Listen for an event
     * @param {TextEditorEvents} event
     * @param {(...any) => void} cb
     */
    on(event: any, cb: any): this;
    /**
     * Emit an event
     * @param {TextEditorEvents} event
     * @param  {...any} args
     */
    emit(event: any, ...args: any[]): this;
    get isTextarea(): boolean;
    get isInput(): boolean;
    get value(): string;
    set value(text: string);
    getCursor(): {
        start: number;
        end: number;
    };
    /**
     * @param start
     * @param end
     * @param direction
     */
    setCursor(start: number, end?: number, direction?: "forward" | "backward" | "none"): void;
    getCurrentLines(): any[];
    /**
     * Get a line by index.
     *
     * This is a 1-based index, so the first line is `1`.
     * @param {number} lineIndex 1-based index
     */
    getLine(lineIndex: any): {
        text: string;
        start: number;
        end: number;
        index: number;
    };
    /**
     * Get lines by indexes.
     *
     * This is a 1-based index, so the first line is `1`.
     * @param {number[]} lineIndexes Array of 1-based indexes
     */
    getLines(lineIndexes: any): any[];
    /**
     * Get a line by index.
     *
     * This is a 1-based index, so the first line is `1`.
     * @param {number} lineIndex 1-based index
     * @param {string} newText
     */
    setLine(lineIndex: any, newText: any): void;
    getAllLines(): string[];
    /**
     * @type {string[]}
     */
    suggestions: any[];
    getWord(): {
        word: string;
        start: number;
        end: number;
    };
    suggest(): any;
    /**
     * If `string`, `TAB` action is cancelled and will autocomplete suggestion.
     *
     * If `null`, `TAB` does the default action.
     * @type {string}
     */
    currentSuggestion: any;
    /**
     * Insert a string into a spot
     * @param text Text to insert. If an array with 2 strings, surround selection with one on each side.
     * @param start Where to insert the text.
     * @param end If higher than `start`, it'll cut out some part of the textbox string.
     */
    insert(text: string | [string, string], start: number, end?: number): void;
}
export {};
