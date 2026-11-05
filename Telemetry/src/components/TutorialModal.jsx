import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    label: 'LOAD YOUR FILES',
    title: 'Start with video and a track.',
    body: 'Add your action-camera clip, then its matching GPX or FIT activity file. Everything is read locally in your browser; your footage is not uploaded.',
    tip: 'FIT files can include heart rate, cadence and power. GPX usually includes location, time and elevation.',
    graphic: 'files',
  },
  {
    label: 'BUILD YOUR HUD',
    title: 'Choose the instruments you want.',
    body: 'Open Telemetry Overlays and enable the widgets you want. Drag a widget on the video to move it; drag its corner to resize. Use its × control to remove it.',
    tip: 'Use Overlay Appearance to set the panel fill, borders and colors. GPX files do not identify a sport, so choose one when needed.',
    graphic: 'hud',
  },
  {
    label: 'LINE UP THE DATA',
    title: 'Sync the clip to your activity.',
    body: 'Play or scrub the video timeline to preview the live telemetry. Clip Position chooses where the video starts inside a longer activity; Fine Alignment nudges GPS timing by up to 30 seconds.',
    tip: 'You can adjust either slider and watch the instruments update in the preview.',
    graphic: 'sync',
  },
  {
    label: 'EXPORT A LAYER',
    title: 'Pick the format for your editor.',
    body: 'Export WebM for a transparent layer in editors that support VP9 alpha. On mobile, MP4 Green Screen is the default for broader compatibility and lower memory use.',
    tip: 'Green-screen MP4 is not true transparency. In your editor, apply Chroma Key and sample the green background.',
    graphic: 'export',
  },
  {
    label: 'FINISH YOUR EDIT',
    title: 'Place the HUD over the original clip.',
    body: 'Import both the original footage and the downloaded overlay into your video editor. Put the overlay on a track above the video and align their start times.',
    tip: 'For WebM, use an editor that preserves VP9 alpha. For green-screen MP4, key out the green, then position and scale the HUD.',
    graphic: 'layers',
  },
];

