/* eslint-disable max-lines-per-function */
import { CreateNodesContext } from '@nx/devkit';
import { tmpProjPath } from '@nx/plugin/testing';

import { createNodes } from './plugin';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(() => false),
  readdirSync: jest.fn(() => ['project.json']),
  readFileSync: jest.fn(() => 'web: node dist/apps/proj'),
}));

describe('@nx/jest/plugin', () => {
  const createNodesFunction = createNodes[1];
  const testProjectName = 'proj';
  let context: CreateNodesContext;

  beforeEach(() => {
    context = {
      nxJsonConfiguration: {
        namedInputs: {
          default: ['{projectRoot}/**/*'],
          production: ['!{projectRoot}/**/*.spec.ts'],
        },
      },
      workspaceRoot: tmpProjPath(),
    };
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should create nodes based on Procfile', async () => {
    const nodes = await createNodesFunction(
      `${testProjectName}/Procfile`,
      {
        deployTargetName: 'deploy-me',
        promoteTargetName: 'promote-me',
      },
      context
    );
    expect(nodes.projects[testProjectName]).toMatchInlineSnapshot(`
      {
        "root": "${testProjectName}",
        "targets": {
          "deploy-me": {
            "cache": false,
            "executor": "@aloes/nx-heroku:deploy",
            "inputs": [
              "default",
              "^production",
            ],
            "options": {
              "procfile": "web: node dist/apps/proj",
            },
          },
          "promote-me": {
            "cache": false,
            "executor": "@aloes/nx-heroku:promote",
            "inputs": [
              "default",
              "^production",
            ],
            "options": {},
          },
        },
      }
    `);
  });
});
