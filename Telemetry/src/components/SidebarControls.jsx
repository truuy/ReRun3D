import { useEffect, useState } from 'react';
import { isMobileDevice } from '../utils/isMobileDevice.js';

export default function SidebarControls({
  videoName,
  gpxName,
  gpxError,
  onVideoChange,
  onGpxChange,
  hasGpxData,
  hasElevation,
  sportCategory,
  sportSelection,
  onSportChange,
  metricAvailability,
  visibleWidgets,
  onToggleWidget,
  overlayAppearance,
  onOverlayAppearanceChange,
  disabled = false,
}) {
  const [isMobile, setIsMobile] = useState(isMobileDevice);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(max-width: 620px), (max-width: 900px) and (max-height: 560px)',
    );
    const updateViewport = () => setIsMobile(isMobileDevice());
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateViewport);
      return () => mediaQuery.removeEventListener('change', updateViewport);
    }

    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, []);

  return (
    <aside className="sidebar">
      <details className="control-section" open>
        <summary className="section-heading">
          <span>01 / MEDIA SOURCES</span>
          <span className="section-mark">INPUT</span>
        </summary>
        <label className="file-picker">
          <input
            type="file"
            accept="video/*,.mp4,.mov,.m4v,.webm"
            disabled={disabled}
            onChange={(event) => {
              onVideoChange(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <span className="file-icon" aria-hidden="true">▣</span>
          <span className="file-copy">
            <strong>{videoName || 'Select action camera video'}</strong>
            <small>MP4 / MOV · local file</small>
          </span>
          <span className="upload-mark" aria-hidden="true">+</span>
        </label>

        <label className="file-picker">
          <input
            type="file"
            accept=".gpx,.fit,application/gpx+xml,application/xml,text/xml"
            disabled={disabled}
            onChange={(event) => {
              onGpxChange(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <span className="file-icon gps-icon" aria-hidden="true">⌖</span>
          <span className="file-copy">
            <strong>{gpxName || 'Select GPS track'}</strong>
            <small>GPX / FIT · timestamped GPS activity</small>
          </span>
          <span className="upload-mark" aria-hidden="true">+</span>
        </label>
        {gpxError && <p className="error-message" role="alert">{gpxError}</p>}
      </details>

      <details className="control-section sport-selector-section">
        <summary className="section-heading">
          <span>02 / ACTIVITY SPORT</span>
          <span className="section-mark">{gpxName?.toLowerCase().endsWith('.gpx') ? 'MANUAL' : 'FIT META'}</span>
        </summary>
        <label className="sport-select-label" htmlFor="sport-select">SPORT PROFILE</label>
        <select
          id="sport-select"
          className="sport-select"
          value={sportSelection}
          disabled={disabled}
          onChange={(event) => onSportChange(event.target.value)}
        >
          <option value="auto">
            {gpxName?.toLowerCase().endsWith('.gpx') ? 'Choose sport (GPX has no sport tag)' : 'Auto-detect from FIT'}
          </option>
          <option value="running">Running</option>
          <option value="cycling">Cycling</option>
          <option value="swimming">Swimming</option>
          <option value="walking">Walking</option>
          <option value="hiking">Hiking</option>
          <option value="other">Other</option>
        </select>
        <p className="help-copy">
          GPX files do not reliably include sport type. Choose the activity to show its overlays.
        </p>
      </details>

      <details className="control-section gpx-capabilities" open={!isMobile}>
        <summary className="section-heading">
          <span>03 / TELEMETRY OVERLAYS</span>
          <span className="section-mark">{hasGpxData ? 'DATA READY' : 'GPX / FIT'}</span>
        </summary>
        <ul className="capability-list">
          <li className={visibleWidgets.includes('map') ? 'capability-available' : ''}>
            <label className="capability-toggle">
              <input
                type="checkbox"
                checked={visibleWidgets.includes('map')}
                disabled={disabled || !hasGpxData}
                onChange={(event) => onToggleWidget('map', event.target.checked)}
              />
              <span><strong>GPS track map</strong><small>Track position and moving marker</small></span>
            </label>
          </li>
          <li className={visibleWidgets.includes('speed') ? 'capability-available' : ''}>
            <label className="capability-toggle">
              <input
                type="checkbox"
                checked={visibleWidgets.includes('speed')}
                disabled={disabled || !hasGpxData}
                onChange={(event) => onToggleWidget('speed', event.target.checked)}
              />
              <span><strong>Speedometer</strong><small>Speed calculated from GPS and time</small></span>
            </label>
          </li>
          <li className={visibleWidgets.includes('elevation') ? 'capability-available' : hasGpxData && !hasElevation ? 'capability-missing' : ''}>
            <label className="capability-toggle">
              <input
                type="checkbox"
                checked={hasElevation && visibleWidgets.includes('elevation')}
                disabled={disabled || !hasGpxData || !hasElevation}
                onChange={(event) => onToggleWidget('elevation', event.target.checked)}
              />
              <span>
                <strong>Elevation profile</strong>
                <small>{hasElevation ? 'Recorded elevation and live position' : hasGpxData ? 'This GPX has no elevation values' : 'Requires elevation in GPX'}</small>
              </span>
            </label>
          </li>
          {[
            { id: 'pace', title: 'Pace', available: metricAvailability.pace, unit: 'min/km' },
            { id: 'cadence', title: sportCategory === 'swimming' ? 'Stroke rate' : 'Cadence', available: metricAvailability.cadence, unit: sportCategory === 'cycling' ? 'rpm' : sportCategory === 'swimming' ? 'strokes/min' : 'spm' },
            { id: 'heartRate', title: 'Heart rate', available: metricAvailability.heartRate, unit: 'bpm' },
            ...(sportCategory === 'cycling'
              ? [{ id: 'power', title: 'Power', available: metricAvailability.power, unit: 'watts' }]
              : []),
          ].map((metric) => (
            <li key={metric.id} className={visibleWidgets.includes(metric.id) ? 'capability-available' : ''}>
              <label className="capability-toggle">
                <input
                  type="checkbox"
                  checked={visibleWidgets.includes(metric.id)}
                  disabled={disabled || !hasGpxData}
                  onChange={(event) => onToggleWidget(metric.id, event.target.checked)}
                />
                <span>
                  <strong>{metric.title} overlay</strong>
                  <small>{metric.available ? `Available · ${metric.unit}` : `No ${metric.title.toLowerCase()} samples in this file`}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="capability-note">GPX usually contains GPS, time and optional elevation. FIT can include sport sensors.</p>
      </details>

      <details className="control-section appearance-section" open={!isMobile}>
        <summary className="section-heading">
          <span>04 / OVERLAY APPEARANCE</span>
          <span className="section-mark">STYLE</span>
        </summary>
        <fieldset className="appearance-fieldset" disabled={disabled}>
          <legend className="appearance-label">CARD BACKGROUND</legend>
          <div className="appearance-segmented" role="group" aria-label="Overlay card background">
            {[
              { id: 'glass', label: 'Glass' },
              { id: 'solid', label: 'Solid' },
              { id: 'transparent', label: 'No fill' },
            ].map((style) => (
              <button
                key={style.id}
                className="appearance-option"
                type="button"
                aria-pressed={overlayAppearance.panelStyle === style.id}
                onClick={() => onOverlayAppearanceChange((current) => ({ ...current, panelStyle: style.id }))}
              >
                {style.label}
              </button>
            ))}
          </div>
          {overlayAppearance.panelStyle === 'glass' && (
            <label className="appearance-range">
              <span className="appearance-range-heading">
                <span>GLASS OPACITY</span>
                <output htmlFor="overlay-opacity">{overlayAppearance.panelOpacity}%</output>
              </span>
              <input
                id="overlay-opacity"
                type="range"
                min="20"
                max="100"
                step="1"
                value={overlayAppearance.panelOpacity}
                onChange={(event) => onOverlayAppearanceChange((current) => ({
                  ...current,
                  panelOpacity: Number(event.target.value),
                }))}
              />
            </label>
          )}
          <label className="appearance-outline">
            <input
              type="checkbox"
              checked={overlayAppearance.showBorders}
              onChange={(event) => onOverlayAppearanceChange((current) => ({
                ...current,
                showBorders: event.target.checked,
              }))}
            />
            <span>Card outlines</span>
            <small>Keep panels defined over busy footage</small>
          </label>
          <div className="appearance-colors">
            <span className="appearance-label">SIGNAL COLOR</span>
            <div className="appearance-swatches" role="group" aria-label="Overlay signal color">
              {[
                { color: '#007AFF', name: 'Apex blue' },
                { color: '#34C759', name: 'Go green' },
                { color: '#FF9F0A', name: 'Track amber' },
                { color: '#FF3B30', name: 'Race red' },
              ].map((swatch) => (
                <button
                  key={swatch.color}
                  className="appearance-swatch"
                  type="button"
                  aria-label={swatch.name}
                  aria-pressed={overlayAppearance.accent === swatch.color}
                  title={swatch.name}
                  style={{ '--swatch-color': swatch.color }}
                  onClick={() => onOverlayAppearanceChange((current) => ({ ...current, accent: swatch.color }))}
                />
              ))}
            </div>
          </div>
          <div className="appearance-colors label-colors">
            <span className="appearance-label">LABEL COLOR</span>
            <div className="appearance-swatches" role="group" aria-label="Overlay label color">
              {[
                { color: null, name: 'Theme default', fill: 'linear-gradient(135deg, #8A94A6 50%, #657080 50%)' },
                { color: '#FFFFFF', name: 'White', fill: '#FFFFFF' },
                { color: '#8A94A6', name: 'Telemetry gray', fill: '#8A94A6' },
                { color: '#007AFF', name: 'Apex blue labels', fill: '#007AFF' },
                { color: '#34C759', name: 'Go green labels', fill: '#34C759' },
              ].map((swatch) => (
                <button
                  key={swatch.name}
                  className="appearance-swatch"
                  type="button"
                  aria-label={swatch.name}
                  aria-pressed={(overlayAppearance.labelColor || null) === swatch.color}
                  title={swatch.name}
                  style={{ '--swatch-color': swatch.fill }}
                  onClick={() => onOverlayAppearanceChange((current) => ({ ...current, labelColor: swatch.color }))}
                />
              ))}
              <label className="appearance-custom-color" title="Choose custom label color">
                <input
                  type="color"
                  aria-label="Custom overlay label color"
                  value={overlayAppearance.labelColor || '#8A94A6'}
                  onChange={(event) => onOverlayAppearanceChange((current) => ({
                    ...current,
                    labelColor: event.target.value.toUpperCase(),
                  }))}
                />
                <span aria-hidden="true">+</span>
              </label>
            </div>
          </div>
          <label className="appearance-range speed-range">
            <span className="appearance-range-heading">
              <span>SPEED DIAL MAX</span>
              <output htmlFor="speed-max">{overlayAppearance.speedMaxKmh} km/h</output>
            </span>
            <input
              id="speed-max"
              type="range"
              min="30"
              max="120"
              step="10"
              value={overlayAppearance.speedMaxKmh}
              onChange={(event) => onOverlayAppearanceChange((current) => ({
                ...current,
                speedMaxKmh: Number(event.target.value),
              }))}
            />
            <span className="appearance-range-limits"><span>30 km/h</span><span>120 km/h</span></span>
          </label>
          <div className="appearance-colors value-colors">
            <span className="appearance-label">DATA VALUE COLOR</span>
            <div className="appearance-swatches" role="group" aria-label="Overlay data value color">
              {[
                { color: null, name: 'Go green default', fill: '#34C759' },
                { color: '#FFFFFF', name: 'White values', fill: '#FFFFFF' },
                { color: '#007AFF', name: 'Apex blue values', fill: '#007AFF' },
                { color: '#FF9F0A', name: 'Track amber values', fill: '#FF9F0A' },
              ].map((swatch) => (
                <button
                  key={swatch.name}
                  className="appearance-swatch"
                  type="button"
                  aria-label={swatch.name}
                  aria-pressed={(overlayAppearance.valueColor || null) === swatch.color}
                  title={swatch.name}
                  style={{ '--swatch-color': swatch.fill }}
                  onClick={() => onOverlayAppearanceChange((current) => ({ ...current, valueColor: swatch.color }))}
                />
              ))}
              <label className="appearance-custom-color" title="Choose custom data value color">
                <input
                  type="color"
                  aria-label="Custom overlay data value color"
                  value={overlayAppearance.valueColor || '#34C759'}
                  onChange={(event) => onOverlayAppearanceChange((current) => ({
                    ...current,
                    valueColor: event.target.value.toUpperCase(),
                  }))}
                />
                <span aria-hidden="true">+</span>
              </label>
            </div>
          </div>
          <p className="appearance-note">Export stays alpha-transparent; card style only affects HUD panels.</p>
        </fieldset>
      </details>

    </aside>
  );
}
