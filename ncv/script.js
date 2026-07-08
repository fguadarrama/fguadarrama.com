const copyButtons = document.querySelectorAll("[data-copy]");

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

copyButtons.forEach((button) => {
  const original = button.textContent;
  let timeout;

  button.addEventListener("click", async () => {
    clearTimeout(timeout);
    try {
      await copyText(button.dataset.copy || "");
      button.textContent = "copied";
    } catch {
      button.textContent = "copy failed";
    }

    timeout = setTimeout(() => {
      button.textContent = original;
    }, 1400);
  });
});

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".code-panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.panel;

    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      const active = panel.id === `panel-${target}`;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  });
});

const status = document.querySelector(".status");
const statusLabel = document.querySelector(".status-label");
const states = ["ready", "quiet", "fast"];
let stateIndex = 0;

if (status && statusLabel) {
  setInterval(() => {
    stateIndex = (stateIndex + 1) % states.length;
    const busy = stateIndex === 1;
    status.classList.toggle("is-busy", busy);
    statusLabel.textContent = states[stateIndex];
  }, 2800);
}
