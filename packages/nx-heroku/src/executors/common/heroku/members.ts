import { exec, parseJsonString } from '../utils';
import { HerokuError, shouldHandleHerokuError } from './error';

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
  const { stdout, stderr } = await exec(
    `heroku access --app ${appName} --json`,
    { encoding: 'utf-8' }
  );
  if (shouldHandleHerokuError(stderr, stdout)) {
    throw new HerokuError(stderr);
  }
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
    // success message is sent to stderr : Adding ${serviceUser} access to the app ${appName}
    await exec(
      `heroku access:add ${serviceUser} --app ${appName} --permissions "${permissions}"`
    );
    return 'created';
  }
}
