import { ExecutorContext } from '@nrwl/devkit';
import { Inject, Service } from 'typedi';
import { DYNO_EXECUTOR_SCHEMA } from './tokens';
import { DynoExecutorSchema } from '../schema';
import { EXECUTOR_CONTEXT } from '../../common/constants';
import { dynoCommand, getAppName, AppName } from '../../common/heroku';
import { Logger, LoggerInterface } from '../../common/logger';
import { HerokuBaseService } from '../../common/heroku/base.service';

@Service()
export class HerokuDynoService extends HerokuBaseService<DynoExecutorSchema> {
  constructor(
    @Inject(DYNO_EXECUTOR_SCHEMA)
    options: DynoExecutorSchema,
    @Inject(EXECUTOR_CONTEXT) private readonly context: ExecutorContext,
    @Logger() logger: LoggerInterface
  ) {
    super(options, logger);
    this.logger.verbose = options.verbose;
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

  async run() {
    await this.validateOptions();
    await this.setupHerokuAuth();
    const { appNamePrefix, command, config, verbose } = this.options;
    const { projectName } = this.context;
    const appName = getAppName({
      appNamePrefix,
      environment: config,
      projectName,
      verbose,
    });
    await this.call({ appName, command });
  }

  async close() {
    try {
      await this.tearDownHerokuAuth();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
