/* eslint-disable max-lines */
import { ExecutorContext } from '@nx/devkit';
import axios from 'axios';
import { toNumber } from 'lodash';
import {
  ChildProcessWithoutNullStreams,
  ExecException,
  spawn,
} from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Service } from 'typedi';

import {
  APTFILE,
  EXECUTOR_CONTEXT,
  HEROKU_BUILDPACK_APT,
  HEROKU_BUILDPACK_STATIC,
  PROCFILE,
  STATIC_JSON,
} from '../../common/constants';
import { getGitLocalBranchName, getGitRemoteBranch } from '../../common/git';
import {
  addAddons,
  addAppToPipeline,
  addBuildPack,
  addDrain,
  addMember,
  addWebhook,
  clearBuildPacks,
  createApp,
  createAppRemote,
  createPipeline,
  getPipelineName,
  hasPlugin,
  HerokuError,
  installPlugin,
  mergeConfigVars,
  pipelineExists,
  serializeConfigVars,
} from '../../common/heroku';
import { HerokuBaseService } from '../../common/heroku/base.service';
import { Logger, LoggerInterface } from '../../common/logger';
import { exec, isExecException, sleep } from '../../common/utils';
import { DeployExecutorSchema, ExtendedDeployExecutorSchema } from '../schema';
import { DEPLOY_EXECUTOR_SCHEMA } from './tokens';

@Service()
export class HerokuAppService {
  constructor(
    @Inject(DEPLOY_EXECUTOR_SCHEMA)
    private options: DeployExecutorSchema,
    @Inject(EXECUTOR_CONTEXT) private readonly context: ExecutorContext,
    @Logger() private logger: LoggerInterface
  ) {
    this.logger.debug = options.debug;
  }

  /*
   * 1. expand options (interpolate variables starting with $)
   * 2. Set default branch
   * 3. set watch delay to milliseconds
   */
  async validateOptions() {
    this.options = HerokuBaseService.validateOptions(this.options);
    this.options.branch ??= await getGitLocalBranchName();
    this.options.watchDelay = toNumber(this.options.watchDelay) * 1000;
  }

  async run(
    options: Pick<
      ExtendedDeployExecutorSchema,
      'appName' | 'environment' | 'projectName' | 'remoteName'
    >
  ): Promise<void> {
    await this.validateOptions();
    const { appName, projectName } = options;
    const extendedOptions: ExtendedDeployExecutorSchema = {
      ...this.options,
      ...options,
    };
    this.logger.info(`Deploying ${projectName} on ${appName} Heroku app...`);
    await new HerokuApp(extendedOptions, this.context, this.logger).run();
  }
}

/*
 * @description create Heroku application and all its resources
 * 1. Create project 'Procfile'
 * 2. Create static buildpack config (optional)
 * 3. Create 'Aptfile', to install extra Ubuntu dependencies before build (optional)
 * 4. Ensure remote is added (that application created)
 * 5. Merge HD_ prefixed variables with the one provided in the options and set Heroku app 'config vars'
 * 6. Register buildpacks (optional)
 * 7. Ensure app is attached to a pipeline with a stage matching the environment provided in options
 * 8. Assign management member (optional)
 * 9. Register addons (optional)
 * 10. Register drains (optional)
 * 11. Register webhook (optional)
 * 12. Deploy (trigger build)
 * 13. Run healthcheck (optional)
 */
class HerokuApp {
  private readonly appsDir: string;

  constructor(
    public options: ExtendedDeployExecutorSchema,
    public context: ExecutorContext,
    public logger: LoggerInterface
  ) {
    this.appsDir =
      context.nxJsonConfiguration?.workspaceLayout?.appsDir ?? 'apps';
  }

  private async addAndCommitFile(
    projectName: string,
    fileName: string
  ): Promise<void> {
    try {
      //? allow custom commit message with format from 'util'
      // const COMMIT_MESSAGE_TEMPLATE = '%s(%s): %s';
      // format(COMMIT_MESSAGE_TEMPLATE, conf.type, conf.scope, conf.message);
      const path = join(this.appsDir, projectName, fileName);
      await exec(
        `git add ${path} && git commit -m "ci(${projectName}): add ${fileName}" -n --no-gpg-sign`
      );
      this.logger.info(`Wrote ${path} with custom configuration.`);
    } catch (error) {
      const ex = error as ExecException;
      // there is (probably) nothing to commit
      this.logger.warn(`${ex.message.trim()}, code ${ex.code}`);
    }
  }
  /*
   * @description create Procfile from options
   */
  private async createProcfile(): Promise<void> {
    const { procfile, projectName } = this.options;
    const procfilePath = join(
      process.cwd(),
      this.appsDir,
      projectName,
      PROCFILE
    );
    const procfileExists = await stat(procfilePath)
      .then(() => true)
      .catch(() => false);
    if (procfile && !procfileExists) {
      await writeFile(procfilePath, procfile);
      await this.addAndCommitFile(projectName, PROCFILE);
    }
  }

