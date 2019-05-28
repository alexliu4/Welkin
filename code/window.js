
var ORIGIN_VERTICAL_OFFSET=100;
var SPRITE_HALF_WIDTH = 96/2;

function Window(width, height) {
  this.width = width;
  this.height = height;

  this.scroll_speed = .1;
  this.should_scroll = true;
  this.scroll_location = 0;

  $('#canvas').attr('width', width);
  $('#canvas').attr('height', height);
  this.context = this.getContext();

  // Flip y-axis, move camera down so (0, 0) isn't touching bottom of this
  this.context.transform(1, 0, 0, -1, 1, 1);
  this.context.translate(0, -height + ORIGIN_VERTICAL_OFFSET);

  this.sky_ = new Image();
  $(this.sky_).attr('src', 'sky.png');
}

Window.prototype.gameOver = function() {
  this.should_scroll = false;
  $('#game_over').show();
};


Window.prototype.reset = function() {
  this.should_scroll = false;
  this.scroll_location = 0;
  $('#game_over').hide();
  $('#fight').show();
}

Window.prototype.startGame = function() {
  this.should_scroll = true;
  $('#fight').hide();
}

Window.prototype.getContext = function() {
  return $('#canvas').get(0).getContext('2d');
};

Window.prototype.top = function() {
  return this.height - ORIGIN_VERTICAL_OFFSET;
};

Window.prototype.right = function() {
  return this.scroll_location + this.width;
};

Window.prototype.update = function(dt) {
  if (this.should_scroll) {
    this.scroll_location += dt * this.scroll_speed;
  }

  // Don't let the players past the left edge of the screen
  var min_player_x = this.scroll_location + SPRITE_HALF_WIDTH;
  if (player1.x < min_player_x) {
    player1.x = min_player_x;
  }
  if (player2.x < min_player_x) {
    player2.x = min_player_x;
  }
}

Window.prototype.drawPlayer = function(player) {
  var x = player.x - this.scroll_location;
  var y = player.y;
  player.sprite.drawAt(this.context, x, player.y, !player.facing_right);

  if (DEBUG) {
    // Draw dot at foot location
    this.context.fillStyle = 'white';
    this.context.fillRect(x-3, player.y-3, 6, 6);

    // Hit box
    this.context.strokeStyle = 'white';
    this.context.fillStyle = 'rgba(255, 255, 0, .5)';
    this.context.beginPath();
    this.context.moveTo(x + player.PUNCH_RANGE/2, player.y);
    this.context.lineTo(x + player.PUNCH_RANGE/2, player.y + 96);
    this.context.lineTo(x - player.PUNCH_RANGE/2, player.y + 96);
    this.context.lineTo(x - player.PUNCH_RANGE/2, player.y);
    this.context.closePath();
    this.context.stroke();
    this.context.fill();
  };
}

Window.prototype.draw = function() {
  // Sky
  this.context.fillStyle = '#aaf';
  this.context.fillRect(0, 0, WIDTH, HEIGHT);

  // Ground
  this.context.fillStyle = '#353';
  thiscontext.fillRect(0, GROUND_VISUAL_OFFSET, WIDTH, -HEIGHT);

  // Sprites
  this.drawPlayer(player1);
  this.drawPlayer(player2);

  // HUD
  this.drawHealth(10, this.top() - 20, player1);
  this.drawHealth(this.width - 110, this.top() - 20, player2);
}

Window.prototype.drawHealth = function(x, y, player) {
  this.context.fillStyle = '#FF0';
  this.context.strokeStyle = '#FF0';
  this.context.strokeRect(x, y, 100, 10);
  this.context.fillRect(x, y, player.health, 10);
}
