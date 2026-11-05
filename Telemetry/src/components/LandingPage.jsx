import ThemeToggle from './ThemeToggle.jsx';

const features = [
  {
    number: '01',
    label: 'IMPORT',
    title: 'Bring the ride in',
    copy: 'Load your action-camera video and its matching GPX or FIT activity file. No upload step.',
  },
  {
    number: '02',
    label: 'CUSTOMIZE',
    title: 'Build your dashboard',
    copy: 'Pick the metrics you care about, then move, resize and style each overlay on the preview.',
  },
  {
    number: '03',
    label: 'EXPORT',
    title: 'Finish in your editor',
    copy: 'Align video and GPS, then export a transparent WebM or green-screen MP4 for chroma key.',
  },
];

export default function LandingPage({ onOpenStudio, theme, onToggleTheme }) {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#home" aria-label="ReRun 3D home">
          <img className="rerun-logo rerun-logo-landing" src="/rerun-logo.png" alt="" />
          <span>ReRun <b>3D</b></span>
        </a>
        <nav className="landing-nav-links" aria-label="Main navigation">
          <a href="#workflow">How it works</a>
          <a href="#features">Features</a>
        </nav>
        <div className="landing-nav-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="landing-nav-cta" type="button" onClick={onOpenStudio}>
            Open Studio <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <section className="landing-hero" id="home">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span /> GPS TELEMETRY FOR ACTION VIDEO</div>
          <h1>Your footage.<br /><em>Every metric.</em></h1>
          <p className="landing-lede">
            Sync a GPS activity to your ride video, choose the stats to show, and export a HUD
            overlay for your edit.
          </p>
          <div className="landing-actions">
            <button className="landing-primary" type="button" onClick={onOpenStudio}>
              Open the editor <span aria-hidden="true">↗</span>
            </button>
            <a className="landing-secondary" href="#workflow">How it works <span aria-hidden="true">↓</span></a>
          </div>
          <div className="landing-trust">
            <span>●</span>
            <span>Runs in your browser</span>
            <i />
            <span>Your files stay on your device</span>
          </div>
        </div>

        <div className="landing-preview" aria-label="Illustration of a telemetry video overlay">
          <div className="preview-topline">
            <span>RIDE PREVIEW</span>
            <span><i /> VIDEO + GPS</span>
          </div>
          <div className="preview-scene">
            <div className="preview-horizon" />
            <svg className="preview-landscape" viewBox="0 0 760 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <path className="landscape-back" d="M0 235 95 158l61 41 96-116 86 103 83-70 91 91 85-112 163 134v191H0Z" />
              <path className="landscape-mid" d="m0 276 105-66 78 54 102-93 83 72 92-41 85 61 84-80 131 69v168H0Z" />
              <path className="landscape-front" d="m0 327 100-66 88 43 90-35 77 47 93-62 91 44 89-58 132 58v122H0Z" />
              <path className="landscape-road" d="M610 420c-65-53-116-61-123-104-8-45 47-58 32-89-11-24-61-31-84-50" />
            </svg>
            <div className="preview-grid" />
            <div className="preview-route" aria-hidden="true">
              <svg viewBox="0 0 220 124" role="presentation">
                <path d="M17 98 C43 90 40 56 70 63 S104 100 123 76 139 37 164 47 183 75 205 20" />
                <circle cx="123" cy="76" r="4" />
              </svg>
            </div>
            <div className="preview-speed">
              <span className="preview-label">SPEED <small>KM/H</small></span>
              <strong>32<span>.8</span></strong>
              <div className="preview-gauge"><i /></div>
            </div>
            <div className="preview-pace">
              <span className="preview-label">PACE</span>
              <strong>4:38 <small>/KM</small></strong>
            </div>
            <div className="preview-map">
              <span className="preview-label">ROUTE</span>
              <svg viewBox="0 0 88 48" role="presentation">
                <path d="M6 38 20 30 18 18 34 22 42 9 54 16 67 11 80 4" />
                <circle cx="42" cy="9" r="3" />
              </svg>
            </div>
            <div className="preview-altitude">
              <span className="preview-label">ELEVATION <small>M</small></span>
              <svg viewBox="0 0 120 30" role="presentation">
                <path d="M1 27 16 22 26 24 40 11 53 16 65 6 79 13 91 4 104 8 119 1" />
              </svg>
            </div>
            <div className="preview-crosshair" />
          </div>
          <div className="preview-footer">
            <span><b>00:18</b> / 00:42</span>
            <div><i /></div>
            <span>+00.0 S</span>
          </div>
          <div className="preview-caption"><span>01</span> SYNCED TELEMETRY</div>
        </div>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">HOW IT WORKS</span>
          <p>Three steps from activity file<br /><span>to a ready-to-edit overlay.</span></p>
        </div>
        <div className="landing-steps">
          {features.map((feature) => (
            <article className="landing-step" key={feature.number}>
              <div className="landing-step-top">
                <span className="landing-step-number">{feature.number}</span>
                <span className="landing-step-label">{feature.label}</span>
              </div>
              <h2>{feature.title}</h2>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-bottom" id="features">
        <div>
          <span className="landing-eyebrow">READY WHEN YOU ARE</span>
          <h2>Bring your next ride<br /><em>into the frame.</em></h2>
        </div>
        <button className="landing-primary" type="button" onClick={onOpenStudio}>
          Open the editor <span aria-hidden="true">↗</span>
        </button>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand" href="#home" aria-label="ReRun 3D home">
          <img className="rerun-logo rerun-logo-landing" src="/rerun-logo.png" alt="" />
          <span>ReRun <b>3D</b></span>
        </a>
        <span className="landing-developer">Built by <strong>teejkunedo</strong></span>
      </footer>
    </main>
  );
}
