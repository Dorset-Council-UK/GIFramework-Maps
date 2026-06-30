import { Feature } from "ol";
import { Geometry, LineString, Point, Polygon } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { transform } from "ol/proj";
import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { GIFWMap } from "../Map";
import { Sidebar } from "../Sidebar";
import { FeatureLike } from "ol/Feature";

type RoutingMode = "route" | "isochrone";
type SelectionTarget = "start" | "end" | "centre" | null;

interface RoutingRequestPayload {
  endpoint: string;
  payload: Record<string, unknown>;
}

export class RoutingPanel implements SidebarPanel {
  container: string;
  gifwMapInstance: GIFWMap;

  private selectionMode: RoutingMode = "route";
  private selectionTarget: SelectionTarget = "start";
  private startCoordinate: number[] | null = null;
  private endCoordinate: number[] | null = null;
  private centreCoordinate: number[] | null = null;
  private currentResultGeoJson: Record<string, unknown> | null = null;
  private currentResultLabel: string = "";
  private selectionLayer: VectorLayer;
  private resultLayer: VectorLayer;
  private mapClickHandler = this.handleMapClick.bind(this);
  private mapClickSubscribed = false;

  constructor(container: string) {
    this.container = container;
  }

  setGIFWMapInstance(map: GIFWMap): void {
    this.gifwMapInstance = map;
  }

  init(): void {
    this.renderLayout();
    this.attachCloseButton();
    this.attachControls();
    this.attachMapClick();
    this.refreshSelectionSummary();
  }

  render(): void {
    this.refreshSelectionSummary();
    this.attachMapClick();
  }

  private attachCloseButton(): void {
    const container = document.querySelector(this.container);
    const closeButton = container?.querySelector<HTMLButtonElement>(
      "button[data-gifw-dismiss-sidebar]",
    );
    if (closeButton instanceof HTMLButtonElement) {
      closeButton.addEventListener("click", () => {
        Sidebar.close();
      });
    }
  }

