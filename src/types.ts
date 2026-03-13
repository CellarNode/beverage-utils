export interface BeverageSubtype {
  id: string;
  name: string;
  oivType?: string;
}

export interface BeverageCategory {
  id: string;
  name: string;
  hsHeading?: string;
  subtypes: BeverageSubtype[];
}

export interface BeverageClassification {
  categories: BeverageCategory[];
}
