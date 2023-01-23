import { Tooltip } from "bootstrap";
import * as olControl from "ol/control";
import * as GIFWSidebar from "../Scripts/Sidebar";


export class SidebarControl extends olControl.Control {
    constructor(sidebar: GIFWSidebar.Sidebar) {
        //const options = opt_options || {};

        const button = document.createElement('button');
        button.innerHTML = `<img src="${sidebar.icon}" alt="${sidebar.name} icon"/>`;


        button.setAttribute('data-gi-sidebar-target', sidebar.id);
        button.setAttribute('data-bs-toggle', 'tooltip');
        button.setAttribute('data-bs-placement', 'left');
        button.setAttribute('data-bs-container', 'body');
        button.setAttribute('title', sidebar.name);
        const element = document.createElement('div');
        element.className = `${sidebar.id} sidebar-button sidebar-order-${sidebar.ordering} ol-unselectable ol-control`;
        element.appendChild(button);

        super({
            element: element
        });
        
        button.addEventListener('click', function () {
            Tooltip.getInstance(button).hide();
            sidebar.toggle.call(sidebar);
            // This'll set the `this` value inside of `getSelection` to `self`
        }, false);
    };
}