  private async createBuildpackFile(
    buildPackName: string,
    buildPackFile: string
  ): Promise<void> {
    const { buildPacks, projectName } = this.options;
    if (buildPacks.includes(buildPackName)) {
      const srcPath = join(
        process.cwd(),
        this.appsDir,
        projectName,
        buildPackFile
      );
      const destPath = join(process.cwd(), buildPackFile);
      const srcBuildPackFile = await readFile(srcPath, 'utf-8');
      // TODO: check destPath exists ?
      const destBuildPackFile = await readFile(destPath, 'utf-8');
      if (destBuildPackFile === srcBuildPackFile) return;

      await writeFile(destPath, srcBuildPackFile);
      await this.addAndCommitFile(projectName, buildPackFile);
    }
  }

  private async addBuildPacks(): Promise<void> {
    const { appName, buildPacks } = this.options;
    if (!(await hasPlugin('buildpack-registry'))) {
      await installPlugin('buildpack-registry');
    }
    this.logger.info(`Clearing and adding buildpacks...`);
    await clearBuildPacks({ appName });
    for (const [i, buildPack] of buildPacks.entries()) {
      await addBuildPack({ appName, buildPack, index: i + 1 });
    }
    this.logger.info(`Buildpacks ${buildPacks} added.`);
  }

  private createStatic(): Promise<void> {
    return this.createBuildpackFile(HEROKU_BUILDPACK_STATIC, STATIC_JSON);
  }

  private createAptfile(): Promise<void> {
    return this.createBuildpackFile(HEROKU_BUILDPACK_APT, APTFILE);
  }

  private async addRemote(): Promise<boolean> {
    const { appName, org, remoteName, region } = this.options;
    try {
      await createAppRemote({ appName, remoteName });
    } catch (error) {
      if (error instanceof HerokuError) {
        await createApp({
          appName,
          org,
          remoteName,
          region,
        });
        this.logger.info(`Created app ${appName} on git remote ${remoteName}.`);
        return true;
      }
      throw error;
    }
    this.logger.info(`Added git remote ${remoteName}.`);
    return false;
  }

  private async mergeConfigVars(): Promise<void> {
    const { appName, variables } = this.options;
    const updatedConfigVars = await mergeConfigVars({
      appName,
      variables,
      update: true,
    });
    if (updatedConfigVars) {
      this.logger.info(
        `Merged config vars : ${serializeConfigVars(updatedConfigVars)}.`
      );
    }
  }
  private async addToPipeline(): Promise<void> {
    const {
      appName,
      appNamePrefix,
      environment,
      projectName,
      org,
      repositoryName,
    } = this.options;
    const pipelineName = getPipelineName({ appNamePrefix, projectName });
    try {
      if (await pipelineExists({ appNamePrefix, projectName })) {
        await addAppToPipeline({
          appName,
          pipelineName,
          environment,
        });
      } else {
        this.logger.warn(
          `Pipeline ${pipelineName} not found, it will be created at the next step.`
        );
        await createPipeline({ appName, environment, org, pipelineName });
        if (repositoryName) {
          await exec(
            `heroku pipelines:connect ${pipelineName} -r ${org}/${repositoryName}`
          );
        }
      }
    } catch (error) {
      if (isExecException(error) && error.code !== 2) {
        this.logger.warn(error.message.trim());
      }
    }
  }

  private async findOrAddMember(): Promise<void> {
    const { serviceUser } = this.options;
    if (!serviceUser) return;
    const response = await addMember({
      appName: this.options.appName,
      serviceUser,
    });
    if (response === 'created') {
      this.logger.warn(
        `Did not find member ${serviceUser}, it will be added at the next step.`
      );
    } else if (response === 'found') {
      this.logger.warn(`Found member ${serviceUser}`);
    }
  }

  private async findOrAddAddons(): Promise<void> {
    await addAddons({
      appName: this.options.appName,
      addons: this.options.addons,
    });
  }

  private async findOrAddWebhook(): Promise<void> {
    const { appName } = this.options;
    const response = await addWebhook({
      appName,
      webhook: this.options.webhook,
    });
    if (response === 'created') {
      this.logger.warn(`Webhook has been created for app ${appName}.`);
    } else if (response === 'updated') {
      this.logger.warn(`Webhook has been updated for app ${appName}.`);
    } else if (response === 'found') {
      this.logger.warn(`Webhook already created for app ${appName}.`);
    }
  }

  private async findOrAddDrain(): Promise<void> {
    const { appName } = this.options;
    const response = await addDrain({
      appName,
      drain: this.options.drain,
    });
    if (response === 'created') {
      this.logger.warn(`Drain has been created for app ${appName}.`);
    } else if (response === 'found') {
      this.logger.warn(`Drain already created for app ${appName}.`);
    }
  }

  // when resetting Heroku repo, consider long watchDelay as the upload might take a while
  private async resetAppRepo(
    appName: string,
    remoteBranch: string | undefined
  ): Promise<boolean> {
    this.logger.info(`Reset repo ${remoteBranch}`);
    if (!(await hasPlugin('heroku-repo'))) {
      await installPlugin('heroku-repo');
    }
    await exec(`heroku repo:reset -a ${appName}`);
    return true;
  }

