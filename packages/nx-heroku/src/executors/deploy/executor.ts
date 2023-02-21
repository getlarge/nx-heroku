import 'reflect-metadata';

import { ExecutorContext, logger } from '@nrwl/devkit';
import { Container } from 'typedi';

import { EXECUTOR_CONTEXT } from '../common/constants';
import { DeployExecutorSchema } from './schema';
import { HerokuDeployService } from './services/heroku-deploy.service';
import { DEPLOY_EXECUTOR_SCHEMA } from './services/tokens';

export default async function herokuDeployment(
  options: DeployExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  options.debug ??= context.isVerbose;
  Container.set(DEPLOY_EXECUTOR_SCHEMA, options);
  Container.set(EXECUTOR_CONTEXT, context);
  const herokuDeployService = Container.get(HerokuDeployService);
  try {
    await herokuDeployService.run();
    return { success: true };
  } catch (err) {
    logger.error(err);
    return { success: false };
  } finally {
    await herokuDeployService.close();
  }
}
