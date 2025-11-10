import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { Sidebar } from "../Sidebar";
import { GIFWMap } from "../Map";
import { getCurrentTheme } from "../ThemeSwitcher";
import { LegendURL } from "../Interfaces/LegendURLs";

export class LegendsPanel implements SidebarPanel {
  container: string;
  gifwMapInstance: GIFWMap;
  //_previousZoom: number;
  constructor(container: string) {
    this.container = container;
  }
  init() {
    this.attachCloseButton();
    this.gifwMapInstance.olMap.on("moveend", () => {
      //check to see if legends panel is visible before calling for a re-render
      //simple visibility check from https://stackoverflow.com/a/21696585/863487
      if (
        (document.querySelector(this.container) as HTMLElement).offsetParent !==
        null
      ) {
        this.render();
      }
    });
    this.render();
  }
  render() {
    this.updateLegend();
  }
  /*TODO - Make this generic*/
  private attachCloseButton(): void {
    const container = document.querySelector(this.container);
    const closeButton = container.querySelector(
      "button[data-gifw-dismiss-sidebar]",
    );
    if (closeButton !== null) {
      closeButton.addEventListener("click", () => {
        Sidebar.close();
      });
    }
  }
  // Mark updateLegend as async
  private async updateLegend(): Promise<void> {
    const legendsContainer = document
      .querySelector(this.container)
      .querySelector("#gifw-legends-container") as HTMLDivElement;
    legendsContainer.innerHTML = "";

    const legends = await this.gifwMapInstance.getLegendURLs(true, getCurrentTheme() === "dark" ? "dark" : "light");

    if (legends.availableLegends.length === 0) {
      this.updateNoLegendsList(legends.nonLegendableLayers, false);
      return;
    }

    // Use for...of with await to ensure sequential rendering
    for (let index = 0; index < legends.availableLegends.length; index++) {
      const legend = legends.availableLegends[index];
      this.appendLegendHeader(legendsContainer, legend.name);

      if (legend.headers != null) {
        await this.fetchAndAppendLegendImage(legendsContainer, legend, index, legend.headers);
      } else {
        this.appendLegendImage(legendsContainer, legend, index);
        // Wait for the image to load or error before continuing
        await this.waitForImageLoadOrError(legendsContainer, legend.name);
      }
    }

    this.updateNoLegendsList(legends.nonLegendableLayers, true);
  }

  // Make fetchAndAppendLegendImage async and return a Promise
  private async fetchAndAppendLegendImage(
    container: HTMLElement,
    legend: LegendURL,
    index: number,
    headers: Headers
  ): Promise<void> {
    const loadingNode = this.createLoadingNode(legend.name);
    container.appendChild(loadingNode);

    try {
      const response = await fetch(legend.legendUrl, { method: "GET", headers });
      if (response.status !== 200) throw new Error("Failed to load image");
      const blob = await response.blob();
      const imgNode = this.createLegendImageNode(legend, index, URL.createObjectURL(blob));
      container.appendChild(imgNode);
      // Wait for the image to load or error before continuing
      await this.waitForImageLoadOrError(container, legend.name);
    } catch {
      this.hideLoadingForLegend(legend.name);
      this.showErrorForLegend(legend.name);
    }
  }

  // Helper to wait for image load or error
  private waitForImageLoadOrError(container: HTMLElement, legendName: string): Promise<void> {
    return new Promise((resolve) => {
      const imgNode = container.querySelector(`img.legend-image[data-legend-name="${legendName}"]`) as HTMLImageElement;
      if (!imgNode) {
        resolve();
        return;
      }
      const cleanup = () => {
        imgNode.removeEventListener("load", onLoad);
        imgNode.removeEventListener("error", onError);
      };
      const onLoad = () => {
        this.hideLoadingForLegend(legendName);
        if (imgNode.width < 5) {
          this.showNoFeaturesMessageForLegend(legendName);
        }
        cleanup();
        resolve();
      };
      const onError = () => {
        this.hideLoadingForLegend(legendName);
        this.showErrorForLegend(legendName);
        cleanup();
        resolve();
      };
      imgNode.addEventListener("load", onLoad, { once: true });
      imgNode.addEventListener("error", onError, { once: true });
    });
  }


