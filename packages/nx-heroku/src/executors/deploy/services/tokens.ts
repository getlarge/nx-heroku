import { Token } from 'typedi';
import type { DeployExecutorSchema } from '../schema';

export const DEPLOY_EXECUTOR_SCHEMA = new Token<DeployExecutorSchema>(
  'DEPLOY_EXECUTOR_SCHEMA'
);
