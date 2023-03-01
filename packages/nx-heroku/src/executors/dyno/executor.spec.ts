/* eslint-disable max-lines-per-function */
import type { ExecutorContext } from '@nrwl/devkit';
import Container from 'typedi';

import { type LoggerInterface, ConsoleLogger } from '../common/logger';
import executor from './executor';
import type { DynoExecutorSchema } from './schema';
import { HerokuDynoService } from './services/heroku-dyno.service';

const options: Omit<DynoExecutorSchema, 'command'> = {
  config: 'development',
  apiKey: 'heroku-user-api-key',
  email: 'heroku-user-email',
  debug: false,
};

class MockHerokuDynoService extends HerokuDynoService {
  constructor(
    options: DynoExecutorSchema,
    context: ExecutorContext,
    logger: LoggerInterface
  ) {
    super(options, context, logger);
  }
}

describe('Dyno Executor', () => {
  let context: ExecutorContext;
  let logger: ConsoleLogger;
  let herokuDynoService: MockHerokuDynoService;

  beforeEach(() => {
    logger = new ConsoleLogger();
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

    jest.spyOn(logger, 'info');
    jest.spyOn(logger, 'error');
    jest.spyOn(logger, 'log').mockImplementation();
  });

  afterEach(() => {
    Container.remove(HerokuDynoService);
    jest.resetAllMocks();
  });

  it('can run', async () => {
    const opts: DynoExecutorSchema = { ...options, command: 'kill' };
    herokuDynoService = new MockHerokuDynoService(opts, context, logger);
    herokuDynoService.run = jest.fn();
    herokuDynoService.close = jest.fn();
    Container.set(HerokuDynoService, herokuDynoService);
    //
    const output = await executor(opts, context);
    expect(herokuDynoService.run).toBeCalled();
    expect(herokuDynoService.close).toBeCalled();
    //
    expect(output.success).toBe(true);
  });

  it('can call kill dyno command', async () => {
    const opts: DynoExecutorSchema = { ...options, command: 'kill' };
    herokuDynoService = new MockHerokuDynoService(opts, context, logger);
    herokuDynoService['validateOptions'] = jest.fn();
    herokuDynoService['setupHerokuAuth'] = jest.fn();
    herokuDynoService['tearDownHerokuAuth'] = jest.fn();
    herokuDynoService['call'] = jest.fn();
    Container.set(HerokuDynoService, herokuDynoService);
    //
    const output = await executor(opts, context);
    //
    expect(herokuDynoService['call']).toBeCalledWith({
      appName: expect.any(String),
      command: 'kill',
    });
    expect(herokuDynoService['tearDownHerokuAuth']).toBeCalled();
    expect(output.success).toBe(true);
  });

  it('can call restart dyno command', async () => {
    const opts: DynoExecutorSchema = { ...options, command: 'restart' };
    herokuDynoService = new MockHerokuDynoService(opts, context, logger);
    herokuDynoService['validateOptions'] = jest.fn();
    herokuDynoService['setupHerokuAuth'] = jest.fn();
    herokuDynoService['tearDownHerokuAuth'] = jest.fn();
    herokuDynoService['call'] = jest.fn();
    Container.set(HerokuDynoService, herokuDynoService);
    //
    const output = await executor(opts, context);
    //
    expect(herokuDynoService['call']).toBeCalledWith({
      appName: expect.any(String),
      command: 'restart',
    });
    expect(herokuDynoService['tearDownHerokuAuth']).toBeCalled();
    expect(output.success).toBe(true);
  });

  it('should throw an error when passing invalid dyno command and return false', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: DynoExecutorSchema = { ...options, command: 'invalid' as any };
    herokuDynoService = new MockHerokuDynoService(opts, context, logger);
    Container.set(HerokuDynoService, herokuDynoService);
    //
    const output = await executor(opts, context);
    //
    expect(output.success).toBe(false);
  });
});
