import { Export } from "../Export";
import { PDFPageSettings } from "../Interfaces/Print/PDFPageSettings";
import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { GIFWMap } from "../Map";
import { Sidebar } from "../Sidebar";
import { Util } from "../Util";

export class PrintPanel implements SidebarPanel {
    container: string;
    gifwMapInstance: GIFWMap;
    pdfPageSettings: PDFPageSettings = {
        "a2": { attributionFontSize: 12, titleFontSize: 16, subtitleFontSize: 12, standaloneLegendTitleFontSize: 20, pageWidth: 594, pageHeight: 420, inlineLegendPortraitMaxWidth: 140, inlineLegendLandscapeMaxWidth: 200, maxLandscapeTitleLength: 170, maxPortraitTitleLength: 130, maxLandscapeSubtitleLength: 500, maxPortraitSubtitleLength: 350 },
        "a3": { attributionFontSize: 11, titleFontSize: 14, subtitleFontSize: 12, standaloneLegendTitleFontSize: 18, pageWidth: 420, pageHeight: 297, inlineLegendPortraitMaxWidth: 120, inlineLegendLandscapeMaxWidth: 140, maxLandscapeTitleLength: 130, maxPortraitTitleLength: 90, maxLandscapeSubtitleLength: 350, maxPortraitSubtitleLength: 240 },
        "a4": { attributionFontSize: 10, titleFontSize: 12, subtitleFontSize: 10, standaloneLegendTitleFontSize: 16, pageWidth: 297, pageHeight: 210, inlineLegendLandscapeMaxWidth: 120, maxLandscapeTitleLength: 100, maxPortraitTitleLength: 70, maxLandscapeSubtitleLength: 310, maxPortraitSubtitleLength: 170 },
        "a5": { attributionFontSize: 8, titleFontSize: 11, subtitleFontSize: 10, standaloneLegendTitleFontSize: 14, pageWidth: 210, pageHeight: 148, maxLandscapeTitleLength: 70, maxPortraitTitleLength: 50, maxLandscapeSubtitleLength: 160, maxPortraitSubtitleLength: 100 }
    };
    exportInstance: Export;
    abortController: AbortController;
    isRunning: boolean = false;
    cancelledByUser: boolean = false;
    longLoadingTimeout: number;
    longLoadingTimeoutLength: number = 10000;

    constructor(container: string) {
        this.container = container;
    }
    init() {
        this.exportInstance = new Export(this.pdfPageSettings, `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}print/configuration/${this.gifwMapInstance.config.id}`);
        this.attachCloseButton();
        this.updateValidationRules();
        this.attachPrintControls();
        
    }
;
    render() {
    };
    /*TODO - Make this generic*/
    private attachCloseButton():void {
        let container = document.querySelector(this.container);
        let closeButton = container.querySelector('button[data-gifw-dismiss-sidebar]');
        if (closeButton !== null) {
            closeButton.addEventListener('click', (e) => {
                Sidebar.close();
            });
        }
    };

    private updateValidationRules() {
        let container: HTMLElement = document.querySelector(this.container);

        let printTitleInput: HTMLInputElement = container.querySelector('#gifw-print-title');
        let printSubtitleInput: HTMLElement = container.querySelector('#gifw-print-subtitle');
        let printPageSizeInput: HTMLSelectElement = container.querySelector('#gifw-print-pagesize');
        let pageSize: "a5" | "a4" | "a3" | "a2" = "a4" ;
        if (printPageSizeInput.value.substring(0, 2) === "a5" || printPageSizeInput.value.substring(0, 2) === "a3" || printPageSizeInput.value.substring(0, 2) === "a2") {
            pageSize = <"a5" | "a4" | "a3" | "a2">printPageSizeInput.value.substring(0, 2);
        }
        let pageOrientation: "p" | "l" = "p";
        if (printPageSizeInput.value.substring(2) === "l") {
            pageOrientation = "l";
        }
        const chosenPageSettings = this.pdfPageSettings[pageSize];
        let maxTitleLen = (pageOrientation === "l" ? chosenPageSettings.maxLandscapeTitleLength : chosenPageSettings.maxPortraitTitleLength);
        let maxSubtitleLen = (pageOrientation === "l" ? chosenPageSettings.maxLandscapeSubtitleLength : chosenPageSettings.maxPortraitSubtitleLength);
        printTitleInput.setAttribute('maxlength', maxTitleLen.toString());
        printTitleInput.nextElementSibling.textContent = `Title too long (max ${maxTitleLen} characters)`
        printSubtitleInput.setAttribute('maxlength', maxSubtitleLen.toString());
        printSubtitleInput.nextElementSibling.textContent = `Subtitle too long (max ${maxSubtitleLen} characters)`

        let form = container.querySelector('form');
        form.checkValidity();
        
    }

