import { invoke } from "@tauri-apps/api/core";
import { confirm, save } from "@tauri-apps/plugin-dialog";
import { DROPLET_SIZE, RESEND_URL, TOKEN_URL, type Deployment, type RegionChoice } from "./types";

const WORKING = "Working on making your app. This can take a while. Leave this window open.";
const PLACE_UNAVAILABLE =
  "That place is not available. Choose another place close to your team, then try again.";
const READY = "Your app is ready.";

const appName = document.querySelector("#app-name") as HTMLHeadingElement;
const summary = document.querySelector("#summary") as HTMLParagraphElement;
const tokenState = document.querySelector("#token-state") as HTMLParagraphElement;
const resendState = document.querySelector("#resend-state") as HTMLParagraphElement;
const dropletState = document.querySelector("#droplet-state") as HTMLParagraphElement;
const tokenEditor = document.querySelector("#token-editor") as HTMLDivElement;
const resendEditor = document.querySelector("#resend-editor") as HTMLDivElement;
const regionStep = document.querySelector("#region-step") as HTMLDivElement;
const regionWarning = document.querySelector("#region-warning") as HTMLParagraphElement;
const dropletActions = document.querySelector("#droplet-actions") as HTMLDivElement;
const finished = document.querySelector("#finished") as HTMLElement;
const finishedDetail = document.querySelector("#finished-detail") as HTMLParagraphElement;
const downloadNote = document.querySelector("#download-note") as HTMLParagraphElement;
const doToken = document.querySelector("#do-token") as HTMLInputElement;
const resendKey = document.querySelector("#resend-key") as HTMLInputElement;
const regionSelect = document.querySelector("#region") as HTMLSelectElement;
const editToken = document.querySelector("#edit-token") as HTMLButtonElement;
const editResend = document.querySelector("#edit-resend") as HTMLButtonElement;
const removeToken = document.querySelector("#remove-token") as HTMLButtonElement;
const removeResend = document.querySelector("#remove-resend") as HTMLButtonElement;
const deployButton = document.querySelector("#deploy") as HTMLButtonElement;
const redeployButton = document.querySelector("#redeploy") as HTMLButtonElement;
const deleteButton = document.querySelector("#delete-droplet") as HTMLButtonElement;
const deployStatus = document.querySelector("#deploy-status") as HTMLParagraphElement;
const deployError = document.querySelector("#deploy-error") as HTMLParagraphElement;

let deployment: Deployment | null = null;
let tokenEditorOpen = false;
let resendEditorOpen = false;
let actionLocked = false;
let shownStatus = "";

function plainMessage(message: string): string {
  const text = message.replace(/^Error:\s*/i, "");
  const lower = text.toLowerCase();
  if (lower.includes(PLACE_UNAVAILABLE.toLowerCase())) {
    return PLACE_UNAVAILABLE;
  }
  const placeUnavailable =
    lower.includes("invalid region") ||
    ((lower.includes("region") || lower.includes("size")) &&
      (lower.includes("not available") || lower.includes("unavailable")));
  if (placeUnavailable) {
    return PLACE_UNAVAILABLE;
  }
  if (lower.includes("not authorized") || lower.includes("returned 403")) {
    return "DigitalOcean did not accept this key. Create a new key and choose Full Access, as in the picture.";
  }
  if (lower.includes("remote command failed") || lower.includes("failed to solve") || text.length > 240) {
    return "We could not finish making your app. Wait a moment, then try again.";
  }
  return text;
}

function askForAnotherPlace(rejected?: string): void {
  if (rejected) {
    regionSelect.querySelector(`option[value="${CSS.escape(rejected)}"]`)?.remove();
  }
  regionSelect.value = "";
  regionWarning.hidden = false;
  regionWarning.textContent = PLACE_UNAVAILABLE;
}

