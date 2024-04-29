import { Map as olMap } from "ol";
import { GIFWMap } from "../Map";

export interface SidebarPanel {
  container?: string;
  html?: string;
  olMapInstance?: olMap;
  init: () => void;
  render: () => void;
  setGIFWMapInstance: (map: GIFWMap) => void;
}