    private attachPrintControls(): void {
        let container: HTMLElement = document.querySelector(this.container);

        let printToScaleCheckbox: HTMLInputElement = container.querySelector('#gifw-print-scale-print');
        let printScaleContainer: HTMLElement = container.querySelector('#gifw-print-scale-container');

        printToScaleCheckbox.addEventListener('change', e => {
            if (printToScaleCheckbox.checked) {
                printScaleContainer.style.display = '';
            } else {
                printScaleContainer.style.display = 'none';
            }
        })

        let printPageSizeInput: HTMLSelectElement = container.querySelector('#gifw-print-pagesize');
        printPageSizeInput.addEventListener('change', e => {
            this.updateValidationRules();
        })

        let printButton = container.querySelector('#gifw-print-do-print');
        printButton.addEventListener('click', (e) => {
            if (this.validatePrintOptions()) {
                this.doPrint();
            } else {
                //highlight error
                let err = new Util.Error(Util.AlertType.Popup, Util.AlertSeverity.Warning, "Cannot print", "Your title or subtitle is too long")
                err.show();
            }
            e.preventDefault();
            
        });


        container.addEventListener('gifw-export-cancel', () => { this.cancelExport() });

    }

    private async doPrint() {

        const map = this.gifwMapInstance;

        const pageSetting = (document.getElementById('gifw-print-pagesize') as HTMLSelectElement).value;
        let pageSize = "a4";
        if (pageSetting.substring(0, 2) === "a5" || pageSetting.substring(0, 2) === "a3" || pageSetting.substring(0, 2) === "a2") {
            pageSize = pageSetting.substring(0, 2);
        }
        /*Narrowing the type required for TS compatibility*/
        let pageOrientation: "p" | "l" = "p";
        if (pageSetting.substring(2) === "l") {
            pageOrientation = "l";
        }
        const legend = ((document.getElementById('gifw-print-legend') as HTMLSelectElement).value as "none" | "pinned-left" | "pinned-right" | "float-left" | "float-right" | "seperate-page");
        

        const resolution = parseInt((document.getElementById('gifw-print-resolution') as HTMLSelectElement).value);
        const isScalePrint = (document.getElementById('gifw-print-scale-print') as HTMLInputElement).checked;
        const scale = parseInt((document.getElementById('gifw-print-scale') as HTMLSelectElement).value);

        this.abortController = new AbortController();
        this.cancelledByUser = false;


        document.getElementById(map.id).addEventListener('gifw-print-finished', (e) => {
            this.hideLoading()
            window.clearTimeout(this.longLoadingTimeout);
        }, {once:true});

        this.exportInstance.createPDF(
            map,
            pageSize as "a2" | "a3" | "a4" | "a5",
            pageOrientation,
            resolution,
            this.abortController,
            isScalePrint ? scale : undefined,
            legend
        )

        this.showLoading();

        this.longLoadingTimeout = window.setTimeout(() => this.showLongLoadingWarning(), this.longLoadingTimeoutLength);

        //try {
        //    await this.exportInstance.createPDF

        //} catch(reason) {
        //    console.error(`Print failed: ${reason}`);
        //    if (!this.cancelledByUser) {
        //        let errDialog;
        //        if (typeof reason === 'object' && (reason as DOMException).code === DOMException.ABORT_ERR ) {
        //            errDialog = new Util.Error(
        //                Util.AlertType.Popup,
        //                Util.AlertSeverity.Danger,
        //                "Print failed",
        //                `<p>Your print took too long to generate. Try turning off any layers you don't need, or choosing a smaller size or lower quality.</p>`
        //            );
        //        } else {
        //            errDialog = new Util.Error(
        //                Util.AlertType.Popup,
        //                Util.AlertSeverity.Danger,
        //                "Print failed",
        //                `<p>Your print failed. Please try again. If you continue to have problems, please let us know.</p>`
        //            );
        //        }
        //        errDialog.show();
        //    }
        //}
        //finally{

        //};
        
    }

    private validatePrintOptions(): boolean {
        let container: HTMLElement = document.querySelector(this.container);
        let form = container.querySelector('form');
        let valid = form.checkValidity();
        form.classList.add('was-validated')
        return valid;
    }

    /**
    * Shows the loading spinner in the print panel
    *
    * @returns void
    *
    */
    private showLoading() {
        let container: HTMLElement = document.querySelector(this.container);
        let printButton:HTMLButtonElement = container.querySelector('#gifw-print-do-print');
        printButton.disabled = true;
        Util.Helper.addFullScreenLoader(this.gifwMapInstance.id, "Generating your print. Please wait a sec.", true, () => { this.cancelledByUser = true;container.dispatchEvent(new Event("gifw-export-cancel")) });
    }

    /**
    * Hides the loading spinner in the print panel
    *
    * @returns void
    *
    */
    private hideLoading() {
        let container: HTMLElement = document.querySelector(this.container);
        let printButton: HTMLButtonElement = container.querySelector('#gifw-print-do-print');
        printButton.disabled = false;
        Util.Helper.removeFullScreenLoader(this.gifwMapInstance.id);

    }

    private cancelExport() {
        this.hideLoading();
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    private showLongLoadingWarning(): void {
        let mapEle = document.getElementById(`${this.gifwMapInstance.id}Container`);
        let cancelButton = mapEle.querySelector('.gifw-full-screen-loader button');
        if (cancelButton) {
            cancelButton.insertAdjacentHTML('afterend', `<p class="mt-2">This map is taking a while to generate.</p><p>You can cancel it with the button above and try removing some layers or reducing the quality to speed it up.</p>`)
        }
    }

    public setGIFWMapInstance(map: GIFWMap) {
        this.gifwMapInstance = map;
    }
}
