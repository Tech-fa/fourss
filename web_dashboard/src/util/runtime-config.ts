export interface RuntimeConfig {
  apiUrl: string;
  docUrl: string;
}

const runtimeConfig: RuntimeConfig = {
  apiUrl: import.meta.env.VITE_API_URL,
  docUrl: import.meta.env.VITE_SUPERDOC_EDITOR_URL,
};

export const initializeRuntimeConfig = async () => {
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const config = (await response.json()) as Partial<RuntimeConfig>;
    if (config.apiUrl) {
      runtimeConfig.apiUrl = config.apiUrl;
    }
    if (config.docUrl) {
      runtimeConfig.docUrl = config.docUrl;
    }
  } catch (error) {}
};

export const getRuntimeConfig = () => runtimeConfig;
