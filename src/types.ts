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

/**
 * One canonical aroma/sensory descriptor (CEL-1618, backed by the
 * `aroma_descriptors` reference-data row — see
 * `cellarnode-backend-v2/apps/cellarnode/src/lib/aroma-descriptor-index.ts`
 * for the server-side counterpart). `aliases` are common alternate
 * spellings that resolve to this term on the server; this package does not
 * re-implement that fold/resolve matching — see `getAromaDescriptorLabel`.
 */
export interface AromaDescriptorTerm {
  readonly slug: string;
  readonly label: string;
  readonly "x-standard": string;
  readonly aliases?: readonly string[];
}

/** One beverage family's aroma-descriptor vocabulary (e.g. `wine`). */
export interface AromaDescriptorFamily {
  readonly label: string;
  readonly standardRef: string;
  readonly terms: readonly AromaDescriptorTerm[];
}

/** Every aroma-descriptor family, keyed by beverage category id. */
export type AromaDescriptorFamilies = Readonly<Record<string, AromaDescriptorFamily>>;
