import type { Tree } from '@nx/devkit';

import { GeneratorSchema } from '../common/schema';
import { updateProjects } from '../common/utils';

export default async function (tree: Tree, options: GeneratorSchema) {
  updateProjects(tree, options, 'promote');
}
