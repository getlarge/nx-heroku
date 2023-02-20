/* eslint-disable max-lines */
import axios from 'axios';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { Inject, Service } from 'typedi';

import {
  APTFILE,
  HEROKU_BUILDPACK_APT,
  HEROKU_BUILDPACK_STATIC,
  STATIC_JSON,
} from '../../common/constants';
import {
  addAddons,
  addAppToPipeline,
  addDrain,
  addMember,
  addWebhook,
  createApp,
  getPipelineName,
  mergeConfigVars,
  pipelineExists,
} from '../../common/heroku';
import { Logger, LoggerInterface } from '../../common/logger';
import { exec, sleep } from '../../common/utils';
import { DeployExecutorSchema, ExtendedDeployExecutorSchema } from '../schema';
import { DEPLOY_EXECUTOR_SCHEMA } from './tokens';

@Service()
export class HerokuAppService {
  constructor(
    @Inject(DEPLOY_EXECUTOR_SCHEMA)
    private options: DeployExecutorSchema,
    @Logger() private logger: LoggerInterface
  ) {
    this.logger.verbose = options.verbose;
  }

  async run(
    options: Pick<
      ExtendedDeployExecutorSchema,
      'appName' | 'environment' | 'projectName' | 'remoteName'
    >
  ) {
    const { appName, projectName } = options;
    const extendedOptions: ExtendedDeployExecutorSchema = {
      ...this.options,
      ...options,
    };

    this.logger.info(`Deploying ${projectName} on ${appName} Heroku app...`);
    await new HerokuApp(extendedOptions, this.logger).run();
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
  constructor(
    public options: ExtendedDeployExecutorSchema,
    public logger: LoggerInterface
  ) {}

  /*
   * @description create Procfile if it does not exist
   */
  private async createProcfile(): Promise<void> {
    const { procfile, projectName } = this.options;
    if (procfile) {
      await writeFile(
        join(process.cwd(), `apps/${projectName}/Procfile`),
        procfile
      );
      // TODO: allow for custom commit message
      await exec(
        `git add -A && git commit -m "ci(${projectName}): add Procfile" -n --no-gpg-sign`
      );
      this.logger.info('Written Procfile with custom configuration');
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
        `apps/${projectName}/${buildPackFile}`
      );
      const destPath = join(process.cwd(), buildPackFile);
      const srcBuildPackFile = await readFile(srcPath, 'utf-8');
      // TODO: check destPath exists ?
      const destBuildPackFile = await readFile(destPath, 'utf-8');
      if (destBuildPackFile === srcBuildPackFile) return;

      await writeFile(destPath, srcBuildPackFile);
      // TODO: allow for custom commit message
      await exec(
        `git add -f ${buildPackFile} && git commit -m "ci(${projectName}): add ${buildPackFile}" -n --no-gpg-sign`
      );
      this.logger.info(`Written ${buildPackFile} with custom configuration`);
    }
  }

  private async hasPlugin(plugin: string): Promise<boolean> {
    const { stdout: list } = await exec('heroku plugins', { encoding: 'utf8' });
    return list.includes(plugin);
  }

  private async addBuildPacks(): Promise<void> {
    const { appName, buildPacks } = this.options;
    if (buildPacks?.length) {
      if (!this.hasPlugin('buildpack-registry')) {
        await exec('heroku plugins:install buildpack-registry');
      }
      await exec(`heroku buildpacks:clear --app ${appName}`);
      const promises = buildPacks.map((buildPack, i) => {
        const index = i + 1;
        return exec(
          `heroku buildpacks:add ${buildPack} --app ${appName} --index ${index}`
        );
      });
      await Promise.all(promises);
    }
  }

  private createStatic() {
    return this.createBuildpackFile(HEROKU_BUILDPACK_STATIC, STATIC_JSON);
  }

  private createAptfile() {
    return this.createBuildpackFile(HEROKU_BUILDPACK_APT, APTFILE);
  }

