(() => {
  const receiverApplicationId = document.currentScript.dataset.receiver;
  const namespace = 'urn:x-cast:com.adultsvskids.memory';
  let context;
  let state = null;
  function publish() {
    const session = context?.getCurrentSession();
    if (session) session.sendMessage(namespace, {version:1, state}).catch(() => {});
  }
  window.avkMemoryCast = {
    update(next) { state = next; publish(); },
    reset() { if (state) { state = null; publish(); } },
    snapshot() { return state; },
    resize(columns) {
      if (state && state.columns !== columns) { state = {...state, columns}; publish(); }
    }
  };
  window.__onGCastApiAvailable = available => {
    if (!available) return;
    const framework = window.cast.framework;
    context = framework.CastContext.getInstance();
    const launcher = document.getElementById('memory-cast');
    function showAvailability() {
      launcher.dataset.available = String(context.getCastState() !== framework.CastState.NO_DEVICES_AVAILABLE);
    }
    context.addEventListener(framework.CastContextEventType.CAST_STATE_CHANGED, showAvailability);
    context.addEventListener(framework.CastContextEventType.SESSION_STATE_CHANGED, event => {
      if ([framework.SessionState.SESSION_STARTED, framework.SessionState.SESSION_RESUMED].includes(event.sessionState)) publish();
    });
    context.setOptions({receiverApplicationId, autoJoinPolicy:chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED});
    showAvailability();
  };
  const sdk = document.createElement('script');
  sdk.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
  document.head.append(sdk);
})();
