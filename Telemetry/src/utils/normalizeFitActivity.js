const SPORT_CATEGORIES = new Set(['cycling', 'running', 'swimming']);
const SEMICIRCLE_TO_DEGREES = 180 / 2 ** 31;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function mean(values) {
  const present = values.filter(isFiniteNumber);
  return present.length
    ? present.reduce((sum, value) => sum + value, 0) / present.length
    : null;
}

function maximum(values) {
  let result = null;
  values.forEach((value) => {
    if (isFiniteNumber(value) && (result === null || value > result)) result = value;
  });
  return result;
}

function toTimestamp(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function getSport(activity, override) {
  const metadataSport =
    activity.sessions?.find((session) => session.sport)?.sport ??
    activity.sports?.find((entry) => entry.sport)?.sport ??
    activity.activity?.sessions?.find((session) => session.sport)?.sport ??
    activity.activity?.sports?.find((entry) => entry.sport)?.sport;
  const sport = String(override ?? metadataSport ?? 'unknown').toLowerCase();

  return {
    sport,
    category: SPORT_CATEGORIES.has(sport) ? sport : 'other',
  };
}

function getBalancePercent(balance) {
  if (!balance || !isFiniteNumber(balance.value)) return null;
  return {
    left: balance.right ? 100 - balance.value : balance.value,
    right: balance.right ? balance.value : 100 - balance.value,
  };
}

function getCoordinate(record, key) {
  const value = record[key];
  if (!isFiniteNumber(value)) return null;

  // FIT parsers may expose either profile-scaled degrees or raw semicircles.
  return Math.abs(value) <= 180 ? value : value * SEMICIRCLE_TO_DEGREES;
}

function normalizeLengths(lengths, poolLengthMeters) {
  return (lengths ?? []).flatMap((length) => {
    const timestamp = toTimestamp(length.timestamp);
    const durationSeconds = isFiniteNumber(length.total_elapsed_time)
      ? length.total_elapsed_time
      : isFiniteNumber(length.total_timer_time)
        ? length.total_timer_time
        : null;
    const strokeCount = isFiniteNumber(length.total_strokes)
      ? length.total_strokes
      : Array.isArray(length.stroke_count)
        ? length.stroke_count.reduce((total, count) => total + (isFiniteNumber(count) ? count : 0), 0)
        : null;

    if (!timestamp) return [];
    return [{
      timestamp: timestamp.toISOString(),
      duration_seconds: durationSeconds,
      distance_m: poolLengthMeters,
      stroke_count: strokeCount,
      stroke_type: length.swim_stroke ?? null,
      swolf: strokeCount !== null && durationSeconds !== null
        ? strokeCount + durationSeconds
        : null,
    }];
  });
}

function applyLengthMetrics(records, lengths) {
  if (!records.length || !lengths.length) return;

  lengths.forEach((length) => {
    let target = null;
    for (const record of records) {
      if (Date.parse(record.timestamp) > Date.parse(length.timestamp)) break;
      target = record;
    }

    if (!target) return;
    if (length.stroke_count !== null) target.stroke_count = length.stroke_count;
    if (length.stroke_type !== null) target.stroke_type = length.stroke_type;
    if (length.swolf !== null) target.swolf = length.swolf;
  });
}

function getSession(activity) {
  return activity.sessions?.[0] ?? activity.activity?.sessions?.[0] ?? {};
}

/**
 * Convert a decoded FIT activity into a sport-tagged, storage-friendly schema.
 * The parser should be configured to return speed in m/s and length in metres.
 *
 * @param {import('fit-file-parser').ParsedFit} activity Parsed FIT messages.
 * @param {string} [sportOverride] Optional normalized sport name to override FIT metadata.
 * @returns {import('./normalizeFitActivity.d.ts').NormalizedFitActivity}
 */
export function normalizeFitActivity(activity, sportOverride) {
  if (!activity || typeof activity !== 'object') {
    throw new TypeError('A decoded FIT activity is required.');
  }

  const { sport, category } = getSport(activity, sportOverride);
  const session = getSession(activity);
  const sourceRecords = activity.records?.length
    ? activity.records
    : category === 'swimming'
      ? activity.lengths ?? []
      : [];
  const rawRecords = sourceRecords
    .map((record) => ({ record, timestamp: toTimestamp(record.timestamp) }))
    .filter((entry) => entry.timestamp)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (!rawRecords.length) {
    throw new Error('The FIT file contains no timestamped record or swim-length data.');
  }

  const firstTimeMs = rawRecords[0].timestamp.getTime();
  let calculatedDistanceMeters = 0;
  let lastCoordinate = null;
  let previousTimeMs = null;
  let previousDistanceMeters = null;
  const records = rawRecords.map(({ record, timestamp }) => {
    const latitude = getCoordinate(record, 'position_lat');
    const longitude = getCoordinate(record, 'position_long');
    const coordinate = latitude !== null && longitude !== null ? { latitude, longitude } : null;

    if (coordinate && lastCoordinate) {
      calculatedDistanceMeters += haversineDistance(
        lastCoordinate.latitude,
        lastCoordinate.longitude,
        coordinate.latitude,
        coordinate.longitude,
      );
    }
    if (coordinate) lastCoordinate = coordinate;

    const recordedDistance = isFiniteNumber(record.distance) && record.distance >= 0
      ? record.distance
      : null;
    const distanceMeters = recordedDistance ?? (coordinate ? calculatedDistanceMeters : null);
    const speedMps = isFiniteNumber(record.enhanced_speed)
      ? record.enhanced_speed
      : isFiniteNumber(record.speed)
        ? record.speed
        : null;
    const altitudeMeters = isFiniteNumber(record.enhanced_altitude)
      ? record.enhanced_altitude
      : isFiniteNumber(record.altitude)
        ? record.altitude
        : null;
    const elapsedSeconds = (timestamp.getTime() - firstTimeMs) / 1000;
    const deltaSeconds = previousTimeMs === null
      ? null
      : (timestamp.getTime() - previousTimeMs) / 1000;
    previousTimeMs = timestamp.getTime();

    const normalized = {
      sport,
      timestamp: timestamp.toISOString(),
      elapsed_seconds: elapsedSeconds,
      latitude,
      longitude,
      altitude_m: altitudeMeters,
      heart_rate_bpm: isFiniteNumber(record.heart_rate) ? record.heart_rate : null,
      speed_mps: speedMps,
      speed_kmh: speedMps === null ? null : speedMps * 3.6,
      pace_seconds_per_km: speedMps && speedMps > 0 ? 1000 / speedMps : null,
      distance_m: distanceMeters,
      temperature_c: isFiniteNumber(record.temperature) ? record.temperature : null,
    };

    if (category === 'cycling') {
      if (isFiniteNumber(record.power)) normalized.power_w = record.power;
      if (isFiniteNumber(record.cadence)) normalized.cadence_rpm = record.cadence;
      const balance = getBalancePercent(record.left_right_balance);
      if (balance) normalized.left_right_balance_percent = balance;
    }

    if (category === 'running') {
      if (isFiniteNumber(record.cadence)) normalized.cadence_spm = record.cadence;
      if (isFiniteNumber(record.vertical_oscillation)) {
        normalized.vertical_oscillation_mm = record.vertical_oscillation;
      }
      if (isFiniteNumber(record.stance_time)) {
        normalized.ground_contact_time_ms = record.stance_time;
      }
    }

    if (category === 'swimming') {
      if (isFiniteNumber(record.cadence)) normalized.cadence_spm = record.cadence;
      if (isFiniteNumber(record.cycles)) normalized.stroke_count = record.cycles;
      if (record.stroke_type !== undefined) normalized.stroke_type = record.stroke_type;
    }

    if (deltaSeconds && deltaSeconds > 0 && distanceMeters !== null && speedMps === null) {
      const derivedSpeed = previousDistanceMeters === null
        ? null
        : (distanceMeters - previousDistanceMeters) / deltaSeconds;
      if (derivedSpeed !== null && derivedSpeed >= 0) {
        normalized.speed_mps = derivedSpeed;
        normalized.speed_kmh = derivedSpeed * 3.6;
        normalized.pace_seconds_per_km = derivedSpeed > 0 ? 1000 / derivedSpeed : null;
      }
    }

    if (distanceMeters !== null) previousDistanceMeters = distanceMeters;
    return normalized;
  });

  const poolLengthMeters = isFiniteNumber(session.pool_length) ? session.pool_length : null;
  const lengths = category === 'swimming'
    ? normalizeLengths(activity.lengths ?? session.lengths, poolLengthMeters)
    : [];
  applyLengthMetrics(records, lengths);

  if (category === 'swimming') {
    let cumulativeSwimDistance = 0;
    lengths.forEach((length) => {
      if (isFiniteNumber(length.distance_m)) cumulativeSwimDistance += length.distance_m;
      const timestamp = Date.parse(length.timestamp);
      let target = null;
      for (const record of records) {
        if (Date.parse(record.timestamp) > timestamp) break;
        target = record;
      }
      if (target && target.distance_m === null && cumulativeSwimDistance > 0) {
        target.distance_m = cumulativeSwimDistance;
      }
    });
  }

  const summaryDistance = isFiniteNumber(session.total_distance)
    ? session.total_distance
    : records.at(-1)?.distance_m ?? calculatedDistanceMeters;
  const elapsedTimeSeconds = isFiniteNumber(session.total_elapsed_time)
    ? session.total_elapsed_time
    : Math.max(0, (Date.parse(records.at(-1).timestamp) - firstTimeMs) / 1000);
  const speeds = records.map((record) => record.speed_mps);
  const heartRates = records.map((record) => record.heart_rate_bpm);
  const powers = records.map((record) => record.power_w);
  const temperatures = records.map((record) => record.temperature_c);
  const cadences = records.map((record) => record.cadence_rpm ?? record.cadence_spm);
  const summaryAverageSpeed = isFiniteNumber(session.avg_speed)
    ? session.avg_speed
    : mean(speeds);
  const summaryMaxSpeed = isFiniteNumber(session.max_speed)
    ? session.max_speed
    : maximum(speeds);

  return {
    schema_version: 1,
    source_format: 'fit',
    sport,
    sport_category: category,
    sub_sport: session.sub_sport ?? activity.sports?.[0]?.sub_sport ?? null,
    records,
    lengths,
    summary: {
      sport,
      total_distance_m: summaryDistance,
      elapsed_time_seconds: elapsedTimeSeconds,
      moving_time_seconds: isFiniteNumber(session.total_timer_time) ? session.total_timer_time : null,
      average_speed_mps: summaryAverageSpeed,
      maximum_speed_mps: isFiniteNumber(session.max_speed) ? session.max_speed : maximum(speeds),
      average_pace_seconds_per_km: summaryAverageSpeed > 0 ? 1000 / summaryAverageSpeed : null,
      average_heart_rate_bpm: isFiniteNumber(session.avg_heart_rate)
        ? session.avg_heart_rate
        : mean(heartRates),
      maximum_heart_rate_bpm: isFiniteNumber(session.max_heart_rate)
        ? session.max_heart_rate
        : maximum(heartRates),
      average_power_w: isFiniteNumber(session.avg_power) ? session.avg_power : mean(powers),
      maximum_power_w: isFiniteNumber(session.max_power) ? session.max_power : maximum(powers),
      average_cadence: isFiniteNumber(session.avg_cadence) ? session.avg_cadence : mean(cadences),
      maximum_cadence: isFiniteNumber(session.max_cadence) ? session.max_cadence : maximum(cadences),
      average_temperature_c: isFiniteNumber(session.avg_temperature)
        ? session.avg_temperature
        : mean(temperatures),
      maximum_temperature_c: isFiniteNumber(session.max_temperature)
        ? session.max_temperature
        : maximum(temperatures),
      total_ascent_m: isFiniteNumber(session.total_ascent) ? session.total_ascent : null,
      total_descent_m: isFiniteNumber(session.total_descent) ? session.total_descent : null,
      total_strokes: isFiniteNumber(session.total_cycles) ? session.total_cycles : null,
      average_swolf: mean(lengths.map((length) => length.swolf)),
      pool_length_m: poolLengthMeters,
    },
  };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) ** 2;
  return 2 * 6_371_000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
