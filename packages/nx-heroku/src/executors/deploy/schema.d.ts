import { ExecutorBaseSchema } from '../common/base-schema';
import { Environment } from '../common/constants';

export interface DeployExecutorSchema
  extends Omit<ExecutorBaseSchema, 'config'> {
  config: Environment[];
  // org not required to allow for personal apps
  org?: string;
  region?: string;
  repositoryName?: string;
  buildPacks: string[];
  variables?: Record<string, string>;
  addons?: { addonAlias?: string; addonName: string }[];
  webhook?: {
    url: string;
    include: string[];
    level: string;
    secret?: string;
  };
  drain?: {
    url: string;
    user?: string;
    password?: string;
  };
  serviceUser?: string;
  procfile?: string;
  branch?: string;
  useForce?: boolean;
  resetRepo?: boolean;
  useHttps?: boolean;
  skipDeploy?: boolean;
  watchDelay: number;
  healthcheck?: string;
  checkString?: string;
  healthcheckDelay?: number;
  rollbackOnHealthcheckFailed?: boolean;
}

export interface ExtendedDeployExecutorSchema extends DeployExecutorSchema {
  environment: Environment;
  projectName: string;
  appName: string;
  remoteName: string;
}
