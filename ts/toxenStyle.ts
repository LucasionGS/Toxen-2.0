/**
 * Pure JavaScript Toxen-style custom elements.
 * @author Lucasion
 */

/**
 * 
 */
export namespace EventEmitter {
  export interface EventEmittable {
    event: string,
    cb: Function,
    /**
     * If usages is -1, it is infinite.
     */
    usages: number
  }
  
  export class EventHandler {
    /**
     * If this event has a preventable action, prevent it.
     */
    public preventDefault() {
      this.prevented = true;
    }
  
    public prevented = false;
  }
  
  export class EventEmitter {
    constructor() { }
  
    private _eventList: EventEmittable[] = [];
  
    // Emitting
    emit(event: string, ...args: any[]) {
      let eventHandler = new EventHandler();
      this._eventList.forEach((e, i) => {
        if (e.event === event) e.cb.call(this, eventHandler, ...args);
        if (e.usages > 0) e.usages--;
        if (e.usages == 0) this._eventList.splice(i, 1);
      });
      return eventHandler;
    }
  
    // Activators
    /**
     * Listen for an event and execute a callback everytime it gets emitted
     */
    on(event: string, cb: (event: EventHandler, ...args: any[]) => void) {
      this._eventList.push({
        event,
        cb,
        "usages": -1
      });
      return this;
    }
    // Figure out a way to prevent eventhandling to be simplier
    off(event: string, cb: (event: EventHandler, ...args: any[]) => void) {
      let indx = this._eventList.findIndex(e => {
        if (e.event === event && e.cb == cb) {
          return true;
        }
        return false;
      });
      if (indx > -1) this._eventList.splice(indx, 1);
      return this;
    }
    /**
     * Listen for an event and execute a callback the first time it gets emitted
     */
    once(event: string, cb: (event: EventHandler, ...args: any[]) => void) {
      this._eventList.push({
        event,
        cb,
        "usages": 1
      });
      return this;
    }
  }
}

export namespace SelectBox {
  export interface HTMLSelectBoxElement extends HTMLElement { }
  export type SelectBoxType = "checkbox" | "radio";
  
  export namespace SelectBoxGroup {
    export interface SelectBoxOptions<ValueType> {
      text: string,
      value?: ValueType,
      defaultChecked?: boolean,
      /**
       * An event to execute when it is clicked on. This gets executed before the value physically changes. Can be prevented with `event.preventDefault()`.
       */
      click?: (this: SelectBox<ValueType>, event: EventEmitter.EventHandler, clickEvent: MouseEvent) => void,
      /**
       * If this is defined as a function, `this` will be the current SelectBox element, and any modifications made to `this` will be brought over to the actual object.
       * 
       * This is executed after all of the default settings have been applied.
       */
      modify?: (this: SelectBox<ValueType>) => void,
      subText?: string
    }
  }
  
  export interface SelectBox<ValueType> extends EventEmitter.EventEmitter {
    // On
    on(event: "click", listener: (event: EventEmitter.EventHandler, clickEvent: MouseEvent) => void): this;
    on(event: "change", listener: (event: EventEmitter.EventHandler, clickEvent: MouseEvent) => void): this;
    // Emit
    emit(event: "click", clickEvent: MouseEvent): EventEmitter.EventHandler;
    emit(event: "change", clickEvent: MouseEvent): EventEmitter.EventHandler;
  }
  
  export interface SelectBoxGroup<ValueType> extends EventEmitter.EventEmitter {
    // On
    /**
     * Executes right after the value has changed on an item in this group.
     */
    on(event: "change", listener: (event: EventEmitter.EventHandler, selectBox: SelectBox<ValueType>) => void): this;
    /**
     * Executes right before the value has changed on an item in this group.
     * 
     * Running `event.preventDefault()` will prevent the value from changing.
     */
    on(event: "click", listener: (event: EventEmitter.EventHandler, selectBox: SelectBox<ValueType>) => void): this;
    // Emit
    emit(event: "change", selectBox: SelectBox<ValueType>): EventEmitter.EventHandler;
    emit(event: "click", selectBox: SelectBox<ValueType>): EventEmitter.EventHandler;
  }
  
