import { Map as olMap } from "ol";

export interface SidebarPanel {
    container?: string;
    html?: string;
    olMapInstance?: olMap;
    init: () => void;
    render: () => void;

}