function renderDeployment(next: Deployment): void {
  deployment = next;
  const hasToken = next.hasDigitalOceanToken;
  const hasResend = next.hasResendApiKey;
  const hasDroplet = next.dropletId > 0 && next.publicIp.length > 0;
  const ready = hasDroplet && !next.running;
  if (!hasToken) {
    tokenEditorOpen = true;
  }
  if (!hasResend) {
    resendEditorOpen = true;
  }
  tokenState.textContent = hasToken ? "Saved on this computer" : "Still needed";
  resendState.textContent = hasResend ? "Saved on this computer" : "Still needed";
  dropletState.textContent = hasDroplet ? "Ready" : "Not created yet";
  editToken.textContent = hasToken ? "Change" : "Add";
  editResend.textContent = hasResend ? "Change" : "Add";
  removeToken.hidden = !hasToken;
  removeResend.hidden = !hasResend;
  tokenEditor.hidden = !tokenEditorOpen;
  resendEditor.hidden = !resendEditorOpen;
  regionStep.hidden = hasDroplet || !hasToken || !hasResend;
  dropletActions.hidden = !hasDroplet;
  finished.hidden = !ready;
  if (ready) {
    const password = next.adminPassword ? ` The password to sign in is ${next.adminPassword}.` : "";
    finishedDetail.textContent = `People on your team can open the app in a browser at ${next.appUrl}.${password} Keep the password private.`;
  }
  const busy = next.running;
  deployButton.disabled = busy;
  redeployButton.disabled = busy || actionLocked;
  deleteButton.disabled = busy || actionLocked;
  removeToken.disabled = busy || actionLocked;
  removeResend.disabled = busy || actionLocked;
  if (next.running) {
    deployStatus.textContent = WORKING;
    deployError.textContent = "";
    shownStatus = next.status;
  } else if (ready) {
    deployStatus.textContent = "";
    deployError.textContent = "";
    shownStatus = next.status;
  } else if (next.status && next.status !== shownStatus) {
    shownStatus = next.status;
    if (next.status === READY) {
      deployStatus.textContent = "";
    } else {
      const plain = plainMessage(next.status);
      deployError.textContent = plain;
      deployStatus.textContent = "";
      if (plain === PLACE_UNAVAILABLE) {
        askForAnotherPlace(regionSelect.value || next.region);
      }
    }
  }
  appName.textContent = "Set up your app";
  summary.textContent =
    "This window puts your app on the internet. Each section explains what we need. What you save stays on this computer, and you can change or remove it later.";
}

function credentialInput() {
  return {
    digitalOceanToken: doToken.value.trim(),
    resendApiKey: resendKey.value.trim(),
    fromEmail: "",
    adminEmail: "",
    region: regionSelect.value,
    size: DROPLET_SIZE,
  };
}

async function saveCredentials(patch: Partial<ReturnType<typeof credentialInput>>): Promise<void> {
  renderDeployment(
    await invoke<Deployment>("save_deployment", {
      input: { ...credentialInput(), ...patch },
    }),
  );
}

async function loadRegions(): Promise<void> {
  if (!deployment?.hasDigitalOceanToken) {
    return;
  }
  const regions = await invoke<RegionChoice[]>("droplet_regions");
  const previous = regionSelect.value;
  regionSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a place";
  regionSelect.append(placeholder);
  for (const region of regions) {
    const option = document.createElement("option");
    option.value = region.slug;
    option.textContent = region.name;
    regionSelect.append(option);
  }
  const saved = deployment.region;
  const savedIsOffered = regions.some((region) => region.slug === saved);
  if (regions.length === 0) {
    regionSelect.value = "";
    regionWarning.hidden = false;
    regionWarning.textContent =
      "DigitalOcean did not offer any places we can use. Check that the key has Full Access, then try again.";
  } else if (previous && regions.some((region) => region.slug === previous)) {
    regionSelect.value = previous;
  } else if (!savedIsOffered && saved.length > 0 && (deployment.dropletId === 0 || deployment.publicIp.length === 0)) {
    regionSelect.value = "";
    regionWarning.hidden = false;
    regionWarning.textContent =
      "The place saved on this computer is not available anymore. Choose another place close to your team before you continue.";
  } else {
    regionSelect.value = "";
  }
  deployButton.disabled = deployment.running;
}

export async function refreshDeployment(): Promise<void> {
  const next = await invoke<Deployment>("deployment_state");
  renderDeployment(next);
  if (next.hasDigitalOceanToken && regionSelect.options.length === 0) {
    await loadRegions();
  }
}

async function forget(kind: string): Promise<void> {
  deployError.textContent = "";
  renderDeployment(await invoke<Deployment>("forget_resource", { kind }));
}