  export class SelectBoxGroup<ValueType> extends EventEmitter.EventEmitter {
    constructor(selectBoxes: SelectBox<ValueType>[]);
    constructor(selectBoxes: SelectBoxGroup.SelectBoxOptions<ValueType>[]);
    constructor(selectBoxes: SelectBox<ValueType>[], type: SelectBox.SelectBoxType);
    constructor(selectBoxes: SelectBoxGroup.SelectBoxOptions<ValueType>[], type: SelectBox.SelectBoxType);
    constructor(selectBoxes: (SelectBoxGroup.SelectBoxOptions<ValueType> | SelectBox<ValueType>)[], type: SelectBox.SelectBoxType = "checkbox") {
      super();
      this.boxes.push(...selectBoxes.map(box => {
        if(box instanceof SelectBox) {
          box.parent = this;
          return box;
        }
        else {
          let sb = new SelectBox<ValueType>(box.text, box.value, box.defaultChecked, type);
          if (typeof box.click == "function") sb.on("click", box.click);
          if (typeof box.subText == "string") {
            let sup = document.createElement("sup");
            sup.innerHTML = box.subText;
            sb.main.appendChild((function() {
              let div = document.createElement("div");
              div.style.float = "left";
              div.appendChild(sup);
              return div;
            })());
          }
          sb.parent = this;
  
          // Must be last
          if (typeof box.modify == "function") box.modify.call(sb);
  
          // Return the map element.
          return sb;
        }
      }));
    }
    
    value: ValueType;
    boxes: SelectBox<ValueType>[] = []
  
    /**
     * Appends all boxes to an element. If you add new elements to this group, run this command again.
     */
    appendTo(element: HTMLElement | string) {
      if (typeof element == "string") element = document.querySelector<HTMLElement>(element);
      this.boxes.forEach(box => {
        box.main.title = box.text;
        box.divCheckBox.title = box.text;
        (element as HTMLElement).appendChild(box.main);
      });
    }
    
    /**
     * Returns an array of the checked boxes.
     */
    getChecked(): SelectBox<ValueType>[] {
      return this.boxes.filter(box => box.checked);
    }
  
    /**
     * Perform an action on each SelectBox in this group.
     */
    forEach(callbackfn: (value: SelectBox<ValueType>, index: number, array: SelectBox<ValueType>[]) => void): void {
      this.boxes.forEach(callbackfn);
    }
  }
  
  export class SelectBox<ValueType> extends EventEmitter.EventEmitter {
    // static createSelectBoxes
  
    constructor(text: string, value: ValueType);
    constructor(text: string, value?: ValueType, defaultChecked?: boolean);
    constructor(text: string, value?: ValueType, defaultChecked?: boolean, type?: SelectBox.SelectBoxType);
    constructor(text: string, value?: ValueType, defaultChecked: boolean = false, type: SelectBox.SelectBoxType = "checkbox") {
      super();
      this.main.classList.add("selectbox");
      this.divCheckBox.classList.add("checkbox");
      this.counterInput.classList.add("counterbox");
      this.counterInput.hidden = true;
      if (typeof defaultChecked == "boolean") this.checked = defaultChecked;
      this.divCheckBox.setAttribute("type", type);
      this.text = text;
      this.main.appendChild(this.divCheckBox);
      this.main.appendChild(this.textParagraph);
      this.main.appendChild(this.counterInput);
      this.main.appendChild(this.subGroupElement);
      this.textParagraph.classList.add("textbox");
      this.counterInput.type = "number";
      this.value = value;
      this.type = type;
  
      this.size = 32;
  
      // this.selectcolor = "rgb(0, 209, 0)";
      this.selectcolor = "inherit";
  
      this.divCheckBox.addEventListener("click", event => {
        this.click(event);
      });
      this.textParagraph.addEventListener("click", event => {
        this.click(event);
      });
    }
  
