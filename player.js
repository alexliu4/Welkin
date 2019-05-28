var canvas;
var p1;
var p2;
var go = false;

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

AnimatingSprite.prototype.drawAt = function(dest_context, x, y, flip_x, player) {
  dest_context.save();
  coords = this.getFrameSpriteCoords_();
  var flip_factor = (flip_x) ? -1 : 1;

  dest_context.translate(x - (flip_factor*48), y + 96);
  dest_context.scale(flip_factor, -1);
  dest_context.drawImage(this.image_,
                         coords.x, coords.y, 96, 96,
                         0, 0, 96, 96);
  dest_context.font = "30px Times";
  if (player == 1)
    dest_context.fillText("I", 35, 5);
  else
    dest_context.fillText("II", 35, 5);

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

function resetGameState(p1,p2) {
  player1 = new Player(350, p1+ '.png', true);
  player2 = new Player(WIDTH - 350 * SCALE, p2+'.png', false);
  player1.other_player = player2;
  player2.other_player = player1;
  keys = new KeyWatcher();
}

function getContext() {
  return $('#canvas').get(0).getContext('2d');
}

// helper function to draw player
function drawPlayer(player,which) {
  player.sprite.drawAt(context, player.x, player.y, !player.facing_right,which);

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
  drawPlayer(player1,1);
  drawPlayer(player2,2);

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
    // alert("Game Over. Reset...");
    console.log("game over");
    var game = new Image();
    game.src = 'game_over.png';
    var ctx = $('#canvas').get(0).getContext('2d');
    console.log(ctx);
    game.onload = function(){
      ctx.drawImage(game, 350, 350);
    }
    // resetGameState();
    timedRefresh(3000); // waits 6 seconds on game over page
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
  // console.log(context);
  home_screen(context);
  var canvas = document.getElementById('canvas');
  var clicked = {1:false,2:false}
  // console.log(canvas);

  //report the mouse position on click to choosen character
  canvas.addEventListener("click", function (evt) {
      var mousePos = getMousePos(canvas, evt);
      if (mousePos.x < 600 && check(mousePos.x, mousePos.y) ){
        p1 = check(mousePos.x,mousePos.y);
        if (clicked[1]){
          alert("Character already chosen")
        }
        else{
          p1 = check(mousePos.x,mousePos.y);
          hover(p1, 1, context);
          clicked[1] = true;
        }

      } else if ( check(mousePos.x, mousePos.y) ){
        if (clicked[2]){
          alert("Character already chosen")
        }
        else{
          p2 = check(mousePos.x,mousePos.y);
          hover(p2, 2, context);
          clicked[2] = true;
        }

      }
      // alert(mousePos.x + ',' + mousePos.y);
      // console.log(mousePos.x, mousePos.y);

      // context.clearRect(0, 0, WIDTH, HEIGHT)
      // Flip y-axis, move camera down so (0, 0) isn't touching bottom of window
      if (go){
        evt.preventDefault();
        context.transform(1, 0, 0, -1, SCALE, SCALE);
        context.translate(0, -HEIGHT + ORIGIN_VERTICAL_OFFSET);

        resetGameState(p1,p2);

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

      }
    },false)
  });




