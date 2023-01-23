import { SearchDefinition } from "./SearchDefinition";

export interface RequiredSearch {
    stopIfFound: boolean;
    enabled: boolean;
    order: number;
    searchDefinition: SearchDefinition;
}