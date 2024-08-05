import jsPDF from "jspdf";
import { Map } from "ol";
import * as olProj from "ol/proj";
import { Size } from "ol/size";
import { LegendURLs } from "./Interfaces/LegendURLs";
import {
  PDFPageSetting,
  PDFPageSettings,
} from "./Interfaces/Print/PDFPageSettings";
import { PrintConfiguration } from "./Interfaces/Print/PrintConfiguration";
import { GIFWMap } from "./Map";
import { GIFWMousePositionControl } from "./MousePositionControl";
import { AlertSeverity, AlertType, CustomError } from "./Util";

export type LegendPositioningOption =
  | "none"
  | "float-left"
  | "pinned-left"
  | "separate-page";
export type PageSizeOption = "a2" | "a3" | "a4" | "a5";
export type PageOrientationOption = "p" | "l";
type TitleBoxDimensions = {
  TotalHeight: number;
  TotalWidth: number;
  TitleHeight: number;
  SubtitleHeight: number;
};
export class Export {
  pageSettings: PDFPageSettings;
  printConfigUrl: string;
  printConfiguration: PrintConfiguration;
  _timeoutId: number;
  _maxProcessingTime: number = 60000;

  constructor(pageSettings: PDFPageSettings, printConfigUrl: string) {
    this.pageSettings = pageSettings;
    this.printConfigUrl = printConfigUrl;
    this.init();
  }

  async init() {
    const resp = await fetch(this.printConfigUrl);
    if (resp.ok) {
      this.printConfiguration = await resp.json();
    } else {
      console.error("Failed to get print configuration", resp.statusText);
      const errDialog = new CustomError(
        AlertType.Popup,
        AlertSeverity.Danger,
        "Error getting print configs",
        "<p>There was an error getting the print config for this version</p><p>This means the print functionality will not work. Please refresh the page to try again</p>",
      );
      errDialog.show();
      document.getElementById("gifw-print-form").innerHTML =
        `<div class="text-center">
                    <i class="bi bi-exclamation-diamond-fill text-danger fs-1"></i>
                    <p class="fs-4">There was an error loading the print configuration</p>
                    <p>Printing is unavailable. Refresh the page to try again.</p>
                </div>`;
    }
  }

  /**
   * Creates a PDF with the specified options and returns it to the user
   * @param map The GIFWMap instance to print
   * @param pageSize The selected page size
   * @param pageOrientation The selected page orientation
   * @param resolution The selected page resolution
   * @param abortController An abort controller to handle cancel events
   * @param scale The selected scale (unused)
   * @param legend The selected legend position
   * @description This function deals with the top level setting up of the map and controlling the render events, the actual PDF drawing is done in renderPDF
   * @returns
   */
  public createPDF(
    map: GIFWMap,
    pageSize: PageSizeOption,
    pageOrientation: PageOrientationOption,
    resolution: number,
    abortController: AbortController,
    scale?: number,
    legend?: LegendPositioningOption,
  ) {
    if (abortController.signal.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    document
      .getElementById(map.id)
      .dispatchEvent(new Event("gifw-draw-deactivate"));
    document
      .getElementById(map.id)
      .dispatchEvent(new Event("gifw-measure-deactivate"));
    const olMap = map.olMap;

    const chosenPageSettings = this.pageSettings[pageSize];
    const width = Math.round(
      ((pageOrientation === "l"
        ? chosenPageSettings.pageWidth
        : chosenPageSettings.pageHeight) *
        resolution) /
        25.4,
    ); //pixels
    const height = Math.round(
      ((pageOrientation === "l"
        ? chosenPageSettings.pageHeight
        : chosenPageSettings.pageWidth) *
        resolution) /
        25.4,
    ); //pixels
    const pageMargin = 20; //mm
    let legendMargin = 0; //mm
    if (legend === "pinned-left") {
      legendMargin =
        (pageOrientation === "l"
          ? chosenPageSettings.inlineLegendLandscapeMaxWidth
          : chosenPageSettings.inlineLegendPortraitMaxWidth) | 0;
    }
    const mapWidth = width - ((pageMargin + legendMargin) * resolution) / 25.4; //pixels
    const mapHeight = height - (pageMargin * resolution) / 25.4; // pixels
    const originalMapSize = olMap.getSize();
    const viewResolution = olMap.getView().getResolution();
/*    const mapRotation = olMap.getView().getRotation();*/

    let keyWasMoved = false;

    const evt = olMap.once("rendercomplete", async () => {
      const keyWillFit = await this.keyWillFit(
        map,
        pageMargin,
        chosenPageSettings,
        legend,
        pageSize,
        pageOrientation,
      );

      if (keyWillFit) {
        await this.renderPDF(
          map,
          mapWidth,
          mapHeight,
          width,
          height,
          pageOrientation,
          pageSize,
          legend,
          legendMargin,
          originalMapSize,
          viewResolution,
        );

        this._timeoutId = window.setTimeout(() => {
          abortController.abort();
        }, this._maxProcessingTime);
      } else {
        if (legend !== "none") {
          legend = "separate-page";
          legendMargin = 0;
          keyWasMoved = true;
        }
        //resize the map and listen for new render event before rendering
        const secondRenderEvt = olMap.once("rendercomplete", async () => {
          await this.renderPDF(
            map,
            mapWidth,
            mapHeight,
            width,
            height,
            pageOrientation,
            pageSize,
            legend,
            legendMargin,
            originalMapSize,
            viewResolution,
            keyWasMoved,
          );

          this._timeoutId = window.setTimeout(() => {
            abortController.abort();
          }, this._maxProcessingTime);
        });
        abortController.signal.addEventListener("abort", () => {
          window.clearTimeout(this._timeoutId);
          olMap.removeEventListener("rendercomplete", secondRenderEvt.listener);
          this.resetMap(map, originalMapSize, viewResolution);
          document
            .getElementById(map.id)
            .dispatchEvent(new CustomEvent("gifw-print-finished"));
        });
        // Set print size to standard
        legendMargin = 0;
        const mapWidth =
          width - ((pageMargin + legendMargin) * resolution) / 25.4; //pixels
        const mapHeight = height - (pageMargin * resolution) / 25.4; // pixels
        this.setMapSizeForPrinting(
          olMap,
          mapWidth,
          mapHeight,
          pageOrientation,
          resolution,
          scale,
        );
      }
    });
    abortController.signal.addEventListener("abort", () => {
      window.clearTimeout(this._timeoutId);
      olMap.removeEventListener("rendercomplete", evt.listener);
      this.resetMap(map, originalMapSize, viewResolution);
      document
        .getElementById(map.id)
        .dispatchEvent(new CustomEvent("gifw-print-finished"));
    });
    // Set print size
    this.setMapSizeForPrinting(
      olMap,
      mapWidth,
      mapHeight,
      pageOrientation,
      resolution,
      scale,
    );
  }

  private async renderPDF(
    map: GIFWMap,
    mapWidth: number,
    mapHeight: number,
    width: number,
    height: number,
    pageOrientation: PageOrientationOption,
    pageSize: PageSizeOption,
    legend: LegendPositioningOption,
    legendMargin: number,
    size: Size,
    viewResolution: number,
    keyWasMoved?: boolean,
  ) {
    const pageMargin = 20; //mm
    const chosenPageSettings = this.pageSettings[pageSize];
    let success = true;
    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: "mm",
      format: pageSize,
    });

