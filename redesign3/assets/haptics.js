import { WebHaptics } from "https://cdn.jsdelivr.net/npm/web-haptics@0.0.6/+esm";

const engine = new WebHaptics({ debug: false, showSwitch: false });

const trigger = (input, options) => {
  try {
    const result = engine.trigger(input, options);
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {}
};

window.FGHaptics = Object.freeze({
  trigger,
  cancel: () => {
    try { engine.cancel(); } catch {}
  },
});
