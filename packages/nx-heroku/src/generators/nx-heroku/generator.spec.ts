import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import {
  Tree,
  readProjectConfiguration,
  addProjectConfiguration,
} from '@nrwl/devkit';

import generator from './generator';
import { NxHerokuGeneratorSchema } from './schema';

describe('nx-heroku generator', () => {
  let appTree: Tree;
  const options: NxHerokuGeneratorSchema = {
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
