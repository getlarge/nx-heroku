import 'reflect-metadata';

import { ExecutorContext, logger } from '@nrwl/devkit';
import Container from 'typedi';

import { EXECUTOR_CONTEXT } from '../common/constants';
import { DynoExecutorSchema } from './schema';
import { HerokuDynoService } from './services/heroku-dyno.service';
import { DYNO_EXECUTOR_SCHEMA } from './services/tokens';

export default async function runExecutor(
  options: DynoExecutorSchema,
  context: ExecutorContext
) {
  options.debug ??= context.isVerbose;
  Container.set(DYNO_EXECUTOR_SCHEMA, options);
  Container.set(EXECUTOR_CONTEXT, context);
  const herokuDynoService = Container.get(HerokuDynoService);

  try {
    await herokuDynoService.run();
    logger.info(`Dyno ${options.command} successful.`);
    return { success: true };
  } catch (err) {
    logger.error(err);
    return { success: false };
  } finally {
    await herokuDynoService.close();
  }
}
