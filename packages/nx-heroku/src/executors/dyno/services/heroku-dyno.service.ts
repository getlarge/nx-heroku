import { ExecutorContext } from '@nx/devkit';
import { Inject, Service } from 'typedi';

import { EXECUTOR_CONTEXT } from '../../common/constants';
import { AppName, dynoCommand, getAppName } from '../../common/heroku';
import { HerokuBaseService } from '../../common/heroku/base.service';
import { Logger, LoggerInterface } from '../../common/logger';
import { DynoExecutorSchema } from '../schema';
import { DYNO_EXECUTOR_SCHEMA } from './tokens';

@Service()
export class HerokuDynoService extends HerokuBaseService<DynoExecutorSchema> {
  constructor(
    @Inject(DYNO_EXECUTOR_SCHEMA)
    options: DynoExecutorSchema,
    @Inject(EXECUTOR_CONTEXT) private readonly context: ExecutorContext,
    @Logger() logger: LoggerInterface
  ) {
    super(options, logger);
    this.logger.debug = options.debug;
  }

  private call({
    appName,
    command,
  }: {
    appName: AppName;
    command: DynoExecutorSchema['command'];
  }): Promise<string> {
    const validCommands: (typeof command)[] = ['kill', 'restart', 'stop'];
    if (!validCommands.includes(command)) {
      throw new TypeError(
        `Invalid command: ${command}. Valid commands are: ${validCommands}`
      );
    }
    return dynoCommand({
      appName,
      command,
    });
  }

  async run(): Promise<void> {
    this.validateOptions();
    await this.setupHerokuAuth();
    const { appNamePrefix, command, config, debug } = this.options;
    const { projectName } = this.context;
    const appName = getAppName({
      appNamePrefix,
      environment: config,
      projectName,
      debug,
    });
    await this.call({ appName, command });
  }

  async close(): Promise<void> {
    try {
      await this.tearDownHerokuAuth();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
