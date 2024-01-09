﻿import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { Sidebar } from "../Sidebar";
import { GIFWMap } from "../Map";
import { Modal, Tooltip } from "bootstrap";
import Spinner from "../Spinner";
import {
  Alert,
  AlertSeverity,
  AlertType,
  CustomError,
  Mapping as MappingUtil,
} from "../Util";

export class SharePanel implements SidebarPanel {
  container: string;
  gifwMapInstance: GIFWMap;
  shareLinkModal: Modal;

  constructor(container: string) {
    this.container = container;
    this.shareLinkModal = Modal.getOrCreateInstance("#short-link-modal");
  }
  init() {
    this.attachCloseButton();
    this.attachCopyButtons();

    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener("gifw-update-permalink", () => {
        //check to see if share panel is visible before calling for a re-render
        //simple visibility check from https://stackoverflow.com/a/21696585/863487
        if (
          (document.querySelector(this.container) as HTMLElement)
            .offsetParent !== null
        ) {
          this.updatePermalink();
        }
      });

    this.render();
  }
  render() {
    this.updatePermalink();
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

  private updatePermalink(): void {
    const permalink = MappingUtil.generatePermalinkForMap(this.gifwMapInstance);
    const container = document.querySelector(this.container);
    const directLinkInput: HTMLInputElement =
      container.querySelector("#gifw-share-link");
    directLinkInput.value = permalink;

    const embedCode = `<iframe src="${permalink}&embed=true" allowfullscreen width="100%" height="500px"></iframe>`;
    const embedCodeInput: HTMLTextAreaElement = container.querySelector(
      "#gifw-share-embed-code",
    );
    embedCodeInput.value = embedCode;
  }

  private attachCopyButtons(): void {
    const container = document.querySelector(this.container);
    const copyButtons: NodeListOf<HTMLButtonElement> =
      container.querySelectorAll("button[data-gifw-copy-target]");
    if (copyButtons) {
      copyButtons.forEach((b) => {
        b.addEventListener("click", () => {
          const targetSelector = b.dataset.gifwCopyTarget;
          if (targetSelector) {
            const copyTarget: HTMLInputElement =
              container.querySelector(targetSelector);
            if (copyTarget) {
              navigator.clipboard.writeText(copyTarget.value).then(
                () => {
                  /* clipboard successfully set */
                  const tooltip = Tooltip.getOrCreateInstance(b);
                  tooltip.show();
                  window.setTimeout(() => {
                    tooltip.hide();
                  }, 3000);
                },
                () => {
                  /* clipboard write failed */
                  const errDialog = new CustomError(
                    AlertType.Popup,
                    AlertSeverity.Danger,
                    "There was a problem copying to the clipboard",
                    "<p>We couldn't automatically copy your link to the clipboard.</p><p>You can copy it manually by selecting the text and hitting <kbd>Ctrl</kbd> - <kbd>C</kbd> on Windows or <kbd>Cmd</kbd> - <kbd>C</kbd> on a Mac. For mobiles and touch screen devices, long tap and hold on the link, then choose Select All, then Copy.</p>",
                  );
                  errDialog.show();
                },
              );
            }
          }
        });
      });
    }
    //since the short link copy button is in a modal, we need to attach a slightly different event handler
    const copyShortLinkButton = document.querySelector(
      "#short-link-modal button[data-gifw-copy-target]",
    ) as HTMLButtonElement;
    copyShortLinkButton.addEventListener("click", () => {
      const targetSelector = copyShortLinkButton.dataset.gifwCopyTarget;
      if (targetSelector) {
        const copyTarget: HTMLInputElement =
          document.querySelector(targetSelector);
        if (copyTarget) {
          navigator.clipboard.writeText(copyTarget.value).then(
            () => {
              /* clipboard successfully set */
              const tooltip = Tooltip.getOrCreateInstance(copyShortLinkButton);
              tooltip.show();
              window.setTimeout(() => {
                tooltip.hide();
              }, 3000);
            },
            () => {
              /* clipboard write failed */
              alert(
                `We couldn't automatically copy your link to the clipboard.</p><p>You can copy it manually by selecting the text and hitting Ctrl - C on Windows or Cmd - C on a Mac. For mobiles and touch screen devices, long tap and hold on the link, then choose Select All, then Copy.`,
              );
            },
          );
        }
      }
    });

    const shortLinkButton: HTMLButtonElement = container.querySelector(
      "#gifw-generate-short-link",
    );
    shortLinkButton.addEventListener("click", async () => {
      shortLinkButton.insertAdjacentElement(
        "afterbegin",
        Spinner.create(["spinner-border-sm", "me-2"]),
      );
      shortLinkButton.disabled = true;
      const shortLink = await this.generateShortLink();
      if (shortLink) {
        this.shareLinkModal.show();
        (
          document.querySelector("#gifw-share-short-link") as HTMLInputElement
        ).value = shortLink;
      }
      shortLinkButton.querySelector(".spinner").remove();
      shortLinkButton.disabled = false;
    });
  }

  private async generateShortLink() {
    const permalink = encodeURIComponent(
      MappingUtil.generatePermalinkForMap(this.gifwMapInstance),
    );
    const fetchUrl = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}api/GenerateShortUrl?url=${permalink}`;
    const response = await fetch(fetchUrl, {
      method: "POST",
    });
    if (!response.ok) {
      this.shareLinkModal.hide();
      Alert.showPopupError(
        "An error occurred",
        "There was a problem generating a short link. Please try again later, or use the standard links.",
      );
      console.error(`HTTP error: ${response.status}`);
      return;
    }
    const data = await response.text();
    return data;
  }

  public setGIFWMapInstance(map: GIFWMap) {
    this.gifwMapInstance = map;
  }
}
