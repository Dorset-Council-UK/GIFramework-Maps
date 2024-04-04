import AnnotationStyle from "../Annotate/AnnotationStyle";
import AnnotationStyleEvent from "../Annotate/AnnotationStyleEvent";
import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { GIFWMap } from "../Map";
import { Sidebar } from "../Sidebar";

export default class AnnotationStylePanel implements SidebarPanel {
  activeStyle: AnnotationStyle;
  container: string;
  gifwMapInstance: GIFWMap;
  optionsPanel: HTMLFormElement;

  constructor(container: string) {
    this.container = container;
  }

  init() {
    this.attachCloseButton();
    this.optionsPanel = document.querySelector(
      `${this.container} .gifw-annotation-style-options`,
    );
    this.render();
  }

  render() {
    if (this.optionsPanel) {
      if (this.activeStyle) {
        this.optionsPanel.innerHTML = this.activeStyle.activeTool.optionsHTML;

        this.rebuildFromStyle(this.activeStyle, true);
      } else {
        Sidebar.close();
      }
    }
  }

  /**
   * Set the map instance this panel is linked to
   *
   * @returns void
   *
   */
  public setGIFWMapInstance(map: GIFWMap) {
    this.gifwMapInstance = map;
  }

  /*TODO - Make this generic*/
  /**
   * Attaches event to close button to the panel
   *
   * @returns void
   *
   */
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

  public setListeners(sidebar: Sidebar) {
    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener(
        "gifw-annotate-update-panel",
        (e: AnnotationStyleEvent) => {
          if (e.detail?.style) {
            this.rebuildFromStyle(e.detail.style);
            sidebar.open();
          } else {
            this.activeStyle = undefined;
            this.render();
          }
        },
      );
    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener("gifw-annotate-deactivate", () => {
        this.activeStyle = undefined;
        this.render();
      });
    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener("gifw-annotate-activate", () => {
        sidebar.open();
      });
  }

