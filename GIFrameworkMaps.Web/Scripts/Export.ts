import jsPDF from "jspdf";
import { Map, } from "ol";
import * as olProj from "ol/proj";
import { PDFPageSetting, PDFPageSettings } from "./Interfaces/Print/PDFPageSettings";
import { PrintConfiguration } from "./Interfaces/Print/PrintConfiguration";
import { GIFWMap } from "./Map";
import { GIFWMousePositionControl } from "./MousePositionControl";
import { Util } from "./Util";


export class Export {
    pageSettings: PDFPageSettings;
    printConfigUrl: string;;
    printConfiguration: PrintConfiguration;
    _timeoutId: number;
    _maxProcessingTime: number = 60000;

    constructor(pageSettings: PDFPageSettings, printConfigUrl: string) {
        this.pageSettings = pageSettings;
        this.printConfigUrl = printConfigUrl;
        this.init();
    }

    init() {
        //ajax call to get print configuration

        fetch(this.printConfigUrl).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json() as Promise<PrintConfiguration>;
        }).then(data => {
            this.printConfiguration = data;
        }).catch(error => {
            console.error("Failed to get print configuration", error);
            let errDialog = new Util.Error(Util.AlertType.Popup, Util.AlertSeverity.Danger, "Error getting print configs", "<p>There was an error getting the print config for this version</p><p>This means the print functionality will not work. Please refresh the page to try again</p>")
            errDialog.show();
            document.getElementById('gifw-print-form').innerHTML =
                `<div class="text-center">
                    <i class="bi bi-exclamation-diamond-fill text-danger fs-1"></i>
                    <p class="fs-4">There was an error loading the print configuration</p>
                    <p>Printing is unavailable. Refresh the page to try again.</p>
                </div>`
        });
    }

    public createPDF(
        map: GIFWMap,
        pageSize: "a2" | "a3" | "a4" | "a5",
        pageOrientation: "p" | "l",
        resolution: number,
        abortController: AbortController,
        scale?: number
        
    ): Promise<void> {

        if (abortController.signal.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        const olMap = map.olMap;
        
        const chosenPageSettings = this.pageSettings[pageSize];
        const width = Math.round(((pageOrientation === "l" ? chosenPageSettings.pageWidth : chosenPageSettings.pageHeight) * resolution) / 25.4);
        const height = Math.round(((pageOrientation === "l" ? chosenPageSettings.pageHeight : chosenPageSettings.pageWidth) * resolution) / 25.4);
        const pageMargin = 20;
        const mapWidth = width - pageMargin;
        const mapHeight = height - pageMargin;
        const size = olMap.getSize();
        const viewResolution = olMap.getView().getResolution();

        let promise = new Promise<void>((resolve, reject) => {

            let evt = olMap.once('rendercomplete', () => {
                try {

                    const pdf = new jsPDF({
                        orientation: pageOrientation,
                        unit: "mm",
                        format: pageSize
                    });


                    const mapCanvas = document.createElement('canvas');
                    mapCanvas.width = mapWidth;
                    mapCanvas.height = mapHeight;
                    const mapContext = mapCanvas.getContext('2d');

                    this.createBackgroundCanvas(mapContext, width, height);

                    let canvases: NodeListOf<HTMLCanvasElement> = document.querySelectorAll('.ol-layers canvas');
                    canvases.forEach(canvas => {
                        this.createLayerCanvas(canvas,mapContext);
                    });

                    pdf.addImage(
                        mapCanvas.toDataURL('image/jpeg'),
                        'JPEG',
                        pageMargin / 2,
                        pageMargin / 2,
                        (pageOrientation === "l" ? chosenPageSettings.pageWidth - pageMargin : chosenPageSettings.pageHeight - pageMargin),
                        (pageOrientation === "l" ? chosenPageSettings.pageHeight - pageMargin : chosenPageSettings.pageWidth - pageMargin)
                    );
                    pdf.rect(
                        pageMargin / 2,
                        pageMargin / 2,
                        (pageOrientation === "l" ? chosenPageSettings.pageWidth - pageMargin : chosenPageSettings.pageHeight - pageMargin),
                        (pageOrientation === "l" ? chosenPageSettings.pageHeight - pageMargin : chosenPageSettings.pageWidth - pageMargin),
                        "S"
                    );

                    this.createTitleBox(pdf, pageMargin, chosenPageSettings);
                    
                    this.createCoordinatesBox(pdf,map,pageMargin,chosenPageSettings);

                    this.createAttributionsBox(pdf, map, pageMargin, chosenPageSettings);

                    //get logo async then send the PDF to the user
                    this.getLogo().then((response) => {
                        let imgData = <string>response;
                        this.createLogoBox(pdf, pageMargin, imgData);
                    }).catch((reason) => {
                        console.error(`Getting the logo for a print failed. Reason: ${reason}`);
                    }).finally(() => {
                        let timestamp = new Date().toISOString();
                        let title = (document.getElementById('gifw-print-title') as HTMLInputElement).value;

                        pdf.setProperties({
                            title: `${title.length !== 0 ? title : 'Map'}`,
                            creator: 'GIFrameworkMaps',

                        });
                        resolve(pdf.save(`${title.length !== 0 ? title.substring(0, 20) : 'Map'}_${timestamp}.pdf`, { returnPromise: true }));
                    })

                } catch (ex: any) {
                    console.error(ex);
                    reject('There was an unexpected problem. ')
                } finally {
                    window.clearTimeout(this._timeoutId);
                    this.resetMap(map, size, viewResolution);
                }
            })
            this._timeoutId = window.setTimeout(() => {
                abortController.abort();
            }, this._maxProcessingTime)

            abortController.signal.addEventListener('abort', () => {
                window.clearTimeout(this._timeoutId);
                olMap.removeEventListener('rendercomplete', evt.listener);
                this.resetMap(map, size, viewResolution);
                reject(new DOMException('Aborted', 'AbortError'));
            });

        });
        //deactivate drawing and measure - TODO A more generic event would be probably be better here
        document.getElementById(map.id).dispatchEvent(new Event('gifw-draw-deactivate'));
        document.getElementById(map.id).dispatchEvent(new Event('gifw-measure-deactivate'));
        // Set print size
        this.setMapSizeForPrinting(olMap, mapWidth, mapHeight,pageOrientation, resolution,scale)
        return promise;
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
    private setMapSizeForPrinting(olMap: Map, mapWidth: number, mapHeight: number, pageOrientation:"p"|"l",resolution:number, scale?:number): void {
        

        let extent = olMap.getView().calculateExtent();
        let center = olMap.getView().getCenter();
        let minX = extent[0];
        let minY = extent[1];
        let maxX = extent[2];
        let maxY = extent[3];
        let centX = center[0];
        let centY = center[1];
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
                olMap.getView().getCenter()
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
    private resetMap(map:GIFWMap, size: number[],viewResolution:number): void {
        const olMap = map.olMap;
        olMap.setSize(size);
        olMap.getView().setResolution(viewResolution);
    }

    private createLayerCanvas(canvas: HTMLCanvasElement, mapContext: CanvasRenderingContext2D) {
        if (canvas.width > 0) {
            const opacity = (canvas.parentNode as HTMLElement).style.opacity;
            const filter = (canvas.parentNode as HTMLElement).style.filter;
            mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
            mapContext.filter = filter === '' ? 'none' : filter;
            
            const transform = canvas.style.transform;
            // Get the transform parameters from the style's transform matrix
            const matrix = transform
                .match(/^matrix\(([^\(]*)\)$/)[1]
                .split(',')
                .map(Number);
            // Apply the transform to the export map context
            CanvasRenderingContext2D.prototype.setTransform.apply(
                mapContext,
                matrix
            );
            mapContext.drawImage(canvas, 0, 0);
        }
    }

    /**
     * Creates a white background canvas to put the map on to
     * @param mapContext
     * @param width
     * @param height
     */
    private createBackgroundCanvas(mapContext: CanvasRenderingContext2D,width: number, height: number): void {
        let backgroundCanvas: HTMLCanvasElement = document.createElement('canvas');
        var ctx = backgroundCanvas.getContext("2d");
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
    private createTitleBox(pdf: jsPDF, pageMargin: number, pageSettings:PDFPageSetting): void {
        /*process title, subtitle and date*/
        const title = (document.getElementById('gifw-print-title') as HTMLInputElement).value;
        const subtitle = (document.getElementById('gifw-print-subtitle') as HTMLInputElement).value;
        const dateString = `Date: ${new Date().toLocaleDateString()}`;
        let maxTitleWidth = ((pdf.internal.pageSize.width - (pageMargin * 2)) / 100) * 75;
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
            titleLines.forEach(l => {
                maxTitleTextWidth = Math.max(maxTitleTextWidth, pdf.getTextWidth(l));
            })

            totalTitleHeight = (pdf.getTextDimensions(title, { maxWidth: maxTitleWidth }).h + 2)
            totalTitleBoxHeight = totalTitleHeight;
        }
        /*get lines for subtitle*/
        pdf.setFontSize(pageSettings.subtitleFontSize);
        if (subtitle.length !== 0) {

            subtitleLines = pdf.splitTextToSize(subtitle, maxTitleWidth);
            subtitleLines.forEach(l => {
                maxTitleTextWidth = Math.max(maxTitleTextWidth, pdf.getTextWidth(l));
            })
            totalSubtitleHeight = (pdf.getTextDimensions(subtitle, { maxWidth: maxTitleWidth }).h + 2);

            totalTitleBoxHeight += totalSubtitleHeight;
        }
        /*add a line for the date*/
        maxTitleTextWidth = Math.max(maxTitleTextWidth, pdf.getTextWidth(dateString));
        totalTitleBoxHeight += (pdf.getTextDimensions(dateString, { maxWidth: maxTitleWidth }).h + 2);
        /*now add the actual text*/
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(0, 0, 0);
        pdf.setTextColor(0, 0, 0)

        pdf.rect(pageMargin / 2, pageMargin / 2, maxTitleTextWidth + 5, totalTitleBoxHeight + 3, "DF");
        /*add title*/
        pdf.setFontSize(pageSettings.titleFontSize);
        if (title.length !== 0) {
            pdf.text(title, (pageMargin / 2) + 2, (pageMargin / 2) + pdf.getTextDimensions(title).h + 2, { maxWidth: maxTitleWidth });
        }
        /*add subtitle*/
        pdf.setFontSize(pageSettings.subtitleFontSize);
        if (subtitle.length !== 0) {
            pdf.text(subtitle, (pageMargin / 2) + 2, (totalTitleHeight) + (pageMargin / 2) + pdf.getTextDimensions(subtitle).h + 2, { maxWidth: maxTitleWidth });
        }
        /*add date*/
        pdf.text(dateString, (pageMargin / 2) + 2, (totalTitleHeight + totalSubtitleHeight) + (pageMargin / 2) + pdf.getTextDimensions(dateString).h + 2, { maxWidth: maxTitleWidth });

    }

    /**
     * Creates the Coordinates box
     * @param pdf
     * @param map
     * @param pageMargin
     * @param pageSettings
     */
    private createCoordinatesBox(pdf: jsPDF, map: GIFWMap, pageMargin:number, pageSettings: PDFPageSetting): void {
        let renderedCoordinates: string[] = [];
        let olMap = map.olMap;
        map.customControls.forEach(c => {
            if (c instanceof GIFWMousePositionControl) {
                let center = olMap.getView().getCenter();
                let destinationProjection = c.getProjectionString(c.projection);
                center = olProj.transform(center, olMap.getView().getProjection(), olProj.get(destinationProjection));
                renderedCoordinates = c.formatCoordinatesAsArray(c.projection, c.decimals, center)
            }
        })
        if (renderedCoordinates.length !== 0) {
            pdf.setFontSize(pageSettings.attributionFontSize);
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(0, 0, 0);
            let maxCoordWidth = ((pdf.internal.pageSize.width - (pageMargin * 2)) / 100) * 25;
            let maxCoordTextWidth = 0;
            renderedCoordinates.forEach(c => {
                maxCoordTextWidth = Math.max(maxCoordTextWidth, pdf.getTextWidth(c));
            })
            let startingCoordsYPosition = (pdf.internal.pageSize.height - 6) - ((pdf.getTextDimensions(renderedCoordinates[0]).h) * renderedCoordinates.length - 1)
            pdf.rect(
                (pageMargin / 2),
                startingCoordsYPosition - (pageMargin / 2),
                maxCoordTextWidth + 5,
                ((pdf.getTextDimensions(renderedCoordinates[0]).h + 1) * (renderedCoordinates.length)) + 3,
                "DF"
            );
            /*NOTE: For some reason, js PDF doesn't like the minutes/seconds characters, so we replace them with reasonable alternatives*/
            renderedCoordinates[0] = renderedCoordinates[0].replace(`′`, `'`).replace(`″`, `"`)
            pdf.text(renderedCoordinates[0],
                (pageMargin / 2) + 2,
                startingCoordsYPosition - 5,
                { maxWidth: maxCoordWidth }
            );

            if (renderedCoordinates.length === 2) {
                renderedCoordinates[1] = renderedCoordinates[1].replace(`′`, `'`).replace(`″`, `"`)
                pdf.text(renderedCoordinates[1],
                    (pageMargin / 2) + 2,
                    startingCoordsYPosition - 5 + (pdf.getTextDimensions(renderedCoordinates[0]).h + 1),
                    { maxWidth: maxCoordWidth }
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
    private createAttributionsBox(pdf: jsPDF, map:GIFWMap, pageMargin:number,pageSettings: PDFPageSetting): void {
        let attributionListItems: NodeListOf<HTMLLIElement> = document.getElementById(map.id).querySelectorAll('.ol-attribution ul li');
        let attributionText: string = '';
        attributionListItems.forEach(attr => {
            attributionText += `${attr.innerText} `;
        })
        pdf.setFontSize(pageSettings.attributionFontSize);
        let maxAttrWidth = ((pdf.internal.pageSize.width - (pageMargin * 2)) / 100) * 75;
        let maxAttrTextWidth = 0;
        let attrLines: string[] = pdf.splitTextToSize(attributionText, maxAttrWidth);
        attrLines.forEach(l => {
            maxAttrTextWidth = Math.max(maxAttrTextWidth, pdf.getTextWidth(l));
        })

        let attrTotalLines = attrLines.length;
        let startingAttrXPosition = pdf.internal.pageSize.width - pageMargin;
        let startingAttrYPosition = (pdf.internal.pageSize.height - 4) - ((pdf.getTextDimensions(attributionText).h + 1) * attrTotalLines - 1)

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(
            startingAttrXPosition - maxAttrTextWidth + 5,
            startingAttrYPosition - (pageMargin / 2),
            maxAttrTextWidth + 5,
            ((pdf.getTextDimensions(attributionText).h + 1) * attrTotalLines) + 3,
            "DF"
        );

        pdf.text(attributionText,
            startingAttrXPosition + 7.5,
            startingAttrYPosition - 5,
            { maxWidth: maxAttrWidth, align: "right" }
        );
    }

    /**
     * Gets the logo defined in the print configuration and converts it to a base64 string
     * */
    private getLogo(): Promise<string | ArrayBuffer> {
        return new Promise((resolve, reject) => {
            var request = new XMLHttpRequest();
            request.open('GET', this.printConfiguration.logoURL);
            request.responseType = 'blob';
            request.onload = () => {
                if (request.status === 200) {
                    this.blobToBase64(request.response).then((base64img) => resolve(base64img));
                } else {
                    reject(Error('Image didn\'t load successfully; error code:' + request.statusText));
                }
            };
            request.onerror = function () {
                reject(Error('There was a network error.'));
            };
            // Send the request
            request.send();
        });
    }

    /**
     * Converts a blob to a base64 string
     * 
     * @param blob - The blob to convert to base64
     * @author https://stackoverflow.com/a/18650249/863487
     */
    private blobToBase64(blob: Blob): Promise<string | ArrayBuffer> {
        return new Promise((resolve, _) => {
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
    private createLogoBox(pdf: jsPDF,pageMargin: number, imgData:string): void {
        let imgProps = pdf.getImageProperties(imgData);
        let newWidth = imgProps.width;
        let newHeight = imgProps.height;
        let maxLogoWidth = 40;
        let maxLogoHeight = 8;
        let ratio = imgProps.height / imgProps.width;

        if (imgProps.height > maxLogoHeight || imgProps.width > maxLogoWidth) {
            if (imgProps.height > imgProps.width) {
                newHeight = maxLogoHeight;
                newWidth = newHeight * (1 / ratio);
            } else {
                newWidth = maxLogoWidth;
                newHeight = newWidth * ratio;
            }
        }


        pdf.addImage(imgData, (pdf.internal.pageSize.width - newWidth - (pageMargin / 2) - 1), (pageMargin / 2) + 1, newWidth, newHeight)

    }

}