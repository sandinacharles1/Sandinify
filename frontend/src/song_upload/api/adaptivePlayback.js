export const BANDWIDTH_SAFETY_FACTOR = 0.8;
export const EWMA_ALPHA = 0.3;

const STORAGE_PREFIX = 'sandinify:throughput:';

export function getNetworkKey(connection) {
  if (!connection) return null;
  const type = connection.type || (connection.effectiveType ? 'cellular' : '');
  const effectiveType = connection.effectiveType || '';
  return type || effectiveType ? `${type || 'unknown'}:${effectiveType || 'unknown'}` : null;
}

export function getNetworkEstimate(connection) {
  if (!connection) return null;

  if (connection.type === 'wifi') return 10_000_000;
  if (connection.type === 'ethernet') return 20_000_000;
  if (connection.type === '5g') return 10_000_000;

  const estimates = {
    'slow-2g': 100_000,
    '2g': 250_000,
    '3g': 750_000,
    '4g': 4_000_000
  };
  return estimates[connection.effectiveType] || null;
}

export function getInitialThroughputEstimate(connection, storage) {
  const networkKey = getNetworkKey(connection);
  if (networkKey && storage) {
    try {
      const savedEstimate = Number(storage.getItem(`${STORAGE_PREFIX}${networkKey}`));
      if (Number.isFinite(savedEstimate) && savedEstimate > 0) return savedEstimate;
    } catch (error) {
      console.warn('Could not read saved playback throughput.', error);
    }
  }
  return getNetworkEstimate(connection);
}

export function saveThroughputEstimate(estimate, connection, storage) {
  const networkKey = getNetworkKey(connection);
  if (!networkKey || !storage || !Number.isFinite(estimate) || estimate <= 0) return;

  try {
    storage.setItem(`${STORAGE_PREFIX}${networkKey}`, String(estimate));
  } catch (error) {
    console.warn('Could not save playback throughput.', error);
  }
}

export function updateEwma(previous, sample, alpha = EWMA_ALPHA) {
  if (!Number.isFinite(sample) || sample <= 0) return previous;
  if (!Number.isFinite(previous) || previous <= 0) return sample;
  return alpha * sample + (1 - alpha) * previous;
}

export function selectLevelIndex(levels, throughput, safetyFactor = BANDWIDTH_SAFETY_FACTOR) {
  if (!levels.length) return -1;

  const safeBandwidth = Number.isFinite(throughput) && throughput > 0
    ? throughput * safetyFactor
    : 0;
  let selectedIndex = 0;
  let selectedBitrate = Number.POSITIVE_INFINITY;

  levels.forEach((level, index) => {
    const bitrate = Number(level.bitrate);
    if (!Number.isFinite(bitrate) || bitrate <= 0) return;
    if (bitrate <= safeBandwidth && bitrate > (
      selectedBitrate === Number.POSITIVE_INFINITY ? 0 : selectedBitrate
    )) {
      selectedIndex = index;
      selectedBitrate = bitrate;
    }
  });

  if (selectedBitrate !== Number.POSITIVE_INFINITY) return selectedIndex;

  levels.forEach((level, index) => {
    const bitrate = Number(level.bitrate);
    if (Number.isFinite(bitrate) && bitrate > 0 && bitrate < selectedBitrate) {
      selectedIndex = index;
      selectedBitrate = bitrate;
    }
  });
  return selectedIndex;
}

export function getBufferedAhead(media) {
  for (let index = 0; index < media.buffered.length; index += 1) {
    const start = media.buffered.start(index);
    const end = media.buffered.end(index);
    if (media.currentTime >= start && media.currentTime <= end) {
      return end - media.currentTime;
    }
  }
  return 0;
}
