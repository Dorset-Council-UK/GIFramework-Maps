import { Control as olControl } from "ol/control";
import { GIFWMap } from "./Map";
import { addFullScreenLoader, removeFullScreenLoader } from "./Util";

declare global {
  interface Window {
    Cesium: typeof import("cesium");
  }
}

type OLCesiumInstance = {
  getCesiumScene(): {
    canvas: HTMLCanvasElement;
    fog: {
      enabled: boolean;
      density: number;
      screenSpaceErrorFactor: number;
    };
    globe: { depthTestAgainstTerrain: boolean };
    terrainProvider: unknown;
  };
  getEnabled(): boolean;
  setEnabled(enabled: boolean): void;
};

interface CesiumIonAssetEndpoint {
  url: string;
  accessToken: string;
}

interface ReparentedControl {
  element: HTMLElement;
  parent: HTMLElement;
  nextSibling: ChildNode | null;
}

export class Cesium3DControl extends olControl {
  private readonly gifwMapInstance: GIFWMap;
  private readonly toggleButton: HTMLButtonElement;
  private ol3d: OLCesiumInstance | undefined;
  private olControlsContainer: HTMLElement | null = null;
  private readonly reparentedControls: ReparentedControl[] = [];
  private isInitializing = false;

  constructor(gifwMapInstance: GIFWMap) {
    const element = document.createElement("div");
    element.className = "gifw-3d-control ol-unselectable ol-control";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.title = "Switch to 3D map";
    toggleButton.setAttribute("aria-label", "Switch to 3D map");
    toggleButton.setAttribute("aria-pressed", "false");
    toggleButton.innerHTML = '<i class="bi bi-badge-3d-fill"></i>';
    element.appendChild(toggleButton);

    super({ element });

    this.gifwMapInstance = gifwMapInstance;
    this.toggleButton = toggleButton;
    this.toggleButton.addEventListener("click", () => {
      void this.toggle3D();
    });
  }

  public is3DEnabled(): boolean {
    return this.ol3d?.getEnabled() ?? false;
  }

  public async set3DEnabled(enabled: boolean): Promise<void> {
    if (enabled === this.is3DEnabled()) {
      return;
    }

    if (enabled && !this.ol3d) {
      await this.initialize();
    }

    if (enabled) {
      this.moveControlsToCesiumContainer();
    } else {
      this.restoreControlsToOpenLayersContainer();
    }

    this.ol3d?.setEnabled(enabled);
    this.updateButton(enabled);
    document.getElementById(this.gifwMapInstance.id)?.dispatchEvent(
      new CustomEvent("gifw-3d-mode-changed", { detail: { enabled } })
    );
  }

  private async toggle3D(): Promise<void> {
    if (this.isInitializing) {
      return;
    }

    try {
      addFullScreenLoader(
        this.gifwMapInstance.id,
        `Switching to ${this.is3DEnabled() ? "2D" : "3D"}. Please stand by...`,
      );
      await this.set3DEnabled(!this.is3DEnabled());
      removeFullScreenLoader(this.gifwMapInstance.id);
    } catch (error) {
      console.error("Could not initialize 3D mode", error);
      this.toggleButton.disabled = true;
      this.toggleButton.title = "3D map is unavailable";
    }
  }

  private async initialize(): Promise<void> {
    this.isInitializing = true;
    this.toggleButton.disabled = true;

    try {
      const cesium = await import("cesium");
      window.Cesium = cesium;
      const { default: OLCesium } = await import("olcs");
      const ol3d = new OLCesium({ map: this.gifwMapInstance.olMap });
      const scene = ol3d.getCesiumScene();

      scene.fog.enabled = true;
      scene.fog.density = 0.0015;
      scene.fog.screenSpaceErrorFactor = 4;
      scene.globe.depthTestAgainstTerrain = true;
      scene.terrainProvider = (await this.createTerrainProvider(cesium)) as typeof scene.terrainProvider;
      this.ol3d = ol3d;
    } finally {
      this.isInitializing = false;
      this.toggleButton.disabled = false;
    }
  }

  private async createTerrainProvider(
    cesium: typeof import("cesium")
  ): Promise<import("cesium").TerrainProvider> {
    const customTerrainUrl = this.gifwMapInstance.config.customTerrainProviderTileJsonURL;
    if (customTerrainUrl) {
      return cesium.CesiumTerrainProvider.fromUrl(customTerrainUrl);
    }

    const ionEndpointProxyUrl = this.gifwMapInstance.config.cesiumIonAssetEndpointProxyURL;
    if (!ionEndpointProxyUrl) {
      throw new Error("No terrain provider has been configured.");
    }

    const response = await fetch(ionEndpointProxyUrl);
    if (!response.ok) {
      throw new Error(`Could not resolve Cesium Ion terrain endpoint: ${response.status}`);
    }

    const endpoint = (await response.json()) as CesiumIonAssetEndpoint;
    const resource = new cesium.Resource({
      url: endpoint.url,
      headers: { Authorization: `Bearer ${endpoint.accessToken}` },
    });
    return cesium.CesiumTerrainProvider.fromUrl(resource);
  }

  private updateButton(enabled: boolean): void {
    this.toggleButton.classList.toggle("ol-control-active", enabled);
    this.toggleButton.setAttribute("aria-pressed", enabled.toString());
    this.toggleButton.title = enabled ? "Switch to 2D map" : "Switch to 3D map";
    this.toggleButton.setAttribute("aria-label", this.toggleButton.title);
  }

  private moveControlsToCesiumContainer(): void {
    if (!this.ol3d) {
      return;
    }

    this.olControlsContainer ??= this.element.parentElement as HTMLElement;
    const cesiumContainer = this.ol3d.getCesiumScene().canvas.parentElement;
    if (!cesiumContainer) {
      return;
    }

    const controls = new Set([
      this.olControlsContainer.querySelector<HTMLElement>(".ol-zoom"),
      this.olControlsContainer.querySelector<HTMLElement>(".ol-rotate"),
      ...this.olControlsContainer.querySelectorAll<HTMLElement>(".sidebar-button"),
      this.element,
    ].filter((control): control is HTMLElement => control !== null));

    controls.forEach((control) => {
      const parent = control.parentElement;
      if (!parent) {
        return;
      }

      this.reparentedControls.push({
        element: control,
        parent,
        nextSibling: control.nextSibling,
      });
      cesiumContainer.appendChild(control);
      control.classList.add("gifw-control--cesium");
    });
  }

  private restoreControlsToOpenLayersContainer(): void {
    this.reparentedControls.forEach(({ element, parent, nextSibling }) => {
      parent.insertBefore(element, nextSibling?.parentNode === parent ? nextSibling : null);
      element.classList.remove("gifw-control--cesium");
    });
    this.reparentedControls.length = 0;
  }
}
