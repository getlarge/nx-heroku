import { Token } from 'typedi';

import type { PromoteExecutorSchema } from '../schema';

export const PROMOTE_EXECUTOR_SCHEMA = new Token<PromoteExecutorSchema>(
  'PROMOTE_EXECUTOR_SCHEMA'
);