    click(event: MouseEvent) {
      event.stopPropagation();
      let isInput = (event.target as HTMLElement).tagName == "INPUT";
      if (!this.disabled && !(this.parent && this.parent.emit("click", this).prevented) && !this.emit("click", event).prevented) {
        if (this.type === "radio") {
          if (this.parent) {
            this.parent.boxes.forEach(box => box.checked = false);
            this.parent.value = this.value;
          }
          this.checked = true;
        }
        else {
          if (!isInput) {
            this.checked = !this.checked;
            if (this.checkSubGroup && this.subGroup) {
              this.subGroup.forEach(s => {
                if (s.type == "checkbox") {
                  s.checked = this.checked;
                }
              });
            }
          }
        }
        if (this.parent) this.parent.emit("change", this);
        this.emit("change", event);
      }
    }
  
    set size(v) {
      let px = v + "px";
      // this.main.style.height = px;
      this.divCheckBox.style.width = `calc(${px} - 16px)`;
      this.divCheckBox.style.height = `calc(${px} - 16px)`;
      this.divCheckBox.style.boxSizing = "border-box";
      this.divCheckBox.style.margin = "8px";
      
      this.main.style.textOverflow = "ellipsis";
      // this.main.style.whiteSpace = "nowrap";
      // this.main.style.wordWrap = "none"
  
      // this.textParagraph.style.height = px;
      this.textParagraph.style.lineHeight = px;
      this.textParagraph.style.fontSize = `calc(${px} - 16px)`;
      this.textParagraph.style.padding = "0";
      this.textParagraph.style.margin = "0";
      if (!this.counterActive) this.textParagraph.style.width = `calc(100% - ${px} - 16px)`; // If no counter
      else this.textParagraph.style.width = `calc(100% - ${px} - 32px)`; // If counter
      
      // `counterInput` only shows if `setCounter` has been activated.
      // this.counterInput.style.height = px;
      this.counterInput.style.lineHeight = px;
      this.counterInput.style.fontSize = `calc(${px} - 16px)`;
      this.counterInput.style.padding = "0";
      this.counterInput.style.margin = "0";
      this.counterInput.style.width = `28px`;
      this._size = v;
    }
    get size() {
      return this._size;
    }
    private _size: number = 40;
  
    /**
     * Applies a counter to this checkbox.
     * @param defaultValue The default value for the counter. `0` is chosen if not specified
     * @param maxValue The maximum value for the counter. None if not specified
     * @param minValue The minimum value for the counter. None if not specified
     */
    setCounter(defaultValue = 0, maxValue?: number, minValue?: number) {
      if (!this.counterActive) {
        this.counterActive = true;
        this.counterInput.hidden = false;
      }
      this.counterInput.value = defaultValue.toString();
      if (typeof maxValue == "number") this.counterInput.max = maxValue.toString();
      if (typeof minValue == "number") this.counterInput.min = minValue.toString();
      this.size = this.size; // Just to refresh
    }
  
    counterInput = document.createElement("input");
    counterActive = false;
  
    get text() {
      return this.textParagraph.innerHTML;
    }
    set text(v) {
      this.textParagraph.innerHTML = v;
    }
  
    /**
     * CSS Color value the button will turn to if it's ticked/selected
     */
    get selectcolor() {
      return this.divCheckBox.style.color;
    };
    set selectcolor(v) {
      this.divCheckBox.style.color = v;
    };
  
    readonly type: SelectBoxType;
  
    parent: SelectBoxGroup<ValueType>;
    subGroup: SelectBoxGroup<unknown>;
    value: ValueType;
    main: HTMLSelectBoxElement = document.createElement("selectbox") as HTMLSelectBoxElement;
    divCheckBox: HTMLDivElement = document.createElement("div");
    /**
     * The element a sub group would be inserted into.
     */
    subGroupElement: HTMLDivElement = document.createElement("div");
    textParagraph = document.createElement("p");
    get checked() {
      return this.divCheckBox.hasAttribute("checked");
    }
    set checked(v) {
      this.divCheckBox.toggleAttribute("checked", v);
      this.counterInput.disabled = v;
      if (v == false) this.counterInput.disabled = true;
      if (v == true && !this.disabled) this.counterInput.disabled = false;
      if (this.subGroup) this.subGroupElement.hidden = this.type == "radio" ? !v : false;
    }
    get disabled() {
      return this.main.hasAttribute("disabled");
    }
    set disabled(v) {
      this.main.toggleAttribute("disabled", v);
      this.counterInput.disabled = v;
      if (v == false && !this.checked) this.counterInput.disabled = true;
      if (this.subGroup) this.subGroup.forEach(s => s.disabled = this.disabled);
    }
  
