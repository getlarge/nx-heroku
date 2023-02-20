import { createCatFile, removeCatFile } from './auth';
import { LoggerInterface } from '../logger';
import { expandOptions } from '../utils';

export type BaseOptions = object & {
  email: string;
  apiKey: string;
};

export abstract class HerokuBaseService<O extends BaseOptions> {
  constructor(public options: O, public readonly logger: LoggerInterface) {}

  /*
   * 1. Expand options (interpolate variables starting with $)
   * 2. Set default branch
   * 3. set watch delay to milliseconds
   */
  async validateOptions() {
    this.options = expandOptions(this.options);
  }

  async setupHerokuAuth(): Promise<void> {
    await createCatFile(this.options);
    this.logger.info('Created and wrote to ~/.netrc');
  }

  async tearDownHerokuAuth(): Promise<void> {
    await removeCatFile();
    this.logger.info('Removed ~/.netrc');
  }
}
