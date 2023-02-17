import { PromoteExecutorSchema } from './schema';
import executor from './executor';

const options: PromoteExecutorSchema = {};

describe('Promote Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});