  /**
   * Sets the annotation style control values to match the new style.
   *
   * @returns void
   * @param style - the new style
   * @param inhibitRender - boolean; if true, the render method will not be called from here. It is anticipated that this will only be set to true when the render method is already due to be called after execution.
   *
   */
  private rebuildFromStyle(
    style: AnnotationStyle,
      inhibitRender: boolean = false,
  ) {
    this.activeStyle = style;
    if (this.activeStyle) {
      if (!inhibitRender) {
        this.render();
        return;
      }
      if (this.optionsPanel) {
        const controls = this.optionsPanel.querySelectorAll<
          HTMLInputElement | HTMLSelectElement
        >("input, select");
          controls.forEach((control) => {
              const outputEle = document.querySelector(`output[for=${control.id || "invalid"}]`);
          switch (control.getAttribute("data-style-property")) {
            case "fillColour":
              control.value = `#${this.activeStyle.fillColourHex}`;
              break;
            case "opacity":
                  control.value = this.activeStyle.opacity.toString();
                  if (outputEle) {
                      (outputEle as HTMLOutputElement).value = `${(this.activeStyle.opacity * 100)}%`;
                  }
              break;
            case "fontColour":
              control.value = `#${this.activeStyle.fontColourHex}`;
              break;
            case "font":
              control.value = this.activeStyle.fontFamily;
              break;
            case "fontStyle":
              control.value = this.activeStyle.fontStyle;
              break;
            case "labelText":
              control.value = this.activeStyle.labelText;
              control.setAttribute("input-text", control.value);
              break;
            case "pointType":
              control.value = this.activeStyle.pointType;
              break;
            case "size":
                  control.value = this.activeStyle.size.toString();
                  if (outputEle) {
                      (outputEle as HTMLOutputElement).value = `${this.activeStyle.size}px`;
                  }
              break;
            case "radiusNumber":
              control.value = this.activeStyle.radiusNumber.toString();
                  control.setAttribute("input-text", control.value);
                  if (this.activeStyle.editMode === "edit") {
                      control.disabled = true;
                  } else {
                      control.disabled = false;
                  }
              break;
            case "radiusUnit":
                  control.value = this.activeStyle.radiusUnit;
                  if (this.activeStyle.editMode === "edit") {
                      control.disabled = true;
                  } else {
                      control.disabled = false;
                  }
              break;
            case "strokeColour":
              control.value = `#${this.activeStyle.strokeColourHex}`;
              break;
            case "strokeStyle":
              control.value = this.activeStyle.strokeStyle;
              break;
            case "strokeWidth":
                  control.value = this.activeStyle.strokeWidth.toString();
                  if (outputEle) {
                      (outputEle as HTMLOutputElement).value = `${this.activeStyle.strokeWidth}px`;
                  }
              break;
            case "pointHasBorder": {
              (control as HTMLInputElement).checked =
                this.activeStyle.pointHasBorder;
              const borderOptions: HTMLElement = document.querySelector(
                "#gifw-annotations-border-options",
              );
              borderOptions.style.display = (control as HTMLInputElement)
                .checked
                ? "block"
                : "none";
              break;
            }
            case "borderColour":
              control.value = `#${this.activeStyle.borderColourHex}`;
              break;
            case "borderWidth":
              control.value = this.activeStyle.borderWidth.toString();
              break;
            default:
              break;
          }
          control.addEventListener("input", () => {
            this.activeStyle = this.activeStyle.getClone(); // clone the active style so as not to unintentionally restyle existing features
            this.gifwMapInstance.olMap.once("pointermove", () => {
              control.blur();
            });
            if (control.getAttribute("data-style-property") == "labelText") {
              control.setAttribute("input-text", control.value); // Strangely, the text value does not get passed with the control to this.updateStyle, and so I have had to create this new attribute...
            }
            if (control.getAttribute("data-style-property") == "radiusNumber") {
              control.setAttribute("input-text", control.value);
            }
            if (
              control.getAttribute("data-style-property") == "pointHasBorder"
            ) {
              const borderOptions: HTMLElement = document.querySelector(
                "#gifw-annotations-border-options",
              );
              borderOptions.style.display = (control as HTMLInputElement)
                .checked
                ? "block"
                : "none";
            }
            this.updateStyle(control);
            document.getElementById(this.gifwMapInstance.id).dispatchEvent(
              new CustomEvent("gifw-annotate-style-update", {
                detail: {
                  style: this.activeStyle,
                },
              }) as AnnotationStyleEvent,
            );
          });
        });
      }
    }
  }

  private updateStyle(control: HTMLInputElement | HTMLSelectElement) {
    switch (control.getAttribute("data-style-property")) {
      case "fillColour":
        this.activeStyle.fillColourHex = control.value.slice(1);
        break;
      case "opacity":
        this.activeStyle.opacity = parseFloat(control.value);
        break;
      case "fontColour":
        this.activeStyle.fontColourHex = control.value.slice(1);
        break;
      case "font":
        this.activeStyle.fontFamily = control.value;
        break;
      case "fontStyle":
         this.activeStyle.fontStyle = control.value;
         break;
      case "labelText":
        this.activeStyle.labelText = control.getAttribute("input-text");
        break;
      case "pointType":
        this.activeStyle.pointType = control.value;
        break;
      case "size":
        this.activeStyle.size = parseFloat(control.value);
        break;
      case "radiusNumber":
        this.activeStyle.radiusNumber = parseFloat(
          control.getAttribute("input-text"),
        );
        break;
      case "radiusUnit":
        this.activeStyle.radiusUnit = control.value as
          | "meters"
          | "kilometers"
          | "miles"
          | "yards"
          | "feet";
        break;
      case "strokeColour":
        this.activeStyle.strokeColourHex = control.value.slice(1);
        break;
      case "strokeStyle":
        this.activeStyle.strokeStyle = control.value as
          | "solid"
          | "dashed"
          | "dotted";
        break;
      case "strokeWidth":
        this.activeStyle.strokeWidth = parseFloat(control.value);
        break;
      case "pointHasBorder":
        this.activeStyle.pointHasBorder = (control as HTMLInputElement).checked;
        break;
      case "borderColour":
        this.activeStyle.borderColourHex = control.value.slice(1);
        break;
      case "borderWidth":
        this.activeStyle.borderWidth = parseFloat(control.value);
        break;
      default:
        return;
    }
  }
}
