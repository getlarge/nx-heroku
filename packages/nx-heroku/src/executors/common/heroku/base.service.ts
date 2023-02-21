import { HEROKU_AUTH_FILE } from '../constants';
import { LoggerInterface } from '../logger';
import { expandOptions } from '../utils';
import { createCatFile, removeCatFile } from './auth';

export type BaseOptions = object & {
  email: string;
  apiKey: string;
};

export abstract class HerokuBaseService<O extends BaseOptions> {
  constructor(public options: O, public readonly logger: LoggerInterface) {}

  /*
   * Expand options (interpolate variables starting with $)
   */
  static validateOptions<o extends BaseOptions>(options: o): o {
    return expandOptions(options);
  }

  validateOptions(): O {
    this.options = HerokuBaseService.validateOptions(this.options);
    return this.options;
  }

  async setupHerokuAuth(): Promise<void> {
    await createCatFile(this.options);
    this.logger.info(`Created and wrote to ${HEROKU_AUTH_FILE}`);
  }

  async tearDownHerokuAuth(): Promise<void> {
    await removeCatFile();
    this.logger.info(`Removed ${HEROKU_AUTH_FILE}`);
  }
}
