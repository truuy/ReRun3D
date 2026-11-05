import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../utils/timeFormat.js';

export default function VideoPlayer({
  file,
  playerRef,
  overlay,
  statsPanel,
  isExporting = false,
  onDurationChange,
}) {
  const [source, setSource] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [mediaError, setMediaError] = useState('');
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const localVideoRef = useRef(null);
  const stageRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (localVideoRef.current && !isExporting) {
      localVideoRef.current.playbackRate = playbackRate;
    }
  }, [isExporting, playbackRate, source]);

  useEffect(() => {
    if (!file) {
      setSource('');
      setDuration(0);
      setCurrentTime(0);
      setAspectRatio(16 / 9);
      onDurationChange?.(0);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setSource(url);
    setAspectRatio(16 / 9);
    setPlaying(false);
    setMediaError('');
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const frameSize = (() => {
    if (!stageSize.width || !stageSize.height) return { width: '100%', height: '100%' };

    const width = Math.min(stageSize.width, stageSize.height * aspectRatio);
    const height = width / aspectRatio;
    return { width, height };
  })();

  const handleMetadata = (event) => {
    const video = event.currentTarget;
    const videoDuration = video.duration || 0;
    setDuration(videoDuration);
    onDurationChange?.(videoDuration);
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setAspectRatio(video.videoWidth / video.videoHeight);
    }
  };

  const updateTime = () => {
    const video = localVideoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const togglePlayback = async () => {
    const video = localVideoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setMediaError('This video could not be played by your browser.');
      }
    } else {
      video.pause();
    }
  };

  const seek = (event) => {
    const time = Number(event.target.value);
    if (localVideoRef.current) localVideoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <div className="player-shell">
      <div
        ref={stageRef}
        className="video-stage"
        style={{ '--video-aspect-ratio': aspectRatio }}
      >
        <div className="video-frame" style={frameSize}>
          {file ? (
            <video
              ref={(element) => {
                localVideoRef.current = element;
                if (playerRef) playerRef.current = element;
              }}
              src={source}
              playsInline
              preload="metadata"
              onLoadedMetadata={handleMetadata}
              onDurationChange={(event) => {
                const videoDuration = event.currentTarget.duration || 0;
                setDuration(videoDuration);
                onDurationChange?.(videoDuration);
              }}
              onTimeUpdate={updateTime}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onError={() => setMediaError('Unable to decode this video. Try an MP4 encoded with H.264.')}
            />
          ) : (
            <div className="empty-prompt">
              <div className="empty-glyph">◉</div>
              <p className="eyebrow">NO VIDEO LOADED</p>
              <p>Choose a video to preview.</p>
            </div>
          )}
          {overlay}
          {mediaError && <div className="media-error" role="alert">{mediaError}</div>}
        </div>
      </div>

      {statsPanel}

      <div className="transport">
        <button
          className="play-button"
          type="button"
          aria-label={playing ? 'Pause video' : 'Play video'}
          onClick={togglePlayback}
          disabled={!file || isExporting}
        >
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <span className="timecode">{formatTime(currentTime)}</span>
        <input
          className="timeline-slider"
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={Math.min(currentTime, duration || 0)}
          aria-label="Video timeline"
          onChange={seek}
          disabled={!file || !duration || isExporting}
        />
        <span className="timecode timecode-total">{formatTime(duration)}</span>
        <label className="playback-rate-control">
          <span className="sr-only">Playback speed</span>
          <select
            value={playbackRate}
            aria-label="Playback speed"
            disabled={!file || isExporting}
            onChange={(event) => setPlaybackRate(Number(event.target.value))}
          >
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
            <option value="4">4×</option>
          </select>
        </label>
      </div>
    </div>
  );
}
