import {
  addProjectConfiguration,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { GeneratorSchema } from '../common/schema';
import generator from './generator';

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
      executor: '@getlarge/nx-heroku:promote',
      options: {
        org: 'test-org',
      },
    });
  });
});
