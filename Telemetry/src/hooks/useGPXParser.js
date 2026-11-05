import { useCallback, useState } from 'react';
import FitParser from 'fit-file-parser';
import { normalizeFitActivity } from '../utils/normalizeFitActivity.js';

const EARTH_RADIUS_METERS = 6_371_000;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizePoints(parsedPoints, useRecordedSpeed = false) {
  if (parsedPoints.length < 2) {
    throw new Error('The activity must contain at least two GPS points.');
  }

  for (let index = 1; index < parsedPoints.length; index += 1) {
    if (parsedPoints[index].timeMs < parsedPoints[index - 1].timeMs) {
      throw new Error('Activity timestamps must be in chronological order.');
    }
  }

  const startTime = parsedPoints[0].timeMs;
  let distanceMeters = 0;

  return parsedPoints.map((point, index) => {
    const previous = parsedPoints[index - 1];
    let calculatedSpeedKmh = 0;
    let gradePercent = 0;

    if (previous) {
      const segmentDistance = haversineDistance(
        previous.lat,
        previous.lon,
        point.lat,
        point.lon,
      );
      const elapsedSeconds = (point.timeMs - previous.timeMs) / 1000;
      distanceMeters += segmentDistance;

      if (elapsedSeconds > 0) {
        calculatedSpeedKmh = (segmentDistance / elapsedSeconds) * 3.6;
      }
      if (segmentDistance > 0 && point.elevation !== null && previous.elevation !== null) {
        gradePercent =
          ((point.elevation - previous.elevation) / segmentDistance) * 100;
      }
    }

    return {
      lat: point.lat,
      lon: point.lon,
      elevation: point.elevation,
      time: (point.timeMs - startTime) / 1000,
      speedKmh: useRecordedSpeed && Number.isFinite(point.speedKmh)
        ? point.speedKmh
        : calculatedSpeedKmh,
      paceSecondsPerKm: calculatedSpeedKmh > 0 ? 3600 / calculatedSpeedKmh : null,
      strokeCount: null,
      swolf: null,
      heartRateBpm: point.heartRateBpm ?? null,
      cadenceSpm: point.cadenceSpm ?? null,
      cadenceRpm: point.cadenceRpm ?? null,
      powerW: point.powerW ?? null,
      distanceMeters,
      gradePercent,
    };
  });
}

function getExtensionValue(point, names) {
  const elements = Array.from(point.getElementsByTagName('*'));
  const target = elements.find((element) => names.includes(element.localName.toLowerCase()));
  if (!target) return null;
  const value = Number(target.textContent?.trim());
  return Number.isFinite(value) ? value : null;
}

function parseTrackPoints(xmlText) {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (document.querySelector('parsererror')) {
    throw new Error('This GPX file contains invalid XML.');
  }

  const rawPoints = Array.from(
    document.getElementsByTagNameNS('*', 'trkpt'),
  );
  if (rawPoints.length === 0) {
    rawPoints.push(...document.getElementsByTagNameNS('*', 'rtept'));
  }
  if (rawPoints.length < 2) {
    throw new Error('The GPX file must contain at least two track points.');
  }

  const parsedPoints = rawPoints.map((point, index) => {
    const latText = point.getAttribute('lat');
    const lonText = point.getAttribute('lon');
    const lat = latText === null ? Number.NaN : Number(latText);
    const lon = lonText === null ? Number.NaN : Number(lonText);
    const timeText = point.getElementsByTagNameNS('*', 'time')[0]?.textContent?.trim();
    const timeMs = timeText ? Date.parse(timeText) : Number.NaN;
    const elevationText = point.getElementsByTagNameNS('*', 'ele')[0]?.textContent?.trim();
    const elevation = elevationText ? Number(elevationText) : null;
    const heartRateBpm = getExtensionValue(point, ['hr', 'heartrate', 'heart_rate']);
    const cadence = getExtensionValue(point, ['cad', 'cadence']);
    const powerW = getExtensionValue(point, ['power']);
    const temperatureC = getExtensionValue(point, ['atemp', 'temp', 'temperature']);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      throw new Error(`Track point ${index + 1} has invalid coordinates.`);
    }
    if (!Number.isFinite(timeMs)) {
      throw new Error(`Track point ${index + 1} is missing a valid timestamp.`);
    }
    if (elevation !== null && !Number.isFinite(elevation)) {
      throw new Error(`Track point ${index + 1} has invalid elevation data.`);
    }

    return {
      lat,
      lon,
      elevation,
      timeMs,
      heartRateBpm,
      cadenceSpm: cadence,
      cadenceRpm: cadence,
      powerW,
      temperatureC,
    };
  });

  return normalizePoints(parsedPoints);
}

async function parseFitFile(file) {
  const parser = new FitParser({
    force: false,
    speedUnit: 'm/s',
    lengthUnit: 'm',
  });
  const activity = await parser.parseAsync(await file.arrayBuffer());
  return normalizeFitActivity(activity);
}

export default function useGPXParser() {
  const [points, setPoints] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [activity, setActivity] = useState(null);

  const loadFile = useCallback(async (file) => {
    if (!file) return;

    setError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'gpx' && extension !== 'fit') {
        throw new Error('Choose a GPX (.gpx) or FIT (.fit) activity file.');
      }

      let parsedPoints;
      if (extension === 'fit') {
        const normalizedActivity = await parseFitFile(file);
        setActivity(normalizedActivity);
        parsedPoints = normalizedActivity.records.map((record) => ({
          lat: record.latitude,
          lon: record.longitude,
          elevation: record.altitude_m,
          time: record.elapsed_seconds,
          speedKmh: record.speed_kmh ?? 0,
          distanceMeters: record.distance_m ?? 0,
          gradePercent: 0,
          paceSecondsPerKm: record.pace_seconds_per_km,
          cadenceSpm: record.cadence_spm > 0 ? record.cadence_spm : null,
          cadenceRpm: record.cadence_rpm,
          powerW: record.power_w,
          strokeCount: record.stroke_count,
          swolf: record.swolf,
          heartRateBpm: record.heart_rate_bpm,
          temperatureC: record.temperature_c,
        }));
      } else {
        parsedPoints = parseTrackPoints(await file.text());
        setActivity(null);
      }
      setPoints(parsedPoints);
      setFileName(file.name);
    } catch (parseError) {
      setPoints([]);
      setActivity(null);
      setFileName('');
      setError(
        parseError instanceof Error
          ? parseError.message
          : typeof parseError === 'string'
            ? parseError
            : 'Unable to parse this activity file.',
      );
    }
  }, []);

  return { points, activity, fileName, error, loadFile };
}