  private createDeployProcess(
    signal: AbortSignal,
    useHttps = false
  ): ChildProcessWithoutNullStreams {
    const { apiKey, appName, branch, remoteName, useForce } = this.options;
    // calling git push with option progress, it is required to push output to stdout
    // otherwise listening to stdout and stderr would not work, and spawn options would require stdio: 'inherit'
    // trying this instead of this.options.remoteName to get past some auth issue
    const destination = useHttps
      ? `https://heroku:${apiKey}@git.heroku.com/${appName}.git`
      : remoteName;
    const args = [
      'push',
      destination,
      `${branch}:refs/heads/main`,
      '--progress',
    ];
    if (useForce) {
      args.push('--force');
    }

    this.logger.info(
      `Pushing to Heroku app ${appName} (${destination}) on branch ${branch}`
    );
    const push = spawn('git', args, { signal });
    push.stdout
      .setEncoding('utf-8')
      //? stop watch when data matches ^Total\s+(\d+)\s+\(delta\s+(\d+)\),\s+reused\s+(\d+)\s+\(delta\s+(\d+)\),\s+pack-reused\s+(\d+)
      .on('data', (data) => this.logger.info(data?.trim()));

    push.stderr
      .setEncoding('utf-8')
      .on('data', (data) => this.logger.info(data?.trim()));
    return push;
  }

  // eslint-disable-next-line max-lines-per-function
  private async deploy(): Promise<void> {
    const {
      appName,
      branch,
      remoteName,
      resetRepo = false,
      useHttps = false,
      skipDeploy = false,
      watchDelay = 0,
    } = this.options;
    if (skipDeploy) {
      this.logger.info('Skipping deploy');
      return;
    }
    if (resetRepo) {
      const remoteBranch = await getGitRemoteBranch({ remoteName });
      await this.resetAppRepo(appName, remoteBranch);
    }
    // Wait for [watchDelay] seconds once the build started to ensure it works and kill child process
    // if watchDelay === 0, the process will not be aborted
    await new Promise<void>((resolve, reject) => {
      // TODO: const signal =  AbortSignal.timeout(watchDelay);
      const controller = new AbortController();
      const { signal } = controller;
      const push = this.createDeployProcess(signal, useHttps);
      const timer = setTimeout(() => {
        if (watchDelay) {
          controller.abort();
          this.logger.info('Build will continue running in the background.');
        }
      }, watchDelay);

      const cleanEvents = () => {
        push.stdout.removeAllListeners();
        push.stderr.removeAllListeners();
        push.removeAllListeners();
        clearTimeout(timer);
      };

      const done = (
        code: number,
        sig: NodeJS.Signals,
        event: 'closed' | 'exited'
      ) => {
        this.logger.info(`Build process ${event} ${code} ${sig}`);
        cleanEvents();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to deploy app ${appName}: ${code} ${sig}`));
        }
      };

      push
        .on('close', (code, sig) => done(code, sig, 'closed'))
        .on('exit', (code, sig) => done(code, sig, 'exited'))
        .on('error', (error) => {
          cleanEvents();
          if ('name' in error && error.name === 'AbortError') {
            resolve();
          } else {
            reject(error);
          }
        });
    });
    this.logger.log(
      `Successfully deployed heroku app ${appName} from branch ${branch}.`
    );
  }

  private async healthcheckFailed(): Promise<void> {
    const { rollbackOnHealthcheckFailed, appName } = this.options;
    if (rollbackOnHealthcheckFailed) {
      await exec(`heroku rollback --app ${appName}`);
      throw new Error(
        'Health Check Failed. Error deploying Server. Deployment has been rolled back. Please check your logs on Heroku to try and diagnose the problem.'
      );
    }
    throw new Error(
      'Health Check Failed. Error deploying Server. Please check your logs on Heroku to try and diagnose the problem.'
    );
  }

  private async runHealthcheck(): Promise<void> {
    const { healthcheckDelay, healthcheck, checkString } = this.options;
    if (healthcheck) {
      if (typeof healthcheckDelay === 'number' && !isNaN(healthcheckDelay)) {
        await sleep(healthcheckDelay * 1000);
      }
      try {
        const { data: body } = await axios({
          method: 'get',
          url: healthcheck,
          responseType: 'text',
          validateStatus: (status) => status >= 200 && status < 300,
        });
        if (checkString && checkString !== body) {
          throw new Error('Failed to match the `checkString`');
        }
        this.logger.info(body);
      } catch (error) {
        this.logger.warn(error.message);
        await this.healthcheckFailed();
      }
    }
  }

  async run(): Promise<void> {
    await this.createProcfile();
    await this.createStatic();
    await this.createAptfile();
    await this.addRemote();
    await this.mergeConfigVars();
    await this.addBuildPacks();
    // TODO: add warning if stack update is available https://devcenter.heroku.com/articles/upgrading-to-the-latest-stack
    await this.addToPipeline();
    await this.findOrAddMember();
    await this.findOrAddAddons();
    await this.findOrAddDrain();
    await this.findOrAddWebhook();
    await this.deploy();
    await this.runHealthcheck();
  }
}