    appendTo(element: HTMLElement | string) {
      if (typeof element == "string") element = document.querySelector<HTMLElement>(element);
      element.appendChild(this.main);
  
      // this.checked = this.checked;
      // this.disabled = this.disabled;
    }
  
    setSubGroup<SubGroupValueType>(selectBoxGroup: SelectBoxGroup<SubGroupValueType> | SelectBoxGroup.SelectBoxOptions<SubGroupValueType>[], type?: SelectBoxType) {
      if (selectBoxGroup instanceof SelectBoxGroup) this.subGroup = selectBoxGroup;
      else this.subGroup = new SelectBoxGroup(selectBoxGroup, type ? type : "checkbox");
  
      this.subGroupElement.style.marginLeft = "5%";
      this.subGroupElement.style.width = "95%";
      this.subGroupElement.hidden = this.type == "radio" ? !this.checked : false;
      this.subGroup.appendTo(this.subGroupElement);
    }
  
    /**
     * Whether or not pressing this parent element should enable and disable all sub elements. (Only applies for type `checkbox`)
     */
    checkSubGroup = false;
  }
}

export namespace InteractiveProgressBar {
  export interface InteractiveProgressBar {
    on(event: "click", listener: (event: EventEmitter.EventHandler, value: number) => void): this;
    on(event: "drag", listener: (event: EventEmitter.EventHandler, value: number) => void): this;
    on(event: "release", listener: (event: EventEmitter.EventHandler, value: number) => void): this;
    on(event: "change", listener: (event: EventEmitter.EventHandler, value: number) => void): this;
    