function StepGraphic({ type }) {
  if (type === 'files') {
    return (
      <svg viewBox="0 0 360 190" role="img" aria-label="Video and GPS files flow into the local studio">
        <rect x="22" y="28" width="130" height="58" rx="2" className="tutorial-diagram-card" />
        <rect x="22" y="104" width="130" height="58" rx="2" className="tutorial-diagram-card" />
        <path d="M37 47h22l8 9v18H37zM59 47v10h9" className="tutorial-diagram-icon" />
        <path d="M39 124h28v18H39zM43 120h20" className="tutorial-diagram-icon" />
        <text x="78" y="57" className="tutorial-diagram-label">ACTION VIDEO</text>
        <text x="78" y="72" className="tutorial-diagram-small">MP4 / MOV</text>
        <text x="78" y="133" className="tutorial-diagram-label">GPS ACTIVITY</text>
        <text x="78" y="148" className="tutorial-diagram-small">GPX / FIT</text>
        <path d="M164 95h53m-8-8 9 8-9 8" className="tutorial-diagram-line" />
        <rect x="227" y="58" width="112" height="74" rx="2" className="tutorial-diagram-accent-card" />
        <path d="M244 77h77M244 91h51M244 105h63" className="tutorial-diagram-line-soft" />
        <circle cx="314" cy="115" r="4" className="tutorial-diagram-dot" />
        <text x="245" y="71" className="tutorial-diagram-label">STUDIO</text>
      </svg>
    );
  }
  if (type === 'hud') {
    return (
      <svg viewBox="0 0 360 190" role="img" aria-label="Move and resize telemetry widgets over video">
        <rect x="20" y="20" width="320" height="150" rx="2" className="tutorial-diagram-scene" />
        <path d="M20 121c48-35 78 19 124-11s70 5 103-35 59 3 93-31" className="tutorial-diagram-route" />
        <rect x="38" y="39" width="104" height="78" rx="2" className="tutorial-diagram-card" />
        <text x="49" y="56" className="tutorial-diagram-small">SPEED</text>
        <path d="M58 91a31 31 0 0 1 62 0" className="tutorial-diagram-gauge" />
        <text x="72" y="91" className="tutorial-diagram-value">32</text>
        <rect x="232" y="77" width="86" height="56" rx="2" className="tutorial-diagram-card-selected" />
        <text x="243" y="94" className="tutorial-diagram-small">HEART RATE</text>
        <text x="252" y="119" className="tutorial-diagram-value">148</text>
        <path d="M305 120l14 13" className="tutorial-diagram-handle" />
        <path d="M197 67l24-12m-7 0 7 0 0 7" className="tutorial-diagram-line" />
      </svg>
    );
  }
  if (type === 'sync') {
    return (
      <svg viewBox="0 0 360 190" role="img" aria-label="Video and GPS timelines aligned with offset controls">
        <text x="24" y="40" className="tutorial-diagram-label">VIDEO</text>
        <text x="24" y="102" className="tutorial-diagram-label">GPS TRACK</text>
        <path d="M92 37h240M92 99h240" className="tutorial-diagram-line-soft" />
        <path d="M116 37h124m-124 62h124" className="tutorial-diagram-line" />
        <circle cx="183" cy="37" r="7" className="tutorial-diagram-dot" />
        <circle cx="183" cy="99" r="7" className="tutorial-diagram-dot" />
        <path d="M183 48v38m-5-7 5 7 5-7" className="tutorial-diagram-line" />
        <rect x="93" y="128" width="237" height="38" rx="2" className="tutorial-diagram-card" />
        <text x="105" y="145" className="tutorial-diagram-small">FINE ALIGNMENT</text>
        <path d="M109 155h201" className="tutorial-diagram-line-soft" />
        <circle cx="206" cy="155" r="6" className="tutorial-diagram-dot" />
      </svg>
    );
  }
  if (type === 'export') {
    return (
      <svg viewBox="0 0 360 190" role="img" aria-label="Choose a transparent WebM or green screen MP4 export">
        <rect x="28" y="38" width="134" height="112" rx="2" className="tutorial-diagram-card" />
        <text x="46" y="62" className="tutorial-diagram-label">CHOOSE FORMAT</text>
        <rect x="45" y="75" width="100" height="25" rx="1" className="tutorial-diagram-accent-card" />
        <text x="56" y="92" className="tutorial-diagram-small">WEBM · ALPHA</text>
        <rect x="45" y="108" width="100" height="25" rx="1" className="tutorial-diagram-card" />
        <text x="56" y="125" className="tutorial-diagram-small">MP4 · GREEN</text>
        <path d="M176 94h38m-8-8 9 8-9 8" className="tutorial-diagram-line" />
        <rect x="226" y="43" width="106" height="100" rx="2" className="tutorial-diagram-scene" />
        <path d="M226 43h106v100H226z" fill="#00d12f" opacity=".8" />
        <rect x="241" y="66" width="54" height="45" rx="2" className="tutorial-diagram-card-selected" />
        <path d="M253 100a15 15 0 0 1 30 0" className="tutorial-diagram-gauge" />
        <text x="243" y="130" className="tutorial-diagram-small">CHROMA KEY</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 360 190" role="img" aria-label="Place the telemetry overlay above the original video">
      <text x="27" y="43" className="tutorial-diagram-label">EDITOR TIMELINE</text>
      <rect x="28" y="60" width="302" height="38" rx="2" className="tutorial-diagram-accent-card" />
      <text x="43" y="83" className="tutorial-diagram-small">TELEMETRY OVERLAY</text>
      <rect x="28" y="109" width="302" height="38" rx="2" className="tutorial-diagram-card" />
      <path d="M44 137c30-23 51 9 80-9s45 5 71-15 51 7 83-6" className="tutorial-diagram-route" />
      <text x="43" y="126" className="tutorial-diagram-small">ORIGINAL VIDEO</text>
      <path d="M340 73v37m-6-7 6 7 6-7" className="tutorial-diagram-line" />
      <text x="29" y="171" className="tutorial-diagram-small">ALIGN BOTH LAYERS AT THE SAME START TIME</text>
    </svg>
  );
}

export default function TutorialModal({ onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not(:disabled), a[href], select:not(:disabled), input:not(:disabled)',
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="tutorial-backdrop" onMouseDown={handleBackdropClick}>
      <section
        ref={dialogRef}
        className="tutorial-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
      >
        <header className="tutorial-header">
          <div className="tutorial-brand">
            <img className="rerun-logo rerun-logo-tutorial" src="/rerun-logo.png" alt="" />
            STUDIO TUTORIAL
          </div>
          <button
            ref={closeButtonRef}
            className="tutorial-close"
            type="button"
            aria-label="Close tutorial"
            onClick={onClose}
          >×</button>
        </header>
        <div className="tutorial-content">
          <div className="tutorial-step-meta">
            <span>{currentStep.label}</span>
            <span>{String(stepIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span>
          </div>
          <div className="tutorial-progress" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            {steps.map((step, index) => (
              <span
                key={step.label}
                className={index <= stepIndex ? 'tutorial-progress-segment is-active' : 'tutorial-progress-segment'}
              />
            ))}
          </div>
          <div className="tutorial-visual"><StepGraphic type={currentStep.graphic} /></div>
          <h2 id="tutorial-title">{currentStep.title}</h2>
          <p id="tutorial-description" className="tutorial-body">{currentStep.body}</p>
          <p className="tutorial-tip"><span>TIP</span>{currentStep.tip}</p>
        </div>
        <footer className="tutorial-footer">
          <button className="tutorial-skip" type="button" onClick={onClose}>Skip guide</button>
          <div className="tutorial-nav">
            <button
              className="tutorial-back"
              type="button"
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={stepIndex === 0}
            >Back</button>
            <button
              className="tutorial-next"
              type="button"
              onClick={() => (isLastStep ? onClose() : setStepIndex((index) => index + 1))}
            >{isLastStep ? 'Start editing' : 'Next step'} <span aria-hidden="true">→</span></button>
          </div>
        </footer>
      </section>
    </div>
  );
}
