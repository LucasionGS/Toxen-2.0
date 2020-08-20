"use strict";
/**
 * Pure JavaScript Toxen-style custom elements.
 * @author Lucasion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractiveProgressBar = exports.SelectBox = exports.EventEmitter = void 0;
/**
 *
 */
var EventEmitter;
(function (EventEmitter_1) {
    class EventHandler {
        constructor() {
            this.prevented = false;
        }
        /**
         * If this event has a preventable action, prevent it.
         */
        preventDefault() {
            this.prevented = true;
        }
    }
    EventEmitter_1.EventHandler = EventHandler;
    class EventEmitter {
        constructor() {
            this._eventList = [];
        }
        // Emitting
        emit(event, ...args) {
            let eventHandler = new EventHandler();
            this._eventList.forEach((e, i) => {
                if (e.event === event)
                    e.cb.call(this, eventHandler, ...args);
                if (e.usages > 0)
                    e.usages--;
                if (e.usages == 0)
                    this._eventList.splice(i, 1);
            });
            return eventHandler;
        }
        // Activators
        /**
         * Listen for an event and execute a callback everytime it gets emitted
         */
        on(event, cb) {
            this._eventList.push({
                event,
                cb,
                "usages": -1
            });
            return this;
        }
        // Figure out a way to prevent eventhandling to be simplier
        off(event, cb) {
            let indx = this._eventList.findIndex(e => {
                if (e.event === event && e.cb == cb) {
                    return true;
                }
                return false;
            });
            if (indx > -1)
                this._eventList.splice(indx, 1);
            return this;
        }
        /**
         * Listen for an event and execute a callback the first time it gets emitted
         */
        once(event, cb) {
            this._eventList.push({
                event,
                cb,
                "usages": 1
            });
            return this;
        }
    }
    EventEmitter_1.EventEmitter = EventEmitter;
})(EventEmitter = exports.EventEmitter || (exports.EventEmitter = {}));
var SelectBox;
(function (SelectBox_1) {
    class SelectBoxGroup extends EventEmitter.EventEmitter {
        constructor(selectBoxes, type = "checkbox") {
            super();
            this.boxes = [];
            this.boxes.push(...selectBoxes.map(box => {
                if (box instanceof SelectBox) {
                    box.parent = this;
                    return box;
                }
                else {
                    let sb = new SelectBox(box.text, box.value, box.defaultChecked, type);
                    if (typeof box.click == "function")
                        sb.on("click", box.click);
                    if (typeof box.subText == "string") {
                        let sup = document.createElement("sup");
                        sup.innerHTML = box.subText;
                        sb.main.appendChild((function () {
                            let div = document.createElement("div");
                            div.style.float = "left";
                            div.appendChild(sup);
                            return div;
                        })());
                    }
                    sb.parent = this;
                    // Must be last
                    if (typeof box.modify == "function")
                        box.modify.call(sb);
                    // Return the map element.
                    return sb;
                }
            }));
        }
        /**
         * Appends all boxes to an element. If you add new elements to this group, run this command again.
         */
        appendTo(element) {
            if (typeof element == "string")
                element = document.querySelector(element);
            this.boxes.forEach(box => {
                box.main.title = box.text;
                box.divCheckBox.title = box.text;
                element.appendChild(box.main);
            });
        }
        /**
         * Returns an array of the checked boxes.
         */
        getChecked() {
            return this.boxes.filter(box => box.checked);
        }
        /**
         * Perform an action on each SelectBox in this group.
         */
        forEach(callbackfn) {
            this.boxes.forEach(callbackfn);
        }
    }
    SelectBox_1.SelectBoxGroup = SelectBoxGroup;
    class SelectBox extends EventEmitter.EventEmitter {
        constructor(text, value, defaultChecked = false, type = "checkbox") {
            super();
            this._size = 40;
            this.counterInput = document.createElement("input");
            this.counterActive = false;
            this.main = document.createElement("selectbox");
            this.divCheckBox = document.createElement("div");
            /**
             * The element a sub group would be inserted into.
             */
            this.subGroupElement = document.createElement("div");
            this.textParagraph = document.createElement("p");
            /**
             * Whether or not pressing this parent element should enable and disable all sub elements. (Only applies for type `checkbox`)
             */
            this.checkSubGroup = false;
            this.main.classList.add("selectbox");
            this.divCheckBox.classList.add("checkbox");
            this.counterInput.classList.add("counterbox");
            this.counterInput.hidden = true;
            if (typeof defaultChecked == "boolean")
                this.checked = defaultChecked;
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
        click(event) {
            event.stopPropagation();
            let isInput = event.target.tagName == "INPUT";
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
                if (this.parent)
                    this.parent.emit("change", this);
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
            if (!this.counterActive)
                this.textParagraph.style.width = `calc(100% - ${px} - 16px)`; // If no counter
            else
                this.textParagraph.style.width = `calc(100% - ${px} - 32px)`; // If counter
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
        /**
         * Applies a counter to this checkbox.
         * @param defaultValue The default value for the counter. `0` is chosen if not specified
         * @param maxValue The maximum value for the counter. None if not specified
         * @param minValue The minimum value for the counter. None if not specified
         */
        setCounter(defaultValue = 0, maxValue, minValue) {
            if (!this.counterActive) {
                this.counterActive = true;
                this.counterInput.hidden = false;
            }
            this.counterInput.value = defaultValue.toString();
            if (typeof maxValue == "number")
                this.counterInput.max = maxValue.toString();
            if (typeof minValue == "number")
                this.counterInput.min = minValue.toString();
            this.size = this.size; // Just to refresh
        }
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
        }
        ;
        set selectcolor(v) {
            this.divCheckBox.style.color = v;
        }
        ;
        get checked() {
            return this.divCheckBox.hasAttribute("checked");
        }
        set checked(v) {
            this.divCheckBox.toggleAttribute("checked", v);
            this.counterInput.disabled = v;
            if (v == false)
                this.counterInput.disabled = true;
            if (v == true && !this.disabled)
                this.counterInput.disabled = false;
            if (this.subGroup)
                this.subGroupElement.hidden = this.type == "radio" ? !v : false;
        }
        get disabled() {
            return this.main.hasAttribute("disabled");
        }
        set disabled(v) {
            this.main.toggleAttribute("disabled", v);
            this.counterInput.disabled = v;
            if (v == false && !this.checked)
                this.counterInput.disabled = true;
            if (this.subGroup)
                this.subGroup.forEach(s => s.disabled = this.disabled);
        }
        appendTo(element) {
            if (typeof element == "string")
                element = document.querySelector(element);
            element.appendChild(this.main);
            // this.checked = this.checked;
            // this.disabled = this.disabled;
        }
        setSubGroup(selectBoxGroup, type) {
            if (selectBoxGroup instanceof SelectBoxGroup)
                this.subGroup = selectBoxGroup;
            else
                this.subGroup = new SelectBoxGroup(selectBoxGroup, type ? type : "checkbox");
            this.subGroupElement.style.marginLeft = "5%";
            this.subGroupElement.style.width = "95%";
            this.subGroupElement.hidden = this.type == "radio" ? !this.checked : false;
            this.subGroup.appendTo(this.subGroupElement);
        }
    }
    SelectBox_1.SelectBox = SelectBox;
})(SelectBox = exports.SelectBox || (exports.SelectBox = {}));
var InteractiveProgressBar;
(function (InteractiveProgressBar_1) {
    class InteractiveProgressBar extends EventEmitter.EventEmitter {
        constructor(width = "100%", height = 20) {
            super();
            this.mouseover = value => value + "";
            /**
             * Whether or not the slider is currently being clicked on.
             */
            this.clicking = false;
            /**
             * RGB value of the slider track color.
             */
            this.color = {
                red: 255,
                green: 255,
                blue: 255
            };
            this._vertical = false;
            this._min = 0;
            this._max = 100;
            this._value = 0;
            this.element = document.createElement("div");
            this.element.object = this;
            if (typeof width == "number")
                width = width + "px";
            if (typeof height == "number")
                height = height + "px";
            this.element.style.display = "block";
            this.element.style.margin = "auto";
            this.element.style.width = width;
            this.element.style.height = height;
            this.element.style.borderStyle = "solid";
            this.element.style.borderWidth = "1px";
            this.element.style.boxSizing = "border-box";
            this.element.style.borderRadius = "20px";
            this.thumb = document.createElement("div");
            this.thumb.style.borderRadius = "50%";
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
                const p = this;
                let box = p.element.getBoundingClientRect();
                let percent = this._vertical ? (box.bottom - e.clientY) / box.height : (e.clientX - box.left) / box.width;
                percent = Math.min(Math.max(0, percent), 1);
                this.value = this.max * percent;
                this.emit("click", this.value);
                this.emit("change", this.value);
            });
            window.addEventListener("mousemove", (e) => {
                const p = this;
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
    InteractiveProgressBar_1.InteractiveProgressBar = InteractiveProgressBar;
})(InteractiveProgressBar = exports.InteractiveProgressBar || (exports.InteractiveProgressBar = {}));
