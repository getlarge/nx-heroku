import { ExecutorBaseSchema } from '../common/base-schema';

export interface PromoteExecutorSchema extends ExecutorBaseSchema {
  org?: string;
  serviceUser: string;
  variables?: Record<string, string>;
}
