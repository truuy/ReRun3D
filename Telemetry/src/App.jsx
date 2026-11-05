import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import SidebarControls from './components/SidebarControls.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import SyncControls from './components/SyncControls.jsx';
import TutorialModal from './components/TutorialModal.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import TelemetryCanvas from './components/TelemetryCanvas.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import useGPXParser from './hooks/useGPXParser.js';
import { isMobileDevice } from './utils/isMobileDevice.js';
import { formatTime } from './utils/timeFormat.js';

export default function App() {
  const [studioOpen, setStudioOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [theme, setTheme] = useState(() => (
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  ));
  const [videoFile, setVideoFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trackStart, setTrackStart] = useState(0);
  const [offset, setOffset] = useState(0);
  const [visibleWidgets, setVisibleWidgets] = useState([]);
  const [sportSelection, setSportSelection] = useState('auto');
  const [overlayAppearance, setOverlayAppearance] = useState({
    panelStyle: 'glass',
    panelOpacity: 82,
    showBorders: true,
    accent: '#007AFF',
    labelColor: null,
    valueColor: null,
    speedMaxKmh: 90,
  });
  const [telemetry, setTelemetry] = useState(null);
  const [exportStatus, setExportStatus] = useState({ state: 'idle', message: '' });
  const [exportFormat, setExportFormat] = useState(() => (
    isMobileDevice() ? 'mp4-key' : 'webm-alpha'
  ));
  const exportFormatChosenRef = useRef(false);
  const videoRef = useRef(null);
  const exportControlsRef = useRef(null);
  const { points, activity, fileName: gpxName, error: gpxError, loadFile } = useGPXParser();

  const videoName = useMemo(() => videoFile?.name ?? '', [videoFile]);
  const hasElevation = points.some((point) => Number.isFinite(point.elevation));
  const metricAvailability = {
    pace: points.some((point) => Number.isFinite(point.paceSecondsPerKm) && point.paceSecondsPerKm > 0),
    cadence: points.some((point) => Number.isFinite(point.cadenceSpm) || Number.isFinite(point.cadenceRpm)),
    heartRate: points.some((point) => Number.isFinite(point.heartRateBpm)),
    power: points.some((point) => Number.isFinite(point.powerW)),
  };
  const sportCategory = sportSelection === 'auto'
    ? activity?.sport_category ?? 'other'
    : sportSelection;
  const trackDuration = points.length ? points[points.length - 1].time : 0;
  const maxTrackStart = Math.max(0, trackDuration - videoDuration);
  const handleTelemetry = useCallback((value) => setTelemetry(value), []);
  const handleToggleWidget = useCallback((id, isVisible) => {
    setVisibleWidgets((current) => (
      isVisible
        ? (current.includes(id) ? current : [...current, id])
        : current.filter((widget) => widget !== id)
    ));
  }, []);
  const handleExportReady = useCallback((controls) => {
    exportControlsRef.current = controls;
  }, []);
  const handleOpenStudio = useCallback(() => {
    setStudioOpen(true);
    setTutorialOpen(true);
  }, []);
  const handleCloseTutorial = useCallback(() => setTutorialOpen(false), []);
  const handleExport = () => {
    if (exportStatus.state === 'recording') {
      exportControlsRef.current?.cancel();
      return;
    }

    setExportStatus({ state: 'idle', message: '' });
    exportControlsRef.current?.start(exportFormat);
  };

  const handleVideoChange = (file) => {
    if (!file) return;
    setVideoFile(file);
    setVideoDuration(0);
    setTelemetry(null);
  };

  const handleGpxChange = (file) => {
    loadFile(file);
    setTrackStart(0);
    setOffset(0);
    setTelemetry(null);
  };

  useEffect(() => {
    setTrackStart((current) => Math.min(current, maxTrackStart));
  }, [maxTrackStart]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#121214' : '#F8F9FA',
    );
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(max-width: 620px), (max-width: 900px) and (max-height: 560px)',
    );
    const updateDefaultExportFormat = () => {
      if (!exportFormatChosenRef.current) {
        setExportFormat(isMobileDevice() ? 'mp4-key' : 'webm-alpha');
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateDefaultExportFormat);
      return () => mediaQuery.removeEventListener('change', updateDefaultExportFormat);
    }

    mediaQuery.addListener(updateDefaultExportFormat);
    return () => mediaQuery.removeListener(updateDefaultExportFormat);
  }, []);

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  if (!studioOpen) {
    return <LandingPage
      onOpenStudio={handleOpenStudio}
      theme={theme}
      onToggleTheme={toggleTheme}
    />;
  }

  return (
    <>
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-lockup studio-brand-button" type="button" onClick={() => setStudioOpen(false)} aria-label="Back to ReRun 3D home">
          <img className="rerun-logo rerun-logo-studio" src="/rerun-logo.png" alt="" />
          <div>
            <div className="brand-name">ReRun <span>3D</span></div>
            <div className="brand-caption">TELEMETRY STUDIO</div>
          </div>
        </button>
        <div className="topbar-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <div className="workspace">
        <SidebarControls
          videoName={videoName}
          gpxName={gpxName}
          gpxError={gpxError}
          hasGpxData={points.length > 0}
          hasElevation={hasElevation}
          sportCategory={sportCategory}
          sportSelection={sportSelection}
          onSportChange={setSportSelection}
          metricAvailability={metricAvailability}
          visibleWidgets={visibleWidgets}
          onToggleWidget={handleToggleWidget}
          overlayAppearance={overlayAppearance}
          onOverlayAppearanceChange={setOverlayAppearance}
          onVideoChange={handleVideoChange}
          onGpxChange={handleGpxChange}
          disabled={exportStatus.state === 'starting' || exportStatus.state === 'recording'}
        />

        <section className="monitor">
          <div className="monitor-heading">
            <div>
              <span className="monitor-kicker">LIVE PREVIEW</span>
              <h1>ReRun 3D Studio</h1>
            </div>
            <div className="monitor-actions">
              <span className="frame-label">DRAG TO MOVE · CORNER TO RESIZE</span>
              <label className="export-format-control">
                <span className="sr-only">Export format</span>
                <select
                  aria-label="Export format"
                  value={exportFormat}
                  disabled={exportStatus.state === 'starting' || exportStatus.state === 'recording'}
                  onChange={(event) => {
                    exportFormatChosenRef.current = true;
                    setExportFormat(event.target.value);
                  }}
                >
                  <option value="webm-alpha">WebM · transparent</option>
                  <option value="mp4-key">MP4 · green screen</option>
                </select>
              </label>
              <button
                className={`export-button${exportStatus.state === 'recording' ? ' export-cancel' : ''}`}
                type="button"
                onClick={handleExport}
                disabled={!videoFile || !points.length || exportStatus.state === 'starting'}
              >
                {exportStatus.state === 'recording'
                  ? 'Cancel export'
                  : exportFormat === 'mp4-key' ? '↓ Export MP4' : '↓ Export WebM'}
              </button>
            </div>
          </div>
          <VideoPlayer
            file={videoFile}
            playerRef={videoRef}
            isExporting={exportStatus.state === 'starting' || exportStatus.state === 'recording'}
            onDurationChange={setVideoDuration}
            statsPanel={<StatsPanel telemetry={telemetry} />}
            overlay={
              <TelemetryCanvas
                videoRef={videoRef}
                points={points}
                trackStart={trackStart}
                offset={offset}
                visibleWidgets={visibleWidgets}
                appearance={overlayAppearance}
                sportCategory={sportCategory}
                theme={theme}
                hasElevation={hasElevation}
                onToggleWidget={handleToggleWidget}
                onTelemetry={handleTelemetry}
                onExportReady={handleExportReady}
                onExportStatus={setExportStatus}
                videoName={videoName}
              />
            }
          />
          {exportStatus.message && (
            <p className={`export-message export-message-${exportStatus.state}`} role="status">
              {exportStatus.message}
              {exportStatus.state === 'done' && (exportFormat === 'mp4-key'
                ? ' In CapCut, use Chroma Key and sample the green background. Card fills are removed for cleaner keying.'
                : ' Use an editor that supports VP9 alpha in WebM.')}
            </p>
          )}
          <SyncControls
            offset={offset}
            onOffsetChange={setOffset}
            trackStart={trackStart}
            maxTrackStart={maxTrackStart}
            onTrackStartChange={setTrackStart}
            disabled={exportStatus.state === 'starting' || exportStatus.state === 'recording'}
          />
          <div className="monitor-foot">
            <span>
              {activity
                ? `FIT · ${activity.sport.toUpperCase()} · ${activity.summary.total_distance_m !== null
                  ? `${(activity.summary.total_distance_m / 1000).toFixed(2)} KM`
                  : 'DISTANCE N/A'} · ${formatTime(activity.summary.elapsed_time_seconds)}`
                : gpxName
                ? (telemetry
                  ? `TRACK · ${gpxName}`
                  : `TRACK · ${gpxName} · ADJUST SYNC BELOW`)
                : 'GPS TRACK NOT LOADED'}
            </span>
            <span>
              {activity
                ? `${activity.records.length.toLocaleString()} SAMPLES`
                : points.length ? `${points.length.toLocaleString()} SAMPLES` : 'NO TRACK DATA'}
            </span>
          </div>
        </section>
      </div>
    </main>
    {tutorialOpen && <TutorialModal onClose={handleCloseTutorial} />}
    </>
  );
}
