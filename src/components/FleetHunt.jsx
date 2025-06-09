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
  const [attackQueue, setAttackQueue] = useState([]);
  const [direction, setDirection] = useState(null);
  const [hits, setHits] = useState([]);
  const [forbiddenCells, setForbiddenCells] = useState([]);
  // Статистика
  const [playerHits, setPlayerHits] = useState(0);
  const [playerMisses, setPlayerMisses] = useState(0);
  const [enemyHits, setEnemyHits] = useState(0);
  const [enemyMisses, setEnemyMisses] = useState(0);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Звуки
  const hitSound = new Audio('/sounds/hit.mp3');
  const missSound = new Audio('/sounds/miss.mp3');

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
          console.warn(`Failed to place ship of size ${ship.size}`);
        }
      }
    }
    return newBoard;
  };

  // Проверка победителя
  const checkWinner = () => {
    if (playerHits >= 20) {
      setWinner('player');
    } else if (enemyHits >= 20) {
      setWinner('enemy');
    }
  };

  // Умный ИИ
  const enemyAttack = () => {
    let x, y;
    let target = null;

    if (attackQueue.length > 0) {
      const validQueue = attackQueue.filter(
        cell =>
          !forbiddenCells.some(fc => fc.x === cell.x && fc.y === cell.y) &&
          playerBoard[cell.x][cell.y] !== 'hit' &&
          playerBoard[cell.x][cell.y] !== 'miss'
      );
      setAttackQueue(validQueue);
      if (validQueue.length > 0) {
        target = validQueue[0];
        x = target.x;
        y = target.y;
      }
    }

    if (!target) {
      let attempts = 0;
      const maxAttempts = 100;
      do {
        x = Math.floor(Math.random() * 10);
        y = Math.floor(Math.random() * 10);
        attempts++;
      } while (
        (playerBoard[x][y] === 'hit' ||
         playerBoard[x][y] === 'miss' ||
         forbiddenCells.some(fc => fc.x === x && fc.y === y)) &&
        attempts < maxAttempts
      );

      if (attempts >= maxAttempts) {
        console.warn('AI could not find a valid cell to attack');
        setTurn('player');
        return;
      }
    }

    if (playerBoard[x][y] === 'hit' || playerBoard[x][y] === 'miss') {
      console.warn(`AI tried to attack already hit/miss cell: ${letters[x]}${numbers[y]}`);
      setAttackQueue(attackQueue.slice(1));
      setTurn('player');
      return;
    }

    const newPlayerBoard = [...playerBoard];
    const isHit = newPlayerBoard[x][y] === 'ship';
    newPlayerBoard[x][y] = isHit ? 'hit' : 'miss';
    const updatedHits = isHit ? [...hits, { x, y }] : hits;
    setHits(updatedHits);
    setEnemyHits(enemyHits + (isHit ? 1 : 0));
    setEnemyMisses(enemyMisses + (isHit ? 0 : 1));
    if (isHit) hitSound.play(); else missSound.play();
    console.log(`AI attacked ${letters[x]}${numbers[y]}: ${isHit ? 'hit' : 'miss'}`);

    if (isHit) {
      let neighbors = [];
      let newQueue = attackQueue.slice(1);

      if (updatedHits.length >= 2 && !direction) {
        const isHorizontal = updatedHits[0].x === updatedHits[1].x;
        setDirection(isHorizontal ? 'horizontal' : 'vertical');
        newQueue = [];
        neighbors = isHorizontal
          ? [
              { x: updatedHits[0].x, y: Math.min(...updatedHits.map(h => h.y)) - 1 },
              { x: updatedHits[0].x, y: Math.max(...updatedHits.map(h => h.y)) + 1 },
            ]
          : [
              { x: Math.min(...updatedHits.map(h => h.x)) - 1, y: updatedHits[0].y },
              { x: Math.max(...updatedHits.map(h => h.x)) + 1, y: updatedHits[0].y },
            ];
      } else if (direction === 'horizontal') {
        neighbors = [
          { x: updatedHits[0].x, y: Math.min(...updatedHits.map(h => h.y)) - 1 },
          { x: updatedHits[0].x, y: Math.max(...updatedHits.map(h => h.y)) + 1 },
        ];
      } else if (direction === 'vertical') {
        neighbors = [
          { x: Math.min(...updatedHits.map(h => h.x)) - 1, y: updatedHits[0].y },
          { x: Math.max(...updatedHits.map(h => h.x)) + 1, y: updatedHits[0].y },
        ];
      } else {
        neighbors = [
          { x: x - 1, y },
          { x: x + 1, y },
          { x, y: y - 1 },
          { x, y: y + 1 },
        ];
      }

      neighbors = neighbors.filter(
        cell =>
          cell.x >= 0 &&
          cell.x < 10 &&
          cell.y >= 0 &&
          cell.y < 10 &&
          newPlayerBoard[cell.x][cell.y] !== 'hit' &&
          newPlayerBoard[cell.x][cell.y] !== 'miss' &&
          !forbiddenCells.some(fc => fc.x === cell.x && fc.y === cell.y) &&
          !newQueue.some(q => q.x === cell.x && q.y === cell.y)
      );

      setAttackQueue([...newQueue, ...neighbors]);
      console.log(`Queue updated: ${[...newQueue, ...neighbors].map(c => `${letters[c.x]}${numbers[c.y]}`)}`);
    } else {
      let isSunk = false;
      let forbidden = [];

      if (direction === 'horizontal' && updatedHits.length > 0) {
        const minY = Math.min(...updatedHits.map(h => h.y));
        const maxY = Math.max(...updatedHits.map(h => h.y));
        const leftEdge = minY === 0 || newPlayerBoard[updatedHits[0].x][minY - 1] === 'miss';
        const rightEdge = maxY === 9 || newPlayerBoard[updatedHits[0].x][maxY + 1] === 'miss';
        isSunk = leftEdge && rightEdge;

        if (isSunk) {
          for (let y = minY - 1; y <= maxY + 1; y++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = updatedHits[0].x + dx;
              if (
                nx >= 0 &&
                nx < 10 &&
                y >= 0 &&
                y < 10 &&
                newPlayerBoard[nx][y] !== 'hit'
              ) {
                forbidden.push({ x: nx, y });
              }
            }
          }
        }
      } else if (direction === 'vertical' && updatedHits.length > 0) {
        const minX = Math.min(...updatedHits.map(h => h.x));
        const maxX = Math.max(...updatedHits.map(h => h.x));
        const topEdge = minX === 0 || newPlayerBoard[minX - 1][updatedHits[0].y] === 'miss';
        const bottomEdge = maxX === 9 || newPlayerBoard[maxX + 1][updatedHits[0].y] === 'miss';
        isSunk = topEdge && bottomEdge;

        if (isSunk) {
          for (let x = minX - 1; x <= maxX + 1; x++) {
            for (let dy = -1; dy <= 1; dy++) {
              const ny = updatedHits[0].y + dy;
              if (
                x >= 0 &&
                x < 10 &&
                ny >= 0 &&
                ny < 10 &&
                newPlayerBoard[x][ny] !== 'hit'
              ) {
                forbidden.push({ x, y: ny });
              }
            }
          }
        }
      } else if (updatedHits.length === 1) {
        const neighbors = [
          { x: updatedHits[0].x - 1, y: updatedHits[0].y },
          { x: updatedHits[0].x + 1, y: updatedHits[0].y },
          { x: updatedHits[0].x, y: updatedHits[0].y - 1 },
          { x: updatedHits[0].x, y: updatedHits[0].y + 1 },
        ].filter(
          cell => cell.x >= 0 && cell.x < 10 && cell.y >= 0 && cell.y < 10
        );
        isSunk = neighbors.every(
          cell =>
            newPlayerBoard[cell.x][cell.y] === 'miss' ||
            newPlayerBoard[cell.x][cell.y] === 'empty'
        );

        if (isSunk) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const nx = updatedHits[0].x + dx;
              const ny = updatedHits[0].y + dy;
              if (
                nx >= 0 &&
                nx < 10 &&
                ny >= 0 &&
                ny < 10 &&
                newPlayerBoard[nx][ny] !== 'hit'
              ) {
                forbidden.push({ x: nx, y: ny });
              }
            }
          }
        }
      }

      if (isSunk) {
        setAttackQueue([]);
        setDirection(null);
        setHits([]);
        setForbiddenCells([...forbiddenCells, ...forbidden]);
        console.log(`Ship sunk! Forbidden cells: ${forbidden.map(c => `${letters[c.x]}${numbers[c.y]}`)}`);
      } else {
        setAttackQueue(attackQueue.slice(1));
      }
    }

    setPlayerBoard(newPlayerBoard);
    setTurn('player');
    checkWinner();
  };

  // Атака игрока
  const handleAttack = (x, y) => {
    if (turn !== 'player' || !gameStarted || winner) return;
    const newEnemyBoard = [...enemyBoard];
    if (enemyBoard[x][y] === 'hit' || enemyBoard[x][y] === 'miss') return;
    const isHit = newEnemyBoard[x][y] === 'ship';
    newEnemyBoard[x][y] = isHit ? 'hit' : 'miss';
    setEnemyBoard(newEnemyBoard);
    setPlayerHits(playerHits + (isHit ? 1 : 0));
    setPlayerMisses(playerMisses + (isHit ? 0 : 1));
    if (isHit) hitSound.play(); else missSound.play();
    setTurn('enemy');
    checkWinner();
  };

  // Ход ИИ с задержкой
  useEffect(() => {
    if (turn === 'enemy' && gameStarted && !winner) {
      const timer = setTimeout(enemyAttack, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, enemyBoard, gameStarted, winner]);

  // Старт игры
  const startGame = () => {
    const newPlayerBoard = placeShipsAutomatically(playerBoard);
    const newEnemyBoard = placeShipsAutomatically(enemyBoard);
    setPlayerBoard(newPlayerBoard);
    setEnemyBoard(newEnemyBoard);
    setGameStarted(true);
    setWinner(null);
    setAttackQueue([]);
    setDirection(null);
    setHits([]);
    setForbiddenCells([]);
    setPlayerHits(0);
    setPlayerMisses(0);
    setEnemyHits(0);
    setEnemyMisses(0);
  };

  // Перезапуск игры
  const restartGame = () => {
    setPlayerBoard(Array(10).fill().map(() => Array(10).fill('empty')));
    setEnemyBoard(Array(10).fill().map(() => Array(10).fill('empty')));
    setGameStarted(false);
    setWinner(null);
    setTurn('player');
    setAttackQueue([]);
    setDirection(null);
    setHits([]);
    setForbiddenCells([]);
    setPlayerHits(0);
    setPlayerMisses(0);
    setEnemyHits(0);
    setEnemyMisses(0);
  };

  return (
    <div className="container">
      <h1>Fleet Hunt</h1>
      {!gameStarted ? (
        <button className="start-button" onClick={startGame}>
          Start
        </button>
      ) : (
        <>
          <div className="game">
            <div className="board">
              <h2>Your Board</h2>
              <div className="grid">
                <div className="grid-labels">
                  <div className="cell"></div>
                  {letters.map(letter => (
                    <div key={letter} className="cell label">
                      {letter}
                    </div>
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
              <h2>Enemy Board</h2>
              <div className="grid">
                <div className="grid-labels">
                  <div className="cell"></div>
                  {letters.map(letter => (
                    <div key={letter} className="cell label">
                      {letter}
                    </div>
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
                <span>{winner === 'player' ? 'You Win!' : 'You Lose!'}</span>
                <button className="restart-button" onClick={restartGame}>
                  Play Again
                </button>
              </>
            ) : (
              <>
                <span>Turn: {turn === 'player' ? 'You' : 'AI'}</span>
                <span>
                  Your Hits: {playerHits}, Misses: {playerMisses} | AI Hits: {enemyHits}, Misses: {enemyMisses}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FleetHunt;