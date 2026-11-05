import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BufferTarget,
  canEncodeVideo,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
} from 'mediabunny';
import { isMobileDevice } from '../utils/isMobileDevice.js';

const PALETTES = {
  dark: {
    accent: '#007AFF',
    value: '#34C759',
    muted: '#8A94A6',
    label: '#8A94A6',
    text: '#FFFFFF',
    panelRgb: '30,30,34',
    panel: 'rgba(30,30,34,.96)',
    solidPanel: 'rgba(30,30,34,1)',
    border: 'rgba(255,255,255,.16)',
    track: 'rgba(255,255,255,.6)',
    closePanel: 'rgba(30,30,34,.96)',
    closeBorder: 'rgba(255,255,255,.4)',
  },
  light: {
    accent: '#007AFF',
    value: '#34C759',
    muted: '#657080',
    label: '#657080',
    text: '#121214',
    panelRgb: '240,242,245',
    panel: 'rgba(240,242,245,.96)',
    solidPanel: 'rgba(240,242,245,1)',
    border: 'rgba(18,18,20,.22)',
    track: 'rgba(18,18,20,.58)',
    closePanel: 'rgba(240,242,245,.96)',
    closeBorder: 'rgba(18,18,20,.4)',
  },
};
const WIDGETS = {
  speed: { width: 122, height: 125 },
  map: { width: 168, height: 126 },
  elevation: { width: 190, height: 92 },
  pace: { width: 144, height: 68 },
  cadence: { width: 144, height: 68 },
  heartRate: { width: 144, height: 68 },
  power: { width: 144, height: 68 },
};

function interpolate(points, time) {
  if (!points.length || time < points[0].time || time > points[points.length - 1].time) {
    return null;
  }

  let low = 0;
  let high = points.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].time < time) low = middle + 1;
    else high = middle - 1;
  }

  const nextIndex = Math.min(low, points.length - 1);
  const previousIndex = Math.max(0, nextIndex - 1);
  const next = points[nextIndex];
  const previous = points[previousIndex];
  const range = next.time - previous.time;
  const ratio = range > 0 ? (time - previous.time) / range : 0;
  const interpolateOptional = (key) => {
    if (Number.isFinite(previous[key]) && Number.isFinite(next[key])) {
      return previous[key] + (next[key] - previous[key]) * ratio;
    }
    return Number.isFinite(previous[key]) ? previous[key] : next[key];
  };

  return {
    lat: Number.isFinite(previous.lat) && Number.isFinite(next.lat)
      ? previous.lat + (next.lat - previous.lat) * ratio
      : Number.isFinite(previous.lat)
        ? previous.lat
        : next.lat,
    lon: Number.isFinite(previous.lon) && Number.isFinite(next.lon)
      ? previous.lon + (next.lon - previous.lon) * ratio
      : Number.isFinite(previous.lon)
        ? previous.lon
        : next.lon,
    elevation: Number.isFinite(previous.elevation) && Number.isFinite(next.elevation)
      ? previous.elevation + (next.elevation - previous.elevation) * ratio
      : Number.isFinite(previous.elevation)
        ? previous.elevation
        : next.elevation,
    speedKmh: previous.speedKmh + (next.speedKmh - previous.speedKmh) * ratio,
    distanceMeters: previous.distanceMeters + (next.distanceMeters - previous.distanceMeters) * ratio,
    gradePercent: previous.gradePercent + (next.gradePercent - previous.gradePercent) * ratio,
    paceSecondsPerKm: interpolateOptional('paceSecondsPerKm'),
    cadenceSpm: interpolateOptional('cadenceSpm'),
    cadenceRpm: interpolateOptional('cadenceRpm'),
    powerW: interpolateOptional('powerW'),
    strokeCount: interpolateOptional('strokeCount'),
    swolf: interpolateOptional('swolf'),
    heartRateBpm: interpolateOptional('heartRateBpm'),
    time,
    index: previousIndex + (nextIndex - previousIndex) * ratio,
  };
}

function drawPanel(context, x, y, width, height, title, palette, scale) {
  if (palette.panelStyle !== 'transparent') {
    context.fillStyle = palette.panel;
    context.fillRect(x, y, width, height);
  }
  if (palette.showBorders) {
    context.strokeStyle = palette.border;
    context.lineWidth = scale;
    context.strokeRect(x + 0.5 * scale, y + 0.5 * scale, width - scale, height - scale);
  }
  context.fillStyle = palette.label;
  context.font = `500 ${14 * scale}px "Poppins", sans-serif`;
  context.textAlign = 'left';
  context.fillText(title, x + 12 * scale, y + 17 * scale);
}

