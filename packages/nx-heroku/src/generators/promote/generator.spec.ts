import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import {
  Tree,
  readProjectConfiguration,
  addProjectConfiguration,
} from '@nrwl/devkit';

import generator from './generator';
import { GeneratorSchema } from '../common/schema';

describe('nx-heroku promote generator', () => {
  let appTree: Tree;
  const options: GeneratorSchema = {
    projectName: 'test',
    org: 'test-org',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(
      appTree,
      'test',
      {
        root: 'apps/test',
        sourceRoot: 'apps/test/src',
      },
      false
    );
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
    expect(config.targets).toHaveProperty('promote');
    expect(config.targets.promote).toEqual({
      executor: '@aloes/nx-heroku:promote',
      options: {
        org: 'test-org',
      },
    });
  });
});
