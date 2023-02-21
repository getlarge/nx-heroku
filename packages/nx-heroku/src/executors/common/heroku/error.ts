import { removeConsoleOutputColors } from '../utils';

export class HerokuError extends Error {
  constructor(message: string) {
    super();
    this.name = 'HerokuError';
    this.message = HerokuError.cleanMessage(message);
    Error.captureStackTrace(this, this.constructor);
  }

  static cleanMessage(message: string): string {
    return removeConsoleOutputColors(message);
  }
}
