import { logger } from '@nrwl/devkit';
import Container, { Constructable } from 'typedi';

export interface LoggerInterface {
  verbose: boolean;
  log(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string | Error | unknown): void;
}

export class ConsoleLogger implements LoggerInterface {
  private _verbose = false;

  get verbose() {
    return this._verbose;
  }

  set verbose(value: boolean) {
    this._verbose = value;
  }

  log(message: string) {
    this.verbose && logger.log(message);
  }

  info(message: string) {
    this.verbose && logger.info(message);
  }

  warn(message: string | unknown) {
    this.verbose && logger.warn(message);
  }

  error(message: string | Error | unknown) {
    this.verbose && logger.error(message);
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