function drawSpeed(context, x, y, scale, speed, palette) {
  const radius = 36 * scale;
  const centerX = x + 60 * scale;
  const centerY = y + 65 * scale;
  const start = Math.PI * 0.78;
  const end = Math.PI * 2.22;
  const ratio = Math.min(speed / palette.speedMaxKmh, 1);

  drawPanel(context, x, y, 122 * scale, 125 * scale, 'SPEED', palette, scale);
  context.beginPath();
  context.arc(centerX, centerY, radius, start, end);
  context.strokeStyle = palette.border;
  context.lineWidth = 4 * scale;
  context.stroke();
  context.beginPath();
  context.arc(centerX, centerY, radius, start, start + (end - start) * ratio);
  context.strokeStyle = palette.accent;
  context.lineWidth = 4 * scale;
  context.lineCap = 'round';
  context.stroke();
  context.fillStyle = palette.value;
  context.textAlign = 'center';
  context.font = `500 ${25 * scale}px "Poppins", sans-serif`;
  context.fillText(speed.toFixed(0), centerX, centerY + 5 * scale);
  context.fillStyle = palette.label;
  context.font = `${14 * scale}px "Poppins", sans-serif`;
  context.fillText('km/h', centerX, centerY + 20 * scale);
}

function drawMap(context, x, y, scale, points, currentPosition, palette) {
  const width = 168 * scale;
  const height = 126 * scale;
  drawPanel(context, x, y, width, height, 'GPS TRACK', palette, scale);

  const gpsPoints = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  const track = gpsPoints.filter((_, index) => index % Math.max(1, Math.ceil(gpsPoints.length / 160)) === 0);
  if (track.length < 2) return;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  track.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
  });
  const mapX = x + 13 * scale;
  const mapY = y + 29 * scale;
  const mapWidth = width - 26 * scale;
  const mapHeight = height - 42 * scale;
  const project = (point) => ({
    x: mapX + 4 * scale + ((point.lon - minLon) / (maxLon - minLon || 1)) * (mapWidth - 8 * scale),
    y: mapY + 4 * scale + (1 - (point.lat - minLat) / (maxLat - minLat || 1)) * (mapHeight - 8 * scale),
  });

  context.beginPath();
  track.forEach((point, index) => {
    const position = project(point);
    if (index === 0) context.moveTo(position.x, position.y);
    else context.lineTo(position.x, position.y);
  });
  context.strokeStyle = palette.track;
  context.lineWidth = 1.4 * scale;
  context.stroke();

  if (currentPosition && Number.isFinite(currentPosition.lat) && Number.isFinite(currentPosition.lon)) {
    const active = project(currentPosition);
    context.beginPath();
    context.arc(active.x, active.y, 3.5 * scale, 0, Math.PI * 2);
    context.fillStyle = palette.accent;
    context.fill();
    context.strokeStyle = `${palette.accent}66`;
    context.lineWidth = 4 * scale;
    context.stroke();
  }
}

