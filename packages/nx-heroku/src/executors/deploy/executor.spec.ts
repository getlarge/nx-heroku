/* eslint-disable max-lines-per-function */
import { ExecutorContext } from '@nx/devkit';
import Container from 'typedi';

import { getAppName } from '../common/heroku';
import { ConsoleLogger, LoggerInterface } from '../common/logger';
import executor from './executor';
import { DeployExecutorSchema } from './schema';
import { HerokuAppService } from './services/heroku-app.service';
import { HerokuDeployService } from './services/heroku-deploy.service';

const options: DeployExecutorSchema = {
  config: ['development'],
  org: 'my-org',
  apiKey: 'heroku-user-api-key',
  email: 'heroku-user-email',
  serviceUser: 'user',
  buildPacks: [],
  addons: [
    {
      addonName: 'heroku-postgresql:mini',
      addonAlias: 'POSTGRES',
    },
  ],
  webhook: {
    url: process.env.HEROKU_WEBHOOK_URL,
    secret: process.env.HEROKU_WEBHOOK_SECRET,
    include: ['api:build', 'api:release', 'dyno'],
    level: 'sync',
  },
  drain: {
    url: process.env.HEROKU_DRAIN_URL,
  },
  variables: {
    LOG_CONCURRENCY: 'true',
  },
  useForce: true,
  watchDelay: 0,
  debug: false,
};

class MockHerokuAppService extends HerokuAppService {
  constructor(
    options: DeployExecutorSchema,
    context: ExecutorContext,
    logger: LoggerInterface
  ) {
    super(options, context, logger);
  }
}

class MockHerokuDeployService extends HerokuDeployService {
  constructor(
    options: DeployExecutorSchema,
    context: ExecutorContext,
    herokuAppManager: MockHerokuAppService,
    logger: LoggerInterface
  ) {
    super(options, context, herokuAppManager, logger);
  }
}

describe('Deploy Executor', () => {
  let context: ExecutorContext;
  let logger: ConsoleLogger;
  let herokuAppService: MockHerokuAppService;
  let herokuDeployService: MockHerokuDeployService;

  beforeEach(() => {
    context = {
      isVerbose: true,
      cwd: process.cwd(),
      root: '/root',
      projectName: 'test',
      projectsConfigurations: {
        version: 2,
        projects: {
          test: {
            root: '/root',
            targets: {},
          },
        },
      },
    };

    logger = new ConsoleLogger();
    herokuAppService = new MockHerokuAppService(options, context, logger);
    herokuDeployService = new MockHerokuDeployService(
      options,
      context,
      herokuAppService,
      logger
    );
    Container.set(HerokuDeployService, herokuDeployService);

    jest.spyOn(logger, 'info');
    jest.spyOn(logger, 'error');
    jest.spyOn(logger, 'log').mockImplementation();
  });

  afterEach(() => {
    Container.remove(HerokuDeployService);
    jest.resetAllMocks();
  });

  it('can run successfully and return true', async () => {
    herokuDeployService.run = jest.fn();
    //
    const output = await executor(options, context);
    //
    expect(herokuDeployService.run).toBeCalled();
    expect(output.success).toBe(true);
  });

  it('should call deploy as many times as the number of `config` declared', async () => {
    options.config = ['development', 'production'];
    herokuDeployService['validateOptions'] = jest.fn();
    herokuDeployService['setEnvironmentVariables'] = jest.fn();
    herokuDeployService['setupHeroku'] = jest.fn();
    herokuDeployService['deployApp'] = jest.fn();
    herokuDeployService['close'] = jest.fn();
    //
    await executor(options, context);
    //
    expect(herokuDeployService['validateOptions']).toBeCalled();
    expect(herokuDeployService['setupHeroku']).toBeCalled();
    expect(herokuDeployService['setEnvironmentVariables']).toBeCalledTimes(2);
    expect(herokuDeployService['deployApp']).toBeCalledTimes(
      options.config.length
    );
    expect(herokuDeployService.close).toBeCalled();
  });

  // TODO: test
  // validateOptions
  // setEnvironmentVariables
  // setupHeroku
  it('should instantiate the heroku app factory', async () => {
    options.config = ['development', 'production'];
    herokuDeployService['validateOptions'] = jest.fn();
    herokuDeployService['setEnvironmentVariables'] = jest.fn();
    herokuDeployService['setupHeroku'] = jest.fn();
    herokuAppService.run = jest.fn();
    herokuDeployService['close'] = jest.fn();
    //
    await executor(options, context);
    //
    expect(herokuDeployService['validateOptions']).toBeCalled();
    expect(herokuDeployService['setupHeroku']).toBeCalled();
    expect(herokuAppService.run).toBeCalledTimes(options.config.length);
    expect(herokuAppService.run).toBeCalledWith({
      environment: 'development',
      projectName: context.projectName,
      appName: getAppName({
        appNamePrefix: options.appNamePrefix,
        projectName: context.projectName,
        environment: 'development',
      }),
      remoteName: expect.any(String),
    });

    expect(herokuDeployService.close).toBeCalled();
  });

  it('can run with failures and return false', async () => {
    herokuDeployService.run = jest
      .fn()
      .mockRejectedValueOnce(new Error('error'));
    //
    const output = await executor(options, context);
    //
    expect(herokuDeployService.run).toBeCalled();
    expect(output.success).toBe(false);
  });

  it('can run with the minimum required options and return true', async () => {
    const opts: DeployExecutorSchema = {
      config: ['development'],
      org: 'my-org',
      buildPacks: [],
      apiKey: 'heroku-user-api-key',
      email: 'heroku-user-email',
      watchDelay: 0,
    };
    herokuDeployService.run = jest.fn();
    //
    const output = await executor(opts, context);
    //
    expect(herokuDeployService.run).toBeCalled();
    expect(output.success).toBe(true);
  });
});
