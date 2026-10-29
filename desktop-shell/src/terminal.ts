import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

type TerminalInfo = {
  shell: string;
  apiUrl: string | null;
  mcpUrl: string | null;
};

const status = document.querySelector("#status") as HTMLParagraphElement;
const mount = document.querySelector("#term") as HTMLDivElement;

const term = new Terminal({
  cursorBlink: true,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 13,
  theme: {
    background: "#111827",
    foreground: "#f9fafb",
    cursor: "#60a5fa",
  },
});
const fit = new FitAddon();
term.loadAddon(fit);
term.open(mount);
fit.fit();

function writeOutput(payload: string): void {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  term.write(bytes);
}

function describe(info: TerminalInfo): string {
  const parts = [info.shell];
  if (info.mcpUrl) {
    parts.push(`APP_MCP_URL=${info.mcpUrl}`);
  }
  if (info.apiUrl) {
    parts.push(`API_URL=${info.apiUrl}`);
  }
  return parts.join(" · ");
}

async function boot(): Promise<void> {
  await listen<string>("terminal-output", (event) => {
    writeOutput(event.payload);
  });
  await listen<string>("terminal-exit", (event) => {
    status.textContent = event.payload;
  });
  term.onData((data) => {
    void invoke("terminal_write", { data });
  });
  term.onResize(({ cols, rows }) => {
    void invoke("terminal_resize", { cols, rows });
  });
  new ResizeObserver(() => {
    fit.fit();
  }).observe(mount);

  const info = await invoke<TerminalInfo>("terminal_start", {
    rows: term.rows,
    cols: term.cols,
  });
  status.textContent = describe(info);
  term.focus();
}

void boot().catch((error: unknown) => {
  status.textContent = String(error);
});
