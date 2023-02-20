import { Token } from 'typedi';
import type { DynoExecutorSchema } from '../schema';

export const DYNO_EXECUTOR_SCHEMA = new Token<DynoExecutorSchema>(
  'DYNO_EXECUTOR_SCHEMA'
);
