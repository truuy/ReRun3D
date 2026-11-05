export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;

  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function formatOffset(seconds) {
  const sign = seconds > 0 ? '+' : '';
  return `${sign}${seconds.toFixed(1)} s`;
}
