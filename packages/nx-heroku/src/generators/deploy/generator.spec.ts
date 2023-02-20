import {
  addProjectConfiguration,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

import { GeneratorSchema } from '../common/schema';
import generator from './generator';

describe('nx-heroku deploy generator', () => {
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
    expect(config.targets).toHaveProperty('deploy');
    expect(config.targets.deploy).toEqual({
      executor: '@aloes/nx-heroku:deploy',
      options: {
        org: 'test-org',
      },
    });
  });
});
