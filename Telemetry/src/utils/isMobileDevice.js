export function isMobileDevice() {
  const isCompactViewport = window.matchMedia(
    '(max-width: 620px), (max-width: 900px) and (max-height: 560px)',
  ).matches;
  const userAgent = navigator.userAgent;
  const isMobileAgent = navigator.userAgentData?.mobile
    ?? /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isTouchMac = navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent);

  return isCompactViewport || isMobileAgent || isTouchMac;
}
