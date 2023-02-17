import type { ExecutorContext } from '@nrwl/devkit';
import { toNumber } from 'lodash';
import { Inject, Service } from 'typedi';

import { Environment } from '../../common/constants';
import {
  getGitEmail,
  getGitLocalBranchName,
  getGitUserName,
} from '../../common/git';
import { createCatFile, getAppName, getRemoteName } from '../../common/heroku';
import { Logger, LoggerInterface } from '../../common/logger';
import { exec, expandOptions } from '../../common/utils';
import { HerokuAppService } from './heroku-app.service';
import { DEPLOY_EXECUTOR_SCHEMA, EXECUTOR_CONTEXT } from './tokens';

import { DeployExecutorSchema } from '../schema';

@Service()
export class HerokuDeployService {
  private previousGitConfig = { name: '', email: '' };

  constructor(
    @Inject(DEPLOY_EXECUTOR_SCHEMA)
    private options: DeployExecutorSchema,
    @Inject(EXECUTOR_CONTEXT) private readonly context: ExecutorContext,
    @Inject(() => HerokuAppService) private herokuAppManager: HerokuAppService,
    @Logger() private logger: LoggerInterface
  ) {
    this.logger.verbose = options.verbose;
  }

  /*
   * 1. Expand options (interpolate variables starting with $)
   * 2. Set default branch
   * 3. set watch delay to milliseconds
   */
  private async validateOptions() {
    this.options = expandOptions(this.options);
    this.options.branch ??= await getGitLocalBranchName();
    this.options.watchDelay = toNumber(this.options.watchDelay) * 1000;
  }

  /*
   * variables are prefixed with HD to avoid conflicts with other env vars
   * this prefix is removed in 'mergeConfigVars' function
   */
  private setEnvironmentVariables(environment: Environment) {
    const { projectName } = this.context;
    process.env.HD_NODE_ENV = environment;
    process.env.HD_PROJECT_ENV = environment;
    process.env.HD_PROJECT_NAME = projectName;
    /*
     * We make the assumption that the project type is app.
     * in an Nx monorepo, there should be more that one app so more than one Procfile is needed,
     * which requires to use the buildpack 'heroku-community/multi-procfile' and to set the config var 'PROCFILE' to the path of the Procfile
     */
    process.env.HD_PROCFILE = `apps/${projectName}/Procfile`;
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
      this.logger.warn(`Some local changes are not committed ${status}`);
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

    await createCatFile(this.options);
    this.logger.info('Created and wrote to ~/.netrc');
  }

  private async deployApp(environment: Environment) {
    const { projectName } = this.context;
    const { appNamePrefix, branch, verbose } = this.options;
    const appName = getAppName({
      appNamePrefix,
      environment,
      projectName,
      verbose,
    });
    // heroku-cli default to 'heroku' which might create conflicts between apps when deploying locally | in same process
    const remoteName = getRemoteName(appName);
    await this.herokuAppManager.run({
      environment,
      projectName,
      appName,
      remoteName,
    });
    this.logger.log(
      `Successfully deployed heroku app ${appName} from branch ${branch}.`
    );
  }

  async run() {
    await this.validateOptions();
    await this.setupHeroku();
    const { config, branch } = this.options;
    for (const environment of config) {
      this.setEnvironmentVariables(environment);
      try {
        await this.deployApp(environment);
      } catch (error) {
        if (error.toString().includes("Couldn't find that app")) {
          this.logger.warn(
            `Skipped deploy to heroku app from branch ${branch}`
          );
        } else {
          this.logger.error(error);
          throw error;
        }
      }
    }
  }

  async close() {
    try {
      this.previousGitConfig.name &&
        (await exec(`git config user.name "${this.previousGitConfig.name}"`));
      this.previousGitConfig.email &&
        (await exec(`git config user.email "${this.previousGitConfig.email}"`));
    } catch (error) {
      this.logger.error(error);
    }
  }
}
