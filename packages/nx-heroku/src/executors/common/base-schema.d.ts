import { Environment } from './constants';

export interface ExecutorBaseSchema {
  config: Environment;
  appNamePrefix?: string;
  apiKey: string;
  email: string;
  verbose?: boolean;
}
