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

/**
 * Canonical lowercase enterprise type IDs that match the
 * `enterprise_types` reference-data rows and the Drizzle
 * `enterpriseType` pgEnum in cellarnode-backend-v2.
 */
export type EnterpriseType = "producer" | "importer" | "distributor";
