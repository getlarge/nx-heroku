import type { Tree } from '@nrwl/devkit';

import { GeneratorSchema } from '../common/schema';
import { updateProjects } from '../common/utils';

export default async function (tree: Tree, options: GeneratorSchema) {
  updateProjects(tree, options, 'promote');
}
