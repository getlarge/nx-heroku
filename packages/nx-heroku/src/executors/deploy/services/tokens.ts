import type { ExecutorContext } from '@nrwl/devkit';
import { Token } from 'typedi';
import type { DeployExecutorSchema } from '../schema';

export const DEPLOY_EXECUTOR_SCHEMA = new Token<DeployExecutorSchema>(
  'DEPLOY_EXECUTOR_SCHEMA'
);
export const EXECUTOR_CONTEXT = new Token<ExecutorContext>('EXECUTOR_CONTEXT');
