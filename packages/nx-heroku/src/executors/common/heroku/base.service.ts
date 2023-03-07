import isEmail from 'validator/lib/isEmail';

import { HEROKU_AUTH_FILE } from '../constants';
import { LoggerInterface } from '../logger';
import { expandOptions } from '../utils';
import { createNetRcFile, removeNetRcFile } from './auth';

export type BaseOptions = object & {
  email: string;
  apiKey: string;
  serviceUser?: string;
};

export abstract class HerokuBaseService<O extends BaseOptions> {
  constructor(public options: O, public readonly logger: LoggerInterface) {}

  /*
   * Expand options (interpolate variables starting with $)
   */
  static validateOptions<o extends BaseOptions>(options: o): o {
    if (options.serviceUser && !isEmail(options.serviceUser)) {
      throw new TypeError(
        `serviceUser (${options.serviceUser}) is not a valid email.`
      );
    }
    return expandOptions(options);
  }

  validateOptions(): O {
    this.options = HerokuBaseService.validateOptions(this.options);
    return this.options;
  }

  async setupHerokuAuth(): Promise<void> {
    await createNetRcFile(this.options);
    this.logger.info(`Created and wrote to ${HEROKU_AUTH_FILE}`);
  }

  async tearDownHerokuAuth(): Promise<void> {
    await removeNetRcFile();
    this.logger.info(`Removed ${HEROKU_AUTH_FILE}`);
  }
}
