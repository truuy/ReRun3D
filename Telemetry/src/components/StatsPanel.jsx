function Stat({ label, value, unit, accent = false }) {
  return (
    <div className="stat-cell">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${accent ? ' stat-accent' : ''}`}>
        {value}<small>{unit}</small>
      </span>
    </div>
  );
}

export default function StatsPanel({ telemetry }) {
  return (
    <section className="stats-panel" aria-label="Live telemetry">
      <Stat label="GROUND SPEED" value={telemetry ? telemetry.speedKmh.toFixed(1) : '—'} unit="km/h" accent />
      <Stat
        label="ELEVATION"
        value={telemetry && Number.isFinite(telemetry.elevation) ? Math.round(telemetry.elevation).toString() : '—'}
        unit="m"
      />
      <Stat label="DISTANCE" value={telemetry ? (telemetry.distanceMeters / 1000).toFixed(2) : '—'} unit="km" />
      <Stat label="GRADE" value={telemetry ? telemetry.gradePercent.toFixed(1) : '—'} unit="%" />
    </section>
  );
}
