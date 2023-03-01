import { logger } from '@nrwl/devkit';
import Container, { Constructable } from 'typedi';

import { isExecException } from './utils';

export interface LoggerInterface {
  debug: boolean;
  log(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string | Error | unknown): void;
}

export class ConsoleLogger implements LoggerInterface {
  private _debug = false;

  static log(message: string) {
    logger.log(message);
  }

  static info(message: string) {
    logger.info(message);
  }

  static warn(message: string | unknown) {
    logger.warn(message);
  }

  static error(error: string | Error | unknown) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    if (isExecException(error)) {
      logger.error(`code: ${error.code}`);
    }
    logger.error(error);
  }

  get debug() {
    return this._debug;
  }

  set debug(value: boolean) {
    this._debug = value;
  }

  log(message: string) {
    this.debug && ConsoleLogger.log(message);
  }

  info(message: string) {
    this.debug && ConsoleLogger.info(message);
  }

  warn(message: string | unknown) {
    this.debug && ConsoleLogger.warn(message);
  }

  error(error: string | Error | unknown) {
    if (this.debug) {
      ConsoleLogger.error(error);
    }
  }
}

export function Logger() {
  return function (
    object: Constructable<unknown>,
    propertyName: string,
    index?: number
  ) {
    const logger = new ConsoleLogger();
    Container.registerHandler({
      object,
      propertyName,
      index,
      value: () => logger,
    });
  };
}
