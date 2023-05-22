import { parseConfigVarsTable } from './config-vars';

const configVarsTable = [
  'CLUSTER_ENABLED:            true',
  'DISK_STORAGE_TRESHOLD:      161061273600',
  'EVENT_LOOP_DELAY_THRESHOLD: 100',
  'HOSTNAME:                   0.0.0.0',
  'LOG_CONCURRENCY:            true',
  'MAX_PAYLOAD_SIZE:           1',
  'MEMORY_RSS_TRESHOLD:',
];

const configVars = {
  CLUSTER_ENABLED: 'true',
  DISK_STORAGE_TRESHOLD: '161061273600',
  EVENT_LOOP_DELAY_THRESHOLD: '100',
  HOSTNAME: '0.0.0.0',
  LOG_CONCURRENCY: 'true',
  MAX_PAYLOAD_SIZE: '1',
  MEMORY_RSS_TRESHOLD: '',
};

describe('ConfigVars', () => {
  it('parseConfigVarsTable - should return a valid Variables object from a table', () => {
    const result = parseConfigVarsTable(configVarsTable);
    expect(result).toEqual(configVars);
  });
});
