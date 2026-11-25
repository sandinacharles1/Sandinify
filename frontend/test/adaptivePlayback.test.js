import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getInitialThroughputEstimate,
  getNetworkEstimate,
  getNetworkKey,
  selectLevelIndex,
  updateEwma
} from '../src/song_upload/api/adaptivePlayback.js';

const levels = [
  { bitrate: 96000 },
  { bitrate: 160000 },
  { bitrate: 320000 }
];

test('falls back to the lowest rendition when no bandwidth estimate exists', () => {
  assert.equal(selectLevelIndex(levels, null), 0);
});

test('selects the highest rendition under the safety-adjusted bandwidth', () => {
  assert.equal(selectLevelIndex(levels, 300000), 1);
  assert.equal(selectLevelIndex(levels, 1000000), 2);
});

test('uses saved throughput only for the matching network class', () => {
  const saved = new Map([
    ['sandinify:throughput:wifi:4g', '500000']
  ]);
  const storage = {
    getItem: (key) => saved.get(key) || null
  };
  const connection = { type: 'wifi', effectiveType: '4g' };

  assert.equal(getInitialThroughputEstimate(connection, storage), 500000);
  assert.equal(getNetworkKey(connection), 'wifi:4g');
});

test('uses network hints when there is no saved estimate', () => {
  assert.equal(getNetworkEstimate({ effectiveType: '3g' }), 750000);
  assert.equal(getInitialThroughputEstimate({ effectiveType: '3g' }, null), 750000);
  assert.equal(getInitialThroughputEstimate(null, null), null);
});

test('smooths successive measured throughput samples with an EWMA', () => {
  assert.equal(updateEwma(400000, 800000), 520000);
  assert.equal(updateEwma(null, 800000), 800000);
});