    try {
      const mapCanvas = document.createElement("canvas");
      mapCanvas.width = mapWidth;
      mapCanvas.height = mapHeight;
      const mapContext = mapCanvas.getContext("2d");

      this.createBackgroundCanvas(mapContext, width, height);

      const canvases: NodeListOf<HTMLCanvasElement> =
        document.querySelectorAll(".ol-layers canvas");
      canvases.forEach((canvas) => {
        this.createLayerCanvas(canvas, mapContext);
      });

      let mapStartingX = pageMargin / 2;
      if (legend === "pinned-left") {
        mapStartingX += legendMargin;
      }
      const mapStartingY = pageMargin / 2;

      pdf.addImage(
        mapCanvas.toDataURL("image/jpeg"),
        "JPEG",
        mapStartingX,
        mapStartingY,
        pageOrientation === "l"
          ? chosenPageSettings.pageWidth - pageMargin - legendMargin
          : chosenPageSettings.pageHeight - pageMargin - legendMargin,
        pageOrientation === "l"
          ? chosenPageSettings.pageHeight - pageMargin
          : chosenPageSettings.pageWidth - pageMargin,
      );
      pdf.rect(
        mapStartingX,
        mapStartingY,
        pageOrientation === "l"
          ? chosenPageSettings.pageWidth - pageMargin - legendMargin
          : chosenPageSettings.pageHeight - pageMargin - legendMargin,
        pageOrientation === "l"
          ? chosenPageSettings.pageHeight - pageMargin
          : chosenPageSettings.pageWidth - pageMargin,
        "S",
      );
      if (legend !== "none") {
        await this.createLegend(
          pdf,
          map,
          pageMargin,
          chosenPageSettings,
          legend,
          pageSize,
          pageOrientation,
        );
      }
      pdf.setPage(1);

      this.createTitleBox(pdf, pageMargin, chosenPageSettings);

      this.createCoordinatesBox(pdf, map, pageMargin, chosenPageSettings);

      this.createAttributionsBox(pdf, map, pageMargin, chosenPageSettings);

      try {
        const logoResp = await this.getLogo();
        const imgData = <string>logoResp;
        this.createLogoBox(pdf, pageMargin, imgData);
      } catch (ex) {
        console.warn(`Getting the logo for a print failed.`);
        console.error(ex);
      }

      const northPointerCheckBox = document.getElementById("gifw-print-north-pointer") as HTMLInputElement;
      //if (northPointerCheckBox.checked) {
      //  try {
      //    const northPointerResp = await this.getNorthArrow();
      //    const imgData = <string>northPointerResp;
      //    this.createNorthPointerBox(pdf, pageMargin, imgData)
      //  } catch (ex) {
      //    console.warn(`Getting the north arrow for a print failed.`);
      //    console.error(ex);
      //  }
      //}

      if (northPointerCheckBox.checked) {
        const northPointerBase64Encoded = "data:image/png; base64, iVBORw0KGgoAAAANSUhEUgAAAUAAAAFACAYAAADNkKWqAAAAAXNSR0IArs4c6QAAIABJREFUeF7tXXngdlO1fuqWuqaQMlSukjKkyCxCIVOGMhaVsSTKkAxRQqhMUSFThcyZp4iQoT4ixO2WFLdB461outN5OL / P + 33fO5y9197n7L3Ps / 5kr7XXetb + Pd8579n72c + BTAgMR + AT1X / +pCM4xwLYx9HHZ7hrbqzjUJ + J5FM2As8puzxVZ0DAlWSmploRwDTDvE1cXXMTATZBtYdjRIA9bHrDkl1JZirsLQDWbDiH7zASGvNraiLApkj1bJwIsGcNdyjXlwA5xW4ATnaYy3WoCNAVMY0fioAIUAtjFAIWAnwKwMsA / DESvCLASMD2LawIsG8db16vhQA5y + kAdm4 + ndNIEaATXBo8CgERoNZGjCfAqZjrArghAsQiwAig9jGkCLCPXW9Ws / UJkLPcB2DZZtM5jRIBOsGlwXoC1BpwRSAEAXLOAwAc5Tr5hPEiwMCA9jWcngD72vnJdYciQM70SgCPTp6y8QjX3LQNpjG0 / RooAuxXv12qdSWZcbEvBrCFy + R6AgyIlkKNREAEqMUxCoGQBMg5SIAkwhCmV + AQKCoGRIBaBG0R4M8ALBoIbldy1itwIOBLCyMCLK2j4epxJZkmM / NjCD + KWE1PgFYE5f80AiJALYS2ngCn5lkOwL1G2EWARgDl / gwCIkCthLYJkBujuUHaYiJAC3rynY6ACFCLoW0C5Hw8Isejcr7m + nqu3wB9kS7cTwRYeIMN5bmSjMtUFElYpBJP / bOL08BYPQF6Aie3GREQAWpFdPEEyDkpl0XZLB8TAfqgJp9ZEBABalF0RYCcd20AN3u0QAToAZpcZkVABKhV0SUBUjqfEvqu5vp6rt8AXRHuyXgRYE8a7VGmK8n8AsDCHvPsC + AYRz89AToCpuHDERABamWEegLkrWsu93QMzssPIo85tEIE6ACWho5GQASo1RGSAKn9t6kHpOcB2NbBTwToAJaGigC1BtwRcH0F5hPg + QB + 6D7V0x6bV + Kplzb0FQE2BErDxiOgJ0CtkJBPgCSmgwAc7gHrjwEs3tBPBNgQKA0TAWoN + CHg8wRIYqLdDeCNHtOSOA9u4CcCbACShkxGQE + AkzHq6wgLAa4H4DpP4F4P4P4JviJAT3DlNiMCIkCtiNCvwFPxeNLj / R7wXgNgQxGgB3JycUZABOgMWW8cLE + ABGkeAD8C8BIPxHaoxFPPGuOnJ0APUOUyKwIiQK2KWE + AjLsTgNM8IP5NfZHSkyN8RYAeoMpFBKg10BwB6xPg1ExXNXilHZbVSQD2CESA3KIz9YGmOQIaWTwCegIsvsXeBbo + ZY0iGX7U4AXpPvZmALcOcQyVm09O8ikIARFgQc0MXEpIknGNNVXKHQBWEwEG7qzCTUdABKjFMAoBV9Ka9Jr5g + pazGU84N6r + qBy / Ex + oXPzSEsuJSAgAiyhi3FqCE0yGwG40iPVf9YfRP5zwDd0bh5pyaUEBESAJXQxTg0xSIb3gOzoke7ZALYXAXogJ5exCIgAtUDaegXmPC8GwDO / 3CPoapsAuKJ2ikHOrvlofAEIiAALaGKkEmKRzAcAfMkj54cALCUC9EBOLiMREAFqcbT5BDg11 / WedwNPfWiJRc5aDT1DQATYs4Y7lBuTZCic + n2HXAaHvg7Alo7q05O + UHumIrfcERAB5t7BePnHJEBmfQSAAz3S55dkym25yO + LAD2A7oOLCLAPXfarMTYBMiv + rreER3qu94 + IAD1A7oOLCLAPXfarsQ0C5JfdyzzS + yWAhRz8RIAOYPVpqAiwT912q7UNAmRGX51pj59bls1GiwCb4dS7USLA3rW8ccFtEeBLATwCYI7GmbkPFAG6Y9YLDxFgL9rsVWRbBMjkdgdA + atYJgKMhWzmcUWAmTcwYvptEiDLuAnAWpHqEQFGAjb3sCLA3DsYL / +2CXB5ANMilSMCjARs7mFFgLl3MF7 + bRMgKzkawH4RShIBRgC1hJAiwBK6GKeGLgiQlVAsYbHAJYkAAwNaSjgRYCmdDF9HVwS4OYBLApcjAgwMaCnhRICldDJ8HV0RICs5F8C2AUsSAQYEs6RQIsCSuhm2li4JkKc8HgUwW6CSRICBgCwtjAiwtI6Gq6dLAmQVewI4IVA5IsBAQJYWRgRYWkfD1dM1AbISXom5eoCSRIABQCwxhAiwxK6GqSkFAlwJwF0ByhEBBgCxxBAiwBK7GqamFAiQlXwWwL7GkkSARgBLdRcBltpZe12pECAr + RmARQwliQAN4JXsKgIsubu22lIiwHcCuMhQjgjQAF7JriLAkrtrqy0lAmQl5wPYyrMkEaAncKW7iQBL77B / fakR4MsAPAbAZ82KAP3XQdGePoupaEBU3HQEUiNAJrYXgGM9eiQC9ACtDy4iwD502a / GFAmQldwOYFXHkkSAjoD1ZbgIsC + dVp1CQAjMgoAIUItCCAiB3iIgAuxt61W4EBACIkCtASEgBHqLgAiwt61X4UJACIgAtQaEgBDoLQIiwN62XoULASEgAtQaEAJCoLcIiAB723oVLgSEgAhQa0AICIHeIiAC7G3rVbgQEAIiQK0BISAEeouACLC3rVfhQkAIiAC1BoSAEOgtAiLA3rZehQsBISAC1BoQAkKgtwiIAHvb + s4KfzWAXao7PpYEsDyA2QE8CuBuAGcDuLmzzDRx7xAQAfau5Z0WvAeAAwEsOCaLCw2XH3VanCbPDwERYH49yzXjT1SJU2a / iYkEm6CkMWYERIBmCBWgAQKu94sw5KcBHNQgtoYIAW8ERIDe0MmxIQILAZgGYOGG46eGPQlgFQAPOPppuBBojIAIsDFUGuiJgM / T39RUJwHg74YyIRAFARFgFFgVdACB7wNY1hORxwEsAYBPgzIhEBwBEWBwSBVwAIG3Va + x1xoR2Q7AOcYYchcCQxEQAWphxETgiwB2M06gL8JGAOU + GgERoFZHLATmBvAwAH4Esdg / 6k3Tj1iCyFcIDENABKh1EQuB9wD4SqDgewM4LlAshREC0xEQAWoxxELgYgDvCBT8FgBrBoqlMEJABKg1EBWBxevX3 + cGnGVVAHcGjKdQQgB6AtQiiIHARyuRg88EDnw0gP0Dx1S4niMgAuz5AohU / m0A3hQ4Nj + oUEFGJgSCISACDAalAtUIrA7g1khobAbgskixFbaHCIgAe9j0yCV / DsA + keY4E8COkWIrbA8REAH2sOkRS34egIcqYVOKnsawP9RH456IEVwx + 4eACLB / PY9Z8TsBXBRzAgDvr5RlTo08h8L3BAERYE8a3VKZXwWwfeS5rgawUeQ5FL4nCIgAe9LoFsqk3h + /1M7VwlyvB3B/C / NoisIREAEW3uAWy / sggC + 0NN / BAA5vaS5NUzACIsCCm9tyadcBWK + lOXmD3AotzaVpCkZABFhwc1ssbTkA97Q4H6daF8ANLc + p6QpDQARYWEM7KudQAIe0PLfk8lsGvMTpRIAldrX9mu4F8IaWp32sPhonufyWgS9pOhFgSd3sppb1AVzTzdR4N4BzO5pb0xaAgAiwgCZ2XMLJ9ebkLtK4oDp5snUXE2vOMhAQAZbRx66qmKc++rZgRwlQLp + 3xv20o / k1beYIiAAzb2DH6b8XwFkd5yC5 / I4bkPP0IsCcu9d97pcA2LzjNL4NYK2Oc9D0mSIgAsy0cQmk / Zr66FsKa0hy + QksiBxTSGHx5oibcgb2A0CZ + hTsKAAHpJCIcsgLARFgXv1KKdvvAFgtkYQkl59II3JLQwSYW8fSyHcNALyqMiWTXH5K3cgkFxFgJo1KLM1jAPDra0omufyUupFJLiLATBqVUJrPr / f + LZZQTkzl9 / XROMnlJ9aYlNMRAabcnTRz2wLAhWmmhl0BfDnR3JRWggiIABNsSuIpnQ08fQY3RbsKwMYpJqac0kRABJhmX1LN6uX16++cqSYIYBkADyScn1JLCAERYELNyCCV3QFQhy9lk1x + yt1JLDcRYGINSTyd62sl5pTTnAZgxZQTVG7pICACTKcXqWeyfPX7GsklB1sHwI05JKocu0VABNgt / jnN / ikAfL3MwU6stsXsmUOiyrFbBESA3eKf0 + z3AeB9vDkY5fKpE / hUDskqx + 4QEAF2h31OM28A4OqcEq636kguP7OmtZ2uCLBtxPOc7xTg6U3GOZnk8nPqVke5igA7Aj6jaeet9 / 4tkFHOTPXv9dE4yeVn1rg20xUBtol2nnO9DwCFBnK0vQAcn2PiyrkdBESA7eCc8yyXAtg00wIkl59p49pKWwTYFtJ5zsMvqQ / lmfr0rCWXn3kDY6YvAoyJbv6xPwaAcvM5m + Tyc + 5e5NxFgJEBzjz87QD4BJWz8Ql2qZwLUO7xEBABxsM298hrVtdN3mws4loA6xtjhHDnb5iXhwikGGUhIAIsq58hqzkWAL + iWmw7ANQP7NrOALBT10lo / vQQEAGm15MUMpqt / vjxKkMy3If3QgD / Z4gRypVy + fyg85tQARWnDAREgGX0MXQVW1a / m / EkhcVOB7BzIgTIOiSXb + lmob4iwEIbayzrHADvMsZ4C4CbEiJAyeUbG1qiuwiwxK7aanpF / fo7hyHMIwCmbo1L4RV4qhTJ5RuaWqKrCLDErtpq + hAA6ulZ7DAAh9QBUiLAjwM4wlKYfMtCQARYVj9DVHMDgLcaA / GDw78nSICSyzc2tjR3EWBpHbXVswKA79lC4LZKjn6NgRgpPQEyLcnlGxtckrsIsKRu2mvhqytfEy22G4CTEyZAyeVbuluYrwiwsIYay / lBfa + uJcxcAP6SMAH + vNYJlFy + pcuF + IoAC2lkgDI2AnClMc75ALaZKUZqr8BMj1t8vm6sVe4FICACLKCJgUo4FcAuxlibALgiAwIcRtTG0uWeIwIiwBy7Fj7n + eq9fy81hH4CwDDZ / BSfAHlMj1 + qHzXUK9cCEBABFtDEACXsAICCARY7DsDeQwKkSIBMU3L5lm4X4isCLKSRxjIuA8DXV4txC83dGREgpb7WthQs3 / wREAHm30NrBUsC + KExyL0AlhsRI9UnQKa7CoC7jLXLPWMERIAZNy9Q6vsDONIY66MAPpchAbLuA421yz1jBESAGTcvUOp3AljZGGshAL / KkAAll29sfO7uIsDcO2jLf61assoS5erq + Bz3EI6ylF + BmbPk8i3dz9xXBJh5A43p88vtR4wxJm0qTp0AJZdvXAA5u4sAc + 6eLfcXVKc2HgawqCHMXwHMPsE / dQL8XX00TnL5hoWQq6sIMNfO2fPeutoMfJ4xzJdrqflxYVInQObOEzCnGbGQe4YIiAAzbFqglM + tNPu2Ncbib4jfzvwJkOlLLt + 4EHJ1FwHm2jlb3ovUR98mvb6Om + XHABZvkEYOT4AsQ3L5DZpZ2hARYGkdbVbPHgA + 32zoyFGHVv / nkw1i5EKAkstv0MzShogAS + tos3puBMBb2yzGpz8 + BU6yXAiQStgrTSpG / 78sBESAZfWzSTUrAvhuk4FjxtxS7R9cs2GMXAiQ5fAulG81rEvDCkBABFhAEx1LOBzAQY4 + Mw93uWQ8JwLkzwIfNmIj94wQEAFm1KxAqT4AYGljrDkBPNkwRk4ESLl86gRyf6OsBwiIAHvQ5IESNx6i2OyKAKXkefqjqeVEgKxp0smWpnVrXAYIiAAzaFLAFLlxeWdjPJIo9801tdwIUHL5TTtbwDgRYAFNbFjCi + ujb / M3HD9sGBVfqPziYrkR4N / qo3GSy3fpcqZjRYCZNs4j7Z0CHPc6prrycl / HuXMjQJZHgYgTHOvU8AwREAFm2DTPlC + vJOvf7uk75UbVZ6o / u1iOBCi5fJcOZzxWBJhx8xxSXwrAgw7jhw29p / qAsrxHjBwJkGVKLt + j2bm5iABz65hfvgcA + LSf63Qv3vhG / UBXy5UAJZfv2ukMx4sAM2yaR8q8 + Md6zGtBAL / 2mDtXAuRFUdb9kh5wyaVNBESAbaLdzVy8 + tF6vOsKw7WZuRIgu8WrQlm7rFAERICFNnagrOMDHO / aptoawv1xPpYzAZ4eYN + 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";
        this.createNorthPointerBox(pdf, pageMargin, northPointerBase64Encoded, map);
      }
     
      const timestamp = new Date().toISOString();
      const title = (
        document.getElementById("gifw-print-title") as HTMLInputElement
      ).value;

      pdf.setProperties({
        title: `${title.length !== 0 ? title : "Map"}`,
        creator: map.config.name,
      });
      await pdf.save(
        `${
          title.length !== 0 ? title.substring(0, 20) : "Map"
        }_${timestamp}.pdf`,
        { returnPromise: true },
      );
    } catch (ex) {
      console.error(ex);
      success = false;
    } finally {
      document.getElementById(map.id).dispatchEvent(
        new CustomEvent("gifw-print-finished", {
          detail: { success: success, keyWasMoved: keyWasMoved },
        }),
      );
      window.clearTimeout(this._timeoutId);
      this.resetMap(map, size, viewResolution);
    }
  }

  /**
   * Sets the map to the appropriate size required for printing
   * @param olMap - The OpenLayers map reference
   * @param mapWidth
   * @param mapHeight
   * @param pageOrientation
   * @param resolution
   * @param scale
   */
  private setMapSizeForPrinting(
    olMap: Map,
    mapWidth: number,
    mapHeight: number,
    pageOrientation: "p" | "l",
    resolution: number,
    scale?: number,
  ): void {
    const extent = olMap.getView().calculateExtent();
    const center = olMap.getView().getCenter();
    const minX = extent[0];
    const minY = extent[1];
    const maxX = extent[2];
    const maxY = extent[3];
    const centX = center[0];
    const centY = center[1];
    //We slightly abuse the 'fit' extent functionality to make prints fit
    //better regardless of user screen size. The extent is calculated based
    //on the left and right hand extents of the map only when in landscape, and
    //top and bottom only when in portrait. We set the other extent values to
    //be the center x or y, forcing the 'fit' function to ignore the width or height
    //
    //Imagine the x's below as the bounding box we are passing to the fit function
    //
    //   |--------x--------|
    //   |        x        |      Portrait extent (marked by x)
    //   |        x        |
    //   |        x        |
    //   |        x        |
    //   |        x        |
    //   |--------x--------|
    //
    //   |-----------------|
    //   |                 |      Landscape extent (marked by x)
    //   |                 |
    //   |xxxxxxxxxxxxxxxxx|
    //   |                 |
    //   |                 |
    //   |-----------------|

    let printExtent = [minX, centY, maxX, centY];
    if (pageOrientation === "p") {
      printExtent = [centX, minY, centX, maxY];
    }

    const printSize = [mapWidth, mapHeight];
    olMap.setSize(printSize);

    const scaleResolution =
      scale /
      olProj.getPointResolution(
        olMap.getView().getProjection(),
        resolution / 25.4,
        olMap.getView().getCenter(),
      );
    const viewResolution = olMap.getView().getResolution();
    const isScalePrint = scale ? true : false;
    const size = olMap.getSize();

    if (isScalePrint) {
      olMap.getView().setResolution(scaleResolution);
    } else {
      const scaling = Math.min(mapWidth / size[0], mapHeight / size[1]);
      olMap.getView().setResolution(viewResolution / scaling);
    }

    olMap.getView().fit(printExtent, { size: printSize });
  }

  /**
   * Resets the map to the view before the print was triggered
   * @param map
   * @param size
   * @param viewResolution
   */
  private resetMap(map: GIFWMap, size: number[], viewResolution: number): void {
    const olMap = map.olMap;
    olMap.setSize(size);
    olMap.getView().setResolution(viewResolution);
  }

  private createLayerCanvas(
    canvas: HTMLCanvasElement,
    mapContext: CanvasRenderingContext2D,
  ) {
    if (canvas.width > 0) {
      const opacity = (canvas.parentNode as HTMLElement).style.opacity;
      const filter = (canvas.parentNode as HTMLElement).style.filter;
      mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
      mapContext.filter = filter === "" ? "none" : filter;

      const transform = canvas.style.transform;
      // Get the transform parameters from the style's transform matrix
      const matrix = transform
        .match(/^matrix\(([^(]*)\)$/)[1]
        .split(",")
        .map(Number);
      // Apply the transform to the export map context
      CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
      mapContext.drawImage(canvas, 0, 0);
    }
  }

  /**
   * Creates a white background canvas to put the map on to
   * @param mapContext
   * @param width
   * @param height
   */
  private createBackgroundCanvas(
    mapContext: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const backgroundCanvas: HTMLCanvasElement =
      document.createElement("canvas");
    const ctx = backgroundCanvas.getContext("2d");
    backgroundCanvas.width = width;
    backgroundCanvas.height = height;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    mapContext.drawImage(backgroundCanvas, 0, 0);
  }

  /**
   * Creates the title box with the title, subtitle and date
   * @param pdf
   * @param pageMargin
   * @param pageSettings
   */
  private createTitleBox(
    pdf: jsPDF,
    pageMargin: number,
    pageSettings: PDFPageSetting,
  ): void {
    /*process title, subtitle and date*/
    const title = (
      document.getElementById("gifw-print-title") as HTMLInputElement
    ).value;
    const subtitle = (
      document.getElementById("gifw-print-subtitle") as HTMLInputElement
    ).value;
    const dateString = `Date: ${new Date().toLocaleDateString()}`;
    const maxTitleWidth =
      ((pdf.internal.pageSize.width - pageMargin * 2) / 100) * 75;

    const rectangleDims = this.getTitleBoxRequiredDimensions(
      pdf,
      pageMargin,
      pageSettings,
    );
    /*now add the actual text*/
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(0, 0, 0);
    pdf.setTextColor(0, 0, 0);
    pdf.rect(
      pageMargin / 2,
      pageMargin / 2,
      rectangleDims.TotalWidth,
      rectangleDims.TotalHeight,
      "DF",
    );
    /*add title*/
    pdf.setFontSize(pageSettings.titleFontSize);
    if (title.length !== 0) {
      pdf.text(
        title,
        pageMargin / 2 + 2,
        pageMargin / 2 + pdf.getTextDimensions(title).h + 2,
        { maxWidth: maxTitleWidth },
      );
    }
    /*add subtitle*/
    pdf.setFontSize(pageSettings.subtitleFontSize);
    if (subtitle.length !== 0) {
      pdf.text(
        subtitle,
        pageMargin / 2 + 2,
        rectangleDims.TitleHeight +
          pageMargin / 2 +
          pdf.getTextDimensions(subtitle).h +
          2,
        { maxWidth: maxTitleWidth },
      );
    }
    /*add date*/
    pdf.text(
      dateString,
      pageMargin / 2 + 2,
      rectangleDims.TitleHeight +
        rectangleDims.SubtitleHeight +
        pageMargin / 2 +
        pdf.getTextDimensions(dateString).h +
        2,
      { maxWidth: maxTitleWidth },
    );
  }

  private getTitleBoxRequiredDimensions(
    pdf: jsPDF,
    pageMargin: number,
    pageSettings: PDFPageSetting,
  ) {
    const title = (
      document.getElementById("gifw-print-title") as HTMLInputElement
    ).value;
    const subtitle = (
      document.getElementById("gifw-print-subtitle") as HTMLInputElement
    ).value;
    const dateString = `Date: ${new Date().toLocaleDateString()}`;
    const maxTitleWidth =
      ((pdf.internal.pageSize.width - pageMargin * 2) / 100) * 75;
    let maxTitleTextWidth = 0;
    let totalTitleBoxHeight = 0;
    let titleLines: string[] = [];
    let totalTitleHeight = 0;
    let totalSubtitleHeight = 0;
    let subtitleLines: string[] = [];

    /*get lines for title*/
    pdf.setFontSize(pageSettings.titleFontSize);
    if (title.length !== 0) {
      titleLines = pdf.splitTextToSize(title, maxTitleWidth);
      titleLines.forEach((l) => {
        maxTitleTextWidth = Math.max(maxTitleTextWidth, pdf.getTextWidth(l));
      });

      totalTitleHeight =
        pdf.getTextDimensions(title, { maxWidth: maxTitleWidth }).h + 2;
      totalTitleBoxHeight = totalTitleHeight;
    }
    /*get lines for subtitle*/
    pdf.setFontSize(pageSettings.subtitleFontSize);
    if (subtitle.length !== 0) {
      subtitleLines = pdf.splitTextToSize(subtitle, maxTitleWidth);
      subtitleLines.forEach((l) => {
        maxTitleTextWidth = Math.max(maxTitleTextWidth, pdf.getTextWidth(l));
      });
      totalSubtitleHeight =
        pdf.getTextDimensions(subtitle, { maxWidth: maxTitleWidth }).h + 2;

      totalTitleBoxHeight += totalSubtitleHeight;
    }
    /*add a line for the date*/
    maxTitleTextWidth = Math.max(
      maxTitleTextWidth,
      pdf.getTextWidth(dateString),
    );
    totalTitleBoxHeight +=
      pdf.getTextDimensions(dateString, { maxWidth: maxTitleWidth }).h + 2;

    totalTitleBoxHeight += 3;
    const totalTitleBoxWidth = maxTitleTextWidth + 5;
    return <TitleBoxDimensions>{
      TotalHeight: totalTitleBoxHeight,
      TotalWidth: totalTitleBoxWidth,
      TitleHeight: totalTitleHeight,
      SubtitleHeight: totalSubtitleHeight,
    };
  }

  /**
   * Creates the Coordinates box
   * @param pdf
   * @param map
   * @param pageMargin
   * @param pageSettings
   */
  private createCoordinatesBox(
    pdf: jsPDF,
    map: GIFWMap,
    pageMargin: number,
    pageSettings: PDFPageSetting,
  ): void {
    let renderedCoordinates: string[] = [];
    const olMap = map.olMap;
    map.customControls.forEach((c) => {
      if (c instanceof GIFWMousePositionControl) {
        let center = olMap.getView().getCenter();
        const destinationProjection = c.getProjectionString(c.projection);
        center = olProj.transform(
          center,
          olMap.getView().getProjection(),
          olProj.get(destinationProjection),
        );
        renderedCoordinates = c.formatCoordinatesAsArray(
          c.projection,
          c.decimals,
          center,
        );
      }
    });
    if (renderedCoordinates.length !== 0) {
      pdf.setFontSize(pageSettings.attributionFontSize);
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(0, 0, 0);
      const maxCoordWidth =
        ((pdf.internal.pageSize.width - pageMargin * 2) / 100) * 25;
      let maxCoordTextWidth = 0;
      renderedCoordinates.forEach((c) => {
        maxCoordTextWidth = Math.max(maxCoordTextWidth, pdf.getTextWidth(c));
      });
      const startingCoordsYPosition =
        pdf.internal.pageSize.height -
        6 -
        (pdf.getTextDimensions(renderedCoordinates[0]).h *
          renderedCoordinates.length -
          1);
      pdf.rect(
        pageMargin / 2,
        startingCoordsYPosition - pageMargin / 2,
        maxCoordTextWidth + 5,
        (pdf.getTextDimensions(renderedCoordinates[0]).h + 1) *
          renderedCoordinates.length +
          3,
        "DF",
      );
      /*NOTE: For some reason, js PDF doesn't like the minutes/seconds characters, so we replace them with reasonable alternatives*/
      renderedCoordinates[0] = renderedCoordinates[0]
        .replace(`′`, `'`)
        .replace(`″`, `"`);
      pdf.text(
        renderedCoordinates[0],
        pageMargin / 2 + 2,
        startingCoordsYPosition - 5,
        { maxWidth: maxCoordWidth },
      );

      if (renderedCoordinates.length === 2) {
        renderedCoordinates[1] = renderedCoordinates[1]
          .replace(`′`, `'`)
          .replace(`″`, `"`);
        pdf.text(
          renderedCoordinates[1],
          pageMargin / 2 + 2,
          startingCoordsYPosition -
            5 +
            (pdf.getTextDimensions(renderedCoordinates[0]).h + 1),
          { maxWidth: maxCoordWidth },
        );
      }
    }
  }

  /**
   * Creates the Attribution box
   * @param pdf
   * @param map
   * @param pageMargin
   * @param pageSettings
   */
  private createAttributionsBox(
    pdf: jsPDF,
    map: GIFWMap,
    pageMargin: number,
    pageSettings: PDFPageSetting,
  ): void {
    const attributionListItems: NodeListOf<HTMLLIElement> = document
      .getElementById(map.id)
      .querySelectorAll(".ol-attribution ul li");
    let attributionText: string = "";
    attributionListItems.forEach((attr) => {
      attributionText += `${attr.innerText} `;
    });
    pdf.setFontSize(pageSettings.attributionFontSize);
    const maxAttrWidth =
      ((pdf.internal.pageSize.width - pageMargin * 2) / 100) * 75;
    let maxAttrTextWidth = 0;
    const attrLines: string[] = pdf.splitTextToSize(
      attributionText,
      maxAttrWidth,
    );
    attrLines.forEach((l) => {
      maxAttrTextWidth = Math.max(maxAttrTextWidth, pdf.getTextWidth(l));
    });

    const attrTotalLines = attrLines.length;
    const startingAttrXPosition = pdf.internal.pageSize.width - pageMargin;
    const startingAttrYPosition =
      pdf.internal.pageSize.height -
      4 -
      ((pdf.getTextDimensions(attributionText).h + 1) * attrTotalLines - 1);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(
      startingAttrXPosition - maxAttrTextWidth + 5,
      startingAttrYPosition - pageMargin / 2,
      maxAttrTextWidth + 5,
      (pdf.getTextDimensions(attributionText).h + 1) * attrTotalLines + 3,
      "DF",
    );

    pdf.text(
      attributionText,
      startingAttrXPosition + 7.5,
      startingAttrYPosition - 5,
      { maxWidth: maxAttrWidth, align: "right" },
    );
  }

  private async createLegend(
    pdf: jsPDF,
    map: GIFWMap,
    pageMargin: number,
    pageSettings: PDFPageSetting,
    legend: LegendPositioningOption,
    pageSize: PageSizeOption,
    pageOrientation: PageOrientationOption,
  ) {
    const legendUrls = map.getLegendURLs(
      `fontAntiAliasing:true;forceLabels:on;hideEmptyRules:true;wrap:true;wrap_limit:${
        pageOrientation === "l"
          ? pageSettings.landscapeKeyWrapLimit
          : pageSettings.portraitKeyWrapLimit
      };`,
    );
    if (legend === "none" || legendUrls.availableLegends.length === 0) {
      return;
    }
    //get images
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const startingX = pageMargin / 2;
    let startingY = pageMargin / 2;
    let currentX = 0;
    let currentY = 0;
    let maxWidth = 0;
    let rectangleWidth = 0;
    let rectangleHeight = 0;
    const legendPromises = this.getLegendImages(legendUrls);
    const allResolvedLegends = await Promise.allSettled(legendPromises);
    const requiredTitleBoxDims = this.getTitleBoxRequiredDimensions(
      pdf,
      pageMargin,
      pageSettings,
    );
    switch (legend) {
      case "pinned-left":
        pdf.setFontSize(pageSettings.titleFontSize);
        rectangleHeight = pageHeight - pageMargin;
        rectangleWidth =
          pageOrientation === "l"
            ? pageSettings.inlineLegendLandscapeMaxWidth
            : pageSettings.inlineLegendPortraitMaxWidth;
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(startingX, startingY, rectangleWidth, rectangleHeight, "S");
        pdf.setFontSize(pageSettings.titleFontSize);
        pdf.text(
          "Map Key",
          pageMargin / 2 + 2,
          pageMargin / 2 + requiredTitleBoxDims.TotalHeight + 2,
          { baseline: "top" },
        );

        startingY =
          pageMargin / 2 +
          pdf.getTextDimensions("Map Key").h +
          7.5 +
          requiredTitleBoxDims.TotalHeight;
        currentX = startingX;
        currentY = startingY;
        pdf.setFontSize(pageSettings.subtitleFontSize);
        allResolvedLegends.forEach((p) => {
          if (p.status === "fulfilled") {
            const layerName = p.value[0];
            const layerNameWidth = pdf.getTextDimensions(layerName).w;
            const img = p.value[1];
            const imgProps = pdf.getImageProperties(img);
            const widthInMM = (imgProps.width * 25.4) / 96;
            const heightInMM = (imgProps.height * 25.4) / 96;
            pdf.text(layerName, currentX + 2, currentY);
            currentY += pdf.getTextDimensions(layerName).h;
            pdf.addImage(img, currentX + 2, currentY, widthInMM, heightInMM);
            if (widthInMM > maxWidth) maxWidth = widthInMM;
            if (layerNameWidth > maxWidth) maxWidth = layerNameWidth;
            currentY += heightInMM + 7.5;
          }
        });
        break;
      case "float-left":
        pdf.setFontSize(pageSettings.titleFontSize);
        rectangleHeight = pdf.getTextDimensions("Map key").h;

        /*get max width required*/
        allResolvedLegends.forEach((p) => {
          if (p.status === "fulfilled") {
            const layerName = p.value[0];
            const layerNameWidth = pdf.getTextDimensions(layerName).w;
            const layerNameHeight = pdf.getTextDimensions(layerName).h;
            const img = p.value[1];
            const imgProps = pdf.getImageProperties(img);
            const widthInMM = (imgProps.width * 25.4) / 96;
            const heightInMM = (imgProps.height * 25.4) / 96;
            rectangleHeight += layerNameHeight + heightInMM + 8;
            if (widthInMM > rectangleWidth) rectangleWidth = widthInMM + 3;
            if (layerNameWidth > rectangleWidth)
              rectangleWidth = layerNameWidth + 3;
          }
        });
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(
          startingX,
          startingY + requiredTitleBoxDims.TotalHeight,
          rectangleWidth,
          rectangleHeight,
          "DF",
        );

        pdf.setFontSize(pageSettings.titleFontSize);
        pdf.text(
          "Map Key",
          pageMargin / 2 + 2,
          pageMargin / 2 + requiredTitleBoxDims.TotalHeight + 2,
          { baseline: "top" },
        );

        startingY =
          pageMargin / 2 +
          pdf.getTextDimensions("Map Key").h +
          7.5 +
          requiredTitleBoxDims.TotalHeight;
        currentX = startingX;
        currentY = startingY;
        pdf.setFontSize(pageSettings.subtitleFontSize);
        allResolvedLegends.forEach((p) => {
          if (p.status === "fulfilled") {
            const layerName = p.value[0];
            const layerNameWidth = pdf.getTextDimensions(layerName).w;
            const img = p.value[1];
            const imgProps = pdf.getImageProperties(img);
            const widthInMM = (imgProps.width * 25.4) / 96;
            const heightInMM = (imgProps.height * 25.4) / 96;
            pdf.text(layerName, currentX + 2, currentY);
            currentY += pdf.getTextDimensions(layerName).h;
            pdf.addImage(img, currentX + 2, currentY, widthInMM, heightInMM);
            if (widthInMM > maxWidth) maxWidth = widthInMM;
            if (layerNameWidth > maxWidth) maxWidth = layerNameWidth;
            currentY += heightInMM + 7.5;
          }
        });

        break;
      case "separate-page":
        pdf.addPage(pageSize, pageOrientation);
        pdf.setFontSize(pageSettings.standaloneLegendTitleFontSize);
        pdf.text("Map Key", pageMargin / 2, pageMargin / 2 + 3);

        startingY = pageMargin / 2 + pdf.getTextDimensions("Map Key").h + 7.5;
        currentX = startingX;
        currentY = startingY;
        pdf.setFontSize(pageSettings.titleFontSize);
        allResolvedLegends.forEach((p) => {
          if (p.status === "fulfilled") {
            const layerName = p.value[0];
            const layerNameWidth = pdf.getTextDimensions(layerName).w;
            const img = p.value[1];
            const imgProps = pdf.getImageProperties(img);
            let widthInMM = (imgProps.width * 25.4) / 96;
            let heightInMM = (imgProps.height * 25.4) / 96;
            if (
              currentY + heightInMM + pdf.getTextDimensions(layerName).h >=
              pageHeight - pageMargin
            ) {
              currentX = pageMargin / 2 + maxWidth + 7.5;
              currentY = startingY;
            }

            if (widthInMM > pageWidth - pageMargin) {
              //key is wider than page.
              const originalWidth = widthInMM;
              widthInMM = pageWidth - pageMargin - startingX;
              const scaleRatio = widthInMM / originalWidth;
              heightInMM = heightInMM * scaleRatio;
            }
            if (heightInMM > pageHeight - pageMargin) {
              //key is taller than page
              const originalHeight = heightInMM;
              heightInMM = pageHeight - pageMargin - startingY;
              const scaleRatio = heightInMM / originalHeight;
              widthInMM = widthInMM * scaleRatio;
            }

            if (
              widthInMM + currentX > pageWidth - pageMargin ||
              layerNameWidth + currentX > pageWidth - pageMargin
            ) {
              //key or title would overflow page edge
              //add to new page
              pdf.addPage(pageSize, pageOrientation);
              pdf.setFontSize(pageSettings.standaloneLegendTitleFontSize);
              pdf.text("Map Key (cont.)", pageMargin / 2, pageMargin / 2 + 3);
              pdf.setFontSize(pageSettings.titleFontSize);
              currentX = startingX;
              currentY = startingY;
              maxWidth = 0;
            }
            pdf.text(layerName, currentX, currentY);
            currentY += pdf.getTextDimensions(layerName).h;
            pdf.addImage(img, currentX, currentY, widthInMM, heightInMM);
            if (widthInMM > maxWidth) maxWidth = widthInMM;
            if (layerNameWidth > maxWidth) maxWidth = layerNameWidth;
            currentY += heightInMM + 7.5;
          }
        });
        break;
    }
  }

  private getLegendImages(legendUrls: LegendURLs) {
    const promises: Promise<[string, HTMLImageElement]>[] = [];
    legendUrls.availableLegends.forEach((legend) => {
      promises.push(
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            if (img.width < 5) {
              reject(`No legend available for ${legend.name}`);
            }
            resolve([legend.name, img]);
          };
          img.onerror = () => reject("Image load failed");
          img.src = legend.legendUrl;
        }),
      );
    });
    return promises;
  }

  /**
   * Gets the logo defined in the print configuration and converts it to a base64 string
   * */
  private async getLogo(): Promise<string | ArrayBuffer> {
    const resp = await fetch(this.printConfiguration.logoURL);
    if (resp.ok) {
      const blobImg = await resp.blob();

      return this.blobToBase64(blobImg);
    } else {
      throw Error("There was a network error.");
    }
  }


  /**
 * Gets the north pointer defined in the print configuration and converts it to a base64 string
 * */
  //private async getNorthArrow(): Promise<string | ArrayBuffer> {
  //  const resp = await fetch(this.printConfiguration.northArrowURL);
  //  if (resp.ok) {
  //    const blobImg = resp.blob();

  //    return this.blobToBase64(blobImg);
  //  } else {
  //    throw Error("There was a network error.");
  //  }
  //}

  private async keyWillFit(
    map: GIFWMap,
    pageMargin: number,
    pageSettings: PDFPageSetting,
    legend: LegendPositioningOption,
    pageSize: PageSizeOption,
    pageOrientation: PageOrientationOption,
  ) {
    if (legend === "none" || legend === "separate-page") {
      return true;
    }

    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: "mm",
      format: pageSize,
    });

    const pageHeight = pdf.internal.pageSize.getHeight();

    if (legend === "pinned-left" || legend === "float-left") {
      //does legend fit
      const legendUrls = map.getLegendURLs(
        `fontAntiAliasing:true;forceLabels:on;hideEmptyRules:true;wrap:true;wrap_limit:${
          pageOrientation === "l"
            ? pageSettings.landscapeKeyWrapLimit
            : pageSettings.portraitKeyWrapLimit
        };`,
      );
      const legendPromises = this.getLegendImages(legendUrls);
      const promises = await Promise.allSettled(legendPromises);
      //calculate width and height required
      pdf.setFontSize(pageSettings.titleFontSize);
      let totalRequiredHeight = pdf.getTextDimensions("Map key").h;
      let totalRequiredWidth = pdf.getTextDimensions("Map key").w;
      pdf.setFontSize(pageSettings.subtitleFontSize);
      promises.forEach((p) => {
        if (p.status === "fulfilled") {
          const layerName = p.value[0];
          const layerNameWidth = pdf.getTextDimensions(layerName).w;
          const layerNameHeight = pdf.getTextDimensions(layerName).h;
          totalRequiredHeight += layerNameHeight;
          if (totalRequiredWidth < layerNameWidth)
            totalRequiredWidth = layerNameWidth;

          const img = p.value[1];
          const imgProps = pdf.getImageProperties(img);
          const widthInMM = (imgProps.width * 25.4) / 96;
          const heightInMM = (imgProps.height * 25.4) / 96;

          totalRequiredHeight += heightInMM;
          if (totalRequiredWidth < widthInMM) totalRequiredWidth = widthInMM;
        }
      });
      const requiredTitleBoxDims = this.getTitleBoxRequiredDimensions(
        pdf,
        pageMargin,
        pageSettings,
      );
      if (
        totalRequiredHeight >
        pageHeight - pageMargin - requiredTitleBoxDims.TotalHeight
      ) {
        return false;
      }
      if (
        totalRequiredWidth >
        (pageOrientation === "l"
          ? pageSettings.inlineLegendLandscapeMaxWidth
          : pageSettings.inlineLegendPortraitMaxWidth)
      ) {
        return false;
      }
      return true;
    }
  }

  /**
   * Converts a blob to a base64 string
   *
   * @param blob - The blob to convert to base64
   * @author https://stackoverflow.com/a/18650249/863487
   */
  private blobToBase64(blob: Blob): Promise<string | ArrayBuffer> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Creates the logo box and inserts the logo image
   * @param pdf
   * @param pageMargin
   * @param imgData - The base64 encoded image
   */
  private createLogoBox(pdf: jsPDF, pageMargin: number, imgData: string): void {
    const imgProps = pdf.getImageProperties(imgData);
    let newWidth = imgProps.width;
    let newHeight = imgProps.height;
    const maxLogoWidth = 40;
    const maxLogoHeight = 8;
    const ratio = imgProps.height / imgProps.width;

    if (imgProps.height > maxLogoHeight || imgProps.width > maxLogoWidth) {
      if (imgProps.height > imgProps.width) {
        newHeight = maxLogoHeight;
        newWidth = newHeight * (1 / ratio);
      } else {
        newWidth = maxLogoWidth;
        newHeight = newWidth * ratio;
      }
    }

    pdf.addImage(
      imgData,
      pdf.internal.pageSize.width - newWidth - pageMargin / 2 - 1,
      pageMargin / 2 + 1,
      newWidth,
      newHeight,
    );
  }

  /**
 * Creates the north pointer box and inserts the north pointer image
 * @param pdf
 * @param pageMargin
 * @param northPointerBase64Encoded - The base64 encoded north pointer image
 */
  private createNorthPointerBox(pdf: jsPDF, pageMargin: number, northPointerBase64Encoded: string, map: GIFWMap): void {
    const imgProps = pdf.getImageProperties(northPointerBase64Encoded);
    let newWidth = imgProps.width;
    let newHeight = imgProps.height;
    const maxNorthPointerWidth = 15;
    const maxNorthPointerHeight = 15;
    const ratio = imgProps.height / imgProps.width;
    const olMap = map.olMap;
    const mapRotationRadians = olMap.getView().getRotation(); //in radians
    const mapRotationDegrees = mapRotationRadians * -180 / Math.PI; //convert to degrees

    if (imgProps.height > maxNorthPointerHeight || imgProps.width > maxNorthPointerWidth) {
      if (imgProps.height > imgProps.width) {
        newHeight = maxNorthPointerHeight;
        newWidth = newHeight * (1 / ratio);
      } else {
        newWidth = maxNorthPointerWidth;
        newHeight = newWidth * ratio;
      }
    }

    //TODO - fiddle with these values in the if statement, values here are wrong, just in as placeholders
    let pageMarginX = 0;
    let pageMarginY = 0;

    if (mapRotationDegrees >= 0 && mapRotationDegrees <= 90 ) {
      pageMarginX = pageMargin / 2 - 1;
      pageMarginY = pageMargin / 2 + 25;
    } else if (mapRotationDegrees >= 91 && mapRotationDegrees <= 180) {
      pageMarginX = pageMargin / 2 - 1;
      pageMarginY = pageMargin / 2 - 25;
    } else if (mapRotationDegrees <= -1 && mapRotationDegrees >= -90) {
      pageMarginX = pageMargin / 2;
      pageMarginY = pageMargin / 2 + 25;
    } else if (mapRotationDegrees <= -91 && mapRotationDegrees >= -179) {
      pageMarginX = pageMargin / 2;
      pageMarginY = pageMargin / 2 - 25;
    } else {
      pageMarginX = pageMargin / 2 - 1;
      pageMarginY = pageMargin / 2 + 25;
    }

    pdf.addImage(
      northPointerBase64Encoded,
      "PNG",
      pdf.internal.pageSize.width - newWidth - pageMarginX,
      pageMarginY,
      //pdf.internal.pageSize.width - newWidth - pageMargin / 2 - 1,
      //pageMargin / 2 + 25,
      newWidth,
      newHeight,
      undefined,
      undefined,
      mapRotationDegrees,
    );
  }

}
