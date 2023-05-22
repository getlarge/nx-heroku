import { parseWebhooksTable, Webhook } from './webhooks';

const webhooksTable = [
  '1965e28c-b99f-4c14-a64c-582efc7667ae https://webhook-handler.io/receive api:build,dyno sync',
  '682df0e5-67f8-4a3b-a71d-78451470b997 https://webhook-handler.io/receive api:build,api:release,dyno sync',
  '5541c980-0835-4063-bc70-9a11d5b8a016 https://webhook-handler.io/receive api:build,api:release,dyno notify',
  'bffc659a-d802-4761-86d5-7f343c135eca https://webhook-handler.io/receive api:addon sync',
  '9caf5cfb-ceac-4512-b197-fab47b3629f2 https://webhook-handler.io/receive api:formation sync',
];

const webhooks: Webhook[] = [
  {
    id: '1965e28c-b99f-4c14-a64c-582efc7667ae',
    url: 'https://webhook-handler.io/receive',
    include: 'api:build,dyno',
    level: 'sync',
  },
  {
    id: '682df0e5-67f8-4a3b-a71d-78451470b997',
    url: 'https://webhook-handler.io/receive',
    include: 'api:build,api:release,dyno',
    level: 'sync',
  },
  {
    id: '5541c980-0835-4063-bc70-9a11d5b8a016',
    url: 'https://webhook-handler.io/receive',
    include: 'api:build,api:release,dyno',
    level: 'notify',
  },
  {
    id: 'bffc659a-d802-4761-86d5-7f343c135eca',
    url: 'https://webhook-handler.io/receive',
    include: 'api:addon',
    level: 'sync',
  },
  {
    id: '9caf5cfb-ceac-4512-b197-fab47b3629f2',
    url: 'https://webhook-handler.io/receive',
    include: 'api:formation',
    level: 'sync',
  },
];

describe('Webhooks', () => {
  it('parseWebhooksTable - should return a valid Webhook objects array from a table', () => {
    const result = parseWebhooksTable(webhooksTable);
    expect(result).toEqual(webhooks);
  });
});
