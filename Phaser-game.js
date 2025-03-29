class PoolGame {
    constructor(options) {
        // Game configuration
        this.config = {
            canvasId: options.canvasId || 'pool-table',
            width: options.width || 800,
            height: options.height || 400
        };
        
        // Game Constants
        this.BALL_RADIUS = 15;
        this.POCKET_RADIUS = 20;
        this.FRICTION = 0.985;
        this.RESTITUTION = 0.85;
        this.MIN_VELOCITY = 0.05;
        this.MAX_SHOT_POWER = 25;
        this.CUE_LENGTH = 150;
        
        // Game State
        this.balls = [];
        this.pockets = [];
        this.currentPlayer = 'player1';
        this.gameActive = true;
        this.aiming = false;
        this.shotPower = 0;
        this.shotAngle = 0;
        this.cueBallStartPos = { x: 0, y: 0 };
        this.lastTime = 0;
        this.animationId = null;
        this.player1Type = 'solid';
        this.player2Type = 'striped';
        this.player1Score = 0;
        this.player2Score = 0;
        
        // DOM Elements
        this.canvas = document.getElementById(this.config.canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cueStick = document.getElementById('cue-stick');
        this.powerLevel = document.getElementById('power-level');
        this.powerValue = document.getElementById('power-value');
        this.newGameBtn = document.getElementById('new-game');
        this.shootBtn = document.getElementById('shoot-btn');
        this.player1Indicator = document.getElementById('player1-indicator');
        this.player2Indicator = document.getElementById('player2-indicator');
        this.messageEl = document.getElementById('message');
    }

    init() {
        // Set canvas size
        this.resizeCanvas(this.config.width, this.config.height);
        
        this.createPockets();
        this.createBalls();
        this.setupEventListeners();
        this.gameLoop();
        this.updateUI();
    }
    
    resizeCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.config.width = width;
        this.config.height = height;
        
        // Reposition balls if game is active
        if (this.gameActive) {
            this.repositionBalls();
        }
    }
    
    repositionBalls() {
        const widthRatio = this.canvas.width / 800;
        const heightRatio = this.canvas.height / 400;
        
        this.balls.forEach(ball => {
            ball.x *= widthRatio;
            ball.y *= heightRatio;
            ball.radius = this.BALL_RADIUS * Math.min(widthRatio, heightRatio);
        });
        
        this.createPockets();
    }

    createPockets() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.pockets = [
            { x: 0, y: 0 },
            { x: width / 2, y: 0 },
            { x: width, y: 0 },
            { x: 0, y: height },
            { x: width / 2, y: height },
            { x: width, y: height }
        ];
    }

    createBalls() {
        this.balls = [];
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Cue ball (white)
        this.balls.push({
            x: width / 4,
            y: height / 2,
            vx: 0,
            vy: 0,
            radius: this.BALL_RADIUS,
            color: 'white',
            number: 0,
            type: 'cue',
            visible: true
        });
        
        // Ball colors and numbers (standard pool)
        const ballColors = [
            { color: 'yellow', number: 1, type: 'solid' },
            { color: 'blue', number: 2, type: 'solid' },
            { color: 'red', number: 3, type: 'solid' },
            { color: 'purple', number: 4, type: 'solid' },
            { color: 'orange', number: 5, type: 'solid' },
            { color: 'green', number: 6, type: 'solid' },
            { color: 'maroon', number: 7, type: 'solid' },
            { color: 'black', number: 8, type: 'eight' },
            { color: 'yellow', number: 9, type: 'striped', stripe: true },
            { color: 'blue', number: 10, type: 'striped', stripe: true },
            { color: 'red', number: 11, type: 'striped', stripe: true },
            { color: 'purple', number: 12, type: 'striped', stripe: true },
            { color: 'orange', number: 13, type: 'striped', stripe: true },
            { color: 'green', number: 14, type: 'striped', stripe: true },
            { color: 'maroon', number: 15, type: 'striped', stripe: true }
        ];
        
        // Arrange balls in triangle formation
        const startX = width * 3/4;
        const startY = height / 2;
        let ballIndex = 0;
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col <= row; col++) {
                if (ballIndex >= ballColors.length) break;
                
                const x = startX + (col - row/2) * (this.BALL_RADIUS * 2.1);
                const y = startY - row * (this.BALL_RADIUS * 1.8) + this.BALL_RADIUS;
                
                this.balls.push({
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    radius: this.BALL_RADIUS,
                    color: ballColors[ballIndex].color,
                    number: ballColors[ballIndex].number,
                    type: ballColors[ballIndex].type,
                    stripe: ballColors[ballIndex].stripe || false,
                    visible: true
                });
                
                ballIndex++;
            }
        }
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        this.updatePhysics(deltaTime);
        this.render();
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    updatePhysics(deltaTime) {
        if (!this.gameActive) return;
        
        // Update ball positions
        this.balls.forEach(ball => {
            if (!ball.visible) return;
            
            ball.x += ball.vx * deltaTime * 60;
            ball.y += ball.vy * deltaTime * 60;
            
            // Apply friction
            ball.vx *= this.FRICTION;
            ball.vy *= this.FRICTION;
            
            // Stop very slow balls
            if (Math.abs(ball.vx) < this.MIN_VELOCITY) ball.vx = 0;
            if (Math.abs(ball.vy) < this.MIN_VELOCITY) ball.vy = 0;
            
            // Boundary collision with cushions
            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius;
                ball.vx *= -this.RESTITUTION;
            }
            if (ball.x + ball.radius > this.canvas.width) {
                ball.x = this.canvas.width - ball.radius;
                ball.vx *= -this.RESTITUTION;
            }
            if (ball.y - ball.radius < 0) {
                ball.y = ball.radius;
                ball.vy *= -this.RESTITUTION;
            }
            if (ball.y + ball.radius > this.canvas.height) {
                ball.y = this.canvas.height - ball.radius;
                ball.vy *= -this.RESTITUTION;
            }
        });
        
        // Ball-to-ball collisions
        for (let i = 0; i < this.balls.length; i++) {
            if (!this.balls[i].visible) continue;
            
            for (let j = i + 1; j < this.balls.length; j++) {
                if (!this.balls[j].visible) continue;
                
                const dx = this.balls[j].x - this.balls[i].x;
                const dy = this.balls[j].y - this.balls[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.balls[i].radius + this.balls[j].radius) {
                    // Collision detected
                    const angle = Math.atan2(dy, dx);
                    const speed1 = Math.sqrt(this.balls[i].vx * this.balls[i].vx + this.balls[i].vy * this.balls[i].vy);
                    const speed2 = Math.sqrt(this.balls[j].vx * this.balls[j].vx + this.balls[j].vy * this.balls[j].vy);
                    
                    const direction1 = Math.atan2(this.balls[i].vy, this.balls[i].vx);
                    const direction2 = Math.atan2(this.balls[j].vy, this.balls[j].vx);
                    
                    const velocityX1 = speed1 * Math.cos(direction1 - angle);
                    const velocityY1 = speed1 * Math.sin(direction1 - angle);
                    const velocityX2 = speed2 * Math.cos(direction2 - angle);
                    const velocityY2 = speed2 * Math.sin(direction2 - angle);
                    
                    // Final velocities after collision
                    const finalVelocityX1 = velocityX2;
                    const finalVelocityX2 = velocityX1;
                    
                    // Update velocities
                    this.balls[i].vx = Math.cos(angle) * finalVelocityX1 + Math.cos(angle + Math.PI/2) * velocityY1;
                    this.balls[i].vy = Math.sin(angle) * finalVelocityX1 + Math.sin(angle + Math.PI/2) * velocityY1;
                    this.balls[j].vx = Math.cos(angle) * finalVelocityX2 + Math.cos(angle + Math.PI/2) * velocityY2;
                    this.balls[j].vy = Math.sin(angle) * finalVelocityX2 + Math.sin(angle + Math.PI/2) * velocityY2;
                    
                    // Move balls apart to prevent sticking
                    const overlap = (this.balls[i].radius + this.balls[j].radius - distance) / 2;
                    this.balls[i].x -= overlap * Math.cos(angle);
                    this.balls[i].y -= overlap * Math.sin(angle);
                    this.balls[j].x += overlap * Math.cos(angle);
                    this.balls[j].y += overlap * Math.sin(angle);
                }
            }
        }
        
        // Check pocket collisions
        this.balls.forEach(ball => {
            if (!ball.visible) return;
            
            for (const pocket of this.pockets) {
                const dx = ball.x - pocket.x;
                const dy = ball.y - pocket.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.POCKET_RADIUS) {
                    // Ball is in pocket
                    ball.visible = false;
                    
                    // Handle cue ball pocketing
                    if (ball.type === 'cue') {
                        this.messageEl.textContent = "Cue ball pocketed! It will be respotted.";
                        setTimeout(() => {
                            this.respotCueBall();
                            this.endTurn(false);
                        }, 1000);
                        return;
                    }
                    
                    // Handle scoring
                    if (ball.type === 'eight') {
                        this.checkEightBallWin(ball);
                    } else {
                        this.updateScore(ball);
                    }
                }
            }
        });
        
        // Check if all balls have stopped moving
        if (this.gameActive && !this.aiming && this.allBallsStopped()) {
            this.shootBtn.disabled = false;
            this.updateUI();
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw table felt
        this.ctx.fillStyle = '#1b5e20';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw table edges
        this.ctx.strokeStyle = '#5d4037';
        this.ctx.lineWidth = 20;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pockets
        this.ctx.fillStyle = 'black';
        this.pockets.forEach(pocket => {
            this.ctx.beginPath();
            this.ctx.arc(pocket.x, pocket.y, this.POCKET_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw balls
        this.balls.forEach(ball => {
            if (!ball.visible) return;
            
            // Draw ball
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            
            if (ball.stripe) {
                // Draw striped ball
                this.ctx.fillStyle = ball.color;
                this.ctx.fill();
                
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(ball.x, ball.y, ball.radius * 0.7, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = ball.color;
                this.ctx.beginPath();
                this.ctx.arc(ball.x, ball.y, ball.radius * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Draw solid or cue ball
                this.ctx.fillStyle = ball.color;
                this.ctx.fill();
            }
            
            // Draw ball number (except cue ball)
            if (ball.number > 0) {
                this.ctx.fillStyle = ball.color === 'yellow' || ball.color === 'white' ? 'black' : 'white';
                this.ctx.font = `${ball.radius * 0.7}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(ball.number.toString(), ball.x, ball.y);
            }
        });
    }

    setupEventListeners() {
        // Mouse controls for aiming
        this.canvas.addEventListener('mousedown', (e) => this.startAiming(e));
        this.canvas.addEventListener('mousemove', (e) => this.updateAiming(e));
        this.canvas.addEventListener('mouseup', (e) => this.takeShot(e));
        this.canvas.addEventListener('mouseleave', () => this.cancelAiming());
        
        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTouchStart(e);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouchMove(e);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleTouchEnd(e);
        });
        
        // Button controls
        this.newGameBtn.addEventListener('click', () => this.resetGame());
        this.shootBtn.addEventListener('click', () => this.executeShot());
        document.getElementById('streak-trigger').addEventListener('click', () => this.triggerStreak());
    }
    
    handleTouchStart(e) {
        if (!this.gameActive || !this.allBallsStopped()) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        const cueBall = this.balls.find(b => b.type === 'cue' && b.visible);
        if (!cueBall) return;
        
        const dist = Math.sqrt(
            Math.pow(touchX - cueBall.x, 2) + 
            Math.pow(touchY - cueBall.y, 2)
        );
        
        if (dist <= cueBall.radius) {
            this.aiming = true;
            this.cueBallStartPos = { x: touchX, y: touchY };
            this.updateAimingFromPosition(touchX, touchY);
            this.shootBtn.disabled = true;
        }
    }
    
    handleTouchMove(e) {
        if (!this.aiming) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        this.updateAimingFromPosition(touchX, touchY);
    }
    
    handleTouchEnd(e) {
        if (!this.aiming) return;
        e.preventDefault();
        this.executeShot();
    }

    startAiming(e) {
        if (!this.gameActive || !this.allBallsStopped()) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const cueBall = this.balls.find(b => b.type === 'cue' && b.visible);
        if (!cueBall) return;
        
        // Check if click is on cue ball
        const dist = Math.sqrt(
            Math.pow(mouseX - cueBall.x, 2) + 
            Math.pow(mouseY - cueBall.y, 2)
        );
        
        if (dist <= cueBall.radius) {
            this.aiming = true;
            this.cueBallStartPos = { x: mouseX, y: mouseY };
            this.updateAiming(e);
            this.shootBtn.disabled = true;
        }
    }

    updateAiming(e) {
        if (!this.aiming) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.updateAimingFromPosition(mouseX, mouseY);
    }
    
    updateAimingFromPosition(x, y) {
        const cueBall = this.balls.find(b => b.type === 'cue' && b.visible);
        if (!cueBall) return;
        
        // Calculate shot angle and power
        const dx = cueBall.x - x;
        const dy = cueBall.y - y;
        this.shotAngle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.shotPower = Math.min(distance / 2, this.MAX_SHOT_POWER);
        const powerPercent = Math.round((this.shotPower / this.MAX_SHOT_POWER) * 100);
        
        // Update power meter
        this.powerLevel.style.width = `${powerPercent}%`;
        this.powerValue.textContent = `Power: ${powerPercent}%`;
        
        // Update cue stick position
        this.cueStick.style.display = 'block';
        this.cueStick.style.left = `${cueBall.x - Math.cos(this.shotAngle) * this.CUE_LENGTH}px`;
        this.cueStick.style.top = `${cueBall.y - Math.sin(this.shotAngle) * this.CUE_LENGTH}px`;
        this.cueStick.style.transform = `rotate(${this.shotAngle}rad)`;
        this.cueStick.style.width = `${this.CUE_LENGTH + distance}px`;
    }

    takeShot(e) {
        if (!this.aiming) return;
        this.executeShot();
    }

    executeShot() {
        const cueBall = this.balls.find(b => b.type === 'cue' && b.visible);
        if (!cueBall) return;
        
        // Apply force to cue ball
        cueBall.vx = Math.cos(this.shotAngle) * this.shotPower;
        cueBall.vy = Math.sin(this.shotAngle) * this.shotPower;
        
        // Reset aiming state
        this.cancelAiming();
        this.gameActive = true;
        this.shootBtn.disabled = true;
        this.messageEl.textContent = "Balls in motion...";
    }

    cancelAiming() {
        this.aiming = false;
        this.shotPower = 0;
        this.powerLevel.style.width = '0%';
        this.powerValue.textContent = 'Power: 0%';
        this.cueStick.style.display = 'none';
    }

    allBallsStopped() {
        return this.balls.every(ball => 
            !ball.visible || 
            (Math.abs(ball.vx) < this.MIN_VELOCITY && 
            Math.abs(ball.vy) < this.MIN_VELOCITY)
        );
    }

    respotCueBall() {
        const cueBall = this.balls.find(b => b.type === 'cue');
        if (cueBall) {
            cueBall.visible = true;
            cueBall.x = this.canvas.width / 4;
            cueBall.y = this.canvas.height / 2;
            cueBall.vx = 0;
            cueBall.vy = 0;
        }
    }

    updateScore(ball) {
        if (ball.type === this.player1Type) {
            this.player1Score++;
            this.messageEl.textContent = "Player 1 scored!";
        } else if (ball.type === this.player2Type) {
            this.player2Score++;
            this.messageEl.textContent = "Player 2 scored!";
        }
        
        // Check if player has won by pocketing all their balls
        const solidsLeft = this.balls.some(b => b.visible && b.type === 'solid');
        const stripesLeft = this.balls.some(b => b.visible && b.type === 'striped');
        
        if (this.currentPlayer === 'player1' && !solidsLeft) {
            this.messageEl.textContent = "Player 1 has pocketed all solids! Aim for the 8-ball!";
        } else if (this.currentPlayer === 'player2' && !stripesLeft) {
            this.messageEl.textContent = "Player 2 has pocketed all stripes! Aim for the 8-ball!";
        }
        
        // Continue current turn if player pocketed their own ball
        if ((this.currentPlayer === 'player1' && ball.type === this.player1Type) || 
            (this.currentPlayer === 'player2' && ball.type === this.player2Type)) {
            setTimeout(() => {
                if (this.allBallsStopped()) {
                    this.messageEl.textContent = `${this.currentPlayer === 'player1' ? 'Player 1' : 'Player 2'} gets another turn!`;
                    this.shootBtn.disabled = false;
                }
            }, 1000);
        } else {
            this.endTurn(true);
        }
    }

    checkEightBallWin(ball) {
        const solidsLeft = this.balls.some(b => b.visible && b.type === 'solid');
        const stripesLeft = this.balls.some(b => b.visible && b.type === 'striped');
        
        if (this.currentPlayer === 'player1' && !solidsLeft) {
            this.messageEl.textContent = "Player 1 wins by pocketing the 8-ball!";
            this.endGame();
        } else if (this.currentPlayer === 'player2' && !stripesLeft) {
            this.messageEl.textContent = "Player 2 wins by pocketing the 8-ball!";
            this.endGame();
        } else {
            this.messageEl.textContent = this.currentPlayer === 'player1' ? 
                "Player 1 loses! Pocketed the 8-ball too early!" : 
                "Player 2 loses! Pocketed the 8-ball too early!";
            this.endGame();
        }
    }

    endTurn(switchPlayer = true) {
        if (switchPlayer) {
            this.currentPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';
        }
        
        this.updateUI();
        
        if (this.allBallsStopped()) {
            this.messageEl.textContent = `${this.currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}'s turn. Click and drag from the cue ball to aim.`;
            this.shootBtn.disabled = false;
        }
    }

    endGame() {
        this.gameActive = false;
        this.shootBtn.disabled = true;
        setTimeout(() => this.resetGame(), 3000);
    }

    resetGame() {
        cancelAnimationFrame(this.animationId);
        this.balls = [];
        this.currentPlayer = 'player1';
        this.player1Score = 0;
        this.player2Score = 0;
        this.gameActive = true;
        this.createBalls();
        this.updateUI();
        this.messageEl.textContent = "New game started! Player 1's turn (Solids).";
        this.lastTime = 0;
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateUI() {
        // Update player indicators
        this.player1Indicator.classList.remove('active-player');
        this.player2Indicator.classList.remove('active-player');
        
        if (this.currentPlayer === 'player1') {
            this.player1Indicator.classList.add('active-player');
        } else {
            this.player2Indicator.classList.add('active-player');
        }
        
        // Update player info text
        this.player1Indicator.textContent = `Player 1 (Solids): ${this.player1Score}`;
        this.player2Indicator.textContent = `Player 2 (Stripes): ${this.player2Score}`;
    }

    triggerStreak() {
        const cueBall = this.balls.find(b => b.type === 'cue' && b.visible);
        if (!cueBall) return;
        
        // Apply vertical force to cue ball
        cueBall.vx = 0;
        cueBall.vy = -this.MAX_SHOT_POWER * 1.5;
        
        this.messageEl.textContent = "Streak shot activated!";
        this.shootBtn.disabled = true;
        this.gameActive = true;
    }
}