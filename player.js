var canvas;

// loads the images
function AnimatingSprite(resource) {
  var that = this;

  // The containing Image HTMLElement
  this.image_ = new Image();
  this.loaded_ = false;
  $(this.image_).load(function() {
    that.setState('idle');
  }).attr('src', resource)
}

// sets states of sprite based on the png files
AnimatingSprite.states = {
 'idle': [0],
 'pain': [1],
 'punch_l': [2, 0],
 'punch_r': [3, 0],
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
  console.log(coords.x,coords.y);
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

var WIDTH=1200;
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
var ACTION_PAIN = 'pain';
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

// helper function to draw player
function drawPlayer(player) {
  player.sprite.drawAt(context, player.x, player.y, !player.facing_right);

  // creates box to sense hits from opponent
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

// draws the game page for fighting (players, health, and map)
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

// creating the basic character movements and reactions
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
  this.PUNCH_TIME = 200;
  this.PAIN_TIME = 200;
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
    }
    else if (newAction == ACTION_PAIN) {
     var spriteState = 'pain';
    }
    else {
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
      this.health -= damage;
      this.setAction(ACTION_PAIN);
      this.action_timer = this.PAIN_TIME;
      if (this.facing_right) {
        this.x -= this.HIT_MOVE_DISTANCE;
      } else {
        this.x += this.HIT_MOVE_DISTANCE;
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
    this.facing_right = (this.x < this.other_player.x);
  }

  this.isAlive = function() {
    return this.health >= 0;
  }

  this.action_timer = 0;
  this.setAction(ACTION_IDLE);
}

// reads the values of the key pressed
function handleInput() {
  if (keys.readKey(KEY_R)) {
    player1.punch();
  }
  if (keys.readKey(KEY_A)) {
    player1.moveLeft();
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
  }
  if (keys.readKey(KEY_UP)) {
    player2.jump();
  }

}

// update per frames
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

// watches if a key is pressed
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
  console.log(context);
  home_screen(context);

  var canvas = document.getElementById('canvas');
  console.log(canvas);

  //report the mouse position on click to choosee character
  canvas.addEventListener("click", function (evt) {
      var mousePos = getMousePos(canvas, evt);
      if (mousePos.x < 600){
        alert("Player one has chosen ______")
      } else {
        alert("Player two has chosen ______")
      }
      // alert(mousePos.x + ',' + mousePos.y);
  }, false);

  // Flip y-axis, move camera down so (0, 0) isn't touching bottom of window
//   context.transform(1, 0, 0, -1, SCALE, SCALE);
//   context.translate(0, -HEIGHT + ORIGIN_VERTICAL_OFFSET);
//
//   resetGameState();
//
  // $(document).keydown(function(event) {
  //   keys.down(event.which);
  //   if (event.which == KEY_P) {
  //     DEBUG=!DEBUG;
  //     $('#debug').text('');
  //   }
  //   if (DEBUG) {
  //     $('#debug').html('Debug:<br>Key: ' + event.which);
  //   }
  // });
//
//   $(document).keyup(function(event) {
//     keys.up(event.which);
//   });
//
//   interval = setInterval(update, 30);
});

function home_screen(ctx) {
  // creates the menu screen
  context.fillStyle = '#aaf';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle='black';
  ctx.font = "30px Times";
  ctx.fillText("WELCOME TO WELKIN", WIDTH/3 + 10, 50);
  var title = new Image();
  title.src = 'title.png';
  title.onload = function (e)
  {
      ctx.drawImage(title, 300, 65);
    }
  // ctx.fillText("CHOOSE YOUR FIGHTER", WIDTH/3, 100);
  // creates borders for each player's choice (canvas= height:1200 width:600)
  ctx.rect(50, 170, 500, 410); // (xcor, ycor, width, height)
  ctx.rect(650, 170, 500, 410);
  ctx.stroke();
  // puts the images of the characters for the users to choose
  var img = new Image();
  img.src = 'character.png';
  /*
  ctx.drawImage(img, 0, 0, 96, 96, 120, 120, 96, 96);
  draws the png image the number values ->(first four are bounds of the original image,
  next two is location on canvas, next two is width and height)
  */
  img.onload = function (e)
  {
      ctx.drawImage(img, 0, 0, 96, 96,
      150, 120, 96, 96);
    }
  var img2 = new Image();
  img2.src = 'character_2.png';
  img2.onload = function (e)
  {
      ctx.drawImage(img2, 0, 0, 96, 96,
      350, 120, 96, 96);
    }
  var img3 = new Image();
  img3.src = 'character_4.png';
  img3.onload = function (e)
  {
      ctx.drawImage(img3, 0, 0, 96, 96,
      500, 120, 96, 96);
    }
  // img.addEventListener("mouseover", hover);
  // console.log(img);
  // img2.addEventListener("mouseover", hover);
  // img3.addEventListener("mouseover", hover);

}

//Get Mouse Position
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}


var hover = function(e){
    console.log("chosen");
  //   var requestID = 0;
  //   var sprite = e.target;
  //   //console.log(e);
  //   var current = 0;
  //   var shift = function(){
	// c.removeChild(sprite);
	// prev = Number(sprite.getAttribute("y"));
	// sprite.setAttribute("y", prev-5);
	// c.appendChild(sprite);
	// //cancel before animating in case  clicked multiple times
	// window.cancelAnimationFrame(requestID)
	// requestID = window.requestAnimationFrame(shift);
	// if (prev<370){
	//     window.cancelAnimationFrame(requestID);
	// };
  //   }
  //
  //   shift();
}

// var reset_position = function(e){
//     var sprite = e.target;
//     sprite.setAttribute("y", 400);
// }
