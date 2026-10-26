/**
 * Test setup — happy-dom global window for React rendering,
 * frozen clock reset hook. Loaded via bunfig.toml preload.
 */
import { Window } from "happy-dom";

const window = new Window();
Object.defineProperty(globalThis, "window", { value: window, writable: true, configurable: true });
Object.defineProperty(globalThis, "document", {
  value: window.document,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "HTMLElement", {
  value: window.HTMLElement,
  writable: true,
  configurable: true,
});
