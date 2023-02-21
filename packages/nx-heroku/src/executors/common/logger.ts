import { logger } from '@nrwl/devkit';
import Container, { Constructable } from 'typedi';

export interface LoggerInterface {
  debug: boolean;
  log(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string | Error | unknown): void;
}

export class ConsoleLogger implements LoggerInterface {
  private _debug = false;

  get debug() {
    return this._debug;
  }

  set debug(value: boolean) {
    this._debug = value;
  }

  log(message: string) {
    this.debug && logger.log(message);
  }

  info(message: string) {
    this.debug && logger.info(message);
  }

  warn(message: string | unknown) {
    this.debug && logger.warn(message);
  }

  error(message: string | Error | unknown) {
    this.debug && logger.error(message);
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
