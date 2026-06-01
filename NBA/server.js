import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import playersData from './playersData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3000;

// 自定义专属昵称（按连接顺序分配）
const customNames = ['大螃蟹', '鸽鸽', '铁牛格林'];

// 全局玩家列表（最多3人）
const players = []; // 存储 { socketId, playerName }

// 游戏状态
const gameState = {
  currentTurn: null,      // 当前该哪位玩家出牌（socket.id）
  lastPlayedCards: [],    // 桌面上最后打出的牌
  lastPlayer: null,       // 最后出牌的人（socket.id）
  hands: [],             // 每个玩家的手牌，players[i]的牌在hands[i]
  passedCount: 0,        // 连续不要的人数（用于判断一轮结束）
};

// ===================== 卡牌工具函数 =====================

/**
 * 获取牌的点数值（用于比较）
 */
function getCardValue(card) {
  return card.pokerValue;
}

/**
 * 按点数排序（升序）
 */
function sortByValue(cards) {
  return [...cards].sort((a, b) => a.pokerValue - b.pokerValue);
}

/**
 * 统计每种点数的数量
 * 返回 Map: value -> count
 */
function getValueCountMap(cards) {
  const map = new Map();
  for (const card of cards) {
    const v = getCardValue(card);
    map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}

/**
 * 获取所有唯一点数（升序排列）
 */
function getUniqueValues(cards) {
  const vals = [...new Set(cards.map(c => c.pokerValue))];
  vals.sort((a, b) => a - b);
  return vals;
}

// ===================== 牌型定义 =====================

const PATTERN = {
  SINGLE: 'single',         // 单张
  PAIR: 'pair',             // 对子
  TRIPLE: 'triple',         // 三条
  TRIPLE_ONE: 'triple_one', // 三带一
  TRIPLE_TWO: 'triple_two', // 三带二
  STRAIGHT: 'straight',     // 顺子（5+张）
  STRAIGHT_PAIR: 'straight_pair', // 连对（3+对）
  PLANE: 'plane',           // 飞机（2+个三条）
  PLANE_SINGLE: 'plane_single', // 飞机带单
  PLANE_PAIR: 'plane_pair', // 飞机带对
  BOMB: 'bomb',             // 炸弹（4张同点）
  ROCKET: 'rocket',         // 火箭（双王）
  FOUR_TWO: 'four_two',     // 四带二
  INVALID: 'invalid',       // 无效牌型
};

// ===================== 牌型判断逻辑 =====================

/**
 * 判断一组牌是什么牌型
 * 返回: { type, mainValue, length }
 *   - type: 牌型
 *   - mainValue: 用于比较的主值
 *   - length: 牌的张数
 */
function identifyPattern(cards) {
  if (!cards || cards.length === 0) {
    return { type: PATTERN.INVALID, mainValue: 0, length: 0 };
  }

  const n = cards.length;
  const sorted = sortByValue(cards);
  const values = sorted.map(c => c.pokerValue);
  const valueCount = getValueCountMap(sorted);
  const uniqueVals = getUniqueValues(sorted);
  const counts = [...valueCount.entries()].sort((a, b) => a[0] - b[0]);

  // ---- 火箭（双王） ----
  if (n === 2 && values.includes(16) && values.includes(17)) {
    return { type: PATTERN.ROCKET, mainValue: 17, length: 2 };
  }

  // ---- 单张 ----
  if (n === 1) {
    return { type: PATTERN.SINGLE, mainValue: values[0], length: 1 };
  }

  // ---- 对子 ----
  if (n === 2 && values[0] === values[1]) {
    return { type: PATTERN.PAIR, mainValue: values[0], length: 2 };
  }

  // ---- 三条 ----
  if (n === 3 && values[0] === values[1] && values[1] === values[2]) {
    return { type: PATTERN.TRIPLE, mainValue: values[0], length: 3 };
  }

  // ---- 炸弹（4张同点） ----
  if (n === 4 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) {
    return { type: PATTERN.BOMB, mainValue: values[0], length: 4 };
  }

  // ---- 三带一 ----
  if (n === 4) {
    // 找出出现3次的值
    const tripleVal = [...valueCount.entries()].find(([v, c]) => c === 3);
    if (tripleVal) {
      return { type: PATTERN.TRIPLE_ONE, mainValue: tripleVal[0], length: 4 };
    }
  }

  // ---- 三带二 ----
  if (n === 5) {
    const tripleVal = [...valueCount.entries()].find(([v, c]) => c === 3);
    const pairVal = [...valueCount.entries()].find(([v, c]) => c === 2);
    if (tripleVal && pairVal) {
      return { type: PATTERN.TRIPLE_TWO, mainValue: tripleVal[0], length: 5 };
    }
  }

  // ---- 四带二（4张同点 + 2张任意） ----
  if (n === 6) {
    const fourVal = [...valueCount.entries()].find(([v, c]) => c === 4);
    if (fourVal) {
      return { type: PATTERN.FOUR_TWO, mainValue: fourVal[0], length: 6 };
    }
  }

  // ---- 顺子（5+张连续单牌，3-A，不含2和王） ----
  if (n >= 5) {
    const isConsecutive = (() => {
      for (let i = 1; i < uniqueVals.length; i++) {
        if (uniqueVals[i] - uniqueVals[i - 1] !== 1) return false;
      }
      return true;
    })();
    if (isConsecutive && uniqueVals.length === n && uniqueVals.every(v => v >= 3 && v <= 14)) {
      // 所有牌都只出现一次
      if ([...valueCount.values()].every(c => c === 1)) {
        return { type: PATTERN.STRAIGHT, mainValue: uniqueVals[uniqueVals.length - 1], length: n };
      }
    }
  }

  // ---- 连对（3+对连续，3-A，不含2和王） ----
  if (n >= 6 && n % 2 === 0) {
    // 每个点数出现2次
    if ([...valueCount.values()].every(c => c === 2)) {
      const pairs = uniqueVals;
      if (pairs.length >= 3) {
        const isConsecutive = (() => {
          for (let i = 1; i < pairs.length; i++) {
            if (pairs[i] - pairs[i - 1] !== 1) return false;
          }
          return true;
        })();
        if (isConsecutive && pairs.every(v => v >= 3 && v <= 14)) {
          return { type: PATTERN.STRAIGHT_PAIR, mainValue: pairs[pairs.length - 1], length: n };
        }
      }
    }
  }

  // ---- 飞机（2+个连续三条，3-A，不含2和王） ----
  if (n >= 6) {
    const tripleVals = [...valueCount.entries()]
      .filter(([v, c]) => c >= 3)
      .map(([v]) => v)
      .sort((a, b) => a - b);

    if (tripleVals.length >= 2) {
      // 检查这些三条是否连续
      // 可能需要处理更复杂的情况，这里实现基本逻辑
      // 先尝试找最长的连续三条序列
      let bestStart = tripleVals[0];
      let bestLen = 1;
      let curStart = tripleVals[0];
      let curLen = 1;
      for (let i = 1; i < tripleVals.length; i++) {
        if (tripleVals[i] - tripleVals[i - 1] === 1) {
          curLen++;
          if (curLen > bestLen) {
            bestLen = curLen;
            bestStart = curStart;
          }
        } else {
          curStart = tripleVals[i];
          curLen = 1;
        }
      }

      if (bestLen >= 2) {
        const tripleCount = bestLen;
        const baseCardCount = tripleCount * 3; // 三条部分占的牌数

        // 取这些三条的牌（每个值取3张）
        const remainingCount = n - baseCardCount;

        // 飞机不带
        if (remainingCount === 0) {
          return {
            type: PATTERN.PLANE,
            mainValue: bestStart + bestLen - 1,
            length: n,
          };
        }

        // 飞机带单
        if (remainingCount === tripleCount) {
          return {
            type: PATTERN.PLANE_SINGLE,
            mainValue: bestStart + bestLen - 1,
            length: n,
          };
        }

        // 飞机带对
        if (remainingCount === tripleCount * 2) {
          // 检查剩余的是否都是对子
          const remainingMap = new Map(valueCount);
          for (let v = bestStart; v < bestStart + bestLen; v++) {
            const cnt = remainingMap.get(v) || 0;
            if (cnt >= 3) {
              remainingMap.set(v, cnt - 3);
            } else {
              remainingMap.delete(v);
            }
          }
          if ([...remainingMap.values()].every(c => c === 2)) {
            return {
              type: PATTERN.PLANE_PAIR,
              mainValue: bestStart + bestLen - 1,
              length: n,
            };
          }
        }
      }
    }
  }

  // ---- 无效牌型 ----
  return { type: PATTERN.INVALID, mainValue: 0, length: n };
}

// ===================== 牌型比较逻辑 =====================

/**
 * 比较两组牌
 * @param {Array} newCards - 新出的牌
 * @param {Array} lastCards - 桌面上最后的牌
 * @returns {boolean} - 新牌是否大于旧牌
 */
function canBeat(newCards, lastCards) {
  if (!lastCards || lastCards.length === 0) {
    // 如果没有上一轮牌（自由出牌），任何合法牌型都可以出
    return true;
  }

  const newPattern = identifyPattern(newCards);
  const lastPattern = identifyPattern(lastCards);

  // 如有任意一组无效，则不能出
  if (newPattern.type === PATTERN.INVALID) return false;
  if (lastPattern.type === PATTERN.INVALID) return false;

  // 火箭可以压任何牌
  if (newPattern.type === PATTERN.ROCKET) return true;
  // 火箭不能被任何非火箭压
  if (lastPattern.type === PATTERN.ROCKET) return false;

  // 炸弹可以压非炸弹的任何牌
  if (newPattern.type === PATTERN.BOMB && lastPattern.type !== PATTERN.BOMB) {
    return true;
  }
  // 被压的是炸弹，新牌也必须是炸弹且更大
  if (lastPattern.type === PATTERN.BOMB && newPattern.type !== PATTERN.BOMB) {
    return false;
  }

  // 牌型必须相同且张数必须相同才能比较主值
  if (newPattern.type !== lastPattern.type) return false;
  if (newPattern.length !== lastPattern.length) return false;

  // 比较主值
  return newPattern.mainValue > lastPattern.mainValue;
}

// ===================== 出牌验证 =====================

/**
 * 验证玩家是否有这些牌
 */
function hasCards(hand, cardsToPlay) {
  // 创建一个手牌的副本
  const handCopy = [...hand];
  for (const card of cardsToPlay) {
    const idx = handCopy.findIndex(c => c.id === card.id);
    if (idx === -1) return false;
    handCopy.splice(idx, 1);
  }
  return true;
}

/**
 * 从手牌中扣除指定牌
 */
function removeCards(hand, cardsToRemove) {
  const newHand = [...hand];
  for (const card of cardsToRemove) {
    const idx = newHand.findIndex(c => c.id === card.id);
    if (idx !== -1) {
      newHand.splice(idx, 1);
    }
  }
  return newHand;
}

// ===================== 回合控制 =====================

/**
 * 获取下一位玩家的索引
 */
function getNextPlayerIndex(currentIndex) {
  if (players.length === 0) return -1;
  return (currentIndex + 1) % players.length;
}

/**
 * 切换到下一位玩家
 */
function advanceTurn() {
  const currentIndex = players.findIndex(p => p.socketId === gameState.currentTurn);
  const nextIndex = getNextPlayerIndex(currentIndex);
  gameState.currentTurn = players[nextIndex].socketId;
}

/**
 * 检查是否一轮结束（连续两人不要）
 * 在3人斗地主中，如果连续两人不要，则lastPlayer重新获得出牌权
 */
function isRoundOver() {
  // 如果当前轮还没有人出牌，不算结束
  if (gameState.lastPlayer === null) return false;
  
  // 如果所有其他玩家都pass了（在3人游戏中，即2人连续pass），一轮结束
  return gameState.passedCount >= 2;
}

/**
 * 重置一轮（更新lastPlayer成为新的自由出牌者）
 */
function resetRound() {
  gameState.lastPlayedCards = [];
  gameState.passedCount = 0;
  // lastPlayer保留，因为新一轮由lastPlayer先出
  // 但currentTurn已经是lastPlayer的下家，我们需要将其设为lastPlayer
  // 所以重置后，由lastPlayer先出
  gameState.currentTurn = gameState.lastPlayer;
  gameState.lastPlayedCards = [];
  gameState.passedCount = 0;
}

// ===================== 广播函数 =====================

/**
 * 广播当前游戏状态给所有玩家
 */
function broadcastGameState() {
  const currentPlayerIndex = players.findIndex(p => p.socketId === gameState.currentTurn);
  const handsCount = gameState.hands.map(h => h.length);
  const playerNames = players.map(p => p.playerName);

  io.emit('updateTable', {
    currentTurn: gameState.currentTurn,
    currentTurnIndex: currentPlayerIndex,
    lastPlayedCards: gameState.lastPlayedCards,
    lastPlayer: gameState.lastPlayer,
    handsCount: handsCount,
    passedCount: gameState.passedCount,
    playerNames: playerNames,
  });
}

/**
 * 处理游戏结束
 */
function handleGameOver(winnerSocketId) {
  const winnerIndex = players.findIndex(p => p.socketId === winnerSocketId);
  const winnerName = players[winnerIndex] ? players[winnerIndex].playerName : `玩家${winnerIndex + 1}`;
  io.emit('gameOver', {
    winner: winnerSocketId,
    winnerIndex: winnerIndex,
    message: `${winnerName} 获胜！`,
    playerNames: players.map(p => p.playerName),
  });
  console.log(`[游戏结束] ${winnerName} (${winnerSocketId}) 获胜！`);
}

// ===================== 牌局管理 =====================

/**
 * 判断单人牌局中某个玩家出牌后是否赢得游戏
 */
function checkAndHandleGameOver(playerSocketId, playerIndex) {
  const hand = gameState.hands[playerIndex];
  if (hand.length === 0) {
    handleGameOver(playerSocketId);
    return true;
  }
  return false;
}

/**
 * Fisher-Yates 洗牌算法
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 洗牌并发牌给所有连接的玩家
 * 54张牌分成三份：17, 17, 20
 * 20张作为地主牌发给第三个玩家
 */
function dealCards() {
  const deck = shuffle(playersData);

  const hand1 = deck.slice(0, 17);   // 玩家1
  const hand2 = deck.slice(17, 34);  // 玩家2
  const hand3 = deck.slice(34, 54);  // 玩家3（地主，20张）

  const hands = [hand1, hand2, hand3];

  // 保存到手牌数据
  gameState.hands = hands;

  // 设置初始状态
  gameState.lastPlayedCards = [];
  gameState.lastPlayer = null;
  gameState.passedCount = 0;
  // 地主（玩家3，索引2）先出牌
  gameState.currentTurn = players[2].socketId;

  // 分别发送给对应玩家
  for (let i = 0; i < players.length; i++) {
    const socketId = players[i].socketId;
    const playerName = players[i].playerName;
    const cards = hands[i];
    io.to(socketId).emit('dealCards', { cards, playerIndex: i, playerName: playerName });
    console.log(`[发牌] 向 ${playerName} (${socketId}) 发送了 ${cards.length} 张牌`);
  }

  console.log(`[发牌] 所有玩家已发牌完成`);
  console.log(`[回合] ${players[2].playerName}（地主）先出牌: ${gameState.currentTurn}`);

  // 延迟一小会儿后广播桌面状态
  setTimeout(() => {
    broadcastGameState();
  }, 300);
}

// Serve static files
app.use(express.static(__dirname));

// Basic Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`[连接] 客户端已连接，Socket ID: ${socket.id}`);

  // 检查是否还能加入房间
  if (players.length >= 3) {
    console.log(`[拒绝] 房间已满，拒绝 ${socket.id} 的连接`);
    socket.emit('roomFull', { message: '房间已满（最多3人），无法加入游戏' });
    socket.disconnect();
    return;
  }

  // 分配专属昵称并加入房间
  const currentIndex = players.length;
  const playerName = customNames[currentIndex];
  players.push({ socketId: socket.id, playerName });
  console.log(`[加入] ${playerName} (Socket: ${socket.id}) 加入房间，当前共 ${players.length} 人`);

  // 通知玩家其编号和昵称
  socket.emit('playerJoined', { playerIndex: currentIndex, totalPlayers: players.length, playerName: playerName });

  // 当第3个玩家连接时，自动触发洗牌发牌
  if (players.length === 3) {
    console.log('[开始] 3名玩家已到齐，开始洗牌发牌...');
    io.emit('gameStarting', { message: '3名玩家已到齐，发牌中...' });
    setTimeout(() => {
      dealCards();
    }, 500);
  } else {
    io.emit('waitingForPlayers', { current: players.length, required: 3 });
  }

  // ===================== 客户端事件监听 =====================

  /**
   * 玩家出牌
   */
  socket.on('playCards', (data) => {
    const { cards } = data;

    if (!cards || cards.length === 0) {
      socket.emit('invalidPlay', { message: '请选择要出的牌' });
      return;
    }

    // 验证：是否轮到该玩家
    if (socket.id !== gameState.currentTurn) {
      socket.emit('invalidPlay', { message: '还没轮到你出牌' });
      return;
    }

    // 查找玩家索引
    const playerIndex = players.findIndex(p => p.socketId === socket.id);
    if (playerIndex === -1) {
      socket.emit('invalidPlay', { message: '玩家不在游戏中' });
      return;
    }

    // 验证：玩家是否持有这些牌
    const hand = gameState.hands[playerIndex];
    if (!hasCards(hand, cards)) {
      socket.emit('invalidPlay', { message: '你手里没有这些牌' });
      return;
    }

    // 牌型验证
    const pattern = identifyPattern(cards);
    if (pattern.type === PATTERN.INVALID) {
      socket.emit('invalidPlay', { message: '牌型不合法' });
      return;
    }

    // 比较大小（如果是接牌的情况）
    if (gameState.lastPlayedCards.length > 0 && gameState.lastPlayer !== null) {
      if (!canBeat(cards, gameState.lastPlayedCards)) {
        socket.emit('invalidPlay', { message: '出的牌不够大' });
        return;
      }
    }

    // ---- 所有验证通过，执行出牌 ----

    // 从手牌中扣除这些牌
    gameState.hands[playerIndex] = removeCards(hand, cards);

    // 更新桌面状态
    gameState.lastPlayedCards = cards;
    gameState.lastPlayer = socket.id;
    gameState.passedCount = 0; // 有人出牌了，重置pass计数

    const playerName = players[playerIndex].playerName;
    console.log(`[出牌] ${playerName} 出了 ${cards.length} 张牌，牌型: ${pattern.type}`);

    // 检查是否获胜
    if (checkAndHandleGameOver(socket.id, playerIndex)) {
      // 游戏结束，广播最终状态
      broadcastGameState();
      return;
    }

    // 切换到下一位玩家
    advanceTurn();
    console.log(`[回合] 轮到 ${gameState.currentTurn} 出牌`);

    // 广播更新
    broadcastGameState();
  });

  /**
   * 玩家选择"不要"（PASS）
   */
  socket.on('pass', () => {
    // 验证：是否轮到该玩家
    if (socket.id !== gameState.currentTurn) {
      socket.emit('invalidPlay', { message: '还没轮到你' });
      return;
    }

    // 如果是第一个出牌（lastPlayer为null），不能pass
    if (gameState.lastPlayer === null) {
      socket.emit('invalidPlay', { message: '你是第一个出牌者，不能pass' });
      return;
    }

    const playerIndex = players.findIndex(p => p.socketId === socket.id);
    const passPlayerName = players[playerIndex] ? players[playerIndex].playerName : `玩家${playerIndex + 1}`;
    console.log(`[Pass] ${passPlayerName} 选择不出牌`);

    gameState.passedCount++;

    // 检查一轮是否结束（连续2人pass，一轮结束）
    if (isRoundOver()) {
      const lastPlayerObj = players.find(p => p.socketId === gameState.lastPlayer);
      const lastPlayerName = lastPlayerObj ? lastPlayerObj.playerName : '';
      console.log(`[回合结束] ${lastPlayerName} 获得新一轮出牌权`);
      resetRound();
    } else {
      // 切换到下一位玩家
      advanceTurn();
    }

    console.log(`[回合] 轮到 ${gameState.currentTurn} 出牌`);

    // 广播更新
    broadcastGameState();
  });

  /**
   * 玩家请求重新开局
   */
  socket.on('requestRestart', () => {
    console.log(`[重新开局] 玩家 ${socket.id} 请求重新发牌`);
    const idx = players.findIndex(p => p.socketId === socket.id);
    if (idx !== -1) {
      // 只重新发牌，不清除玩家列表
      console.log('[开始] 重新发牌...');
      io.emit('gameStarting', { message: '重新发牌中...' });
      setTimeout(() => {
        dealCards();
      }, 500);
    }
  });

  /**
   * 玩家断开连接
   */
  socket.on('disconnect', (reason) => {
    console.log(`[断开] 客户端已断开，Socket ID: ${socket.id}，原因: ${reason}`);
    const idx = players.findIndex(p => p.socketId === socket.id);
    if (idx !== -1) {
      const discPlayerName = players[idx].playerName;
      players.splice(idx, 1);
      console.log(`[移除] ${discPlayerName} 已从房间移除，剩余 ${players.length} 人`);
    }
    // 通知剩余玩家有人离开
    io.emit('playerLeft', { remainingPlayers: players.length });
  });
});

httpServer.listen(PORT, () => {
  console.log(`[服务器] NBA斗地主后端服务器已启动`);
  console.log(`[地址] http://localhost:${PORT}`);
  console.log(`[静态] 提供静态文件服务: ${__dirname}`);
});