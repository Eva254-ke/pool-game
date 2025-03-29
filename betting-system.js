function initBettingSystem(game) {
    const bettingForm = document.getElementById('betting-form');
    const timerDisplay = document.getElementById('timer-display');
    const winnerDisplay = document.getElementById('winner-display');
    const currentBetsDiv = document.getElementById('current-bets');
    
    let bets = [];
    let gameTimer;
    let secondsRemaining = 240; // 4 minutes in seconds
    let gameRound = 1;
    let bettingOpen = true;
    
    updateTimerDisplay();
    bettingForm.addEventListener('submit', placeBet);
    startGameTimer();
    
    function startGameTimer() {
        clearInterval(gameTimer);
        gameTimer = setInterval(() => {
            secondsRemaining--;
            updateTimerDisplay();
            
            if (secondsRemaining <= 0) {
                endBettingRound();
            }
        }, 1000);
    }
    
    function updateTimerDisplay() {
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        timerDisplay.textContent = `Next round in: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    function placeBet(e) {
        e.preventDefault();
        
        if (!bettingOpen) {
            alert("Betting is closed until next round starts!");
            return;
        }
        
        const playerSelect = document.getElementById('player-select');
        const betAmountInput = document.getElementById('bet-amount');
        
        const player = playerSelect.value;
        const amount = parseInt(betAmountInput.value);
        
        if (!player || !amount || amount < 1) {
            alert("Please select a player and enter a valid bet amount!");
            return;
        }
        
        const bet = {
            player,
            amount,
            timestamp: new Date().toLocaleTimeString()
        };
        
        bets.push(bet);
        updateBetsDisplay();
        bettingForm.reset();
    }
    
    function updateBetsDisplay() {
        currentBetsDiv.innerHTML = '<h3>Current Bets</h3>';
        
        if (bets.length === 0) {
            currentBetsDiv.innerHTML += '<p>No bets placed yet</p>';
            return;
        }
        
        bets.forEach(bet => {
            const betDiv = document.createElement('div');
            betDiv.className = 'bet-item';
            betDiv.innerHTML = `
                <strong>${bet.player === 'player1' ? 'Player 1' : 'Player 2'}</strong>: 
                $${bet.amount} (${bet.timestamp})
            `;
            currentBetsDiv.appendChild(betDiv);
        });
    }
    
    function endBettingRound() {
        bettingOpen = false;
        clearInterval(gameTimer);
        
        let winningPlayer;
        if (game.player1Score > game.player2Score) {
            winningPlayer = 'player1';
        } else if (game.player2Score > game.player1Score) {
            winningPlayer = 'player2';
        } else {
            winningPlayer = 'tie';
        }
        
        if (winningPlayer === 'tie') {
            winnerDisplay.textContent = "Round ended in a tie! Bets returned.";
            winnerDisplay.style.color = 'white';
        } else {
            winnerDisplay.textContent = `Round ${gameRound} Winner: ${winningPlayer === 'player1' ? 'Player 1' : 'Player 2'}!`;
            winnerDisplay.style.color = winningPlayer === 'player1' ? '#2196F3' : '#FF5722';
            
            const winningBets = bets.filter(bet => bet.player === winningPlayer);
            const totalWinnings = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
            
            if (winningBets.length > 0) {
                winnerDisplay.textContent += ` Total winnings: $${totalWinnings * 2}`;
            }
        }
        
        winnerDisplay.style.display = 'block';
        
        setTimeout(() => {
            startNewRound();
        }, 5000);
    }
    
    function startNewRound() {
        gameRound++;
        secondsRemaining = 240;
        bets = [];
        bettingOpen = true;
        winnerDisplay.style.display = 'none';
        updateBetsDisplay();
        startGameTimer();
    }
}