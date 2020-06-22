// 
// Easier JSDocs for on event.
// 
// 
// 

declare function on(event: string, callback: (...any) => void): void;
declare function emit(event: string, ...args: any[]): void;

declare function on(event: "play", callback: (song: Song) => void): void;
declare function emit(event: "play", song: Song): void;

declare function on(event: "pause", callback: () => void): void;
declare function emit(event: "pause"): void;

declare function on(event: "unpause", callback: () => void): void;
declare function emit(event: "unpause"): void;


export {
  on,
  emit
};