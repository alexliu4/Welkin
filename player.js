
function AnimatingSprite(resource) {
  var that = this;

  // The containing Image HTMLElement
  this.image_ = new Image();
  this.loaded_ = false;
  $(this.image_).load(function() {
    that.setState('idle');

    //that.loaded_ = true;

    // Create a canvas element to hold this image
    //that.canvas_ = document.createElement('canvas');
    //that.context_ = that.canvas_.getContext('2d');
    // Copy the image into the canvas
  }).attr('src', resource)
}

AnimatingSprite.states = {
 'idle': [0],
 'pain': [1],
 'punch_l': [2, 0],
 'punch_r': [3, 0],
 'block': [4],
 'throw': [5],
 'thrown': [7, 8, 9, 10, 10, 0, 0, 0],
}
AnimatingSprite.FRAME_TIME = 150;  // milliseconds spent on each frame

AnimatingSprite.prototype.drawAt = function(dest_context, x, y, flip_x) {
  dest_context.save();
  coords = this.getFrameSpriteCoords_();
  var flip_factor = (flip_x) ? -1 : 1;

  dest_context.translate(x - (flip_factor*48), y + 96);
  dest_context.scale(flip_factor, -1);
  dest_context.drawImage(this.image_,
                         coords.x, coords.y, 96, 96,
                         0, 0, 96, 96);
  dest_context.restore();
};

AnimatingSprite.prototype.setState = function(state) {
  if (AnimatingSprite.states[state] === undefined) {
    return;
  }
  this.currentStateString_ = state;
  this.currentState_ = AnimatingSprite.states[state];
  this.stateStartTime_ = new Date().getTime();
};

AnimatingSprite.prototype.getStateFrameNum_ = function() {
  var now = new Date().getTime();
  var elapsed = now - this.stateStartTime_;
  var frameNum = elapsed / AnimatingSprite.FRAME_TIME;
  frameNum = frameNum % this.currentState_.length;
  return parseInt(frameNum);
};

AnimatingSprite.prototype.getFrameSpriteCoords_ = function() {
  if (this.currentStateString_ == 'punch_l') {
    //debugger;
  }
  var spriteIndex = this.currentState_[this.getStateFrameNum_()];
  var x = parseInt(spriteIndex % 4) * 96;
  var y = parseInt(spriteIndex / 4) * 96;
  return {x: x, y: y};
}

var WIDTH=800;
var HEIGHT=600;
var ORIGIN_VERTICAL_OFFSET=100;
var TOP_OF_WINDOW = HEIGHT - ORIGIN_VERTICAL_OFFSET;
var GROUND_VISUAL_OFFSET = 25;
var SCALE=1;

// Key codes
var KEY_SPACE=32;
var KEY_W=87;
var KEY_A=65;
var KEY_S=83;
var KEY_D=68;
var KEY_R=82;
var KEY_T=84;
var KEY_P=80;
var KEY_COMMA=188;
var KEY_PERIOD=190;
var KEY_LEFT=37;
var KEY_RIGHT=39;
var KEY_UP=38;

var ACTION_IDLE = 'idle';
var ACTION_PUNCH = 'punch';
var ACTION_BLOCK = 'block';
var DEBUG = false;

var context;
var keys;
var player1;
var player2;
var interval;

var SPRITE_HALF_WIDTH = 96/2;

function resetGameState() {
  player1 = new Player(350, 'character.png', true);
  player2 = new Player(WIDTH - 350 * SCALE, 'character_2.png', false);
  player1.other_player = player2;
  player2.other_player = player1;
  keys = new KeyWatcher();
}

function getContext() {
  return $('#canvas').get(0).getContext('2d');
}

function drawPlayer(player) {
  player.sprite.drawAt(context, player.x, player.y, !player.facing_right);

  if (DEBUG) {
    context.fillStyle = 'white';
    context.fillRect(player.x-3, player.y-3, 6, 6);

    context.strokeStyle = 'white';
    context.fillStyle = 'rgba(255, 255, 0, .5)';
    context.beginPath();
    context.moveTo(x + player.PUNCH_RANGE/2, player.y);
    context.lineTo(x + player.PUNCH_RANGE/2, player.y + 96);
    context.lineTo(x - player.PUNCH_RANGE/2, player.y + 96);
    context.lineTo(x - player.PUNCH_RANGE/2, player.y);
    context.closePath();
    context.stroke();
    context.fill();
  };
}

function draw() {
  // Sky
  context.fillStyle = '#aaf';
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Ground
  context.fillStyle = '#353';
  context.fillRect(0, GROUND_VISUAL_OFFSET, WIDTH, -HEIGHT);

  // Sprites
  drawPlayer(player1);
  drawPlayer(player2);

  // HUD
  drawHealth(10, TOP_OF_WINDOW - 20, player1);
  drawHealth(WIDTH - 110, TOP_OF_WINDOW - 20, player2);
}

function drawHealth(x, y, player) {
  context.fillStyle = '#FF0';
  context.strokeStyle = '#FF0';
  context.strokeRect(x, y, 100, 10);
  context.fillRect(x, y, player.health, 10);
}


