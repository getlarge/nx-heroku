import { ExecutorContext } from '@nrwl/devkit';
import Container from 'typedi';

import { EXECUTOR_CONTEXT } from '../common/constants';
import { DynoExecutorSchema } from './schema';
import { HerokuDynoService } from './services/heroku-dyno.service';
import { DYNO_EXECUTOR_SCHEMA } from './services/tokens';

export default async function runExecutor(
  options: DynoExecutorSchema,
  context: ExecutorContext
) {
  Container.set(DYNO_EXECUTOR_SCHEMA, options);
  Container.set(EXECUTOR_CONTEXT, context);
  const herokuDynoService = Container.get(HerokuDynoService);

  try {
    await herokuDynoService.run();
    return { success: true };
  } catch (err) {
    return { success: false };
  } finally {
    await herokuDynoService.close();
  }
}
