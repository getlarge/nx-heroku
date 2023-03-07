import {
  parseJsonString,
  parseTable,
  removeConsoleOutputColors,
} from './utils';

// script -F test heroku config --app <app-name>
const drainRawOutput = `
[97m[[39m
  [97m{[39m
    [94m"addon"[39m[93m:[39m [90mnull[39m[32m,[39m
    [94m"created_at"[39m[93m:[39m [92m"2022-12-05T16:31:10Z"[39m[32m,[39m
    [94m"id"[39m[93m:[39m [92m"e9c0bbad-1d2a-464a-a3b1-4baa7c402ff3"[39m[32m,[39m
    [94m"token"[39m[93m:[39m [92m"d.9f414bb2-f095-435b-a51d-3d81a18da875"[39m[32m,[39m
    [94m"updated_at"[39m[93m:[39m [92m"2022-12-05T16:31:10Z"[39m[32m,[39m
    [94m"url"[39m[93m:[39m [92m"https://logger.doamin.com/api/logger"[39m
  [97m}[39m
[97m][39m
[?25h
`;

// script -F test heroku config --app <app-name>
const configVarsRawOutput = `
[2m=== [22m[1ms1-auth-service-staging Config Vars[22m
[34m[32mCLUSTER_ENABLED[34m[39m:            true
[34m[32mDISK_STORAGE_TRESHOLD[34m[39m:      161061273600
[34m[32mEVENT_LOOP_DELAY_THRESHOLD[34m[39m: 100
[34m[32mHOSTNAME[34m[39m:                   0.0.0.0
[34m[32mLOG_CONCURRENCY[34m[39m:            true
[34m[32mMAX_PAYLOAD_SIZE[34m[39m:           1
[34m[32mMEMORY_RSS_TRESHOLD[34m[39m:
[34m[32mNODE_ENV[34m[39m:                   staging
[34m[32mNPM_TOKEN[34m[39m:                  npm_token
[34m[32mPROCFILE[34m[39m:                   apps/x-service/Procfile
[34m[32mPROJECT_ENV[34m[39m:                staging
[34m[32mPROJECT_NAME[34m[39m:               x-service
[34m[32mPROXY_SERVER_URL[34m[39m:           https://x.service.dev
[34m[32mSERVER_URL[34m[39m:                 http://localhost:3000
[34m[32mTAG[34m[39m:                        v1.9.4
[34m[32mUSE_YARN_CACHE[34m[39m:             undefined
[34m[32mYARN2_SKIP_PRUNING[34m[39m:         true
`;

const configVarsClean = `=== s1-auth-service-staging Config Vars
CLUSTER_ENABLED:            true
DISK_STORAGE_TRESHOLD:      161061273600
EVENT_LOOP_DELAY_THRESHOLD: 100
HOSTNAME:                   0.0.0.0
LOG_CONCURRENCY:            true
MAX_PAYLOAD_SIZE:           1
MEMORY_RSS_TRESHOLD:
NODE_ENV:                   staging
NPM_TOKEN:                  npm_token
PROCFILE:                   apps/x-service/Procfile
PROJECT_ENV:                staging
PROJECT_NAME:               x-service
PROXY_SERVER_URL:           https://x.service.dev
SERVER_URL:                 http://localhost:3000
TAG:                        v1.9.4
USE_YARN_CACHE:             undefined
YARN2_SKIP_PRUNING:         true`;

describe('Utils', () => {
  it.todo('expandOptions - should expand options');

  it('removeConsoleOutputColors - should remove ANSI colors code', () => {
    const result = removeConsoleOutputColors(configVarsRawOutput);
    expect(result).toBe(configVarsClean);
  });

  it('parseJsonString - should parse raw json string', () => {
    const result = parseJsonString(drainRawOutput);
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    const [firstItem] = result;
    expect(firstItem).toHaveProperty('addon', null);
    expect(firstItem).toHaveProperty('created_at', '2022-12-05T16:31:10Z');
    expect(firstItem).toHaveProperty(
      'id',
      'e9c0bbad-1d2a-464a-a3b1-4baa7c402ff3'
    );
    expect(firstItem).toHaveProperty(
      'token',
      'd.9f414bb2-f095-435b-a51d-3d81a18da875'
    );
    expect(firstItem).toHaveProperty('updated_at', '2022-12-05T16:31:10Z');
    expect(firstItem).toHaveProperty(
      'url',
      'https://logger.doamin.com/api/logger'
    );
  });

  it('parseTable - should parse raw config vars string', () => {
    const result = parseTable(configVarsRawOutput);
    expect(result).toBeDefined();
    expect(result).toHaveLength(17);
  });
});
