import { Environment } from './constants';

export interface ExecutorBaseSchema {
  config: Environment;
  apiKey: string;
  email: string;
  appNamePrefix?: string;
  verbose?: boolean;
}
