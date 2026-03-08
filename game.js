const RAD = Math.PI / 180;
const scrn = document.getElementById("canvas");
const sctx = scrn.getContext("2d");
scrn.tabIndex = 1;

let frames = 0;
let dx = 2;
const state = {
  curr: 0,
  getReady: 0,
  Play: 1,
  gameOver: 2,
};
const SFX = {
  start: new Audio(),
  flap: new Audio(),
  score: new Audio(),
  hit: new Audio(),
  die: new Audio(),
  played: false,
};

// Particles System
const particles = [];
class Particle {
    constructor(x, y, color, speedX, speedY, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speedX = speedX;
        this.speedY = speedY;
        this.life = life;
        this.maxLife = life;
        this.size = Math.random() * 3 + 1;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        this.size = Math.max(0, this.size - 0.1);
    }
    draw() {
        sctx.save();
        sctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        sctx.fillStyle = this.color;
        sctx.beginPath();
        sctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        sctx.fill();
        sctx.restore();
    }
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        let speedX = (Math.random() - 0.5) * 4;
        let speedY = (Math.random() - 0.5) * 4;
        let life = Math.random() * 20 + 10;
        particles.push(new Particle(x, y, color, speedX, speedY, life));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (let p of particles) {
        p.draw();
    }
}

const gnd = {
  sprite: new Image(),
  x: 0,
  y: 0,
  draw: function () {
    this.y = parseFloat(scrn.height - this.sprite.height);
    sctx.drawImage(this.sprite, this.x, this.y);
  },
  update: function () {
    if (state.curr != state.Play) return;
    this.x -= dx;
    this.x = this.x % (this.sprite.width / 2);
  },
};
const bg = {
  sprite: new Image(),
  x: 0,
  y: 0,
  draw: function () {
    let y = parseFloat(scrn.height - this.sprite.height);
    sctx.drawImage(this.sprite, this.x, y);
    sctx.drawImage(this.sprite, this.x + this.sprite.width, y);
  },
  update: function() {
    if (state.curr != state.Play) return;
    this.x -= dx * 0.5; // Parallax effect
    if (this.x <= -this.sprite.width) {
        this.x = 0;
    }
  }
};
const pipe = {
  top: { sprite: new Image() },
  bot: { sprite: new Image() },
  gap: 120, // Increased gap slightly for better playability
  moved: true,
  pipes: [],
  draw: function () {
    for (let i = 0; i < this.pipes.length; i++) {
      let p = this.pipes[i];
      sctx.drawImage(this.top.sprite, p.x, p.y);
      sctx.drawImage(
        this.bot.sprite,
        p.x,
        p.y + parseFloat(this.top.sprite.height) + this.gap
      );
    }
  },
  update: function () {
    if (state.curr != state.Play) return;
    if (frames % 100 == 0) {
      this.pipes.push({
        x: parseFloat(scrn.width),
        y: -210 * Math.min(Math.random() + 1, 1.8),
      });
    }
    this.pipes.forEach((pipe) => {
      pipe.x -= dx;
    });

    if (this.pipes.length && this.pipes[0].x < -this.top.sprite.width) {
      this.pipes.shift();
      this.moved = true;
    }
  },
};
const bird = {
  animations: [
    { sprite: new Image() },
    { sprite: new Image() },
    { sprite: new Image() },
    { sprite: new Image() },
  ],
  rotatation: 0,
  x: 50,
  y: 100,
  speed: 0,
  gravity: 0.15,
  thrust: 4.5,
  frame: 0,
  draw: function () {
    let h = this.animations[this.frame].sprite.height;
    let w = this.animations[this.frame].sprite.width;
    sctx.save();
    sctx.translate(this.x, this.y);
    sctx.rotate(this.rotatation * RAD);
    sctx.drawImage(this.animations[this.frame].sprite, -w / 2, -h / 2);
    sctx.restore();
  },
  update: function () {
    let r = parseFloat(this.animations[0].sprite.width) / 2;
    switch (state.curr) {
      case state.getReady:
        this.rotatation = 0;
        this.y += frames % 10 == 0 ? Math.sin(frames * RAD) : 0;
        this.frame += frames % 10 == 0 ? 1 : 0;
        break;
      case state.Play:
        this.frame += frames % 5 == 0 ? 1 : 0;
        this.y += this.speed;
        this.setRotation();
        this.speed += this.gravity;
        if (this.y + r >= gnd.y || this.collisioned()) {
          state.curr = state.gameOver;
          createParticles(this.x, this.y, 30, '#ffcc00'); // Explosion particles
        }
        break;
      case state.gameOver:
        this.frame = 1;
        if (this.y + r < gnd.y) {
          this.y += this.speed;
          this.setRotation();
          this.speed += this.gravity * 2;
        } else {
          this.speed = 0;
          this.y = gnd.y - r;
          this.rotatation = 90;
          if (!SFX.played) {
            SFX.die.play();
            SFX.played = true;
          }
        }
        break;
    }
    this.frame = this.frame % this.animations.length;
  },
  flap: function () {
    if (this.y > 0) {
      SFX.flap.play();
      this.speed = -this.thrust;
      createParticles(this.x, this.y + 10, 5, '#ffffff'); // Flap dust particles
    }
  },
  setRotation: function () {
    if (this.speed <= 0) {
      this.rotatation = Math.max(-25, (-25 * this.speed) / (-1 * this.thrust));
    } else if (this.speed > 0) {
      this.rotatation = Math.min(90, (90 * this.speed) / (this.thrust * 2));
    }
  },
  collisioned: function () {
    if (!pipe.pipes.length) return;
    let birdSprite = this.animations[0].sprite;
    let x = pipe.pipes[0].x;
    let y = pipe.pipes[0].y;
    let r = birdSprite.height / 4 + birdSprite.width / 4;
    let roof = y + parseFloat(pipe.top.sprite.height);
    let floor = roof + pipe.gap;
    let w = parseFloat(pipe.top.sprite.width);
    
    // Improved hitbox (slightly smaller than sprite for better feel)
    if (this.x + r - 5 >= x) {
      if (this.x - r + 5 < x + w) {
        if (this.y - r + 5 <= roof || this.y + r - 5 >= floor) {
          SFX.hit.play();
          return true;
        }
      } else if (pipe.moved) {
        UI.score.curr++;
        SFX.score.play();
        pipe.moved = false;
        
        // Add score floating text effect or particles
        createParticles(x + w, floor - pipe.gap/2, 10, '#00ff00');
      }
    }
  },
};
const UI = {
  getReady: { sprite: new Image() },
  gameOver: { sprite: new Image() },
  tap: [{ sprite: new Image() }, { sprite: new Image() }],
  score: {
    curr: 0,
    best: 0,
  },
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  frame: 0,
  draw: function () {
    switch (state.curr) {
      case state.getReady:
        this.y = parseFloat(scrn.height - this.getReady.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.getReady.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.getReady.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.getReady.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
      case state.gameOver:
        this.y = parseFloat(scrn.height - this.gameOver.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.gameOver.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.gameOver.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.gameOver.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
    }
    this.drawScore();
  },
  drawScore: function () {
    sctx.fillStyle = "#FFFFFF";
    sctx.strokeStyle = "#000000";
    switch (state.curr) {
      case state.Play:
        sctx.lineWidth = 4; // Thicker stroke
        sctx.font = "bold 45px 'Squada One', sans-serif";
        sctx.textAlign = "center";
        sctx.strokeText(this.score.curr, scrn.width / 2, 60);
        sctx.fillText(this.score.curr, scrn.width / 2, 60);
        sctx.textAlign = "start"; // reset
        break;
      case state.gameOver:
        sctx.lineWidth = 3;
        sctx.font = "bold 40px 'Squada One', sans-serif";
        let sc = `SCORE : ${this.score.curr}`;
        try {
          this.score.best = Math.max(
            this.score.curr,
            localStorage.getItem("best") || 0
          );
          localStorage.setItem("best", this.score.best);
          let bs = `BEST  : ${this.score.best}`;
          sctx.strokeText(sc, scrn.width / 2 - 80, scrn.height / 2 + 10);
          sctx.fillText(sc, scrn.width / 2 - 80, scrn.height / 2 + 10);
          sctx.strokeText(bs, scrn.width / 2 - 80, scrn.height / 2 + 50);
          sctx.fillText(bs, scrn.width / 2 - 80, scrn.height / 2 + 50);
        } catch (e) {
          sctx.strokeText(sc, scrn.width / 2 - 85, scrn.height / 2 + 20);
          sctx.fillText(sc, scrn.width / 2 - 85, scrn.height / 2 + 20);
        }
        break;
    }
  },
  update: function () {
    if (state.curr == state.Play) return;
    this.frame += frames % 10 == 0 ? 1 : 0;
    this.frame = this.frame % this.tap.length;
  },
};

// Input handling
function handleInput() {
  switch (state.curr) {
    case state.getReady:
      state.curr = state.Play;
      SFX.start.play();
      break;
    case state.Play:
      bird.flap();
      break;
    case state.gameOver:
      state.curr = state.getReady;
      bird.speed = 0;
      bird.y = 100;
      pipe.pipes = [];
      UI.score.curr = 0;
      SFX.played = false;
      particles.length = 0; // Clear particles on restart
      break;
  }
}

scrn.addEventListener("click", handleInput);
scrn.addEventListener("touchstart", (e) => { e.preventDefault(); handleInput(); }, {passive: false});

scrn.onkeydown = function keyDown(e) {
  if (e.keyCode == 32 || e.keyCode == 87 || e.keyCode == 38) {
    handleInput();
  }
};

gnd.sprite.src = "assets/images/ground.png";
bg.sprite.src = "assets/images/BG.png";
pipe.top.sprite.src = "assets/images/toppipe.png";
pipe.bot.sprite.src = "assets/images/botpipe.png";
UI.gameOver.sprite.src = "assets/images/go.png";
UI.getReady.sprite.src = "assets/images/getready.png";
UI.tap[0].sprite.src = "assets/images/tap/t0.png";
UI.tap[1].sprite.src = "assets/images/tap/t1.png";
bird.animations[0].sprite.src = "assets/images/bird/b0.png";
bird.animations[1].sprite.src = "assets/images/bird/b1.png";
bird.animations[2].sprite.src = "assets/images/bird/b2.png";
bird.animations[3].sprite.src = "assets/images/bird/b0.png";
SFX.start.src = "assets/sounds/start.wav";
SFX.flap.src = "assets/sounds/flap.wav";
SFX.score.src = "assets/sounds/score.wav";
SFX.hit.src = "assets/sounds/hit.wav";
SFX.die.src = "assets/sounds/die.wav";

// Check if user wants to use a single sprite sheet
const newSpriteSheetImg = new Image();
newSpriteSheetImg.src = "assets/images/new-spritesheet.png";
let useNewSpriteSheet = false;

newSpriteSheetImg.onload = function() {
    console.log("Loaded new sprite sheet.");
    useNewSpriteSheet = true;
};

function gameLoop() {
  update();
  draw();
  frames++;
  requestAnimationFrame(gameLoop); // Better than setInterval
}

function update() {
  bird.update();
  bg.update(); // Added parallax bg update
  gnd.update();
  pipe.update();
  UI.update();
  updateParticles();
}

function draw() {
  sctx.fillStyle = "#30c0df";
  sctx.fillRect(0, 0, scrn.width, scrn.height);
  bg.draw();
  pipe.draw();
  
  if (useNewSpriteSheet && state.curr !== state.gameOver) {
    // If the user meant the new sprite sheet to be the bird, we can draw it scaled down
    sctx.save();
    sctx.translate(bird.x, bird.y);
    sctx.rotate(bird.rotatation * RAD);
    // Draw the whole new image scaled to bird size (assuming it's a replacement bird sprite)
    let bWidth = 34; // standard bird width
    let bHeight = 24;
    sctx.drawImage(newSpriteSheetImg, -bWidth / 2, -bHeight / 2, bWidth, bHeight);
    sctx.restore();
  } else {
    bird.draw();
  }
  
  drawParticles(); // Draw particles before ground
  gnd.draw();
  UI.draw();
}

// Start game loop using requestAnimationFrame
requestAnimationFrame(gameLoop);