  private async addRemote(): Promise<boolean> {
    const { appName, org, remoteName } = this.options;
    // TODO: catch error when gitconfig could not be locked that occurs during parallel deployment
    const { stderr } = await exec(
      `heroku git:remote --app ${appName} --remote ${remoteName}`
    );
    if (stderr) {
      await createApp({
        appName,
        org,
        remoteName,
      });
      this.logger.info(`Created app ${appName} on git remote ${remoteName}`);
      return true;
    }
    this.logger.info(`Added git remote ${remoteName}`);
    return false;
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
          `Pipeline ${pipelineName} not found, it will be created at the next step`
        );
        await exec(
          `heroku pipelines:create ${pipelineName} --app ${appName} --stage ${environment} --team ${org}`
        );
        if (repositoryName) {
          await exec(
            `heroku pipelines:connect ${pipelineName} -r ${org}/${repositoryName}`
          );
        }
      }
    } catch (error) {
      if (error.status !== 2) {
        this.logger.warn(error.message);
      }
    }
  }

  private async findOrAddMember(): Promise<void> {
    const { serviceUser } = this.options;
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
      this.logger.warn(
        `Webhook not found for ${appName}, it will be registered at the next step.`
      );
    } else if (response === 'updated') {
      this.logger.warn(
        `Webhook found for ${appName} but parameters changed, it will be updated at the next step.`
      );
    }
  }

  private async findOrAddDrain(): Promise<void> {
    const { appName } = this.options;
    const response = await addDrain({
      appName,
      drain: this.options.drain,
    });
    if (response === 'created') {
      this.logger.warn(
        `Did not find drain for app ${appName}, it will be added at the next step.`
      );
    } else if (response === 'found') {
      this.logger.info(`Found drain for app ${appName}.`);
    }
  }

  private async getRemoteBranch(): Promise<string> {
    const { remoteName } = this.options;
    const { stdout } = await exec(
      `git remote show ${remoteName} | grep 'HEAD' | cut -d':' -f2 | sed -e 's/^ *//g' -e 's/ *$//g'`,
      { encoding: 'utf-8' }
    );
    return stdout?.trim();
  }

  // when resetting Heroku repo, consider long watchDelay as the upload might take a while
  private async resetAppRepo(
    appName: string,
    remoteBranch: string | undefined
  ): Promise<boolean> {
    this.logger.info(`Reset repo ${remoteBranch}`);
    if (!(await this.hasPlugin('heroku-repo'))) {
      await exec('heroku plugins:install heroku-repo');
    }
    await exec(`heroku repo:reset -a ${appName}`);
    return true;
  }

  private createDeployProcess(
    signal: AbortSignal
  ): ChildProcessWithoutNullStreams {
    const { branch, remoteName, useForce } = this.options;
    // calling git push with option progress, it is required to push output to stdout
    // otherwise listening to stdout and stderr would not work, and spawn options would require stdio: 'inherit'
    const args = [
      'push',
      remoteName,
      `${branch}:refs/heads/main`,
      '--progress',
    ];
    if (useForce) {
      args.push('--force');
    }

    const push = spawn('git', args, { signal });
    push.stdout.setEncoding('utf-8');
    push.stdout.on('data', (data) => this.logger.info(data));
    push.stderr.setEncoding('utf-8');
    push.stderr.on('data', (data) => this.logger.error(data));

    return push;
  }

  // eslint-disable-next-line max-lines-per-function
  private async deploy() {
    const { appName, branch, resetRepo = false, watchDelay = 0 } = this.options;
    if (resetRepo) {
      const remoteBranch = await this.getRemoteBranch();
      this.resetAppRepo(appName, remoteBranch);
    }
    this.logger.info(`Pushing to Heroku app ${appName} on branch ${branch}`);
    // Wait for [watchDelay] seconds once the build started to ensure it works and kill child process
    // if watchDelay === 0, the process will not be aborted
    await new Promise<void>((resolve, reject) => {
      const controller = new AbortController();
      const { signal } = controller;
      const push = this.createDeployProcess(signal);
      const timer = setTimeout(() => {
        if (watchDelay) {
          controller.abort();
          this.logger.info('Build will continue running in the background.');
        }
      }, watchDelay);

      function cleanEvents() {
        push.stdout.removeAllListeners();
        push.stderr.removeAllListeners();
        push.removeAllListeners();
        clearTimeout(timer);
      }

      function done(
        code: number,
        sig: NodeJS.Signals,
        event: 'closed' | 'exited'
      ) {
        this.logger.info(`Build process ${event} ${code} ${sig}`);
        cleanEvents();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to deploy app ${appName}: ${code} ${sig}`));
        }
      }

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
  }

  private async healthcheckFailed(): Promise<void> {
    const { rollbackOnHealthcheckFailed, appName } = this.options;
    if (rollbackOnHealthcheckFailed) {
      await exec(`heroku rollback --app ${appName}`);
      throw new Error(
        'Health Check Failed. Error deploying Server. Deployment has been rolled back. Please check your logs on Heroku to try and diagnose the problem'
      );
    } else {
      throw new Error(
        'Health Check Failed. Error deploying Server. Please check your logs on Heroku to try and diagnose the problem'
      );
    }
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
          validateStatus(status) {
            return status >= 200 && status < 300;
          },
        });
        if (checkString && checkString !== body) {
          throw new Error('Failed to match the `checkString`');
        }
        this.logger.info(body);
      } catch (err) {
        this.logger.warn(err.message);
        await this.healthcheckFailed();
      }
    }
  }

  async run(): Promise<void> {
    await this.createProcfile();
    await this.createStatic();
    await this.createAptfile();
    await this.addRemote();
    await mergeConfigVars(this.options);
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
