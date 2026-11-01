'use strict';
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  UI.init(game);
  Input.init(canvas, {
    pause: () => { if (game.state === 'playing' || game.state === 'paused') game.togglePause(); },
    mute: () => UI.toggleMute(),
    choose: i => UI.chooseCard(i),
    confirm: () => UI.confirm(),
    blur: () => { if (game.state === 'playing') game.togglePause(); },
  });
  window.game = game;
});
