﻿import jsPDF from "jspdf";
import { Map } from "ol";
import * as olProj from "ol/proj";
import { Size } from "ol/size";
import * as olControl from "ol/control";
import { LegendURLs } from "./Interfaces/LegendURLs";
import {
  PDFPageSetting,
  PDFPageSettings,
} from "./Interfaces/Print/PDFPageSettings";
import { PrintConfiguration } from "./Interfaces/Print/PrintConfiguration";
import { GIFWMap } from "./Map";
import { GIFWMousePositionControl } from "./MousePositionControl";
import html2canvas from 'html2canvas';

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
  printConfiguration: PrintConfiguration;
  _timeoutId: number;
  _maxProcessingTime: number = 60000;
  startingAttrYPosition: number;
  ONE_INCH: 25.4;
  DEFAULT_SCREEN_RESOLUTION: 96;

  constructor(
    pageSettings: PDFPageSettings,
    printConfiguration: PrintConfiguration,
  ) {
    this.pageSettings = pageSettings;
    this.printConfiguration = printConfiguration;
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
        this.ONE_INCH,
    ); //pixels
    const height = Math.round(
      ((pageOrientation === "l"
        ? chosenPageSettings.pageHeight
        : chosenPageSettings.pageWidth) *
        resolution) /
        this.ONE_INCH,
    ); //pixels
    const pageMargin = 20; //mm
    let legendMargin = 0; //mm
    if (legend === "pinned-left") {
      legendMargin =
        (pageOrientation === "l"
          ? chosenPageSettings.inlineLegendLandscapeMaxWidth
          : chosenPageSettings.inlineLegendPortraitMaxWidth) | 0;
    }
    const mapWidth = width - ((pageMargin + legendMargin) * resolution) / this.ONE_INCH; //pixels
    const mapHeight = height - (pageMargin * resolution) / this.ONE_INCH; // pixels
    const originalMapSize = olMap.getSize();
    const viewResolution = olMap.getView().getResolution();

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
          width - ((pageMargin + legendMargin) * resolution) / this.ONE_INCH; //pixels
        const mapHeight = height - (pageMargin * resolution) / this.ONE_INCH; // pixels
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

      const scalebarCheckbox = (document.getElementById(
        "gifw-print-scale-bar",
      ) as HTMLInputElement);
      if (scalebarCheckbox.checked) {
        try {
          const scaleImg = await this.getScaleLine();
          const imgData = scaleImg;
          await this.createScalebarBox(pdf, pageMargin, imgData, this.startingAttrYPosition);
        } catch (ex) {
          console.warn(`Getting the scaleline for a print failed.`);
          console.error(ex);
        }
      }
      
      try {
        const logoResp = await this.getLogo();
        const imgData = <string>logoResp;
        this.createLogoBox(pdf, pageMargin, imgData);
      } catch (ex) {
        console.warn(`Getting the logo for a print failed.`);
        console.error(ex);
      }

      const northPointerCheckBox = document.getElementById(
        "gifw-print-north-pointer",
      ) as HTMLInputElement;
      if (northPointerCheckBox.checked) {
        try {
          const northPointerResp = await this.getNorthArrow();
          const imgData = <string>northPointerResp;
          await this.createNorthPointerBox(pdf, pageMargin, imgData, map);
        } catch (ex) {
          console.warn(`Getting the north arrow for a print failed.`);
          console.error(ex);
        }
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
        resolution / this.ONE_INCH,
        olMap.getView().getCenter(),
      );
    const viewResolution = olMap.getView().getResolution();
    const isScalePrint = scale ? true : false;
    const size = olMap.getSize();

    const scaleLineCtrl = olMap.getControls().getArray().filter(c => c instanceof olControl.ScaleLine);
    (scaleLineCtrl[0] as olControl.ScaleLine).setDpi(scaleResolution);

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
    this.startingAttrYPosition =
      pdf.internal.pageSize.height -
      4 -
      ((pdf.getTextDimensions(attributionText).h + 1) * attrTotalLines - 1);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(
      startingAttrXPosition - maxAttrTextWidth + 5,
      this.startingAttrYPosition - pageMargin / 2,
      maxAttrTextWidth + 5,
      (pdf.getTextDimensions(attributionText).h + 1) * attrTotalLines + 3,
      "DF",
    );

    pdf.text(
      attributionText,
      startingAttrXPosition + 7.5,
      this.startingAttrYPosition - 5,
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
            const widthInMM = (imgProps.width * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
            const heightInMM = (imgProps.height * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
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
            const widthInMM = (imgProps.width * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
            const heightInMM = (imgProps.height * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
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
            const widthInMM = (imgProps.width * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
            const heightInMM = (imgProps.height * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
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
            let widthInMM = (imgProps.width * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
            let heightInMM = (imgProps.height * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
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
  private async getNorthArrow(): Promise<string | ArrayBuffer> {
    const resp = await fetch(this.printConfiguration.northArrowURL);
    if (resp.ok) {
      const blobImg = await resp.blob();

      return this.blobToBase64(blobImg);
    } else {
      throw Error("There was a network error.");
    }
  }

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
          const widthInMM = (imgProps.width * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;
          const heightInMM = (imgProps.height * this.ONE_INCH) / this.DEFAULT_SCREEN_RESOLUTION;

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
    const maxLogoHeight = 20;
    const ratio = imgProps.height / imgProps.width;

    if (imgProps.height > maxLogoHeight || imgProps.width > maxLogoWidth) {
      if (imgProps.height >= imgProps.width) {
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
   * Gets the scale line control and adds to canvas using html2canvas. 
   * Due to the way OpenLayers works, the scale bar uses additional options for html2canvas
   * that adjust the size of the canvas selected to make sure to include the scale numbers and text properly.
   * @returns
   */
  private async getScaleLine() {
    const scalelineData: HTMLElement = document.querySelector("div.ol-scale-line");

    if (scalelineData != null) {
      const canvas = await html2canvas(scalelineData, { backgroundColor: null });
      return canvas.toDataURL('image/png');
    } else {
      const scalelineData: HTMLElement = document.querySelector("div.ol-scale-bar");
      const canvas = await html2canvas(scalelineData, { backgroundColor: null, width: scalelineData.clientWidth + 20, height: scalelineData.clientHeight + 20, x: -5, y: -15 });
      return canvas.toDataURL('image/png');
    }
  }

  /**
 * Creates the scalebar box and inserts the scale bar or scale line
 * @param pdf
 * @param pageMargin
 * @param imgData - The base64 encoded image
 * @param startingAttrYPosition - The starting Y position of the attribution
 */
  private createScalebarBox(pdf: jsPDF, pageMargin: number, imgData: string, startingAttrYPosition: number): void {
    const imgProps = pdf.getImageProperties(imgData);
    const printResolution = parseInt(
      (document.getElementById("gifw-print-resolution") as HTMLSelectElement)
        .value,
    );
    const newWidth = (imgProps.width) * this.ONE_INCH / printResolution;
    const newHeight = (imgProps.height) * this.ONE_INCH / printResolution;

    // Y Height is adjusted here due to OpenLayers interpretting pixels differently depending on DPI chosen
    let adjustedYHeight = 0;
    if (printResolution <= 96) {
      adjustedYHeight = 15;
    } else if (printResolution <= 150) {
      adjustedYHeight = 10;
    } else if (printResolution <= 200) {
      adjustedYHeight = 8;
    } else {
      adjustedYHeight = 6;
    }

    pdf.addImage(
      imgData,
      pdf.internal.pageSize.width - newWidth - pageMargin / 2 - 4,
      startingAttrYPosition - pageMargin / 2 - adjustedYHeight,
      newWidth,
      newHeight,
    );
  }

  /**
   * Creates the north pointer box and inserts the north pointer image
   * @param pdf
   * @param pageMargin
   * @param imgData - The base64 encoded north pointer image
   */
  private async createNorthPointerBox(
    pdf: jsPDF,
    pageMargin: number,
    imgData: string,
    map: GIFWMap,
  ) {
    const olMap = map.olMap;
    const mapRotationRadians = olMap.getView().getRotation(); //in radians
    const mapRotationDegrees = (mapRotationRadians * -180) / Math.PI; //convert to degrees
    const rotatedImage = await this.rotateBase64Image(
      imgData,
      mapRotationDegrees,
    );
    const imgProps = pdf.getImageProperties(rotatedImage);
    let newWidth = imgProps.width;
    let newHeight = imgProps.height;
    const maxNorthPointerWidth = 15;
    const maxNorthPointerHeight = 15;
    const ratio = imgProps.height / imgProps.width;

    if (
      imgProps.height > maxNorthPointerHeight ||
      imgProps.width > maxNorthPointerWidth
    ) {
      if (imgProps.height >= imgProps.width) {
        newHeight = maxNorthPointerHeight;
        newWidth = newHeight * (1 / ratio);
      } else {
        newWidth = maxNorthPointerWidth;
        newHeight = newWidth * ratio;
      }
    }

    pdf.addImage(
      rotatedImage,
      "PNG",
      pdf.internal.pageSize.width - newWidth - pageMargin / 2 - 4,
      pageMargin / 2 + 25,
      newWidth,
      newHeight,
      undefined,
      undefined,
      0,
    );
  }

  /**
   * Rotates an image based on the rotation of the base map.
   * @param srcBase64
   * @param degrees
   * @returns
   */
  private async rotateBase64Image(
    srcBase64: string,
    degrees: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = degrees % 180 === 0 ? img.width : img.height;
        canvas.height = degrees % 180 === 0 ? img.height : img.width;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / -180);
        ctx.drawImage(img, img.width / -2, img.height / -2);
        resolve(canvas.toDataURL());
      };
      img.onerror = reject;
      img.src = srcBase64;
    });
  }
}
