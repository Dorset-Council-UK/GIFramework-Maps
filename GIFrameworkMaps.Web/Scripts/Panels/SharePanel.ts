import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { Sidebar } from "../Sidebar";
import { GIFWMap } from "../Map";
import { Util } from "../Util";
import { Tooltip } from "bootstrap";

export class SharePanel implements SidebarPanel {
    container: string;
    gifwMapInstance: GIFWMap;

    constructor(container: string) {
        this.container = container;
    }
    init() {
        console.log(`init called on Share (container ${this.container})`);
        this.attachCloseButton();
        this.attachCopyButtons();

        document.getElementById(this.gifwMapInstance.id).addEventListener('gifw-update-permalink', () => {
            //check to see if share panel is visible before calling for a re-render
            //simple visibility check from https://stackoverflow.com/a/21696585/863487
            if ((document.querySelector(this.container) as HTMLElement).offsetParent !== null) {
                this.updatePermalink();
            }
        });

        this.render();
    };
    render() {
        console.log(`render called on Share (container ${this.container})`);
        this.updatePermalink();
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

    private updatePermalink(): void {
        let permalink = Util.Mapping.generatePermalinkForMap(this.gifwMapInstance);
        let container = document.querySelector(this.container);
        let directLinkInput:HTMLInputElement = container.querySelector('#gifw-share-link');
        directLinkInput.value = permalink;

        let embedCode = `<iframe src="${permalink}&embed=true" allowfullscreen width="100%" height="500px"></iframe>`
        let embedCodeInput: HTMLTextAreaElement = container.querySelector('#gifw-share-embed-code');
        embedCodeInput.value = embedCode;
    }

    private attachCopyButtons(): void {
        let container = document.querySelector(this.container);
        let copyButtons: NodeListOf<HTMLButtonElement> = container.querySelectorAll('button[data-gifw-copy-target]');
        if (copyButtons) {
            copyButtons.forEach(b => {
                b.addEventListener('click', e => {
                    let targetSelector = b.dataset.gifwCopyTarget;
                    if (targetSelector) {
                        let copyTarget: HTMLInputElement = container.querySelector(targetSelector);
                        if (copyTarget) {
                            navigator.clipboard.writeText(copyTarget.value).then(() => {
                                /* clipboard successfully set */
                                let tooltip = Tooltip.getOrCreateInstance(b);
                                tooltip.show();
                                window.setTimeout(() => { tooltip.hide() }, 3000);
                            }, () => {
                                /* clipboard write failed */
                                let errDialog = new Util.Error(Util.AlertType.Popup,
                                    Util.AlertSeverity.Danger,
                                    "There was a problem copying to the clipboard",
                                    "<p>We couldn't automatically copy your link to the clipboard.</p><p>You can copy it manually by selecting the text and hitting <kbd>Ctrl</kbd> - <kbd>C</kbd> on Windows or <kbd>Cmd</kbd> - <kbd>C</kbd> on a Mac. For mobiles and touch screen devices, long tap and hold on the link, then choose Select All, then Copy.</p>")
                                errDialog.show();
                            });
                        }
                    }
                })
            })
        }


    }
    public setGIFWMapInstance(map: GIFWMap) {
        this.gifwMapInstance = map;
    }
}