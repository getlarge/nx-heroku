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

export function shouldHandleHerokuError(
  stderr: string,
  stdout: string
): boolean {
  const warnings = ['Warning: heroku update available'];
  return (
    stderr &&
    !warnings.some((warning) => stderr.trim().includes(warning)) &&
    !stdout?.trim()
  );
}
