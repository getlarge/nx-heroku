import { ExecutorBaseSchema } from '../common/base-schema';

export interface DynoExecutorSchema extends ExecutorBaseSchema {
  command: 'kill' | 'restart' | 'stop';
}
