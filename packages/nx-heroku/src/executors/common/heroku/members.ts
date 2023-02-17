import { exec, parseJsonString } from '../utils';

export async function getMembers(appName: string): Promise<
  {
    created_at: string;
    id: string;
    updated_at: string;
    user: {
      email: string;
      federated: boolean;
      id: string;
    };
    app: { id: string; name: string };
    role: string;
    permissions: { name: string; description: string }[];
    privileges: { name: string; description: string }[];
  }[]
> {
  const { stdout } = await exec(`heroku access -a ${appName} --json`, {
    encoding: 'utf-8',
  });
  return parseJsonString(stdout);
}

export async function addMember(options: {
  appName: string;
  serviceUser: string;
  permissions?: string;
}): Promise<'found' | 'created'> {
  const {
    appName,
    serviceUser,
    permissions = 'deploy,operate,manage,view',
  } = options;
  const members = await getMembers(appName);
  if (
    members?.length &&
    members.find(({ user }) => user.email === serviceUser)
  ) {
    //? Should we replace user with heroku access:delete and heroku access:update when found ?
    return 'found';
  } else {
    const { stderr } = await exec(
      `heroku access:add ${serviceUser} -a ${appName} -p ${permissions}`
    );
    if (stderr) {
      throw new Error(stderr);
    }
    return 'created';
  }
}
