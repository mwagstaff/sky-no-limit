const STORAGE_KEY = 'sky-no-limit.cookie-notice.dismissed-at.v1';
const DISMISSAL_TTL = 1000 * 60 * 60 * 24 * 180;

const dismissalIsCurrent = () => {
  try {
    const dismissedAt = Number(window.localStorage.getItem(STORAGE_KEY));
    const age = Date.now() - dismissedAt;
    return Number.isFinite(dismissedAt) && dismissedAt > 0 && age >= 0 && age < DISMISSAL_TTL;
  } catch {
    return false;
  }
};

if (!dismissalIsCurrent()) {
  const notice = document.createElement('aside');
  notice.className = 'cookie-notice';
  notice.setAttribute('aria-label', 'Cookie notice');
  notice.hidden = true;
  notice.innerHTML = `
    <div class="shell cookie-notice__inner">
      <span class="cookie-notice__signal" aria-hidden="true"></span>
      <p>
        <strong>Cookie note.</strong>
        No analytics, advertising or tracking cookies. Your browser remembers this dismissal for six months.
      </p>
      <div class="cookie-notice__actions">
        <a href="/privacy_policy">Privacy details</a>
        <button type="button" data-cookie-notice-dismiss>Got it</button>
      </div>
    </div>
  `;

  document.body.append(notice);
  notice.hidden = false;
  window.requestAnimationFrame(() => {
    notice.dataset.visible = 'true';
  });

  notice.querySelector('[data-cookie-notice-dismiss]')?.addEventListener('click', () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Dismiss for this page view even when browser storage is unavailable.
    }

    const removeNotice = () => notice.remove();
    notice.dataset.visible = 'false';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      removeNotice();
      return;
    }

    notice.addEventListener('transitionend', (event) => {
      if (event.target === notice && event.propertyName === 'opacity') removeNotice();
    });
    window.setTimeout(removeNotice, 300);
  });
}
