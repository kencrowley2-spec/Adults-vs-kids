// Adults vs. Kids integration. Original HexGL game and notices retained.
(function () {
  'use strict';
  var controls = document.getElementById('avk-drive');
  var held = new Map();
  function ship() { return window.hexGL && window.hexGL.components.shipControls; }
  function releaseAll() {
    held.clear();
    var current = ship();
    ['left', 'right', 'forward'].forEach(function (key) {
      if (current) current.key[key] = false;
      controls.querySelector('[data-drive="' + key + '"]').setAttribute('aria-pressed', 'false');
    });
  }
  controls.querySelectorAll('button').forEach(function (button) {
    var key = button.dataset.drive;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      held.set(event.pointerId, key);
      button.setPointerCapture(event.pointerId);
      if (ship()) ship().key[key] = true;
      button.setAttribute('aria-pressed', 'true');
    });
    function up(event) {
      held.delete(event.pointerId);
      var pressed = Array.from(held.values()).includes(key);
      if (ship()) ship().key[key] = pressed;
      button.setAttribute('aria-pressed', String(pressed));
    }
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('lostpointercapture', up);
  });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { releaseAll(); if (bkcore.Audio._ctx) bkcore.Audio._ctx.suspend(); }
    else if (!muted && bkcore.Audio._ctx) bkcore.Audio._ctx.resume();
  });
  document.getElementById('avk-restart').onclick = function () { location.reload(); };
  var muted = false;
  var sound = document.getElementById('avk-sound');
  sound.onclick = function () {
    muted = !muted;
    if (bkcore.Audio._ctx) bkcore.Audio._ctx[muted ? 'suspend' : 'resume']();
    sound.textContent = muted ? 'Unmute' : 'Mute';
    sound.setAttribute('aria-pressed', String(muted));
  };
  // Make the upstream menu operable with keyboard and assistive technology.
  document.querySelectorAll('#menu > div').forEach(function (item) {
    item.setAttribute('role', 'button'); item.tabIndex = 0;
    item.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.click(); }
    });
  });
  var originalScore = bkcore.hexgl.HexGL.prototype.displayScore;
  bkcore.hexgl.HexGL.prototype.displayScore = function (time, laps) {
    originalScore.call(this, time, laps);
    releaseAll(); controls.hidden = true;
    var finished = this.gameplay.result === this.gameplay.results.FINISH;
    var result = document.getElementById('time');
    if (!finished) result.textContent = 'Ship destroyed — try again!';
    document.querySelector('#step-5 #ctrl-help').textContent = 'Tap to race again, or return to the Arcade.';
    bkcore.Audio.stop('bg'); bkcore.Audio.stop('wind');
  };
  var ready = false;
  window.addEventListener('hexgl-ready', function () { ready = true; if (muted && bkcore.Audio._ctx) bkcore.Audio._ctx.suspend(); });
  // Keep the original camera's aspect ratio on device rotation without losing a race.
  function resize() {
    if (!ready) return;
    var game = window.hexGL, factor = game.quality === 0 ? .5 : 1;
    game.width = Math.round(window.innerWidth * factor);
    game.height = Math.round(window.innerHeight * factor);
    var scene = game.manager.get('game');
    if (scene && scene.camera) { scene.camera.aspect = game.width / game.height; scene.camera.updateProjectionMatrix(); }
    game.renderer.setSize(game.width, game.height);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', function () { releaseAll(); if (bkcore.Audio._ctx) bkcore.Audio._ctx.suspend(); });
})();
