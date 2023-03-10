import { ExecutorContext } from '@nrwl/devkit';
import { Inject, Service } from 'typedi';

import { EXECUTOR_CONTEXT } from '../../common/constants';
import {
  addAppToPipeline,
  addMember,
  appExists,
  createApp,
  getAppName,
  getPipelineName,
  getRemoteName,
  mergeConfigVars,
  pipelineExists,
  promoteApp,
} from '../../common/heroku';
import { HerokuBaseService } from '../../common/heroku/base.service';
import { Logger, LoggerInterface } from '../../common/logger';
import { PromoteExecutorSchema } from '../schema';
import { PROMOTE_EXECUTOR_SCHEMA } from './tokens';

@Service()
export class HerokuPromoteService extends HerokuBaseService<PromoteExecutorSchema> {
  constructor(
    @Inject(PROMOTE_EXECUTOR_SCHEMA)
    options: PromoteExecutorSchema,
    @Inject(EXECUTOR_CONTEXT) private readonly context: ExecutorContext,
    @Logger() logger: LoggerInterface
  ) {
    super(options, logger);
    this.logger.debug = options.debug;
  }

  private async checkPipelineExists(): Promise<string> {
    const { appNamePrefix } = this.options;
    const { projectName } = this.context;
    const pipelineName = getPipelineName({ appNamePrefix, projectName });
    if (!(await pipelineExists({ appNamePrefix, projectName }))) {
      throw new Error(`Pipeline ${pipelineName} does not exist.`);
    }
    return pipelineName;
  }

  private async checkAppExistsInPipeline(
    pipelineName: string
  ): Promise<string> {
    const { appNamePrefix, config: environment, org, debug } = this.options;
    const { projectName } = this.context;
    const appName = getAppName({
      appNamePrefix,
      projectName,
      environment,
      debug,
    });
    if (!(await appExists({ appName }))) {
      this.logger.log(`Creating app ${appName}...`);
      await createApp({
        appName,
        org,
        remoteName: getRemoteName(appName),
      });
      await addAppToPipeline({
        appName,
        pipelineName,
        environment,
      });
    }
    return appName;
  }

  async run(): Promise<void> {
    this.validateOptions();
    await this.setupHerokuAuth();
    const { appNamePrefix, config: environment, variables } = this.options;
    const { projectName } = this.context;
    const pipelineName = await this.checkPipelineExists();
    const appName = await this.checkAppExistsInPipeline(pipelineName);
    await mergeConfigVars({
      appName,
      variables,
      update: true,
    });

    this.logger.log(`Promoting app ${appName}...`);
    await promoteApp({ appNamePrefix, projectName, environment });

    this.options.serviceUser &&
      (await addMember({ appName, serviceUser: this.options.serviceUser }));
    //? await addDrain({ appName, drain: this.options.drain });
    //? await addWebhook({ appName, webhook: this.options.webhook });
  }

  async close(): Promise<void> {
    try {
      await this.tearDownHerokuAuth();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
