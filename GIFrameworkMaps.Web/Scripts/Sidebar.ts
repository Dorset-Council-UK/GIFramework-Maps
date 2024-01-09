import * as GIFWSidebarControl from "../Scripts/SidebarControl";
import { SidebarPanel } from "./Interfaces/SidebarPanel";

export class Sidebar {
  id: string;
  name: string;
  description: string;
  icon: string;
  ordering: number;
  control: GIFWSidebarControl.SidebarControl;
  panel?: SidebarPanel;
  opened: boolean;

  constructor(
    id: string,
    name: string,
    description: string,
    icon: string,
    ordering: number,
    panel: SidebarPanel,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.icon = icon;
    this.ordering = ordering;
    this.panel = panel;
    this.opened = false;
  }

  public open(): void {
    const sidebarPanelsContainer = document.querySelector(
      "#gifw-sidebar-right",
    );
    const sidebar: HTMLDivElement = sidebarPanelsContainer.querySelector(
      `#${this.id}`,
    );

    const otherSidebars: NodeListOf<HTMLDivElement> =
      sidebarPanelsContainer.querySelectorAll(".sidebar");
    otherSidebars.forEach((sb) => {
      sb.style.display = "none";
    });
    const otherSidebarButtons = document.querySelectorAll(
      ".giframeworkMap .sidebar-button",
    );
    otherSidebarButtons.forEach((sb) => {
      sb.classList.toggle("sidebar-open", true);
      sb.classList.remove("active");
    });

    const sidebarButton: HTMLButtonElement = document.querySelector(
      `.giframeworkMap .sidebar-button button[data-gi-sidebar-target="${this.id}"]`,
    );
    const sidebarButtonContainer: HTMLElement = sidebarButton?.parentElement;
    sidebarPanelsContainer.classList.toggle("show", true);
    sidebarButtonContainer?.classList.toggle("active", true);
    sidebarButton?.blur();

    sidebar.style.display = "block";
    if (!this.opened) {
      this.panel.init();
      this.opened = true;
    } else {
      this.panel.render();
    }
  }
  public close(): void {
    Sidebar.close();
  }
  public toggle(): void {
    const targetSidebarId = this.id;
    const sidebarPanelsContainer = document.querySelector(
      "#gifw-sidebar-right",
    );
    const sidebar: HTMLDivElement = sidebarPanelsContainer.querySelector(
      `#${targetSidebarId}`,
    );

    if (sidebar.style.display === "none") {
      this.close();
      this.open();
    } else {
      this.close();
    }
  }
  public addButton(): void {
    this.control = new GIFWSidebarControl.SidebarControl(this);
  }

  static close() {
    const sidebarPanelsContainer = document.querySelector(
      "#gifw-sidebar-right",
    );
    sidebarPanelsContainer.classList.toggle("show", false);
    const otherSidebars: NodeListOf<HTMLDivElement> =
      sidebarPanelsContainer.querySelectorAll(".sidebar");
    otherSidebars.forEach((sb) => {
      sb.style.display = "none";
    });
    const otherSidebarButtons: NodeListOf<HTMLButtonElement> =
      document.querySelectorAll(
        ".giframeworkMap .sidebar-button button[data-gi-sidebar-target]",
      );
    otherSidebarButtons.forEach((sb) => {
      sb.parentElement.classList.toggle("sidebar-open", false);
      sb.parentElement.classList.toggle("active", false);
      sb.blur();
    });
  }
}