function drawElevation(context, x, y, scale, points, telemetry, palette) {
  const width = 190 * scale;
  const height = 92 * scale;
  drawPanel(context, x, y, width, height, 'ELEVATION', palette, scale);

  const elevationPoints = points.filter((point) => Number.isFinite(point.elevation));
  if (!elevationPoints.length) {
    context.fillStyle = palette.label;
    context.font = `${14 * scale}px "Poppins", sans-serif`;
    context.textAlign = 'center';
    context.fillText('NO ELEVATION DATA', x + width / 2, y + height / 2 + 10 * scale);
    return;
  }

  let minimum = Infinity;
  let maximum = -Infinity;
  elevationPoints.forEach((point) => {
    minimum = Math.min(minimum, point.elevation);
    maximum = Math.max(maximum, point.elevation);
  });
  const step = Math.max(1, Math.ceil(elevationPoints.length / 400));
  const sampledIndexes = [];
  for (let index = 0; index < elevationPoints.length; index += step) sampledIndexes.push(index);
  if (sampledIndexes[sampledIndexes.length - 1] !== elevationPoints.length - 1) {
    sampledIndexes.push(elevationPoints.length - 1);
  }
  const left = x + 12 * scale;
  const top = y + 29 * scale;
  const graphWidth = width - 24 * scale;
  const graphHeight = height - 42 * scale;
  const startTime = elevationPoints[0].time;
  const timeRange = elevationPoints[elevationPoints.length - 1].time - startTime;
  const pointFor = (point) => ({
    x: left + ((point.time - startTime) / (timeRange || 1)) * graphWidth,
    y: top + graphHeight - ((point.elevation - minimum) / (maximum - minimum || 1)) * graphHeight,
  });

  context.beginPath();
  sampledIndexes.forEach((index, sampleIndex) => {
    const point = pointFor(elevationPoints[index]);
    if (sampleIndex === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.strokeStyle = palette.accent;
  context.lineWidth = 1.5 * scale;
  context.stroke();

  if (telemetry && Number.isFinite(telemetry.elevation)) {
    const active = {
      x: left + ((telemetry.time - startTime) / (timeRange || 1)) * graphWidth,
      y: top + graphHeight - ((telemetry.elevation - minimum) / (maximum - minimum || 1)) * graphHeight,
    };
    context.beginPath();
    context.arc(active.x, active.y, 2.7 * scale, 0, Math.PI * 2);
    context.fillStyle = palette.text;
    context.fill();
  }
}

function drawMetricOverlay(context, id, x, y, scale, telemetry, sportCategory, palette) {
  const metric = {
    pace: {
      title: 'PACE',
      value: Number.isFinite(telemetry?.paceSecondsPerKm) && telemetry.paceSecondsPerKm > 0
        ? `${Math.floor(telemetry.paceSecondsPerKm / 60)}:${String(Math.floor(telemetry.paceSecondsPerKm % 60)).padStart(2, '0')}`
        : '--:--',
      unit: '/KM',
    },
    cadence: {
      title: 'CADENCE',
      value: sportCategory === 'cycling'
        ? Number.isFinite(telemetry?.cadenceRpm) ? Math.round(telemetry.cadenceRpm).toString() : '—'
        : Number.isFinite(telemetry?.cadenceSpm) ? Math.round(telemetry.cadenceSpm).toString() : '—',
      unit: sportCategory === 'cycling' ? 'RPM' : 'SPM',
    },
    heartRate: {
      title: 'HEART RATE',
      value: Number.isFinite(telemetry?.heartRateBpm) ? Math.round(telemetry.heartRateBpm).toString() : '—',
      unit: 'BPM',
    },
    power: {
      title: 'POWER',
      value: Number.isFinite(telemetry?.powerW) ? Math.round(telemetry.powerW).toString() : '—',
      unit: 'W',
    },
  }[id];
  if (!metric) return;

  const { width, height } = WIDGETS[id];
  drawPanel(context, x, y, width * scale, height * scale, metric.title, palette, scale);
  context.textAlign = 'left';
  context.fillStyle = palette.value;
  context.font = `500 ${26 * scale}px "Poppins", sans-serif`;
  context.fillText(metric.value, x + 11 * scale, y + 53 * scale);
  context.fillStyle = palette.label;
  context.font = `500 ${14 * scale}px "Poppins", sans-serif`;
  context.fillText(metric.unit, x + 84 * scale, y + 52 * scale);
}

function defaultLayout(width, height, scale) {
  const compact = width < 860;
  return {
    speed: { x: 16 * scale / width, y: (height - 141 * scale) / height, size: 1 },
    map: { x: (width - 185 * scale) / width, y: 16 * scale / height, size: 1 },
    elevation: { x: (width - 207 * scale) / width, y: (height - 108 * scale) / height, size: 1 },
    pace: { x: 16 * scale / width, y: 16 * scale / height, size: 1 },
    cadence: { x: (compact ? 168 : 176) * scale / width, y: 16 * scale / height, size: 1 },
    heartRate: { x: (compact ? 16 : 336) * scale / width, y: (compact ? 94 : 16) * scale / height, size: 1 },
    power: { x: (compact ? 168 : 496) * scale / width, y: (compact ? 94 : 16) * scale / height, size: 1 },
  };
}

function getCanvasScale(width, height) {
  return Math.max(0.12, Math.min(1, width / 300, height / 150));
}

function getWidgetBounds(id, layout, width, height, scale) {
  const widget = WIDGETS[id];
  const widgetWidth = widget.width * scale * layout[id].size;
  const widgetHeight = widget.height * scale * layout[id].size;
  return {
    x: Math.min(Math.max(0, layout[id].x * width), Math.max(0, width - widgetWidth)),
    y: Math.min(Math.max(0, layout[id].y * height), Math.max(0, height - widgetHeight)),
    width: widgetWidth,
    height: widgetHeight,
  };
}

function drawSelection(context, bounds, scale, palette) {
  context.save();
  context.strokeStyle = palette.accent;
  context.lineWidth = 1;
  context.setLineDash([4, 3]);
  context.strokeRect(bounds.x + 0.5, bounds.y + 0.5, bounds.width - 1, bounds.height - 1);
  context.setLineDash([]);
  context.fillStyle = palette.accent;
  context.fillRect(bounds.x + bounds.width - 10 * scale, bounds.y + bounds.height - 10 * scale, 10 * scale, 10 * scale);
  context.restore();
}

function drawCloseButton(context, bounds, scale, palette) {
  const size = 14 * scale;
  const x = bounds.x + bounds.width - size - 5 * scale;
  const y = bounds.y + 5 * scale;
  context.fillStyle = palette.closePanel;
  context.fillRect(x, y, size, size);
  if (palette.showBorders) {
    context.strokeStyle = palette.closeBorder;
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }
  context.fillStyle = palette.text;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `500 ${16 * scale}px "Poppins", sans-serif`;
  context.fillText('×', x + size / 2, y + size / 2 + 0.25 * scale);
  context.textBaseline = 'alphabetic';
}

function renderHud(
  context,
  width,
  height,
  points,
  videoTime,
  trackStart,
  offset,
  scale,
  layout,
  visibleWidgets,
  sportCategory,
  hasElevation,
  selectedWidget = null,
  showCloseButtons = false,
  theme = 'dark',
  appearance = {},
  backgroundColor = null,
) {
  context.clearRect(0, 0, width, height);
  if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  }
  const basePalette = PALETTES[theme] || PALETTES.dark;
  const panelStyle = appearance.panelStyle || 'glass';
  const panelAlpha = Math.max(0, Math.min(100, appearance.panelOpacity ?? 82)) / 100;
  const palette = {
    ...basePalette,
    accent: appearance.accent || basePalette.accent,
    label: appearance.labelColor || basePalette.label,
    value: appearance.valueColor || basePalette.value,
    speedMaxKmh: Math.max(30, Math.min(120, appearance.speedMaxKmh ?? 90)),
    panel: panelStyle === 'solid'
      ? basePalette.solidPanel
      : `rgba(${basePalette.panelRgb},${panelAlpha})`,
    closePanel: panelStyle === 'solid'
      ? basePalette.solidPanel
      : `rgba(${basePalette.panelRgb},${panelStyle === 'transparent' ? 0 : panelAlpha})`,
    panelStyle,
    showBorders: appearance.showBorders ?? true,
  };
  const telemetry = interpolate(points, videoTime + trackStart + offset);
  if (!points.length) return null;

  Object.keys(WIDGETS).forEach((id) => {
    if (!visibleWidgets.includes(id)) return;
    if (id === 'elevation' && !hasElevation) return;
    const bounds = getWidgetBounds(id, layout, width, height, scale);
    const widgetScale = scale * layout[id].size;
    if (id === 'speed' && telemetry) {
      drawSpeed(context, bounds.x, bounds.y, widgetScale, telemetry.speedKmh, palette);
    } else if (id === 'map') {
      drawMap(context, bounds.x, bounds.y, widgetScale, points,
        telemetry ? { lat: telemetry.lat, lon: telemetry.lon } : null, palette);
    } else if (id === 'elevation') {
      drawElevation(context, bounds.x, bounds.y, widgetScale, points, telemetry, palette);
    } else if (['pace', 'cadence', 'heartRate', 'power'].includes(id)) {
      drawMetricOverlay(context, id, bounds.x, bounds.y, widgetScale, telemetry, sportCategory, palette);
    }
    if (showCloseButtons) drawCloseButton(context, bounds, scale, palette);
    if (selectedWidget === id) drawSelection(context, bounds, scale, palette);
  });
  return telemetry;
}

export default function TelemetryCanvas({
  videoRef,
  points,
  trackStart,
  offset,
  visibleWidgets,
  sportCategory,
  theme,
  appearance,
  hasElevation,
  onToggleWidget,
  onTelemetry,
  onExportReady,
  onExportStatus,
  videoName,
}) {
  const canvasRef = useRef(null);
  const telemetryCallbackRef = useRef(onTelemetry);
  const exportStatusCallbackRef = useRef(onExportStatus);
  const pointsRef = useRef(points);
  const visibleWidgetsRef = useRef(visibleWidgets);
  const sportCategoryRef = useRef(sportCategory);
  const themeRef = useRef(theme);
  const appearanceRef = useRef(appearance);
  const hasElevationRef = useRef(hasElevation);
  const trackStartRef = useRef(trackStart);
  const offsetRef = useRef(offset);
  const exportSessionRef = useRef(null);
  const layoutRef = useRef(null);
  const layoutTouchedRef = useRef(false);
  const dragRef = useRef(null);
  const [selectedWidget, setSelectedWidget] = useState(null);

  useEffect(() => { telemetryCallbackRef.current = onTelemetry; }, [onTelemetry]);
  useEffect(() => { exportStatusCallbackRef.current = onExportStatus; }, [onExportStatus]);
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { visibleWidgetsRef.current = visibleWidgets; }, [visibleWidgets]);
  useEffect(() => { sportCategoryRef.current = sportCategory; }, [sportCategory]);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { appearanceRef.current = appearance; }, [appearance]);
  useEffect(() => { hasElevationRef.current = hasElevation; }, [hasElevation]);
  useEffect(() => { trackStartRef.current = trackStart; }, [trackStart]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const cancelExport = useCallback(() => {
    const session = exportSessionRef.current;
    if (!session) return;

    session.cancelled = true;
    session.video.pause();
    cancelAnimationFrame(session.frameId);
    if (!session.capturePending) {
      session.cancel().catch((error) => {
        exportStatusCallbackRef.current({
          state: 'error',
          message: error instanceof Error ? error.message : 'Could not cancel the overlay export.',
        });
      });
    }
  }, []);

  const startExport = useCallback(async (format = 'webm-alpha') => {
    const canvas = canvasRef.current;
    const video = videoRef?.current;
    const isGreenScreen = format === 'mp4-key';
    if (!canvas || !video || !pointsRef.current.length) {
      exportStatusCallbackRef.current({ state: 'error', message: 'Load a video and GPX track before exporting.' });
      return;
    }
    if (typeof VideoEncoder === 'undefined') {
      exportStatusCallbackRef.current({ state: 'error', message: 'Video export is not supported by this browser.' });
      return;
    }
    if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration) || video.duration <= 0) {
      exportStatusCallbackRef.current({ state: 'error', message: 'Wait for the video to finish loading before exporting.' });
      return;
    }

    const frameRate = 30;
    const isMobileViewport = isMobileDevice();
    const maxExportDimension = isMobileViewport ? 1280 : Infinity;
    const resolutionScale = Math.min(1, maxExportDimension / Math.max(video.videoWidth, video.videoHeight));
    const outputWidth = Math.max(2, Math.floor((video.videoWidth * resolutionScale) / 2) * 2);
    const outputHeight = Math.max(2, Math.floor((video.videoHeight * resolutionScale) / 2) * 2);
    const bitrate = isMobileViewport ? 3_500_000 : (isGreenScreen ? 5_000_000 : 8_000_000);
    const encoderConfig = {
      width: outputWidth,
      height: outputHeight,
      bitrate,
      frameRate,
    };
    let encoderSupport;
    try {
      if (isGreenScreen) {
        encoderSupport = { supported: await canEncodeVideo('avc', encoderConfig) };
      } else {
        encoderSupport = {
          ...await VideoEncoder.isConfigSupported({
            ...encoderConfig,
            codec: 'vp09.00.10.08',
            framerate: frameRate,
          }),
        };
      }
    } catch (error) {
      exportStatusCallbackRef.current({
        state: 'error',
        message: error instanceof Error ? error.message : `Could not check ${isGreenScreen ? 'MP4' : 'WebM'} encoder support.`,
      });
      return;
    }
    if (!encoderSupport.supported) {
      exportStatusCallbackRef.current({
        state: 'error',
        message: isGreenScreen
          ? 'This browser cannot encode H.264 MP4 at this resolution. Try a shorter or smaller source video.'
          : 'This browser cannot encode VP9 WebM at this resolution. Try a supported browser or smaller source video.',
      });
      return;
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    const outputContext = outputCanvas.getContext('2d', { alpha: true });
    if (!outputContext) {
      exportStatusCallbackRef.current({ state: 'error', message: 'Could not initialize the export canvas.' });
      return;
    }

    const target = new BufferTarget();
    let output;
    let videoSource;
    try {
      output = new Output({
        format: isGreenScreen ? new Mp4OutputFormat() : new WebMOutputFormat(),
        target,
      });
      videoSource = new CanvasSource(outputCanvas, {
        codec: isGreenScreen ? 'avc' : 'vp9',
        quality: new Quality({ bitrate: encoderConfig.bitrate }),
        ...(isGreenScreen
          ? { alpha: 'discard' }
          : { alpha: 'keep', latencyMode: 'quality', fullCodecString: 'vp09.00.10.08' }),
      });
      output.addVideoTrack(videoSource, { frameRate });
      await output.start();
    } catch (error) {
      if (output && output.state !== 'finalized' && output.state !== 'canceled') {
        await output.cancel();
      }
      videoSource?.close();
      exportStatusCallbackRef.current({
        state: 'error',
        message: error instanceof Error
          ? error.message
          : `Could not start ${isGreenScreen ? 'H.264 MP4' : 'transparent VP9'} encoding.`,
      });
      return;
    }

    const previousTime = video.currentTime;
    const previousPlaybackRate = video.playbackRate;
    const previousMuted = video.muted;
    const wasPlaying = !video.paused && !video.ended;
    const screenBounds = canvas.getBoundingClientRect();
    const displayScale = getCanvasScale(screenBounds.width, screenBounds.height);
    const outputScale = displayScale * (outputCanvas.width / Math.max(1, screenBounds.width));
    const session = {
      output,
      video,
      frameId: 0,
      cancelled: false,
      capturePending: false,
      finishing: false,
      lastTimestamp: -1,
      cleanup: null,
      cancel: null,
    };
    exportSessionRef.current = session;
    exportStatusCallbackRef.current({
      state: 'starting',
      message: `Preparing ${isGreenScreen ? 'green-screen MP4' : 'transparent WebM'} export…`,
    });

    const cleanup = async () => {
      if (session.cleaned) return '';
      session.cleaned = true;
      cancelAnimationFrame(session.frameId);
      video.currentTime = previousTime;
      video.playbackRate = previousPlaybackRate;
      exportSessionRef.current = null;
      if (!wasPlaying) {
        video.muted = previousMuted;
        return '';
      }

      try {
        video.muted = true;
        await video.play();
        video.muted = previousMuted;
        return '';
      } catch {
        video.muted = previousMuted;
        return ' The source video could not resume playback.';
      }
    };
    session.cleanup = cleanup;

    const cancelSession = async () => {
      if (session.cancelCleanupStarted) return;
      session.cancelCleanupStarted = true;
      cancelAnimationFrame(session.frameId);
      if (output.state === 'started' || output.state === 'pending') await output.cancel();
      await cleanup();
      exportStatusCallbackRef.current({ state: 'idle', message: '' });
    };
    session.cancel = cancelSession;

    const reportExportError = async (error) => {
      if (session.cancelled) {
        await cancelSession();
        return;
      }
      if (output.state === 'started' || output.state === 'pending') await output.cancel();
      await cleanup();
      exportStatusCallbackRef.current({
        state: 'error',
        message: error instanceof Error ? error.message : 'Could not encode the transparent overlay.',
      });
    };

    exportStatusCallbackRef.current({
      state: 'recording',
      message: `Encoding ${isGreenScreen ? 'green-screen H.264 MP4' : 'transparent VP9 WebM'}. Keep this tab open.`,
    });

    const renderExportFrame = (time) => renderHud(
      outputContext,
      outputCanvas.width,
      outputCanvas.height,
      pointsRef.current,
      time,
      trackStartRef.current,
      offsetRef.current,
      outputScale,
      layoutRef.current || defaultLayout(outputCanvas.width, outputCanvas.height, outputScale),
      visibleWidgetsRef.current,
      sportCategoryRef.current,
      hasElevationRef.current,
      null,
      false,
      themeRef.current,
      isGreenScreen
        ? { ...appearanceRef.current, panelStyle: 'transparent' }
        : appearanceRef.current,
      isGreenScreen ? '#00FF00' : null,
    );

    const finalizeExport = async () => {
      if (session.finishing || session.cancelled) return;
      session.finishing = true;
      cancelAnimationFrame(session.frameId);
      try {
        videoSource.close();
        await output.finalize();
        if (session.cancelled) {
          await cleanup();
          exportStatusCallbackRef.current({ state: 'idle', message: '' });
          return;
        }
        if (!target.buffer?.byteLength) {
          throw new Error('The browser produced an empty overlay file.');
        }

        const extension = isGreenScreen ? 'mp4' : 'webm';
        const blob = new Blob([target.buffer], { type: isGreenScreen ? 'video/mp4' : 'video/webm' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const baseName = videoName.replace(/\.[^.]+$/, '') || 'video';
        link.href = downloadUrl;
        link.download = `${baseName}-telemetry-overlay.${extension}`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        const playbackMessage = await cleanup();
        exportStatusCallbackRef.current({
          state: 'done',
          message: `${isGreenScreen ? 'Green-screen H.264 MP4' : 'Transparent VP9 WebM'} downloaded.${playbackMessage}`,
        });
      } catch (error) {
        await reportExportError(error);
      }
    };

    const captureNextFrame = async () => {
      if (session.cancelled) {
        await cancelSession();
        return;
      }
      if (video.ended || video.currentTime >= video.duration) {
        await finalizeExport();
        return;
      }

      const currentTime = video.currentTime;
      if (currentTime - session.lastTimestamp >= 1 / frameRate || session.lastTimestamp < 0) {
        session.capturePending = true;
        try {
          renderExportFrame(currentTime);
          await videoSource.add(currentTime, 1 / frameRate);
          session.lastTimestamp = currentTime;
        } finally {
          session.capturePending = false;
        }
        if (session.cancelled) {
          await cancelSession();
          return;
        }
        exportStatusCallbackRef.current({
          state: 'recording',
          message: `Encoding ${isGreenScreen ? 'green-screen MP4' : 'transparent WebM'} · ${Math.floor(currentTime)} / ${Math.ceil(video.duration)} s`,
        });
      }

      session.frameId = requestAnimationFrame(() => {
        captureNextFrame().catch(reportExportError);
      });
    };

    session.cancel = cancelSession;
    try {
      video.muted = true;
      video.pause();
      video.playbackRate = 1;
      if (video.currentTime !== 0) {
        await new Promise((resolve, reject) => {
          const handleSeeked = () => {
            video.removeEventListener('error', handleSeekError);
            resolve();
          };
          const handleSeekError = () => {
            video.removeEventListener('seeked', handleSeeked);
            reject(new Error('Could not seek to the beginning of the source video.'));
          };
          video.addEventListener('seeked', handleSeeked, { once: true });
          video.addEventListener('error', handleSeekError, { once: true });
          video.currentTime = 0;
        });
      }
      renderExportFrame(0);
      session.capturePending = true;
      await videoSource.add(0, 1 / frameRate);
      session.capturePending = false;
      session.lastTimestamp = 0;
      if (session.cancelled) {
        await cancelSession();
        return;
      }
      await video.play();
      session.frameId = requestAnimationFrame(() => {
        captureNextFrame().catch(reportExportError);
      });
    } catch (error) {
      session.capturePending = false;
      await reportExportError(error);
    }
  }, [videoName, videoRef]);

  useEffect(() => {
    onExportReady?.({ start: startExport, cancel: cancelExport });
    return () => onExportReady?.(null);
  }, [cancelExport, onExportReady, startExport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    let frameId;
    let lastReported = 0;
    const resizeObserver = new ResizeObserver(() => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      if (!layoutTouchedRef.current && bounds.width > 0 && bounds.height > 0) {
        layoutRef.current = defaultLayout(
          bounds.width,
          bounds.height,
          getCanvasScale(bounds.width, bounds.height),
        );
      }
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    });
    resizeObserver.observe(canvas);

    const render = (now) => {
      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width;
      const height = bounds.height;
      const videoTime = videoRef?.current?.currentTime || 0;
      const scale = getCanvasScale(width, height);
      if (!layoutRef.current && width > 0 && height > 0) {
        layoutRef.current = defaultLayout(width, height, scale);
      }
      const telemetry = renderHud(
        context,
        width,
        height,
        pointsRef.current,
        videoTime,
        trackStartRef.current,
        offsetRef.current,
        scale,
        layoutRef.current || defaultLayout(width, height, scale),
        visibleWidgetsRef.current,
        sportCategoryRef.current,
        hasElevationRef.current,
        selectedWidget,
        true,
        themeRef.current,
        appearanceRef.current,
      );
      if (now - lastReported >= 100) {
        telemetryCallbackRef.current(telemetry);
        lastReported = now;
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [selectedWidget, videoRef]);

  const canvasPoint = (event) => {
    const bounds = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const handlePointerDown = (event) => {
    if (!pointsRef.current.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    const scale = getCanvasScale(bounds.width, bounds.height);
    const layout = layoutRef.current || defaultLayout(bounds.width, bounds.height, scale);
    layoutRef.current = layout;
    const point = canvasPoint(event);

    for (const id of ['pace', 'cadence', 'heartRate', 'power', 'elevation', 'map', 'speed']) {
      if (!visibleWidgetsRef.current.includes(id)) continue;
      if (id === 'elevation' && !hasElevationRef.current) continue;
      const widget = getWidgetBounds(id, layout, bounds.width, bounds.height, scale);
      const closeSize = 14 * scale;
      const closeX = widget.x + widget.width - closeSize - 5 * scale;
      const closeY = widget.y + 5 * scale;
      if (
        point.x >= closeX && point.x <= closeX + closeSize &&
        point.y >= closeY && point.y <= closeY + closeSize
      ) {
        onToggleWidget(id, false);
        setSelectedWidget(null);
        event.preventDefault();
        return;
      }

      const handle = Math.max(14, 14 * scale);
      if (
        point.x >= widget.x + widget.width - handle &&
        point.x <= widget.x + widget.width + handle / 2 &&
        point.y >= widget.y + widget.height - handle &&
        point.y <= widget.y + widget.height + handle / 2
      ) {
        dragRef.current = {
          id, mode: 'resize', startX: point.x, startY: point.y,
          initialSize: layout[id].size,
        };
        setSelectedWidget(id);
        canvas.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }

      if (
        point.x >= widget.x && point.x <= widget.x + widget.width &&
        point.y >= widget.y && point.y <= widget.y + widget.height
      ) {
        dragRef.current = {
          id, mode: 'move', startX: point.x, startY: point.y,
          initialX: layout[id].x, initialY: layout[id].y,
        };
        setSelectedWidget(id);
        canvas.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }
    }
    setSelectedWidget(null);
  };

  const handlePointerMove = (event) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    const scale = getCanvasScale(bounds.width, bounds.height);
    const point = canvasPoint(event);
    const drag = dragRef.current;

    if (!drag) {
      const layout = layoutRef.current || defaultLayout(bounds.width, bounds.height, scale);
      const hoveringClose = visibleWidgetsRef.current.some((id) => {
        const widget = getWidgetBounds(id, layout, bounds.width, bounds.height, scale);
        const size = 14 * scale;
        const x = widget.x + widget.width - size - 5 * scale;
        const y = widget.y + 5 * scale;
        return point.x >= x && point.x <= x + size && point.y >= y && point.y <= y + size;
      });
      const hovering = visibleWidgetsRef.current.some((id) => {
        const widget = getWidgetBounds(id, layout, bounds.width, bounds.height, scale);
        return point.x >= widget.x && point.x <= widget.x + widget.width &&
          point.y >= widget.y && point.y <= widget.y + widget.height;
      });
      canvas.style.cursor = hoveringClose ? 'pointer' : hovering ? 'move' : 'default';
      return;
    }

    layoutTouchedRef.current = true;
    const item = layoutRef.current[drag.id];
    if (drag.mode === 'resize') {
      const base = WIDGETS[drag.id];
      const sizeDelta = Math.max(
        (point.x - drag.startX) / (base.width * scale),
        (point.y - drag.startY) / (base.height * scale),
      );
      const maxSize = Math.min(2.2, bounds.width / (base.width * scale), bounds.height / (base.height * scale));
      item.size = Math.min(maxSize, Math.max(0.55, drag.initialSize + sizeDelta));
      const widget = getWidgetBounds(drag.id, layoutRef.current, bounds.width, bounds.height, scale);
      item.x = Math.min(item.x, Math.max(0, 1 - widget.width / bounds.width));
      item.y = Math.min(item.y, Math.max(0, 1 - widget.height / bounds.height));
    } else {
      const widget = getWidgetBounds(drag.id, layoutRef.current, bounds.width, bounds.height, scale);
      item.x = Math.min(Math.max(0, drag.initialX + (point.x - drag.startX) / bounds.width),
        Math.max(0, 1 - widget.width / bounds.width));
      item.y = Math.min(Math.max(0, drag.initialY + (point.y - drag.startY) / bounds.height),
        Math.max(0, 1 - widget.height / bounds.height));
    }
  };

  const handlePointerUp = (event) => {
    dragRef.current = null;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      className="telemetry-canvas"
      aria-label="Telemetry overlay. Drag a gauge to move it, its corner to resize, or its × button to hide it."
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
