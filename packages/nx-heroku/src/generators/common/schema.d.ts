export interface GeneratorSchema {
  projectName: string;
  org: string;
  repositoryName?: string;
  appNamePrefix?: string;
  apiKey?: string;
  email?: string;
  debug?: boolean;
}