  private renderLayout(): void {
    const container = document.querySelector(this.container) as HTMLElement;
    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="card-body gifw-routing-panel">
        <div class="card-title-closeable py-2">
          <h4 class="card-title">Routing</h4>
          <button type="button" class="btn-close" data-gifw-dismiss-sidebar="routing-control" aria-label="Close"></button>
        </div>
        <p class="small text-muted mb-3">Generate routes or isochrones with OpenRouteService. Click the map to set the start, destination or isochrone centre.</p>
        <div class="btn-group w-100 mb-3" role="group" aria-label="Routing mode">
          <button type="button" class="btn btn-sm btn-outline-primary active" data-routing-mode="route">Route</button>
          <button type="button" class="btn btn-sm btn-outline-primary" data-routing-mode="isochrone">Isochrone</button>
        </div>
        <div class="mb-3">
          <div class="btn-group w-100" role="group" aria-label="Routing target">
            <button type="button" class="btn btn-sm btn-outline-secondary active" data-routing-target="start">Start</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-routing-target="end">End</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-routing-target="centre">Centre</button>
          </div>
        </div>
        <div class="route-controls">
          <div class="mb-3">
            <label class="form-label small mb-1" for="gifw-routing-profile">Profile</label>
            <select id="gifw-routing-profile" class="form-select form-select-sm">
              <option value="driving-car">Driving car</option>
              <option value="cycling-regular">Cycling</option>
              <option value="foot-walking">Walking</option>
            </select>
          </div>
        </div>
        <div class="isochrone-controls d-none">
          <div class="mb-3">
            <label class="form-label small mb-1" for="gifw-routing-range">Travel time (seconds)</label>
            <input id="gifw-routing-range" class="form-range" type="range" min="300" max="1800" step="300" value="900" />
            <div class="small text-muted" id="gifw-routing-range-value">900 seconds</div>
          </div>
          <div class="mb-3">
            <label class="form-label small mb-1" for="gifw-routing-range-type">Range type</label>
            <select id="gifw-routing-range-type" class="form-select form-select-sm">
              <option value="time">Time</option>
              <option value="distance">Distance</option>
            </select>
          </div>
        </div>
        <button id="gifw-routing-submit" class="btn btn-primary btn-sm w-100 mb-3" type="button">Calculate</button>
        <div id="gifw-routing-status" class="small mb-3"></div>
        <div id="gifw-routing-summary" class="small text-muted mb-3"></div>
        <div class="d-flex gap-2">
          <button id="gifw-routing-export" class="btn btn-outline-secondary btn-sm" type="button" disabled>Export GeoJSON</button>
          <button id="gifw-routing-clear" class="btn btn-outline-secondary btn-sm" type="button">Clear</button>
        </div>
      </div>
    `;

    const rangeInput = container.querySelector<HTMLInputElement>("#gifw-routing-range");
    const maxRange = this.gifwMapInstance.config.routingMaxIsochroneRangeSeconds || 1800;
    if (rangeInput) {
      rangeInput.max = maxRange.toString();
      if (parseInt(rangeInput.value, 10) > maxRange) {
        rangeInput.value = maxRange.toString();
      }
    }

    this.selectionLayer = new VectorLayer({
      source: new VectorSource(),
      style: (feature) => this.getSelectionStyle(feature),
      zIndex: 1000,
    });
    this.resultLayer = new VectorLayer({
      source: new VectorSource(),
      style: this.getResultStyle(),
      zIndex: 1001,
    });

    this.gifwMapInstance.olMap.addLayer(this.selectionLayer);
    this.gifwMapInstance.olMap.addLayer(this.resultLayer);
  }

  private attachControls(): void {
    const container = document.querySelector(this.container) as HTMLElement;
    if (!container) {
      return;
    }

    const modeButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-routing-mode]"),
    );
    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectionMode = button.getAttribute("data-routing-mode") as RoutingMode;
        this.toggleMode(this.selectionMode);
      });
    });

    const targetButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-routing-target]"),
    );
    targetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectionTarget = button.getAttribute("data-routing-target") as SelectionTarget;
        this.toggleTarget(this.selectionTarget);
      });
    });

    const rangeInput = container.querySelector<HTMLInputElement>("#gifw-routing-range");
    const rangeValue = container.querySelector<HTMLElement>("#gifw-routing-range-value");
    rangeInput?.addEventListener("input", () => {
      if (rangeValue) {
        rangeValue.textContent = `${rangeInput.value} seconds`;
      }
    });

    const submitButton = container.querySelector<HTMLButtonElement>("#gifw-routing-submit");
    submitButton?.addEventListener("click", () => {
      void this.runRequest();
    });

    const exportButton = container.querySelector<HTMLButtonElement>("#gifw-routing-export");
    exportButton?.addEventListener("click", () => {
      this.exportResult();
    });

    const clearButton = container.querySelector<HTMLButtonElement>("#gifw-routing-clear");
    clearButton?.addEventListener("click", () => {
      this.clearSelection();
    });

    this.toggleMode(this.selectionMode);
    this.toggleTarget(this.selectionTarget);
  }

  private attachMapClick(): void {
    if (this.mapClickSubscribed) {
      return;
    }
    this.gifwMapInstance.olMap.on("singleclick", this.mapClickHandler);
    this.mapClickSubscribed = true;
  }

  private handleMapClick(event: { coordinate: number[] }): void {
    const mapProjection = this.gifwMapInstance.olMap.getView().getProjection();
    const lonLat = transform(event.coordinate, mapProjection, "EPSG:4326");

    switch (this.selectionTarget) {
      case "start":
        this.startCoordinate = lonLat;
        break;
      case "end":
        this.endCoordinate = lonLat;
        break;
      case "centre":
        this.centreCoordinate = lonLat;
        break;
      default:
        break;
    }

    this.refreshSelectionSummary();
    this.refreshSelectionLayer();
  }

  private async runRequest(): Promise<void> {
    const container = document.querySelector(this.container) as HTMLElement;
    const submitButton = container.querySelector<HTMLButtonElement>("#gifw-routing-submit");
    const status = container.querySelector<HTMLElement>("#gifw-routing-status");
    if (submitButton === null) {
      console.error("Submit button not found.");
      return;
    }
    if (this.selectionMode === "route") {
      if (!this.startCoordinate || !this.endCoordinate) {
        this.showStatus("Select a start and end location first.", "warning");
        return;
      }
    } else if (!this.centreCoordinate) {
      this.showStatus("Select a centre point for the isochrone first.", "warning");
      return;
    }

    submitButton.disabled = true;
    if (status) {
      status.textContent = "Requesting data from OpenRouteService...";
    }

    if (this.startCoordinate === null || this.startCoordinate.length != 2) {
      console.error("Start coordinate is invalid.");
      return;
    }
    if (this.endCoordinate === null || this.endCoordinate.length != 2) {
      console.error("End coordinate is invalid.");
      return;
    }
    try {
      const requestPayload: RoutingRequestPayload =
        this.selectionMode === "route"
          ? {
              endpoint: `directions/${this.getSelectedProfile()}`,
              payload: {
                coordinates: [
                  [this.startCoordinate[0], this.startCoordinate[1]],
                  [this.endCoordinate[0], this.endCoordinate[1]],
                ],
                format: "geojson",
                units: "km",
              },
            }
          : {
              endpoint: `isochrones/${this.getSelectedProfile()}`,
              payload: {
                locations: [[this.centreCoordinate[0], this.centreCoordinate[1]]],
                range: [this.getSelectedRange()],
                range_type: this.getSelectedRangeType(),
                units: "m",
                interval: this.getSelectedRange() / 3,
              },
            };

      const response = await fetch(
        `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}api/routing/ors`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const responseJson = await response.json();
      this.currentResultGeoJson = responseJson as Record<string, unknown>;
      this.currentResultLabel =
        this.selectionMode === "route"
          ? "Route generated"
          : "Isochrone generated";

      this.drawResult(responseJson);
      this.showStatus(this.currentResultLabel, "success");
      this.toggleExportButton(true);
    } catch (error) {
      console.error(error);
      this.showStatus(
        error instanceof Error ? error.message : "The OpenRouteService request failed.",
        "danger",
      );
    } finally {
      submitButton.disabled = false;
    }
  }

  private drawResult(result: Record<string, unknown>): void {
    const source = this.resultLayer.getSource();
    if (source === null) {
      console.error("Result layer source is null.");
      return;
    }
    source.clear();

    const features = (result as { features?: Array<Record<string, unknown>> }).features ?? [];
    if (features.length === 0) {
      return;
    }

    const firstFeature = features[0];
    const geometry = firstFeature.geometry as Record<string, unknown> | undefined;
    const geometryType = geometry?.type as string | undefined;
    const coordinates = geometry?.coordinates as Array<unknown> | undefined;

    if (!geometryType || !coordinates) {
      return;
    }

    const mapProjection = this.gifwMapInstance.olMap.getView().getProjection();
    let olGeometry: Geometry | null = null;

    if (geometryType === "LineString") {
      const lineCoordinates = (coordinates as number[][]).map((coordinate) =>
        transform(coordinate, "EPSG:4326", mapProjection),
      );
      olGeometry = new LineString(lineCoordinates);
    } else if (geometryType === "Polygon") {
      const polygonCoordinates = (coordinates as number[][][]).map((ring) =>
        ring.map((coordinate) => transform(coordinate, "EPSG:4326", mapProjection)),
      );
      olGeometry = new Polygon(polygonCoordinates);
    }

    if (olGeometry) {
      const feature = new Feature({ geometry: olGeometry });
      source.addFeature(feature);
    }
  }

  private refreshSelectionLayer(): void {
    const source = this.selectionLayer.getSource();
    if (source === null) {
      console.error("Result layer source is null.");
      return;
    }
    source.clear();

    const features: Feature[] = [];
    if (this.startCoordinate) {
      features.push(this.createPointFeature(this.startCoordinate, "start"));
    }
    if (this.endCoordinate) {
      features.push(this.createPointFeature(this.endCoordinate, "end"));
    }
    if (this.centreCoordinate) {
      features.push(this.createPointFeature(this.centreCoordinate, "centre"));
    }

    features.forEach((feature) => source.addFeature(feature));
  }

  private createPointFeature(coordinate: number[], kind: "start" | "end" | "centre"): Feature {
    const mapProjection = this.gifwMapInstance.olMap.getView().getProjection();
    const transformed = transform(coordinate, "EPSG:4326", mapProjection);
    const geometry = new Point(transformed);
    //const color = kind === "start" ? "#198754" : kind === "end" ? "#dc3545" : "#0d6efd";
    return new Feature({
      geometry,
      kind,
    });
  }

  private refreshSelectionSummary(): void {
    const container = document.querySelector(this.container) as HTMLElement;
    if (!container) {
      return;
    }

    const summary = container.querySelector<HTMLElement>("#gifw-routing-summary");
    const selectionSummary = [];

    if (this.startCoordinate) {
      selectionSummary.push(`Start: ${this.formatCoordinate(this.startCoordinate)}`);
    }
    if (this.endCoordinate) {
      selectionSummary.push(`End: ${this.formatCoordinate(this.endCoordinate)}`);
    }
    if (this.centreCoordinate) {
      selectionSummary.push(`Centre: ${this.formatCoordinate(this.centreCoordinate)}`);
    }

    if (summary) {
      summary.textContent = selectionSummary.length > 0 ? selectionSummary.join(" | ") : "Select one or more map locations to begin.";
    }

    this.refreshSelectionLayer();
  }

  private clearSelection(): void {
    this.startCoordinate = null;
    this.endCoordinate = null;
    this.centreCoordinate = null;
    this.currentResultGeoJson = null;
    this.currentResultLabel = "";
    this.selectionLayer.getSource()?.clear();
    this.resultLayer.getSource()?.clear();
    this.toggleExportButton(false);
    const container = document.querySelector(this.container) as HTMLElement;
    const status = container.querySelector<HTMLElement>("#gifw-routing-status");
    if (status) {
      status.textContent = "";
    }
    this.refreshSelectionSummary();
  }

  private toggleMode(mode: RoutingMode): void {
    const container = document.querySelector(this.container) as HTMLElement;
    const routeControls = container.querySelector<HTMLElement>(".route-controls");
    const isochroneControls = container.querySelector<HTMLElement>(".isochrone-controls");
    const submitButton = container.querySelector<HTMLButtonElement>("#gifw-routing-submit");
    const modeButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-routing-mode]"),
    );

    modeButtons.forEach((button) => {
      const active = button.getAttribute("data-routing-mode") === mode;
      button.classList.toggle("active", active);
      button.classList.toggle("btn-primary", active);
      button.classList.toggle("btn-outline-primary", !active);
    });

    if (mode === "route") {
      routeControls?.classList.remove("d-none");
      isochroneControls?.classList.add("d-none");
      if (this.selectionTarget === "centre") {
        this.selectionTarget = "start";
      }
      if (submitButton) {
        submitButton.textContent = "Calculate route";
      }
    } else {
      routeControls?.classList.add("d-none");
      isochroneControls?.classList.remove("d-none");
      if (this.selectionTarget !== "centre") {
        this.selectionTarget = "centre";
      }
      if (submitButton) {
        submitButton.textContent = "Calculate isochrone";
      }
    }

    this.toggleTarget(this.selectionTarget);
  }

  private toggleTarget(target: SelectionTarget): void {
    const container = document.querySelector(this.container) as HTMLElement;
    const targetButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-routing-target]"),
    );

    targetButtons.forEach((button) => {
      const active = button.getAttribute("data-routing-target") === target;
      button.classList.toggle("active", active);
      button.classList.toggle("btn-primary", active);
      button.classList.toggle("btn-outline-secondary", !active);
    });
  }

  private toggleExportButton(enabled: boolean): void {
    const container = document.querySelector(this.container) as HTMLElement;
    const exportButton = container.querySelector<HTMLButtonElement>("#gifw-routing-export");
    if (exportButton) {
      exportButton.disabled = !enabled;
    }
  }

  private exportResult(): void {
    if (!this.currentResultGeoJson) {
      return;
    }

    const blob = new Blob([JSON.stringify(this.currentResultGeoJson, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this.selectionMode === "route" ? "route" : "isochrone"}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private showStatus(message: string, severity: "warning" | "danger" | "success"): void {
    const container = document.querySelector(this.container) as HTMLElement;
    const status = container.querySelector<HTMLElement>("#gifw-routing-status");
    if (!status) {
      return;
    }

    const colorClass =
      severity === "warning"
        ? "alert-warning"
        : severity === "danger"
          ? "alert-danger"
          : "alert-success";
    status.innerHTML = `<div class="alert ${colorClass} py-2 px-3 mb-0" role="alert">${message}</div>`;
  }

  private formatCoordinate(coordinate: number[]): string {
    return `${coordinate[1].toFixed(4)}, ${coordinate[0].toFixed(4)}`;
  }

  private getSelectedProfile(): string {
    const container = document.querySelector(this.container) as HTMLElement;
    const profileSelect = container.querySelector<HTMLSelectElement>("#gifw-routing-profile");
    return profileSelect?.value || "driving-car";
  }

  private getSelectedRange(): number {
    const container = document.querySelector(this.container) as HTMLElement;
    const rangeInput = container.querySelector<HTMLInputElement>("#gifw-routing-range");
    const value = parseInt(rangeInput?.value || "900", 10);
    return Math.min(value, this.gifwMapInstance.config.routingMaxIsochroneRangeSeconds || 1800);
  }

  private getSelectedRangeType(): string {
    const container = document.querySelector(this.container) as HTMLElement;
    const rangeTypeSelect = container.querySelector<HTMLSelectElement>("#gifw-routing-range-type");
    return rangeTypeSelect?.value || "time";
  }

  private getSelectionStyle(feature: FeatureLike): Style {
    const kind = feature.get("kind") as "start" | "end" | "centre" | undefined;
    const color = kind === "start" ? "#198754" : kind === "end" ? "#dc3545" : "#0d6efd";
    return new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: `${color}66` }),
        stroke: new Stroke({ color: color, width: 2 }),
      }),
    });
  }

  private getResultStyle(): Style {
    return new Style({
      stroke: new Stroke({ color: "#dc3545", width: 4 }),
      fill: new Fill({ color: "rgba(220,53,69,0.2)" }),
    });
  }
}
