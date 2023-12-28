import { Export, LegendPositioningOption, PageOrientationOption, PageSizeOption } from "../Export";
import { PDFPageSettings } from "../Interfaces/Print/PDFPageSettings";
import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { GIFWMap } from "../Map";
import { Sidebar } from "../Sidebar";
import { Alert, AlertSeverity, AlertType, CustomError, Helper } from "../Util";

export class PrintPanel implements SidebarPanel {
    container: string;
    gifwMapInstance: GIFWMap;
    pdfPageSettings: PDFPageSettings = {
        "a2": { attributionFontSize: 12, titleFontSize: 16, subtitleFontSize: 12, standaloneLegendTitleFontSize: 20, pageWidth: 594, pageHeight: 420, inlineLegendPortraitMaxWidth: 140, inlineLegendLandscapeMaxWidth: 200, maxLandscapeTitleLength: 170, maxPortraitTitleLength: 130, maxLandscapeSubtitleLength: 500, maxPortraitSubtitleLength: 350, landscapeKeyWrapLimit: 800, portraitKeyWrapLimit: 650 },
        "a3": { attributionFontSize: 11, titleFontSize: 14, subtitleFontSize: 12, standaloneLegendTitleFontSize: 18, pageWidth: 420, pageHeight: 297, inlineLegendPortraitMaxWidth: 80, inlineLegendLandscapeMaxWidth: 140, maxLandscapeTitleLength: 130, maxPortraitTitleLength: 90, maxLandscapeSubtitleLength: 350, maxPortraitSubtitleLength: 240, landscapeKeyWrapLimit: 650, portraitKeyWrapLimit: 500 },
        "a4": { attributionFontSize: 10, titleFontSize: 12, subtitleFontSize: 10, standaloneLegendTitleFontSize: 16, pageWidth: 297, pageHeight: 210, inlineLegendLandscapeMaxWidth: 80, maxLandscapeTitleLength: 100, maxPortraitTitleLength: 70, maxLandscapeSubtitleLength: 310, maxPortraitSubtitleLength: 170, landscapeKeyWrapLimit: 430, portraitKeyWrapLimit: 800 },
        "a5": { attributionFontSize: 8, titleFontSize: 11, subtitleFontSize: 10, standaloneLegendTitleFontSize: 14, pageWidth: 210, pageHeight: 148, maxLandscapeTitleLength: 70, maxPortraitTitleLength: 50, maxLandscapeSubtitleLength: 160, maxPortraitSubtitleLength: 100, landscapeKeyWrapLimit: 700, portraitKeyWrapLimit: 700 }
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

    render() {
    }
    /*TODO - Make this generic*/
    private attachCloseButton():void {
        const container = document.querySelector(this.container);
        const closeButton = container.querySelector('button[data-gifw-dismiss-sidebar]');
        if (closeButton !== null) {
            closeButton.addEventListener('click', () => {
                Sidebar.close();
            });
        }
    }

    private updateValidationRules() {
        const container: HTMLElement = document.querySelector(this.container);

        const printTitleInput: HTMLInputElement = container.querySelector('#gifw-print-title');
        const printSubtitleInput: HTMLElement = container.querySelector('#gifw-print-subtitle');
        const printPageSizeInput: HTMLSelectElement = container.querySelector('#gifw-print-pagesize');
        const printLegendInput: HTMLSelectElement = container.querySelector('#gifw-print-legend');
        const printLegendSizeWarning: HTMLDivElement = container.querySelector('#gifw-print-legend-size-warning');
        let pageSize: PageSizeOption = "a4";
        if (printPageSizeInput.value.substring(0, 2) === "a5" || printPageSizeInput.value.substring(0, 2) === "a3" || printPageSizeInput.value.substring(0, 2) === "a2") {
            pageSize = <PageSizeOption>printPageSizeInput.value.substring(0, 2);
        }
        let pageOrientation: PageOrientationOption = "p";
        if (printPageSizeInput.value.substring(2) === "l") {
            pageOrientation = "l";
        }
        const chosenPageSettings = this.pdfPageSettings[pageSize];
        const maxTitleLen = (pageOrientation === "l" ? chosenPageSettings.maxLandscapeTitleLength : chosenPageSettings.maxPortraitTitleLength);
        const maxSubtitleLen = (pageOrientation === "l" ? chosenPageSettings.maxLandscapeSubtitleLength : chosenPageSettings.maxPortraitSubtitleLength);
        printTitleInput.setAttribute('maxlength', maxTitleLen.toString());
        printTitleInput.nextElementSibling.textContent = `Title too long (max ${maxTitleLen} characters)`
        printSubtitleInput.setAttribute('maxlength', maxSubtitleLen.toString());
        printSubtitleInput.nextElementSibling.textContent = `Subtitle too long (max ${maxSubtitleLen} characters)`

        if (pageSize === "a5" || (pageSize === "a4" && pageOrientation === "p")) {
            //separate page legends only
            (printLegendInput.querySelector(`option[value="${<LegendPositioningOption>"float-left"}"]`) as HTMLOptionElement).disabled = true;
            (printLegendInput.querySelector(`option[value="${<LegendPositioningOption>"pinned-left"}"]`) as HTMLOptionElement).disabled = true;
            printLegendSizeWarning.style.display = "";
            //if user has a disabled options selected, reset to 0
            if (printLegendInput.selectedOptions[0].disabled) {
                printLegendInput.selectedIndex = 0;
            }

        } else {
            //all legend types allowed
            (printLegendInput.querySelector(`option[value="${<LegendPositioningOption>"float-left"}"]`) as HTMLOptionElement).disabled = false;
            (printLegendInput.querySelector(`option[value="${<LegendPositioningOption>"pinned-left"}"]`) as HTMLOptionElement).disabled = false;
            printLegendSizeWarning.style.display = "none";
        }

        const form = container.querySelector('form');
        form.checkValidity();
    }

    private attachPrintControls(): void {
        const container: HTMLElement = document.querySelector(this.container);

        const printToScaleCheckbox: HTMLInputElement = container.querySelector('#gifw-print-scale-print');
        const printScaleContainer: HTMLElement = container.querySelector('#gifw-print-scale-container');

        printToScaleCheckbox.addEventListener('change', () => {
            if (printToScaleCheckbox.checked) {
                printScaleContainer.style.display = '';
            } else {
                printScaleContainer.style.display = 'none';
            }
        })

        const printPageSizeInput: HTMLSelectElement = container.querySelector('#gifw-print-pagesize');
        printPageSizeInput.addEventListener('change', () => {
            this.updateValidationRules();
        })

        const printButton = container.querySelector('#gifw-print-do-print');
        printButton.addEventListener('click', (e) => {
            if (this.validatePrintOptions()) {
                this.doPrint();
            } else {
                //highlight error
                const err = new CustomError(AlertType.Popup, AlertSeverity.Warning, "Cannot print", "Your title or subtitle is too long")
                err.show();
            }
            e.preventDefault();
            
        });

        container.addEventListener('gifw-export-cancel', () => { this.cancelExport() });
    }

    private async doPrint() {

        const map = this.gifwMapInstance;

        const pageSetting = (document.getElementById('gifw-print-pagesize') as HTMLSelectElement).value;
        let pageSize: PageSizeOption = "a4";
        if (pageSetting.substring(0, 2) === "a5" || pageSetting.substring(0, 2) === "a3" || pageSetting.substring(0, 2) === "a2") {
            pageSize = <PageSizeOption>pageSetting.substring(0, 2);
        }
        /*Narrowing the type required for TS compatibility*/
        let pageOrientation: PageOrientationOption = "p";
        if (pageSetting.substring(2) === "l") {
            pageOrientation = "l";
        }
        const legend = ((document.getElementById('gifw-print-legend') as HTMLSelectElement).value as LegendPositioningOption);

        const resolution = parseInt((document.getElementById('gifw-print-resolution') as HTMLSelectElement).value);
        const isScalePrint = (document.getElementById('gifw-print-scale-print') as HTMLInputElement).checked;
        const scale = parseInt((document.getElementById('gifw-print-scale') as HTMLSelectElement).value);

        this.abortController = new AbortController();
        this.cancelledByUser = false;

        document.getElementById(map.id).addEventListener('gifw-print-finished', (e: CustomEvent) => {
            this.hideLoading()
            window.clearTimeout(this.longLoadingTimeout);
            if (e.detail.success !== true) {
                Alert.showPopupError('Your print failed', `<p>Your print failed to generate. Try turning off any layers you don't need, or choosing a smaller size or lower quality. If you continue to have problems, please let us know.`)
            } else {
                if (e.detail.keyWasMoved === true) {
                    const msg = new CustomError(AlertType.Popup, AlertSeverity.Info,
                        "Your key could not fit",
                        "Your map key would not fit in the place you requested, so was added to a separate page in your PDF");
                    msg.show();
                }
            }
        }, {once:true});

        this.exportInstance.createPDF(
            map,
            pageSize,
            pageOrientation,
            resolution,
            this.abortController,
            isScalePrint ? scale : undefined,
            legend
        )
        this.showLoading();
        this.longLoadingTimeout = window.setTimeout(() => this.showLongLoadingWarning(), this.longLoadingTimeoutLength);       
    }

    private validatePrintOptions(): boolean {
        const container: HTMLElement = document.querySelector(this.container);
        const form = container.querySelector('form');
        const valid = form.checkValidity();
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
        const container: HTMLElement = document.querySelector(this.container);
        const printButton:HTMLButtonElement = container.querySelector('#gifw-print-do-print');
        printButton.disabled = true;
        Helper.addFullScreenLoader(this.gifwMapInstance.id, "Generating your print. Please wait a sec.", true, () => { this.cancelledByUser = true;container.dispatchEvent(new Event("gifw-export-cancel")) });
    }

    /**
    * Hides the loading spinner in the print panel
    *
    * @returns void
    *
    */
    private hideLoading() {
        const container: HTMLElement = document.querySelector(this.container);
        const printButton: HTMLButtonElement = container.querySelector('#gifw-print-do-print');
        printButton.disabled = false;
        Helper.removeFullScreenLoader(this.gifwMapInstance.id);

    }

    private cancelExport() {
        this.hideLoading();
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    private showLongLoadingWarning(): void {
        const mapEle = document.getElementById(`${this.gifwMapInstance.id}Container`);
        const cancelButton = mapEle.querySelector('.gifw-full-screen-loader button');
        if (cancelButton) {
            cancelButton.insertAdjacentHTML('afterend', `<p class="mt-2">This map is taking a while to generate.</p><p>You can cancel it with the button above and try removing some layers or reducing the quality to speed it up.</p>`)
        }
    }

    public setGIFWMapInstance(map: GIFWMap) {
        this.gifwMapInstance = map;
    }
}
