import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { CitizenService } from './citizen';

describe('CitizenService', () => {
  test('returns parsed JSON on successful search fetch', async () => {
    mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        json: async () => [{ id: '1', name: 'Test Person', nino: 'AA123456C', status: 'Active' }]
      };
    });

    const api = new CitizenService('http://localhost:3001');
    const result = await api.searchCitizens('Test');

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Test Person');
    
    mock.restoreAll();
  });

  test('throws error on non-ok response', async () => {
    mock.method(global, 'fetch', async () => {
      return {
        ok: false,
        statusText: 'Internal Server Error'
      };
    });

    const api = new CitizenService('http://localhost:3001');
    
    await assert.rejects(    async () => api.searchCitizens('Test'),
      /Citizen API error: Internal Server Error/
    );

    mock.restoreAll();
  });
});