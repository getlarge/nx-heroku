import { ExecutorContext } from '@nrwl/devkit';
import { Inject, Service } from 'typedi';
import { EXECUTOR_CONTEXT } from '../../common/constants';
import { PROMOTE_EXECUTOR_SCHEMA } from './tokens';
import { PromoteExecutorSchema } from '../schema';
import { Logger, LoggerInterface } from '../../common/logger';
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

@Service()
export class HerokuPromoteService extends HerokuBaseService<PromoteExecutorSchema> {
  constructor(
    @Inject(PROMOTE_EXECUTOR_SCHEMA)
    options: PromoteExecutorSchema,
    @Inject(EXECUTOR_CONTEXT) private readonly context: ExecutorContext,
    @Logger() logger: LoggerInterface
  ) {
    super(options, logger);
    this.logger.verbose = options.verbose;
  }

  async run() {
    await this.validateOptions();
    await this.setupHerokuAuth();

    const {
      appNamePrefix,
      config: environment,
      org,
      variables,
      verbose,
    } = this.options;
    const { projectName } = this.context;
    const appName = getAppName({
      appNamePrefix,
      projectName,
      environment,
      verbose,
    });

    const pipelineName = getPipelineName({ appNamePrefix, projectName });
    if (!(await pipelineExists({ appNamePrefix, projectName }))) {
      throw new Error(`Pipeline ${pipelineName} does not exist.`);
    }

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

    await mergeConfigVars({
      appName,
      variables,
    });

    this.logger.log(`Promoting app ${appName}...`);
    await promoteApp({ appNamePrefix, projectName, environment });

    await addMember({ appName, serviceUser: this.options.serviceUser });
    //? await addDrain({ appName, drain: this.options.drain });
    //? await addWebhook({ appName, webhook: this.options.webhook });
  }

  async close() {
    try {
      await this.tearDownHerokuAuth();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
