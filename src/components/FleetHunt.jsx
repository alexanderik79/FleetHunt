import { useState, useEffect } from 'react';
import './FleetHunt.css';

function FleetHunt() {
  const [playerBoard, setPlayerBoard] = useState(
    Array(10).fill().map(() => Array(10).fill('empty'))
  );
  const [enemyBoard, setEnemyBoard] = useState(
    Array(10).fill().map(() => Array(10).fill('empty'))
  );
  const [turn, setTurn] = useState('player');
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState(null);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Автоматическое размещение кораблей
  const placeShipsAutomatically = (board) => {
    const newBoard = board.map(row => [...row]);
    const ships = [
      { size: 4, count: 1 },
      { size: 3, count: 2 },
      { size: 2, count: 3 },
      { size: 1, count: 4 },
    ];

    const isValidPosition = (x, y, size, isHorizontal) => {
      if (isHorizontal && y + size > 10) return false;
      if (!isHorizontal && x + size > 10) return false;
      for (let i = 0; i < size; i++) {
        const currX = isHorizontal ? x : x + i;
        const currY = isHorizontal ? y + i : y;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = currX + dx;
            const ny = currY + dy;
            if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && newBoard[nx][ny] === 'ship') {
              return false;
            }
          }
        }
      }
      return true;
    };

    for (const ship of ships) {
      for (let i = 0; i < ship.count; i++) {
        let placed = false;
        let attempts = 0;
        const maxAttempts = 200;

        while (!placed && attempts < maxAttempts) {
          const x = Math.floor(Math.random() * 10);
          const y = Math.floor(Math.random() * 10);
          const isHorizontal = Math.random() > 0.5;

          if (isValidPosition(x, y, ship.size, isHorizontal)) {
            for (let j = 0; j < ship.size; j++) {
              const currX = isHorizontal ? x : x + j;
              const currY = isHorizontal ? y + j : y;
              newBoard[currX][currY] = 'ship';
            }
            placed = true;
          }
          attempts++;
        }
        if (!placed) {
          console.warn(`Не удалось разместить корабль размером ${ship.size}`);
        }
      }
    }
    return newBoard;
  };

  // Проверка победителя
  const checkWinner = () => {
    const playerHits = enemyBoard.flat().filter(cell => cell === 'hit').length;
    const enemyHits = playerBoard.flat().filter(cell => cell === 'hit').length;

    if (playerHits >= 20) {
      setWinner('player');
    } else if (enemyHits >= 20) {
      setWinner('enemy');
    }
  };

  // Ход ИИ
  const enemyAttack = () => {
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      x = Math.floor(Math.random() * 10);
      y = Math.floor(Math.random() * 10);
      attempts++;
    } while (
      (playerBoard[x][y] === 'hit' || playerBoard[x][y] === 'miss') &&
      attempts < maxAttempts
    );

    if (attempts >= maxAttempts) {
      console.warn('ИИ не нашел свободную клетку для атаки');
      setTurn('player');
      return;
    }

    const newPlayerBoard = [...playerBoard];
    newPlayerBoard[x][y] = newPlayerBoard[x][y] === 'ship' ? 'hit' : 'miss';
    setPlayerBoard(newPlayerBoard);
    setTurn('player');
    checkWinner();
  };

  // Атака игрока
  const handleAttack = (x, y) => {
    if (turn !== 'player' || !gameStarted || winner) return;
    const newEnemyBoard = [...enemyBoard];
    if (newEnemyBoard[x][y] === 'hit' || newEnemyBoard[x][y] === 'miss') return;
    newEnemyBoard[x][y] = newEnemyBoard[x][y] === 'ship' ? 'hit' : 'miss';
    setEnemyBoard(newEnemyBoard);
    setTurn('enemy');
    checkWinner();
  };

  // Ход ИИ с задержкой
  useEffect(() => {
    if (turn === 'enemy' && gameStarted && !winner) {
      const timer = setTimeout(enemyAttack, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, gameStarted, winner]);

  // Старт игры
  const startGame = () => {
    const newPlayerBoard = placeShipsAutomatically(playerBoard);
    const newEnemyBoard = placeShipsAutomatically(enemyBoard);
    setPlayerBoard(newPlayerBoard);
    setEnemyBoard(newEnemyBoard);
    setGameStarted(true);
    setWinner(null);
  };

  // Перезапуск игры
  const restartGame = () => {
    setPlayerBoard(Array(10).fill().map(() => Array(10).fill('empty')));
    setEnemyBoard(Array(10).fill().map(() => Array(10).fill('empty')));
    setGameStarted(false);
    setWinner(null);
    setTurn('player');
  };

  return (
    <div className="container">
      <h1>Fleet Hunt</h1>
      {!gameStarted ? (
        <button className="start-button" onClick={startGame}>Начать</button>
      ) : (
        <>
          <div className="game">
            <div className="board">
              <h2>Ваше поле</h2>
              <div className="grid">
                <div className="grid-labels">
                  <div className="cell"></div>
                  {letters.map((letter) => (
                    <div key={letter} className="cell label">{letter}</div>
                  ))}
                </div>
                {playerBoard.map((row, x) => (
                  <div key={x} className="grid-row">
                    <div className="cell label">{numbers[x]}</div>
                    {row.map((cell, y) => (
                      <div key={`${x}-${y}`} className={`cell ${cell}`}>
                        {cell === 'ship' ? '■' : cell === 'hit' ? 'X' : cell === 'miss' ? '·' : ''}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="board">
              <h2>Поле противника</h2>
              <div className="grid">
                <div className="grid-labels">
                  <div className="cell"></div>
                  {letters.map((letter) => (
                    <div key={letter} className="cell label">{letter}</div>
                  ))}
                </div>
                {enemyBoard.map((row, x) => (
                  <div key={x} className="grid-row">
                    <div className="cell label">{numbers[x]}</div>
                    {row.map((cell, y) => (
                      <div
                        key={`${x}-${y}`}
                        className={`cell ${cell === 'ship' || cell === 'empty' ? 'unknown' : cell}`}
                        onClick={() => handleAttack(x, y)}
                      >
                        {cell === 'hit' ? 'X' : cell === 'miss' ? '·' : ''}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="status">
            {winner ? (
              <>
                <span>{winner === 'player' ? 'Победа!' : 'Поражение'}</span>
                <button className="restart-button" onClick={restartGame}>Заново</button>
              </>
            ) : (
              <span>Ход: {turn === 'player' ? 'Ваш' : 'ИИ'}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FleetHunt;