function home_screen(ctx) {
  // creates the menu screen
  context.fillStyle = '#001a00';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  var welkin = new Image();
  welkin.src = 'welkin.png';
  var one = new Image();
  one.src = 'one.png';
  var two = new Image();
  two.src = 'two.png';
  var fight = new Image();
  fight.src = 'fight.png';
  var title = new Image();
  title.src = 'title.png';
  title.onload = function (e)
  {
      ctx.drawImage(welkin, 330, 15);
      ctx.drawImage(title, 300, 65);
      ctx.drawImage(one, 175, 110);
      ctx.drawImage(two, 775, 110);
      ctx.drawImage(fight, 521, 350);
    }
  // ctx.fillText("CHOOSE YOUR FIGHTER", WIDTH/3, 100);
  // creates borders for each player's choice (canvas= height:1200 width:600)
  ctx.rect(50, 170, 500, 410); // (xcor, ycor, width, height)
  ctx.rect(650, 170, 500, 410);
  ctx.strokeStyle = "gray";
  ctx.stroke();
  // fight button
  ctx.fillStyle = 'gray';
  // ctx.fillRect(550, 350, 100, 50);
  ctx.fillRect(500, 325, 200, 80);
  ctx.fillStyle = '#001a00'
  // puts the images of the characters for the users to choose
  var img = new Image();
  img.src = 'baebio.png';
  var img2 = new Image();
  img2.src = 'astaphium.png';
  var img3 = new Image();
  img3.src = 'hokkaido.png';
  var img4 = new Image();
  img4.src = 'nordsman.png';

  /*
  ctx.drawImage(img, 0, 0, 96, 96, 120, 120, 96, 96);
  draws the png image the number values ->(first four are bounds of the original image,
  next two is location on canvas, next two is width and height)
  */
  img4.onload = function (e)
  {
      // player one
      ctx.drawImage(img, 0, 0, 96, 96,
      150, 220, 96, 96);
      ctx.drawImage(img2, 0, 0, 96, 96,
      350, 220, 96, 96);
      ctx.drawImage(img3, 0, 0, 96, 96,
      150, 400, 96, 96);
      ctx.drawImage(img4, 0, 0, 96, 96,
      350, 400, 96, 96);
      // player two
      ctx.drawImage(img, 0, 0, 96, 96,
      750, 220, 96, 96);
      ctx.drawImage(img2, 0, 0, 96, 96,
      950, 220, 96, 96);
      ctx.drawImage(img3, 0, 0, 96, 96,
      750, 400, 96, 96);
      ctx.drawImage(img4, 0, 0, 96, 96,
      950, 400, 96, 96);
    }
}

//Get Mouse Position
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// check <- helper function for character selection
function check(xcor, ycor){
  var x = xcor; var y = ycor;
  // for the start fight button
  if (xcor >= 500 && xcor <= 700 && ycor >= 325 && ycor <= 405 ){
    if (p1 && p2 ){
      alert("fight shall begin");
      go = true;
    } else {
      alert("Cannot begin fight without choosing fighters!!");
    }
  }

  // for the character
  if (xcor > 600){
    x -= 600; //overlaps player 2
  }
  x -= 150;
  y -= 220; // makes it start from origin
  if (ycor < 400){
    if (x <= 96 && y <= 96 && x >= 0 && y >= 0){ // within char 1
      return "baebio";
    }
    else if (x-200 <= 96 && y <= 96 && x-200 >= 0 && y >= 0) { // within char 2
      return "astaphium";
    }
  } else {
    y -= 180;
    if (x <= 96 && y <= 96 && x >= 0 && y >= 0){ // within char 3
      return "hokkaido";
    }
    else if (x-200 <= 96 && y <= 96 && x-200 >= 0 && y >= 0) { // within char 4
      return "nordsman";
    }
  }
}

var size = 96;
var movement = 3;
var boundary = 156;

function hover(char, user, ctx){
  var i = 0;
  if (user == 2){
    i = 600;
  }
  clear(char, user, ctx);
  switch (char){
    case "baebio":
      var img = new Image();
      img.src = 'baebio.png';
      img.onload = function(){
      ctx.drawImage(img, 0, 0, 96, 96,
          130 + i, 190, 150, 150);
      }
      break;
    case "astaphium":
      var img2 = new Image();
      img2.src = 'astaphium.png';
      img2.onload = function(){
      ctx.drawImage(img2, 0, 0, 96, 96,
          330 + i, 190, 150, 150);
      }
      break;
    case "hokkaido":
      var img3 = new Image();
      img3.src = 'hokkaido.png';
      img3.onload = function(){
      ctx.drawImage(img3, 0, 0, 96, 96,
          130 + i, 370, 150, 150);
      }
      break;
    case "nordsman":
      var img4 = new Image();
      img4.src = 'nordsman.png';
      img4.onload = function(){
      ctx.drawImage(img4, 0, 0, 96, 96,
          330 + i, 370, 150, 150);
      }
      break;
  }
}

function clear(char, user, ctx){
    console.log(ctx);
    var i = 0;
    if (user == 2){
      i = 600;
    }
    console.log(i)
    ctx.fillStyle = '001a00';
    //ctx.fillStyle = 'black';
    switch (char){
      case "baebio":
        ctx.fillRect(140 + i, 210, 100 , 160 );
        break;
      case "astaphium":
        ctx.fillRect(340 + i, 210, 120,160);
        break;
      case "hokkaido":
        ctx.fillRect(140 + i, 390, 100, 160);
        break;
      case "nordsman":
        ctx.fillRect(330 + i, 360, 150, 200);
        break;
    }
    ctx.stroke();
}

// helper function to refresh page when game is over
function timedRefresh(timeoutPeriod) {
   setTimeout("location.reload(true);",timeoutPeriod);
}
