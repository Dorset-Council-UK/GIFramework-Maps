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

    constructor(id: string, name:string, description: string, icon:string, ordering:number, panel:SidebarPanel) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.icon = icon;
        this.ordering = ordering;
        this.panel = panel;
        this.opened = false;
    }

    public open(): void {
        let sidebarPanelsContainer = document.querySelector('#gifw-sidebar-right');
        let sidebar: HTMLDivElement = sidebarPanelsContainer.querySelector('#' + this.id);

        var otherSidebars: NodeListOf<HTMLDivElement> = sidebarPanelsContainer.querySelectorAll('.sidebar');
        otherSidebars.forEach(function (sb) {
            sb.style.display = 'none';
        });
        var otherSidebarButtons = document.querySelectorAll('.giframeworkMap .sidebar-button');
        otherSidebarButtons.forEach(function (sb) {
            sb.classList.toggle('sidebar-open', true);
            sb.classList.remove('active');
        });

        let sidebarButton: HTMLButtonElement = document.querySelector('.giframeworkMap .sidebar-button button[data-gi-sidebar-target="' + this.id + '"]');
        let sidebarButtonContainer: HTMLElement = sidebarButton?.parentElement;
        sidebarPanelsContainer.classList.toggle('show', true);
        sidebarButtonContainer?.classList.toggle('active', true);
        sidebarButton?.blur();

        sidebar.style.display = 'block';
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
        var targetSidebarId = this.id;
        var sidebarPanelsContainer = document.querySelector('#gifw-sidebar-right');
        var sidebar:HTMLDivElement = sidebarPanelsContainer.querySelector('#' + targetSidebarId);

        if (sidebar.style.display === 'none') {
            this.close();
            this.open();
        } else {
            this.close();
        };
    }
    public addButton(): void {
        this.control = new GIFWSidebarControl.SidebarControl(this);
    }



    static close() {
        var sidebarPanelsContainer = document.querySelector('#gifw-sidebar-right');
        sidebarPanelsContainer.classList.toggle('show', false);
        var otherSidebars: NodeListOf<HTMLDivElement> = sidebarPanelsContainer.querySelectorAll('.sidebar');
        otherSidebars.forEach(function (sb) {
            sb.style.display = 'none';
        });
        var otherSidebarButtons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.giframeworkMap .sidebar-button button[data-gi-sidebar-target]');
        otherSidebarButtons.forEach(function (sb) {
            sb.parentElement.classList.toggle('sidebar-open', false);
            sb.parentElement.classList.toggle('active', false);
            sb.blur();
        });
    }

}

