import { deploymentIsRunning, mountDeploy, refreshDeployment } from "./setup/deploy";
import "./styles.css";

const summary = document.querySelector("#summary") as HTMLParagraphElement;

mountDeploy();

async function boot(): Promise<void> {
  let last = "This window is still opening.";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await refreshDeployment();
      window.setInterval(() => {
        if (deploymentIsRunning()) {
          void refreshDeployment().catch(() => undefined);
        }
      }, 2000);
      return;
    } catch (error) {
      last = String(error);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  summary.textContent = last;
}

void boot();
