import { ExecutorContext } from '@nrwl/devkit';
import { Inject, Service } from 'typedi';
import { EXECUTOR_CONTEXT } from '../../common/constants';
import { PROMOTE_EXECUTOR_SCHEMA } from './tokens';
import { PromoteExecutorSchema } from '../schema';
import { Logger, LoggerInterface } from '../../common/logger';
import { expandOptions } from '../../common/utils';
import {
  addAppToPipeline,
  addMember,
  appExists,
  createApp,
  createCatFile,
  getAppName,
  getPipelineName,
  getRemoteName,
  mergeConfigVars,
  pipelineExists,
  promoteApp,
  removeCatFile,
} from '../../common/heroku';

@Service()
export class HerokuPromoteService {
  constructor(
    @Inject(PROMOTE_EXECUTOR_SCHEMA)
    private options: PromoteExecutorSchema,
    @Inject(EXECUTOR_CONTEXT) private readonly context: ExecutorContext,
    @Logger() private logger: LoggerInterface
  ) {
    this.logger.verbose = options.verbose;
  }

  private async validateOptions() {
    this.options = expandOptions(this.options);
  }

  private async setupHeroku(): Promise<void> {
    await createCatFile(this.options);
    this.logger.info('Created and wrote to ~/.netrc');
  }

  async run() {
    const {
      appNamePrefix,
      config: environment,
      org,
      variables,
      verbose,
    } = this.options;

    const { projectName } = this.context;
    await this.validateOptions();
    await this.setupHeroku();

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
      await removeCatFile();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
