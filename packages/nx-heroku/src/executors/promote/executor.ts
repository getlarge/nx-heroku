import 'reflect-metadata';

import type { ExecutorContext } from '@nx/devkit';
import Container from 'typedi';

import { EXECUTOR_CONTEXT } from '../common/constants';
import { PromoteExecutorSchema } from './schema';
import { HerokuPromoteService } from './services/heroku-promote.service';
import { PROMOTE_EXECUTOR_SCHEMA } from './services/tokens';

export default async function runExecutor(
  options: PromoteExecutorSchema,
  context: ExecutorContext
) {
  options.debug ??= context.isVerbose;
  Container.set(PROMOTE_EXECUTOR_SCHEMA, options);
  Container.set(EXECUTOR_CONTEXT, context);
  const herokuPromoteService = Container.get(HerokuPromoteService);
  try {
    await herokuPromoteService.run();
    herokuPromoteService.logger.info('Promotion successful.');
    return { success: true };
  } catch (error) {
    herokuPromoteService.logger.error(error);
    return { success: false };
  } finally {
    await herokuPromoteService.close();
  }
}
