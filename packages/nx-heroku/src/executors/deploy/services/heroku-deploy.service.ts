import type { ExecutorContext } from '@nrwl/devkit';
import { Inject, Service } from 'typedi';

import { Environment, EXECUTOR_CONTEXT } from '../../common/constants';
import {
  getGitEmail,
  getGitUserName,
  setGitEmail,
  setGitUserName,
} from '../../common/git';
import { getAppName, getRemoteName } from '../../common/heroku';
import { HerokuBaseService } from '../../common/heroku/base.service';
import { Logger, LoggerInterface } from '../../common/logger';
import { exec } from '../../common/utils';
import { DeployExecutorSchema } from '../schema';
import { HerokuAppService } from './heroku-app.service';
import { DEPLOY_EXECUTOR_SCHEMA } from './tokens';

@Service()
export class HerokuDeployService extends HerokuBaseService<DeployExecutorSchema> {
  private previousGitConfig = { name: '', email: '' };
  private appsDir: string;

  constructor(
    @Inject(DEPLOY_EXECUTOR_SCHEMA)
    options: DeployExecutorSchema,
    @Inject(EXECUTOR_CONTEXT) private readonly context: ExecutorContext,
    @Inject(() => HerokuAppService) private herokuAppManager: HerokuAppService,
    @Logger() logger: LoggerInterface
  ) {
    super(options, logger);
    this.logger.debug = options.debug;
    this.appsDir =
      context.nxJsonConfiguration?.workspaceLayout?.appsDir || 'apps';
  }

  /*
   * variables are prefixed with HD to avoid conflicts with other env vars
   * this prefix is removed in 'mergeConfigVars' function
   */
  private setEnvironmentVariables(environment: Environment): void {
    const { projectName } = this.context;
    process.env.HD_NODE_ENV = environment;
    process.env.HD_PROJECT_ENV = environment;
    process.env.HD_PROJECT_NAME = projectName;
    /*
     * We make the assumption that the project type is app.
     * in an Nx monorepo, there should be more that one app so more than one Procfile is needed,
     * which requires to use the buildpack 'heroku-community/multi-procfile' and to set the config var 'PROCFILE' to the path of the Procfile
     */
    process.env.HD_PROCFILE = `${this.appsDir}/${projectName}/Procfile`;
  }

  private async setupHeroku(): Promise<void> {
    const { email } = this.options;
    this.previousGitConfig.name = await getGitUserName();
    this.previousGitConfig.email = await getGitEmail();
    await exec(`git config user.name "${this.previousGitConfig.name}"`);
    await exec(`git config user.email "${email}"`);
    const { stdout: status } = await exec('git status --porcelain', {
      encoding: 'utf-8',
    });
    if (status) {
      this.logger.warn(
        `Some local changes are not committed :\n ${status.trim()}`
      );
    }

    // Check if Repo clone is shallow
    const { stdout: isShallow } = await exec(
      'git rev-parse --is-shallow-repository',
      { encoding: 'utf-8' }
    );
    // If the Repo clone is shallow, make it unshallow
    if (isShallow === 'true\n') {
      await exec('git fetch --prune --unshallow');
    }

    await this.setupHerokuAuth();
  }

  private async deployApp(environment: Environment): Promise<void> {
    const { projectName } = this.context;
    const { appNamePrefix, debug } = this.options;
    const appName = getAppName({
      appNamePrefix,
      environment,
      projectName,
      debug,
    });
    // heroku-cli default to 'heroku' which might create conflicts between apps when deploying locally | in same process
    const remoteName = getRemoteName(appName);
    await this.herokuAppManager.run({
      environment,
      projectName,
      appName,
      remoteName,
    });
  }

  async run(): Promise<void> {
    this.validateOptions();
    await this.setupHeroku();
    const { config } = this.options;
    for (const environment of config) {
      this.setEnvironmentVariables(environment);
      await this.deployApp(environment);
    }
  }

  async close(): Promise<void> {
    try {
      await this.tearDownHerokuAuth();
      this.previousGitConfig.name &&
        (await setGitUserName(this.previousGitConfig.name));
      this.previousGitConfig.email &&
        (await setGitEmail(this.previousGitConfig.email));
    } catch (error) {
      this.logger.error(error);
    }
  }
}
