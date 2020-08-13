/**
 * Pure JavaScript Toxen-style custom elements.
 * @author Lucasion
 */
/**
 *
 */
export declare namespace EventEmitter {
    interface EventEmittable {
        event: string;
        cb: Function;
        /**
         * If usages is -1, it is infinite.
         */
        usages: number;
    }
    class EventHandler {
        /**
         * If this event has a preventable action, prevent it.
         */
        preventDefault(): void;
        prevented: boolean;
    }
    class EventEmitter {
        constructor();
        private _eventList;
        emit(event: string, ...args: any[]): EventHandler;
        /**
         * Listen for an event and execute a callback everytime it gets emitted
         */
        on(event: string, cb: (event: EventHandler, ...args: any[]) => void): this;
        off(event: string, cb: (event: EventHandler, ...args: any[]) => void): this;
        /**
         * Listen for an event and execute a callback the first time it gets emitted
         */
        once(event: string, cb: (event: EventHandler, ...args: any[]) => void): this;
    }
}
export declare namespace SelectBox {
    interface HTMLSelectBoxElement extends HTMLElement {
    }
    type SelectBoxType = "checkbox" | "radio";
    namespace SelectBoxGroup {
        interface SelectBoxOptions<ValueType> {
            text: string;
            value?: ValueType;
            defaultChecked?: boolean;
            /**
             * An event to execute when it is clicked on. This gets executed before the value physically changes. Can be prevented with `event.preventDefault()`.
             */
            click?: (this: SelectBox<ValueType>, event: EventEmitter.EventHandler, clickEvent: MouseEvent) => void;
            /**
             * If this is defined as a function, `this` will be the current SelectBox element, and any modifications made to `this` will be brought over to the actual object.
             *
             * This is executed after all of the default settings have been applied.
             */
            modify?: (this: SelectBox<ValueType>) => void;
            subText?: string;
        }
    }
    interface SelectBox<ValueType> extends EventEmitter.EventEmitter {
        on(event: "click", listener: (event: EventEmitter.EventHandler, clickEvent: MouseEvent) => void): this;
        on(event: "change", listener: (event: EventEmitter.EventHandler, clickEvent: MouseEvent) => void): this;
        emit(event: "click", clickEvent: MouseEvent): EventEmitter.EventHandler;
        emit(event: "change", clickEvent: MouseEvent): EventEmitter.EventHandler;
    }
    interface SelectBoxGroup<ValueType> extends EventEmitter.EventEmitter {
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
        emit(event: "change", selectBox: SelectBox<ValueType>): EventEmitter.EventHandler;
        emit(event: "click", selectBox: SelectBox<ValueType>): EventEmitter.EventHandler;
    }
    class SelectBoxGroup<ValueType> extends EventEmitter.EventEmitter {
        constructor(selectBoxes: SelectBox<ValueType>[]);
        constructor(selectBoxes: SelectBoxGroup.SelectBoxOptions<ValueType>[]);
        constructor(selectBoxes: SelectBox<ValueType>[], type: SelectBox.SelectBoxType);
        constructor(selectBoxes: SelectBoxGroup.SelectBoxOptions<ValueType>[], type: SelectBox.SelectBoxType);
        value: ValueType;
        boxes: SelectBox<ValueType>[];
        /**
         * Appends all boxes to an element. If you add new elements to this group, run this command again.
         */
        appendTo(element: HTMLElement | string): void;
        /**
         * Returns an array of the checked boxes.
         */
        getChecked(): SelectBox<ValueType>[];
        /**
         * Perform an action on each SelectBox in this group.
         */
        forEach(callbackfn: (value: SelectBox<ValueType>, index: number, array: SelectBox<ValueType>[]) => void): void;
    }
    class SelectBox<ValueType> extends EventEmitter.EventEmitter {
        constructor(text: string, value: ValueType);
        constructor(text: string, value?: ValueType, defaultChecked?: boolean);
        constructor(text: string, value?: ValueType, defaultChecked?: boolean, type?: SelectBox.SelectBoxType);
        click(event: MouseEvent): void;
        set size(v: number);
        get size(): number;
        private _size;
        /**
         * Applies a counter to this checkbox.
         * @param defaultValue The default value for the counter. `0` is chosen if not specified
         * @param maxValue The maximum value for the counter. None if not specified
         * @param minValue The minimum value for the counter. None if not specified
         */
        setCounter(defaultValue?: number, maxValue?: number, minValue?: number): void;
        counterInput: HTMLInputElement;
        counterActive: boolean;
        get text(): string;
        set text(v: string);
        /**
         * CSS Color value the button will turn to if it's ticked/selected
         */
        get selectcolor(): string;
        set selectcolor(v: string);
        readonly type: SelectBoxType;
        parent: SelectBoxGroup<ValueType>;
        subGroup: SelectBoxGroup<unknown>;
        value: ValueType;
        main: HTMLSelectBoxElement;
        divCheckBox: HTMLDivElement;
        /**
         * The element a sub group would be inserted into.
         */
        subGroupElement: HTMLDivElement;
        textParagraph: HTMLParagraphElement;
        get checked(): boolean;
        set checked(v: boolean);
        get disabled(): boolean;
        set disabled(v: boolean);
        appendTo(element: HTMLElement | string): void;
        setSubGroup<SubGroupValueType>(selectBoxGroup: SelectBoxGroup<SubGroupValueType> | SelectBoxGroup.SelectBoxOptions<SubGroupValueType>[], type?: SelectBoxType): void;
        /**
         * Whether or not pressing this parent element should enable and disable all sub elements. (Only applies for type `checkbox`)
         */
        checkSubGroup: boolean;
    }
}
export declare namespace InteractiveProgressBar {
    interface InteractiveProgressBar {
        on(event: "click", listener: (event: EventEmitter.EventHandler, value: number) => void): this;
        on(event: "drag", listener: (event: EventEmitter.EventHandler, value: number) => void): this;
        on(event: "release", listener: (event: EventEmitter.EventHandler, value: number) => void): this;
        emit(event: "click", value: number): EventEmitter.EventHandler;
        emit(event: "drag", value: number): EventEmitter.EventHandler;
        emit(event: "release", value: number): EventEmitter.EventHandler;
    }
    namespace InteractiveProgressBar {
        interface HTMLInteractiveProgressBar extends HTMLDivElement {
            object: InteractiveProgressBar;
            thumb: HTMLDivElement;
        }
    }
    class InteractiveProgressBar extends EventEmitter.EventEmitter {
        constructor(width?: string | number, height?: string | number);
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
        clicking: boolean;
        /**
         * RGB value of the slider track color.
         */
        color: {
            red: number;
            green: number;
            blue: number;
        };
        private _vertical;
        private _min;
        private _max;
        private _value;
        /**
         * Whether or not the slider is shown vertically.
         */
        get vertical(): boolean;
        set vertical(_value: boolean);
        /**
         * The minimum value for the slider.
         */
        get min(): number;
        set min(_value: number);
        /**
         * The maximum value for the slider.
         */
        get max(): number;
        set max(_value: number);
        /**
         * The current value for the slider.
         */
        get value(): number;
        set value(_value: number);
        /**
         * The percentage value for the slider.
         * How many percent (in `xx[.xx]` format) the value is to reach the maximum value.
         */
        get percent(): number;
        updateRange(): void;
    }
}
