import { existsSync } from 'node:fs';

import { HEROKU_AUTH_FILE } from './constants';
import { BaseOptions, HerokuBaseService } from './heroku/base.service';
import { type LoggerInterface, ConsoleLogger } from './logger';

const options: BaseOptions = {
  email: 'email@test.com',
  apiKey: '123e4567-e89b-12d3-a456-426614174000',
};

class MockHerokuBaseService<
  O extends BaseOptions
> extends HerokuBaseService<O> {
  constructor(opts: O, logger: LoggerInterface) {
    super(opts, logger);
  }
}

describe('HerokuBaseService', () => {
  let logger: ConsoleLogger;
  let herokuService: MockHerokuBaseService<typeof options>;

  beforeEach(() => {
    logger = new ConsoleLogger();
    herokuService = new MockHerokuBaseService(options, logger);

    jest.spyOn(logger, 'info');
    jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('can create Heroku auth config file', async () => {
    await herokuService.setupHerokuAuth();
    //
    expect(herokuService.logger.info).toBeCalledTimes(1);
    expect(existsSync(HEROKU_AUTH_FILE)).toBeTruthy();
  });

  it('can remove Heroku auth config file', async () => {
    await herokuService.tearDownHerokuAuth();
    //
    expect(herokuService.logger.info).toBeCalledTimes(1);
    expect(existsSync(HEROKU_AUTH_FILE)).toBeFalsy();
  });

  it('can expand options from environment variables', () => {
    const opts = {
      ...options,
      test: '${EXPANDED_VALUE}',
      nested: { test: '${EXPANDED_VALUE}' },
    };
    process.env.EXPANDED_VALUE = 'expanded';
    const service = new MockHerokuBaseService(opts, logger);
    //
    const mutatedOptions = service.validateOptions();
    //
    expect(mutatedOptions.test).toBe('expanded');
    expect(mutatedOptions.nested.test).toBe('expanded');
  });
});
