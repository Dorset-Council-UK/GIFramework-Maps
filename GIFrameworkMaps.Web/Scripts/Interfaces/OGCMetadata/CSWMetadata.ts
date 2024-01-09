export interface CSWMetadata {
  title: string;
  abstract: string;
  attribution: string;
  keywords: string[];
  accessRights: string;
  dataLinks: CSWMetadataLinks[];
  documentURL: string;
}

export interface CSWMetadataLinks {
  url: string;
  type: string;
}
