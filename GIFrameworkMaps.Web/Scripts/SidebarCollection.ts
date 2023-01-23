import * as Sidebar from "../Scripts/Sidebar";

export class SidebarCollection {

    sidebars: Array<Sidebar.Sidebar>;
    constructor(sidebars:Array<Sidebar.Sidebar>) {
        this.sidebars = sidebars;
    }

    public initSidebarCollection(): void {
        let actualOrdering: number = 1;
        this.sidebars.sort((a, b) => a.ordering - b.ordering).forEach(sidebar => {
            sidebar.ordering = actualOrdering;
            console.log(sidebar);
            sidebar.addButton();
            actualOrdering++;
        });
    }
}