export function mountDeploy(): void {
  document.querySelector("#create-token")?.addEventListener("click", () => {
    void invoke("open_external", { url: TOKEN_URL });
  });
  document.querySelector("#create-resend")?.addEventListener("click", () => {
    void invoke("open_external", { url: RESEND_URL });
  });
  regionSelect.addEventListener("change", () => {
    if (regionSelect.value) {
      regionWarning.hidden = true;
    }
  });

  editToken.addEventListener("click", () => {
    tokenEditorOpen = Boolean(tokenEditor.hidden);
    tokenEditor.hidden = !tokenEditorOpen;
  });
  editResend.addEventListener("click", () => {
    resendEditorOpen = Boolean(resendEditor.hidden);
    resendEditor.hidden = !resendEditorOpen;
  });

  removeToken.addEventListener("click", async () => {
    if (!deployment || actionLocked) {
      return;
    }
    actionLocked = true;
    renderDeployment(deployment);
    try {
      const accepted = await confirm(
        "Remove the DigitalOcean key from this computer? DigitalOcean will still accept that key until you delete it on their website.",
        { title: "Remove the DigitalOcean key", kind: "warning", okLabel: "Remove", cancelLabel: "Keep it" },
      );
      if (!accepted) {
        return;
      }
      await forget("token");
      doToken.value = "";
    } catch (error) {
      deployError.textContent = plainMessage(String(error));
    } finally {
      actionLocked = false;
      if (deployment) {
        renderDeployment(deployment);
      }
    }
  });

  removeResend.addEventListener("click", async () => {
    if (!deployment || actionLocked) {
      return;
    }
    actionLocked = true;
    renderDeployment(deployment);
    try {
      const accepted = await confirm("Remove the email key from this computer?", {
        title: "Remove the email key",
        kind: "warning",
        okLabel: "Remove",
        cancelLabel: "Keep it",
      });
      if (!accepted) {
        return;
      }
      await forget("resend");
      resendKey.value = "";
    } catch (error) {
      deployError.textContent = plainMessage(String(error));
    } finally {
      actionLocked = false;
      if (deployment) {
        renderDeployment(deployment);
      }
    }
  });

  document.querySelector("#save-token")?.addEventListener("click", async () => {
    deployError.textContent = "";
    const token = doToken.value.trim();
    try {
      await invoke("check_token", { token });
      tokenEditorOpen = false;
      await saveCredentials({ digitalOceanToken: token });
      doToken.value = "";
      await loadRegions();
    } catch (error) {
      deployError.textContent = plainMessage(String(error));
    }
  });

  document.querySelector("#save-resend")?.addEventListener("click", async () => {
    deployError.textContent = "";
    const key = resendKey.value.trim();
    if (!key) {
      deployError.textContent = "Paste the email key from Resend.";
      return;
    }
    try {
      resendEditorOpen = false;
      await saveCredentials({ resendApiKey: key });
      resendKey.value = "";
      deployStatus.textContent = deployment?.publicIp
        ? "Saved. Choose Update my app so the running app uses the new email key."
        : "Saved. We will use this email key when we make your app.";
    } catch (error) {
      deployError.textContent = plainMessage(String(error));
    }
  });

  deployButton.addEventListener("click", async () => {
    deployError.textContent = "";
    if (!regionSelect.value) {
      regionWarning.hidden = false;
      regionWarning.textContent = "Choose a place close to your team, then continue.";
      return;
    }
    regionWarning.hidden = true;
    try {
      await saveCredentials({ region: regionSelect.value });
      renderDeployment(await invoke<Deployment>("start_deploy"));
    } catch (error) {
      const plain = plainMessage(String(error));
      deployError.textContent = plain;
      if (plain === PLACE_UNAVAILABLE) {
        askForAnotherPlace(regionSelect.value);
      }
    }
  });

  redeployButton.addEventListener("click", async () => {
    deployError.textContent = "";
    try {
      renderDeployment(await invoke<Deployment>("start_deploy"));
    } catch (error) {
      deployError.textContent = plainMessage(String(error));
    }
  });

  deleteButton.addEventListener("click", async () => {
    if (!deployment || actionLocked) {
      return;
    }
    actionLocked = true;
    deployError.textContent = "";
    renderDeployment(deployment);
    try {
      const accepted = await confirm(
        "Remove the computer that runs your app? The app will stop working there. The keys saved on this computer stay, so you can create it again.",
        { title: "Remove this computer", kind: "warning", okLabel: "Remove", cancelLabel: "Keep it" },
      );
      if (!accepted) {
        return;
      }
      renderDeployment(await invoke<Deployment>("delete_droplet"));
      await loadRegions();
    } catch (error) {
      deployError.textContent = plainMessage(String(error));
    } finally {
      actionLocked = false;
      if (deployment) {
        renderDeployment(deployment);
      }
    }
  });

  document.querySelector("#download-config")?.addEventListener("click", async () => {
    downloadNote.textContent = "";
    deployError.textContent = "";
    const destination = await save({
      title: "Save a copy of your setup",
      defaultPath: "my-app-setup.json",
      filters: [{ name: "Setup file", extensions: ["json"] }],
    });
    if (!destination) {
      return;
    }
    try {
      await invoke("export_configuration", { destination });
      downloadNote.textContent = "Saved. Keep that file somewhere private, and do not share it.";
    } catch (error) {
      deployError.textContent = plainMessage(String(error));
    }
  });
}

export function deploymentIsRunning(): boolean {
  return deployment?.running === true;
}
