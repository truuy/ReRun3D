import { formatOffset, formatTime } from '../utils/timeFormat.js';

export default function SyncControls({
  offset,
  onOffsetChange,
  trackStart,
  maxTrackStart,
  onTrackStartChange,
  disabled = false,
}) {
  return (
    <section className="sync-controls" aria-label="Video and GPS synchronization">
      <details className="sync-control" open>
        <summary className="sync-control-heading">
          <span>CLIP POSITION IN TRACK</span>
          <span className="section-mark">GPX</span>
        </summary>
        <div className="sync-control-content">
          <div className="offset-readout">
            <span>TRACK START</span>
            <strong>{formatTime(trackStart)}</strong>
          </div>
          <input
            className="offset-slider"
            type="range"
            min="0"
            max={maxTrackStart}
            step={maxTrackStart > 600 ? '1' : '0.1'}
            value={Math.min(trackStart, maxTrackStart)}
            aria-label="Video start position within the GPS track"
            disabled={disabled || maxTrackStart <= 0}
            onChange={(event) => onTrackStartChange(Number(event.target.value))}
          />
          <div className="range-labels">
            <span>00:00</span>
            <span>{formatTime(maxTrackStart)}</span>
          </div>
          <p className="help-copy">Choose where this video begins in the longer GPS recording.</p>
        </div>
      </details>

      <details className="sync-control" open>
        <summary className="sync-control-heading">
          <span>FINE ALIGNMENT</span>
          <span className="section-mark">SYNC</span>
        </summary>
        <div className="sync-control-content">
          <div className="offset-readout">
            <span>GPS OFFSET</span>
            <strong>{formatOffset(offset)}</strong>
          </div>
          <input
            className="offset-slider"
            type="range"
            disabled={disabled}
            min="-30"
            max="30"
            step="0.1"
            value={offset}
            aria-label="GPS time offset in seconds"
            onChange={(event) => onOffsetChange(Number(event.target.value))}
          />
          <div className="range-labels"><span>−30 s</span><span>0</span><span>+30 s</span></div>
          <p className="help-copy">Positive values advance the GPS position relative to the video.</p>
          <button
            className="reset-button"
            type="button"
            disabled={disabled}
            onClick={() => onOffsetChange(0)}
          >
            Reset alignment <span>↺</span>
          </button>
        </div>
      </details>
    </section>
  );
}
