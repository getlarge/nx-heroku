import type { ExecutorContext } from '@nrwl/devkit';
import { Container } from 'typedi';
import { HerokuDeployService } from './services/heroku-deploy.service';
import { DEPLOY_EXECUTOR_SCHEMA } from './services/tokens';
import { DeployExecutorSchema } from './schema';
import { EXECUTOR_CONTEXT } from '../common/constants';

export default async function herokuDeployment(
  options: DeployExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  Container.set(DEPLOY_EXECUTOR_SCHEMA, options);
  Container.set(EXECUTOR_CONTEXT, context);
  const herokuDeployService = Container.get(HerokuDeployService);

  try {
    await herokuDeployService.run();
    return { success: true };
  } catch (err) {
    return { success: false };
  } finally {
    await herokuDeployService.close();
  }
}
