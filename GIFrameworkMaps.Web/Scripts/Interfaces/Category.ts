import { Layer } from "./Layer";

export interface Category {
  id: number;
  name: string;
  description: string;
  order: number;
  layers: Layer[];
  parentCategory: Category;
  open: boolean;
}
