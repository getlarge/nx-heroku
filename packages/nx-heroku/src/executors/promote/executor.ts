import type { ExecutorContext } from '@nrwl/devkit';
import Container from 'typedi';

import { EXECUTOR_CONTEXT } from '../common/constants';
import { PromoteExecutorSchema } from './schema';
import { HerokuPromoteService } from './services/heroku-promote.service';
import { PROMOTE_EXECUTOR_SCHEMA } from './services/tokens';

export default async function runExecutor(
  options: PromoteExecutorSchema,
  context: ExecutorContext
) {
  Container.set(PROMOTE_EXECUTOR_SCHEMA, options);
  Container.set(EXECUTOR_CONTEXT, context);
  const herokuPromoteService = Container.get(HerokuPromoteService);

  try {
    await herokuPromoteService.run();
    return { success: true };
  } catch (err) {
    return { success: false };
  } finally {
    await herokuPromoteService.close();
  }
}
