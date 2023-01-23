import { TourStep } from "./TourStep";

export interface TourDetails {
    id: number;
    name: string;
    frequency: number;
    updateDate: Date;
    steps: TourStep[];
}