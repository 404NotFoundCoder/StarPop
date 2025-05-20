document.addEventListener("DOMContentLoaded", function () {
  // 遊戲配置
  const config = {
    levels: [
      { colors: 2, size: 6 },
      { colors: 3, size: 7 },
      { colors: 4, size: 8 },
      { colors: 5, size: 9 },
      { colors: 6, size: 10 },
    ],
    colorPalette: [
      "#FF5252", // 紅色
      "#4DD0E1", // 淺藍色
      "#FFD54F", // 黃色
      "#7C4DFF", // 紫色
      "#66BB6A", // 綠色
      "#42A5F5", // 藍色
    ],
  };

  // 遊戲狀態
  let gameState = {
    board: [],
    score: 0,
    currentLevel: 0,
    colors: 0,
    size: 0,
    selectedBlocks: [],
    isAnimating: false,
  };

  // 選擇器
  const gameBoard = document.getElementById("game-board");
  const scoreElement = document.getElementById("score");
  const levelElement = document.getElementById("level");
  const levelCompleteModal = document.getElementById("level-complete");
  const levelScoreElement = document.getElementById("level-score");
  const gameOverModal = document.getElementById("game-over");
  const finalScoreElement = document.getElementById("final-score");
  const helpModal = document.getElementById("help-modal");

  // 調試信息區域
  const debugContainer = document.createElement("div");
  debugContainer.id = "debug-info";
  debugContainer.style.position = "fixed";
  debugContainer.style.bottom = "0";
  debugContainer.style.left = "0";
  debugContainer.style.backgroundColor = "rgba(0,0,0,0.7)";
  debugContainer.style.color = "white";
  debugContainer.style.padding = "10px";
  debugContainer.style.fontSize = "12px";
  debugContainer.style.maxHeight = "150px";
  debugContainer.style.overflowY = "auto";
  debugContainer.style.zIndex = "1000";
  // document.body.appendChild(debugContainer);

  // 調試日誌函數
  function logDebug(message) {
    console.log(message);
    const msgElement = document.createElement("div");
    msgElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    debugContainer.appendChild(msgElement);

    // 限制顯示的日誌數量
    if (debugContainer.children.length > 20) {
      debugContainer.removeChild(debugContainer.firstChild);
    }
    // 滾動到最新日誌
    debugContainer.scrollTop = debugContainer.scrollHeight;
  }

  // 按鈕事件監聽
  document.getElementById("restart-btn").addEventListener("click", restartGame);
  document
    .getElementById("next-level-btn")
    .addEventListener("click", nextLevel);
  document
    .getElementById("retry-btn")
    .addEventListener("click", retryCurrentLevel);
  document.getElementById("help-btn").addEventListener("click", showHelp);
  document
    .getElementById("close-help-btn")
    .addEventListener("click", closeHelp);

  // 初始化遊戲
  initGame();

  function initGame() {
    logDebug("初始化遊戲");
    gameState.currentLevel = 0;
    gameState.score = 0;
    gameState.isAnimating = false; // 確保初始狀態不在動畫中
    updateUI();
    initLevel();
  }

  // 初始化當前關卡
  function initLevel() {
    const level = config.levels[gameState.currentLevel];
    gameState.colors = level.colors;
    gameState.size = level.size;
    gameState.selectedBlocks = [];
    gameState.isAnimating = false; // 確保每次關卡初始化時重置動畫狀態

    logDebug(
      `初始化關卡 ${gameState.currentLevel + 1}, 顏色: ${
        gameState.colors
      }, 尺寸: ${gameState.size}`
    );

    // 更新遊戲面板大小
    gameBoard.style.gridTemplateColumns = `repeat(${gameState.size}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${gameState.size}, 1fr)`;

    // 生成可解的遊戲板
    generateSolvableBoard();

    // 渲染遊戲板
    renderBoard();

    // 更新UI
    updateUI();
  }

  // 生成可解的遊戲板
  function generateSolvableBoard() {
    logDebug("生成可解遊戲板");
    let attempts = 0;
    const maxAttempts = 100; // 避免無限循環

    do {
      gameState.board = [];

      // 隨機填充遊戲板
      for (let i = 0; i < gameState.size; i++) {
        gameState.board[i] = [];
        for (let j = 0; j < gameState.size; j++) {
          const colorIndex = Math.floor(Math.random() * gameState.colors);
          gameState.board[i][j] = colorIndex;
        }
      }
      attempts++;

      if (attempts >= maxAttempts) {
        logDebug("警告: 達到最大嘗試次數，強制生成遊戲板");
        break;
      }
    } while (!hasSolution());

    logDebug(`生成遊戲板完成，嘗試次數: ${attempts}`);
  }

  // 檢查是否有解
  function hasSolution() {
    for (let i = 0; i < gameState.size; i++) {
      for (let j = 0; j < gameState.size; j++) {
        if (gameState.board[i][j] !== -1) {
          // 確保不檢查空格
          const connectedBlocks = findConnectedBlocks(i, j);
          if (connectedBlocks.length >= 2) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // 渲染遊戲板
  function renderBoard() {
    logDebug("渲染遊戲板");
    gameBoard.innerHTML = "";

    for (let i = 0; i < gameState.size; i++) {
      for (let j = 0; j < gameState.size; j++) {
        const colorIndex = gameState.board[i][j];
        if (colorIndex !== -1) {
          // -1 表示空白格
          const block = document.createElement("div");
          block.className = "star-block";
          block.style.backgroundColor = config.colorPalette[colorIndex];
          block.dataset.row = i;
          block.dataset.col = j;

          // 移除星星符號，改用純色塊
          // block.dataset.color = colorIndex;

          // 使用閉包來保證正確的行列索引
          (function (row, col) {
            block.addEventListener("click", function () {
              if (gameState.isAnimating) {
                logDebug(`點擊被忽略 - 動畫中 [${row},${col}]`);
                return;
              }
              logDebug(
                `點擊方塊 [${row},${col}], 顏色: ${gameState.board[row][col]}`
              );
              handleBlockClick(row, col);
            });
          })(i, j);

          gameBoard.appendChild(block);
        } else {
          // 創建空白格
          const emptyBlock = document.createElement("div");
          emptyBlock.className = "empty-block";
          gameBoard.appendChild(emptyBlock);
        }
      }
    }

    // 更新方塊位置
    updateBlockPositions();
    // 更新剩餘方塊數
    updateBlocksLeft();
  }

  // 更新方塊位置
  function updateBlockPositions() {
    const blocks = document.querySelectorAll(".star-block");
    blocks.forEach((block) => {
      const row = parseInt(block.dataset.row);
      const col = parseInt(block.dataset.col);

      block.style.gridRow = row + 1;
      block.style.gridColumn = col + 1;
    });
  }

  // 處理方塊點擊
  function handleBlockClick(row, col) {
    // 檢查坐標是否有效
    if (row < 0 || row >= gameState.size || col < 0 || col >= gameState.size) {
      logDebug(`無效的坐標 [${row},${col}]`);
      return;
    }

    // 檢查是否為空白格
    if (gameState.board[row][col] === -1) {
      logDebug(`點擊了空白格 [${row},${col}]`);
      return;
    }

    const connectedBlocks = findConnectedBlocks(row, col);
    logDebug(`找到 ${connectedBlocks.length} 個相連方塊`);

    if (connectedBlocks.length >= 2) {
      // 高亮顯示將要消除的方塊
      highlightBlocks(connectedBlocks);

      // 延遲移除方塊，以便玩家能看到高亮效果
      setTimeout(() => {
        // 再次檢查動畫狀態，避免在高亮期間點擊其他方塊
        if (gameState.isAnimating) {
          logDebug("移除被取消 - 動畫中");
          return;
        }

        // 消除方塊
        removeBlocks(connectedBlocks);

        // 計算分數
        const points = connectedBlocks.length * (connectedBlocks.length - 1);
        gameState.score += points;
        logDebug(
          `消除 ${connectedBlocks.length} 個方塊，得分 ${points}，總分 ${gameState.score}`
        );

        // 更新UI
        updateUI();

        // 方塊掉落動畫後，檢查遊戲狀態
        setTimeout(checkGameState, 600);
      }, 200);
    } else {
      logDebug(`方塊不足以消除 (需要至少2個)`);
    }
  }

  // 高亮將要消除的方塊
  function highlightBlocks(blocks) {
    blocks.forEach((block) => {
      const selector = `.star-block[data-row="${block.row}"][data-col="${block.col}"]`;
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add("highlight");
      }
    });
  }

  // 尋找相連的相同顏色方塊
  function findConnectedBlocks(row, col) {
    const colorIndex = gameState.board[row][col];
    if (colorIndex === -1) return [];

    const visited = Array(gameState.size)
      .fill()
      .map(() => Array(gameState.size).fill(false));
    const connectedBlocks = [];

    function dfs(r, c) {
      if (
        r < 0 ||
        r >= gameState.size ||
        c < 0 ||
        c >= gameState.size ||
        visited[r][c] ||
        gameState.board[r][c] !== colorIndex
      ) {
        return;
      }

      visited[r][c] = true;
      connectedBlocks.push({ row: r, col: c });

      // 檢查上下左右
      dfs(r - 1, c);
      dfs(r + 1, c);
      dfs(r, c - 1);
      dfs(r, c + 1);
    }

    dfs(row, col);
    return connectedBlocks;
  }

  // 移除方塊
  function removeBlocks(blocks) {
    gameState.isAnimating = true;
    logDebug(`開始移除方塊動畫`);

    // 標記要移除的方塊位置為-1
    blocks.forEach((block) => {
      gameState.board[block.row][block.col] = -1;
    });

    // 執行掉落邏輯
    applyGravity();

    // 執行水平移動邏輯
    applyHorizontalShift();

    // 重新渲染遊戲板
    renderBoard();

    // 動畫結束後重置標誌
    setTimeout(() => {
      gameState.isAnimating = false;
      logDebug("動畫結束，重置動畫狀態");
    }, 600);
  }

  // 方塊掉落邏輯
  function applyGravity() {
    logDebug("執行掉落邏輯");
    // 從底部到頂部檢查每一列
    for (let col = 0; col < gameState.size; col++) {
      let emptyRow = -1;

      // 從底部開始向上尋找空白格
      for (let row = gameState.size - 1; row >= 0; row--) {
        if (gameState.board[row][col] === -1) {
          emptyRow = row;

          // 尋找上方最近的非空方塊
          for (let r = row - 1; r >= 0; r--) {
            if (gameState.board[r][col] !== -1) {
              // 移動方塊
              gameState.board[emptyRow][col] = gameState.board[r][col];
              gameState.board[r][col] = -1;
              emptyRow--;
              break;
            }
          }
        }
      }
    }
  }

  // 水平移動邏輯（當某一列完全為空時，右側的方塊向左移動）
  function applyHorizontalShift() {
    logDebug("執行水平移動邏輯");
    let colChanged = true;
    let iterations = 0;
    const maxIterations = gameState.size; // 避免無限循環

    while (colChanged && iterations < maxIterations) {
      colChanged = false;
      iterations++;

      for (let col = 0; col < gameState.size - 1; col++) {
        let isEmpty = true;

        // 檢查當前列是否為空
        for (let row = 0; row < gameState.size; row++) {
          if (gameState.board[row][col] !== -1) {
            isEmpty = false;
            break;
          }
        }

        if (isEmpty) {
          logDebug(`列 ${col} 為空，將右側方塊向左移動`);
          // 將右側方塊向左移動
          for (let c = col; c < gameState.size - 1; c++) {
            for (let row = 0; row < gameState.size; row++) {
              gameState.board[row][c] = gameState.board[row][c + 1];
              gameState.board[row][c + 1] = -1;
            }
          }

          colChanged = true;
          break; // 一次移動一列，避免邏輯混亂
        }
      }
    }

    if (iterations >= maxIterations) {
      logDebug("警告: 水平移動達到最大迭代次數");
    }
  }

  // 檢查遊戲狀態
  function checkGameState() {
    logDebug("檢查遊戲狀態");

    // 更新剩餘方塊數
    const blocksLeft = updateBlocksLeft();

    // 檢查是否過關（所有方塊都被消除）
    if (blocksLeft === 0) {
      // 過關
      logDebug("恭喜過關！");
      levelComplete();
      return;
    }

    // 檢查是否還有可消除的方塊
    const hasSol = hasSolution();
    logDebug(`檢查是否有解: ${hasSol ? "有解" : "無解"}`);

    if (!hasSol) {
      // 遊戲結束
      logDebug("遊戲結束 - 無可消除方塊");
      gameOver();
    }
  }

  // 關卡通過
  function levelComplete() {
    levelScoreElement.textContent = gameState.score;
    levelCompleteModal.style.display = "flex";

    // 檢查是否還有下一關
    if (gameState.currentLevel >= config.levels.length - 1) {
      document.getElementById("next-level-btn").textContent = "重新開始";
    }
  }

  // 遊戲結束
  function gameOver() {
    finalScoreElement.textContent = gameState.score;
    gameOverModal.style.display = "flex";
  }

  // 下一關
  function nextLevel() {
    levelCompleteModal.style.display = "none";

    // 檢查是否還有下一關
    if (gameState.currentLevel < config.levels.length - 1) {
      gameState.currentLevel++;
    } else {
      // 如果已經是最後一關，重新開始遊戲
      gameState.currentLevel = 0;
      gameState.score = 0;
    }

    initLevel();
  }

  // 重試當前關卡
  function retryCurrentLevel() {
    gameOverModal.style.display = "none";
    // 遊戲結束後，從第一關重新開始
    gameState.currentLevel = 0;
    gameState.score = 0;
    initLevel();
  }

  // 重新開始遊戲
  function restartGame() {
    gameState.currentLevel = 0;
    gameState.score = 0;
    initLevel();
  }

  // 顯示幫助
  function showHelp() {
    helpModal.style.display = "flex";
  }

  // 關閉幫助
  function closeHelp() {
    helpModal.style.display = "none";
  }

  // 更新UI
  function updateUI() {
    scoreElement.textContent = gameState.score;
    levelElement.textContent = gameState.currentLevel + 1;
  }

  // 添加計算並顯示剩餘方塊數的功能
  function updateBlocksLeft() {
    let blocksLeft = 0;
    for (let i = 0; i < gameState.size; i++) {
      for (let j = 0; j < gameState.size; j++) {
        if (gameState.board[i][j] !== -1) {
          blocksLeft++;
        }
      }
    }
    document.getElementById("blocks-left").textContent = blocksLeft;
    return blocksLeft;
  }
});