function Player(x, sprite_sheet, facing_right) {
  this.x = x;
  this.y = 0;
  this.health = 100;
  this.sprite = new AnimatingSprite(sprite_sheet);

  this.jumped = false;
  this.facing_right = facing_right;

  this.other_player = null;

  this.dy = 0;
  this.SPEED = 4;
  this.PUNCH_TIME = 0.5;
  this.BLOCK_TIME = 0.5;
  this.PUNCH_RANGE = 70;
  this.PUNCH_DAMAGE = 10;
  this.HIT_MOVE_DISTANCE = 5;


  this.moveLeft = function() {
    if (this.action != ACTION_IDLE) {
      return;
    }
    this.x -= this.SPEED;
  }
  this.moveRight = function() {
    if (this.action != ACTION_IDLE) {
      return;
    }
    this.x += this.SPEED;
  }

  this.setAction = function(newAction) {
    this.action = newAction;
    if (newAction == ACTION_PUNCH) {
      var spriteState = (this.facing_right) ? 'punch_l' : 'punch_r';
    } else if (newAction == ACTION_BLOCK) {
      var spriteState = 'block';
    } else {
      var spriteState = 'idle';
    }
    this.sprite.setState(spriteState);
  }

  this.punch = function() {
    if (this.action != ACTION_IDLE) {
      return;
    }
    this.setAction(ACTION_PUNCH);
    this.action_timer = this.PUNCH_TIME;

    if (this.distanceTo(this.other_player) < this.PUNCH_RANGE) {
      this.other_player.hit(this.PUNCH_DAMAGE);
    }
  }

  this.jump = function(){
      // Do not allow a new jump if one is already in progress.
      if (this.jumped) {
        return;
      }
      this.dy = 0.4;  // set some initial upwards velocity
      this.jumped = true;
      console.log('this is dy', this.dy);
      console.log('this is y cor', this.y);
  }

  this.hit = function(damage) {
    if (this.isBlocking) {
      this.setAction(ACTION_BLOCK);
      this.action_timer = this.BLOCK_TIME;
    } else {
      this.health -= damage;
      if (this.facing_right) {
        this.x -= this.HIT_MOVE_DISTANCE;
      } else {
        this.x += this.HIT_MOVE_DISTANCE;
      }
    }
  }

  this.distanceTo = function(other) {
    return Math.abs(this.x - other.x);
  }

  this.update = function() {
    var dt = 30;
    var newY = this.y + this.dy * dt;
    this.dy -= 0.03;
    if(newY < 0){
      newY = 0;
      this.jumped = false;
      this.dy = 0;
    }
    this.y = newY;
    //console.log(newY,dt,this.dy)

    if (this.action_timer > 0) {
      this.action_timer -= dt;
      if (this.action_timer < 0) {
        this.action_timer = 0;
        this.setAction(ACTION_IDLE);
      }
    }
  }

  this.isAlive = function() {
    return this.health >= 0;
  }

  this.block = function(should_block) {
    this.isBlocking = should_block;
  }

  this.action_timer = 0;
  this.setAction(ACTION_IDLE);
}

function handleInput() {
  if (keys.readKey(KEY_R)) {
    player1.punch();
  }
  if (keys.readKey(KEY_A)) {
    player1.moveLeft();
    player1.block(true);
  } else {
    player1.block(false);
  }
  if (keys.readKey(KEY_D)) {
    player1.moveRight();
  }
  if (keys.readKey(KEY_W)) {
    player1.jump();
  }

  if (keys.readKey(KEY_COMMA)) {
    player2.punch();
  }
  if (keys.readKey(KEY_LEFT)) {
    player2.moveLeft();
  }
  if (keys.readKey(KEY_RIGHT)) {
    player2.moveRight();
    player2.block(true);
  } else {
    player2.block(false);
  }
  if (keys.readKey(KEY_UP)) {
    player2.jump();
  }

}

function update() {
  handleInput();
  player1.update();
  player2.update();

  if (!player1.isAlive() || !player2.isAlive()) {
    //alert("Game Over. Reset...");
    resetGameState();
  }

  draw();
}

function KeyWatcher() {
  this.keys = {}

  this.down = function(key) {
    this.keys[key] = true;
  }

  this.up = function(key) {
    this.keys[key] = false;
  }

  this.readKey = function(key) {
    return this.keys[key];
  }

  this.reset = function() {
    for (var k in this.keys) {
      if (this.keys[k] == true) {
        this.keys[k] = false;
      }
    }
  }
}

$(document).ready(function() {
  $('#canvas').attr('width', WIDTH);
  $('#canvas').attr('height', HEIGHT);
  context = getContext();

  // Flip y-axis, move camera down so (0, 0) isn't touching bottom of window
  context.transform(1, 0, 0, -1, SCALE, SCALE);
  context.translate(0, -HEIGHT + ORIGIN_VERTICAL_OFFSET);

  resetGameState();

  $(document).keydown(function(event) {
    keys.down(event.which);
    if (event.which == KEY_P) {
      DEBUG=!DEBUG;
      $('#debug').text('');
    }
    if (DEBUG) {
      $('#debug').html('Debug:<br>Key: ' + event.which);
    }
  });

  $(document).keyup(function(event) {
    keys.up(event.which);
  });

  interval = setInterval(update, 30);
});
