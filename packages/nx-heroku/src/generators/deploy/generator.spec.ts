import {
  addProjectConfiguration,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { GeneratorSchema } from '../common/schema';
import generator from './generator';

describe('nx-heroku deploy generator', () => {
  let appTree: Tree;

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
    const options: GeneratorSchema = {
      projectName: 'test',
      org: 'test-org',
      apiKey: '${HEROKU_API_KEY}',
    };
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
    expect(config.targets).toHaveProperty('deploy');
    expect(config.targets.deploy).toEqual({
      executor: '@getlarge/nx-heroku:deploy',
      options: {
        org: 'test-org',
        apiKey: '${HEROKU_API_KEY}',
      },
    });
  });
});
