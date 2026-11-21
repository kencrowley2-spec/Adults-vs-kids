(() => {
  const host = location.hostname;
  if (host !== 'adultsvskids.com' && host !== 'www.adultsvskids.com') return;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;

  const settings = document.getElementById('guide-ad-settings');
  const slot = document.getElementById('guide-ad-slot');
  const allow = settings.querySelector('[data-allow-ad]');
  const withdraw = settings.querySelector('[data-withdraw-ad]');
  settings.hidden = false;

  allow.addEventListener('click', () => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + slot.dataset.adClient;

    allow.hidden = true;
    withdraw.hidden = false;
    slot.hidden = false;
    slot.className = 'adsbygoogle';
    slot.style.display = 'block';
    (window.adsbygoogle ||= []).push({});
    document.head.append(script);
    withdraw.focus();
  }, { once: true });

  withdraw.addEventListener('click', () => location.reload());
})();