    emit(event: "click", value: number): EventEmitter.EventHandler;
    emit(event: "drag", value: number): EventEmitter.EventHandler;
    emit(event: "release", value: number): EventEmitter.EventHandler;
    emit(event: "change", value: number): EventEmitter.EventHandler;
  }
  export namespace InteractiveProgressBar {
    export interface HTMLInteractiveProgressBar extends HTMLDivElement {
      object: InteractiveProgressBar,
      thumb: HTMLDivElement
    }
  }
  export class InteractiveProgressBar extends EventEmitter.EventEmitter {
    constructor(width: string | number = "100%", height: string | number = 20) {
      super();
      this.element = document.createElement("div") as InteractiveProgressBar.HTMLInteractiveProgressBar;
      
      this.element.object = this;
      if (typeof width == "number") width = width + "px";
      if (typeof height == "number") height = height + "px";
      this.element.style.display = "block";
      this.element.style.margin = "auto";
      this.element.style.width = width;
      this.element.style.height = height;
      this.element.style.borderStyle = "solid";
      this.element.style.borderWidth = "1px";
      this.element.style.boxSizing = "border-box";
      this.element.style.borderRadius = "20px";
      
      this.thumb = document.createElement("div");
      this.thumb.style.borderRadius = "50%"
      this.thumb.style.borderStyle = "solid";
      this.thumb.style.borderWidth = "1px";
      this.thumb.style.backgroundColor = "white";
      // this.thumb.style.boxSizing = "border-box";

      setTimeout(() => {
        this.vertical = this.vertical;
      }, 1000);
      this.element.thumb = this.thumb;

      this.element.appendChild(this.thumb);

      window.addEventListener("mouseup", (e) => {
        if (e.button == 0 && this.clicking == true) {
          this.clicking = false;
          this.emit("release", this.value);
          this.emit("change", this.value);
        }
      });
      this.element.addEventListener("click", (e) => {
        const p: InteractiveProgressBar = this;
        let box = p.element.getBoundingClientRect();
        let percent = this._vertical ? (box.bottom - e.clientY) / box.height : (e.clientX - box.left) / box.width;
        percent = Math.min(Math.max(0, percent), 1);
        this.value = this.max * percent;
        this.emit("click", this.value);
        this.emit("change", this.value);
      });
      window.addEventListener("mousemove", (e) => {
        const p: InteractiveProgressBar = this;
        if (p.clicking === true) {
          let box = p.element.getBoundingClientRect();
          let percent = this._vertical ? (box.bottom - e.clientY) / box.height : (e.clientX - box.left) / box.width;
          percent = Math.min(Math.max(0, percent), 1);
          this.value = this.max * percent;
          this.emit("drag", this.value);
          this.emit("change", this.value);
        }
      });
      this.element.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (e.button == 0) {
          this.clicking = true;
        }
      });
      this.thumb.addEventListener("mouseover", (e) => {
        this.thumb.title = this.mouseover(this.value);
      });
    }

    mouseover: ((value: number) => string) = value => value + "";

    /**
     * The element that contains the slider.
     */
    element: InteractiveProgressBar.HTMLInteractiveProgressBar;
    /**
     * The thumb circle element that is used to indicate where the value is in the slider.
     */
    thumb: HTMLDivElement;
    /**
     * Whether or not the slider is currently being clicked on.
     */
    clicking = false;
    /**
     * RGB value of the slider track color.
     */
    color: {
      red: number,
      green: number,
      blue: number
    } = {
      red: 255,
      green: 255,
      blue: 255
    }
    private _vertical = false;
    private _min: number = 0;
    private _max: number = 100;
    private _value: number = 0;
    /**
     * Whether or not the slider is shown vertically.
     */
    get vertical() {
      return this._vertical;
    }
    set vertical(_value) {
      this._vertical = _value;
      let elm = this.element.getBoundingClientRect();
      if (!_value) {
        // this.thumb.style.transform = `translate(-50%, 0)`;
        // this.thumb.style.width = `calc(${elm.height}px - 1px)`;
        // this.thumb.style.height = `calc(${elm.height}px - 1px)`;
        this.thumb.style.transform = `translate(-50%, calc(-${elm.height}px * 0.25))`;
        this.thumb.style.width = `calc(${elm.height}px * 1.3)`;
        this.thumb.style.height = `calc(${elm.height}px * 1.3)`;
      }
      else {
        // this.thumb.style.transform = `translate(0, -50%)`;
        // this.thumb.style.width = `calc(${elm.width}px - 1px)`;
        // this.thumb.style.height = `calc(${elm.width}px - 1px)`;
        this.thumb.style.transform = `translate(calc(-${elm.width}px * 0.25), -50%)`;
        this.thumb.style.width = `calc(${elm.width}px * 1.3)`;
        this.thumb.style.height = `calc(${elm.width}px * 1.3)`;
      }
      this.updateRange();
    }
    /**
     * The minimum value for the slider.
     */
    get min() {
      return this._min;
    }
    set min(_value) {
      this._min = _value;
      this.updateRange();
    }
    /**
     * The maximum value for the slider.
     */
    get max() {
      return this._max;
    }
    set max(_value) {
      this._max = _value;
      this.updateRange();
    }
    /**
     * The current value for the slider.
     */
    get value() {
      return this._value;
    }
    set value(_value) {
      this._value = _value;
      this.updateRange();
    }

    /**
     * The percentage value for the slider.  
     * How many percent (in `xx[.xx]` format) the value is to reach the maximum value.
     */
    get percent() {
      return this.value / this.max * 100;
    }

    updateRange() {
      let pos = this.element.getBoundingClientRect();
      let percent = this.value / this.max * 100;
      var lGradient = `linear-gradient(90deg, rgba(${this.color.red},${this.color.green},${this.color.blue},0.7) 0%, rgba(${this.color.red},${this.color.green},${this.color.blue},1) ${Math.round(percent)}%, rgba(255,255,255,0) ${Math.round(percent)}%)`;
      if (this._vertical) {
        this.thumb.style.marginLeft = "";
        this.thumb.style.marginTop = (pos.height - (pos.height * (this.value / this.max))) + "px";
        lGradient = `linear-gradient(0deg, rgba(${this.color.red},${this.color.green},${this.color.blue},0.7) 0%, rgba(${this.color.red},${this.color.green},${this.color.blue},1) ${Math.round(percent)}%, rgba(255,255,255,0) ${Math.round(percent)}%)`;
      }
      else {
        this.thumb.style.marginLeft = (pos.width * (this.value / this.max)) + "px";
        this.thumb.style.marginTop = "";
      }
      this.element.style.background = lGradient;
    }
  }
}