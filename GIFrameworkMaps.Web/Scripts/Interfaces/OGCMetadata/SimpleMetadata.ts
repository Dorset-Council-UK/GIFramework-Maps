export interface SimpleMetadata {
  title: string;
  abstract: string;
  attribution: string;
  keywords: string[];
  accessRights: string;
  dataLinks: MetadataLinks[];
  documentURL: string;
}

export interface MetadataLinks {
  url: string;
  type: string;
}
