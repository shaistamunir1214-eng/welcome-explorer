import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom should expose localStorage, but some runners need an explicit stub.
const store: Record<string, string> = {};
vi.stubGlobal(
  "localStorage",
  {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const key of Object.keys(store)) delete store[key]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage,
);

// jsdom has no AudioContext; the wizard's chime is best-effort and guarded,
// but stubbing keeps the console quiet.
vi.stubGlobal(
  "AudioContext",
  class {
    currentTime = 0;
    destination = {};
    createOscillator() {
      return {
        frequency: { value: 0 },
        type: "sine",
        connect: () => ({ connect: () => {} }),
        start: () => {},
        stop: () => {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => ({ connect: () => {} }),
      };
    }
  },
);

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0) as unknown as number) as typeof window.requestAnimationFrame;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom does not implement scrollIntoView.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
