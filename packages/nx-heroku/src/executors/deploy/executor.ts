import type { ExecutorContext } from '@nrwl/devkit';
import { DeployExecutorSchema } from './schema';

export default async function herokuDeployment(
  options: DeployExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {

  try {
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}
