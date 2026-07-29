import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

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