  private appendLegendHeader(container: HTMLElement, name: string) {
    const headerNode = document.createElement("h6");
    headerNode.textContent = name;
    container.appendChild(headerNode);
  }

  private appendLegendImage(container: HTMLElement, legend: LegendURL, index: number) {
    const loadingNode = this.createLoadingNode(legend.name);
    const imgNode = this.createLegendImageNode(legend, index, legend.legendUrl);

    container.appendChild(loadingNode);
    container.appendChild(imgNode);

    imgNode.addEventListener("error", () => {
      this.hideLoadingForLegend(legend.name);
      this.showErrorForLegend(legend.name);
    }, { once: true });

    imgNode.addEventListener("load", () => {
      this.hideLoadingForLegend(legend.name);
      if (imgNode.width < 5) {
        this.showNoFeaturesMessageForLegend(legend.name);
      }
    }, { once: true });
  }

  private createLoadingNode(name: string): HTMLDivElement {
    const loadingNode = document.createElement("div");
    loadingNode.className = "legend-loading mb-2";
    loadingNode.setAttribute("data-legend-name", name);
    loadingNode.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>`;
    return loadingNode;
  }

  private createLegendImageNode(legend: LegendURL, index: number, src: string): HTMLImageElement {
    const imgNode = new Image();
    imgNode.id = `legend-image-${index}`;
    imgNode.className = "legend-image mb-4";
    imgNode.setAttribute("data-legend-name", legend.name);
    imgNode.src = src;
    return imgNode;
  }

  
  private showErrorForLegend(layerName: string) {
    const legendImage = document
      .querySelector(this.container)
      .querySelector(`img.legend-image[data-legend-name="${layerName}"]`);
    if (legendImage) {
      legendImage.insertAdjacentHTML(
        "afterend",
        `<div class="alert alert-warning p-2"><i class="bi bi-exclamation-triangle"></i> The legend for this layer failed to load</div>`,
      );
      legendImage.remove();
    }
  }
  private showNoFeaturesMessageForLegend(layerName: string) {
    const legendImage = document
      .querySelector(this.container)
      .querySelector(`img.legend-image[data-legend-name="${layerName}"]`);
    if (legendImage) {
      legendImage.insertAdjacentHTML(
        "afterend",
        `<div class="alert alert-info p-2"><i class="bi bi-info-circle"></i> No features in view</div>`,
      );
      legendImage.remove();
    }
  }
  private hideLoadingForLegend(layerName: string) {
    const loadingElement = document
      .querySelector(this.container)
      .querySelector(`div.legend-loading[data-legend-name="${layerName}"]`);
    if (loadingElement) {
      loadingElement.remove();
    }
  }
  private updateNoLegendsList(
    nonLegendableLayers: string[] = [],
    hasLegendableLayers: boolean = false,
  ) {
    const noLegendsContainer = document
      .querySelector(this.container)
      .querySelector("#gifw-no-legends-container") as HTMLDivElement;
    if (hasLegendableLayers) {
      (
        noLegendsContainer.querySelector(
          "#gifw-no-legends-no-layers-text",
        ) as HTMLDivElement
      ).style.display = "none";
    } else {
      (
        noLegendsContainer.querySelector(
          "#gifw-no-legends-no-layers-text",
        ) as HTMLDivElement
      ).style.display = "block";
    }
    const nonLegendableLayersList = noLegendsContainer.querySelector("ul");
    nonLegendableLayersList.innerHTML = "<li>Basemaps</li>";
    if (nonLegendableLayers.length !== 0) {
      nonLegendableLayers.forEach((l) => {
        const item = document.createElement("li");
        item.textContent = l;
        nonLegendableLayersList.appendChild(item);
      });
    }
  }
  public setGIFWMapInstance(map: GIFWMap) {
    this.gifwMapInstance = map;
  }
}
