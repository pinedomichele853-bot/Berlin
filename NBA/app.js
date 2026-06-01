/**
 * app.js - NBA 斗地主 单页面应用
 * 
 * 功能：
 *  - 连接后端Socket.io服务器接收发牌
 *  - 牌型检测：单张、对子、三带一、单顺子(5+)、双顺子(连对)、炸弹(四张相同)
 *  - 玩家选牌、出牌、过牌交互
 *  - 比拼动画效果
 *  - 输赢结算面板
 * 
 * 注意：此版本为多人联网版，所有出牌判定均由服务器完成。
 *       本地只负责展示和与服务器通信。
 */

// ========== Socket.io 连接 ==========
const socket = io("http://localhost:3000");

// ========== 全局游戏状态 ==========
const game = {
  playerCards: [],
  selectedIndices: new Set(),
  mySocketId: null,          // 当前玩家的socket id（在connect时获取）
  myPlayerName: '',          // 当前玩家的专属昵称
  gameStarted: false,
  isMyTurn: false,           // 是否轮到我出牌
};

// 临时保存刚打出的牌（等待服务器确认后移除）
let pendingPlayedCards = null;

// ========== 工具函数 ==========

function sortByStrength(cards) {
  return [...cards].sort((a, b) => b.pokerValue - a.pokerValue);
}

function sortByStrengthAsc(cards) {
  return [...cards].sort((a, b) => a.pokerValue - b.pokerValue);
}

function getCategoryColor(category) {
  const map = {
    legend: 'from-yellow-400 to-orange-500',
    guard: 'from-blue-400 to-purple-500',
    forward: 'from-green-400 to-teal-500',
    center: 'from-red-400 to-pink-500'
  };
  return map[category] || 'from-gray-400 to-gray-600';
}

function getCategoryBadge(category) {
  const map = {
    legend: '🏆 传奇',
    guard: '🎯 后卫',
    forward: '💪 前锋',
    center: '🏀 中锋'
  };
  return map[category] || '❓ 未知';
}

// NBA官方球员头像CDN图片URL (updated to new CDN)
const NBA_IMAGE_BASE_URL = 'https://cdn.nba.com/headshots/nba/latest/260x190/';

function getPlayerImageUrl(card) {
  if (card.nbaId) {
    return `${NBA_IMAGE_BASE_URL}${card.nbaId}.png`;
  }
  return null;
}

/**
 * Create an <img> element with robust error handling via addEventListener.
 * This avoids fragile inline onerror handlers that can break innerHTML parsing.
 */
function createPlayerImage(imgUrl, alt, className = '') {
  if (!imgUrl) return null;
  const img = document.createElement('img');
  img.src = imgUrl;
  img.alt = alt || '';
  img.className = (className || '') + ' nba-player-img';
  img.loading = 'lazy';
  img.addEventListener('error', function() {
    this.style.display = 'none';
  });
  return img;
}

function getPokerDisplay(value) {
  if (value === 17) return { symbol: '👑', label: '大王' };
  if (value === 16) return { symbol: '👑', label: '小王' };
  if (value === 15) return { symbol: '2️⃣', label: '2' };
  if (value === 14) return { symbol: '🅰️', label: 'A' };
  if (value === 13) return { symbol: '🅺', label: 'K' };
  if (value === 12) return { symbol: '🆀', label: 'Q' };
  if (value === 11) return { symbol: '🅹', label: 'J' };
  if (value <= 10) return { symbol: `🔢`, label: String(value) };
  return { symbol: '🃏', label: String(value) };
}

// Get ppg display with 1 decimal
function getPPG(card) {
  return typeof card.ppg === 'number' ? card.ppg.toFixed(1) : '—';
}

// ========== 牌型检测 ==========

const HAND_TYPES = {
  SINGLE: 'single',
  PAIR: 'pair',
  THREE_WITH_ONE: 'threeWithOne',
  STRAIGHT: 'straight',
  DOUBLE_STRAIGHT: 'doubleStraight',
  BOMB: 'bomb',
  INVALID: 'invalid'
};

const HAND_TYPE_NAMES = {
  [HAND_TYPES.SINGLE]: '单张',
  [HAND_TYPES.PAIR]: '对子',
  [HAND_TYPES.THREE_WITH_ONE]: '三带一',
  [HAND_TYPES.STRAIGHT]: '顺子',
  [HAND_TYPES.DOUBLE_STRAIGHT]: '连对',
  [HAND_TYPES.BOMB]: '炸弹 💣',
  [HAND_TYPES.INVALID]: '非法牌型'
};

function detectHandType(cards) {
  if (!cards || cards.length === 0) return { type: HAND_TYPES.INVALID, value: 0, valid: false };

  const n = cards.length;
  const values = cards.map(c => c.pokerValue).sort((a, b) => a - b);

  const countMap = new Map();
  for (const v of values) {
    countMap.set(v, (countMap.get(v) || 0) + 1);
  }
  const counts = [...countMap.entries()].sort((a, b) => a[0] - b[0]);
  const countValues = counts.map(([v, c]) => ({ value: v, count: c }));

  if (n === 1) {
    return { type: HAND_TYPES.SINGLE, value: values[0], valid: true };
  }

  if (n === 2 && countValues.length === 1 && countValues[0].count === 2) {
    return { type: HAND_TYPES.PAIR, value: values[0], valid: true };
  }

  if (n === 4) {
    const three = countValues.find(c => c.count === 3);
    if (three) {
      return { type: HAND_TYPES.THREE_WITH_ONE, value: three.value, valid: true };
    }
  }

  if (n === 4 && countValues.length === 1 && countValues[0].count === 4) {
    return { type: HAND_TYPES.BOMB, value: values[0], valid: true };
  }

  if (n >= 5) {
    if (countValues.length === n) {
      const allPlayable = values.every(v => v >= 3 && v <= 14);
      if (allPlayable) {
        let isConsecutive = true;
        for (let i = 1; i < values.length; i++) {
          if (values[i] - values[i - 1] !== 1) {
            isConsecutive = false;
            break;
          }
        }
        if (isConsecutive) {
          return { type: HAND_TYPES.STRAIGHT, value: values[values.length - 1], valid: true };
        }
      }
    }
  }

  if (n >= 6 && n % 2 === 0) {
    const allPairs = countValues.every(c => c.count === 2);
    if (allPairs && countValues.length >= 3) {
      const pairValues = countValues.map(c => c.value);
      const allPlayable = pairValues.every(v => v >= 3 && v <= 14);
      if (allPlayable) {
        let isConsecutive = true;
        for (let i = 1; i < pairValues.length; i++) {
          if (pairValues[i] - pairValues[i - 1] !== 1) {
            isConsecutive = false;
            break;
          }
        }
        if (isConsecutive) {
          return { type: HAND_TYPES.DOUBLE_STRAIGHT, value: pairValues[pairValues.length - 1], valid: true };
        }
      }
    }
  }

  return { type: HAND_TYPES.INVALID, value: 0, valid: false };
}

// ========== 比拼动画 ==========

/**
 * Show a battle comparison animation between two plays
 */
function showBattleAnimation(prevCards, prevPlayer, newCards, newPlayer) {
  const existing = document.querySelector('.battle-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'battle-overlay fixed inset-0 z-[5000] flex items-center justify-center';
  overlay.style.background = 'rgba(0,0,0,0.75)';
  overlay.style.backdropFilter = 'blur(4px)';

  const prevCard = prevCards[0];
  const newCard = newCards[0];

  const prevDisplay = getPokerDisplay(prevCard.pokerValue);
  const newDisplay = getPokerDisplay(newCard.pokerValue);
  const prevColor = getCategoryColor(prevCard.category);
  const newColor = getCategoryColor(newCard.category);
  const prevPPG = getPPG(prevCard);
  const newPPG = getPPG(newCard);

  const prevHand = detectHandType(prevCards);
  const newHand = detectHandType(newCards);
  const typeName = HAND_TYPE_NAMES[newHand.type] || '';

  const prevMainName = prevCards.length === 1 ? prevCard.name : `${prevCard.name}等${prevCards.length}张`;
  const newMainName = newCards.length === 1 ? newCard.name : `${newCard.name}等${newCards.length}张`;

  const prevImgUrl = getPlayerImageUrl(prevCard);
  const newImgUrl = getPlayerImageUrl(newCard);

  overlay.innerHTML = `
    <div class="battle-container flex flex-col items-center gap-4 px-4 w-full max-w-lg">
      <div class="text-center mb-2">
        <span class="text-red-400 font-black text-2xl">⚔️ 巨星对决 ⚔️</span>
      </div>
      <div class="flex items-center justify-center gap-3 w-full">
        <div class="battle-card-left flex-shrink-0 rounded-xl p-3 w-32 sm:w-36 bg-gradient-to-b ${prevColor} text-white border border-white/30 shadow-lg">
          ${prevImgUrl ? `<div class="flex justify-center -mx-3 -mt-3 mb-1">
            <img src="${prevImgUrl}" alt="${prevCard.name}" class="w-14 h-10 object-contain" 
                 onerror="this.style.display='none'" loading="lazy">
          </div>` : ''}
          <div class="text-center">
            <p class="font-black text-sm leading-tight truncate">${prevCard.name}</p>
            <p class="text-[10px] text-yellow-200">${prevDisplay.symbol} ${prevDisplay.label}</p>
            <p class="text-xs font-bold text-yellow-300 mt-1">${prevPPG} 分</p>
          </div>
          ${prevCards.length > 1 ? `<div class="mt-1 text-[10px] text-white/70 text-center">+${prevCards.length - 1} 张</div>` : ''}
          <div class="mt-1 text-center text-[9px] bg-black/30 rounded px-1 py-0.5">
            ${prevPlayer}
          </div>
        </div>
        <div class="battle-vs flex-shrink-0 text-center">
          <span class="text-3xl font-black text-red-500 drop-shadow-lg">VS</span>
          <div class="text-[10px] text-red-300 font-bold">被管住</div>
        </div>
        <div class="battle-card-right flex-shrink-0 rounded-xl p-3 w-32 sm:w-36 bg-gradient-to-b ${newColor} text-white border border-yellow-400/50 shadow-lg battle-result-text">
          ${newImgUrl ? `<div class="flex justify-center -mx-3 -mt-3 mb-1">
            <img src="${newImgUrl}" alt="${newCard.name}" class="w-14 h-10 object-contain" 
                 onerror="this.style.display='none'" loading="lazy">
          </div>` : ''}
          <div class="text-center">
            <p class="font-black text-sm leading-tight truncate">${newCard.name}</p>
            <p class="text-[10px] text-yellow-200">${newDisplay.symbol} ${newDisplay.label}</p>
            <p class="text-xs font-bold text-yellow-300 mt-1">${newPPG} 分</p>
          </div>
          ${newCards.length > 1 ? `<div class="mt-1 text-[10px] text-white/70 text-center">+${newCards.length - 1} 张</div>` : ''}
          <div class="mt-1 text-center text-[9px] bg-black/30 rounded px-1 py-0.5">
            ${newPlayer}
          </div>
        </div>
      </div>
      <div class="text-center bg-black/40 rounded-xl px-4 py-2 border border-yellow-400/20 max-w-sm">
        <p class="text-white text-sm font-bold leading-relaxed">
          <span class="text-yellow-300">${newMainName}</span>
          <span class="text-white">（${newPPG}分）的</span>
          <span class="text-yellow-300">${typeName}</span>
          <span class="text-white">管住了</span>
          <span class="text-red-300">${prevMainName}</span>
          <span class="text-white">（${prevPPG}分）！</span>
        </p>
        <p class="text-green-300 text-xs mt-1 font-bold">
          ✓ ${newPPG > prevPPG ? '场均得分更高，压制！' : '牌力压制！'}
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
  }, 2200);
}

// ========== 渲染函数 ==========

function renderAICards(containerId, count) {
  const container = document.getElementById(containerId);
  // Derive the count element ID from the container ID (e.g., "ai-landlord-cards" → "ai-landlord-count")
  const countElId = containerId.replace('-cards', '-count');
  const countEl = document.getElementById(countElId);
  if (!container) return;

  if (countEl) {
    countEl.textContent = `${count} 张`;
  }
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const cardEl = document.createElement('div');
    cardEl.className = `card-back rounded-lg w-10 h-14 sm:w-12 sm:h-16 flex items-center justify-center 
                         text-yellow-300 font-bold text-lg shadow-lg deal-anim-ai`;
    cardEl.style.animationDelay = `${i * 0.3}s`;
    cardEl.textContent = '🏀';
    container.appendChild(cardEl);
  }
}

function createSinglePlayerCard(card, index) {
  const actualIdx = game.playerCards.indexOf(card);
  const safeIdx = actualIdx >= 0 ? actualIdx : index;
  const isSelected = game.selectedIndices.has(safeIdx);

  const { symbol, label } = getPokerDisplay(card.pokerValue);
  const catColor = getCategoryColor(card.category);
  const catBadge = getCategoryBadge(card.category);
  const isLegend = card.pokerValue >= 16;
  const isStar = card.pokerValue >= 14;

  const cardDiv = document.createElement('div');
  cardDiv.className = `card-glow flex-shrink-0 rounded-xl p-3 w-36 sm:w-40 
                        bg-gradient-to-b ${catColor} text-white 
                        border border-white/20 ${isStar ? 'star-glow' : ''} 
                        ${isLegend ? 'ring-2 ring-yellow-400' : ''}
                        ${isSelected ? 'card-selected' : ''}
                        cursor-pointer select-none deal-anim`;
  cardDiv.style.animationDelay = `${index * 0.05}s`;
  cardDiv.dataset.cardIndex = safeIdx;

  const imgUrl = getPlayerImageUrl(card);

  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex justify-between items-start mb-1';
  headerDiv.innerHTML = `
    <span class="text-xs font-bold bg-black/30 px-1.5 py-0.5 rounded">${label}</span>
    <span class="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">${catBadge}</span>
  `;
  cardDiv.appendChild(headerDiv);

  if (imgUrl) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'flex justify-center -mx-3 -mt-1 mb-1';
    const img = createPlayerImage(imgUrl, card.name, 'w-16 h-12 object-contain drop-shadow-md');
    if (img) {
      imgContainer.appendChild(img);
    }
    cardDiv.appendChild(imgContainer);
  }

  const infoDiv = document.createElement('div');
  infoDiv.className = 'text-center';
  infoDiv.innerHTML = `
    <p class="font-black text-sm sm:text-base leading-tight truncate drop-shadow-md">${card.name}</p>
    <p class="text-[10px] text-yellow-200 mt-1 leading-tight">
      ${symbol} ${isLegend ? (card.pokerValue === 17 ? 'GOAT 👑' : 'King 👑') : ''}
    </p>
  `;
  cardDiv.appendChild(infoDiv);

  const statsDiv = document.createElement('div');
  statsDiv.className = 'mt-2 grid grid-cols-3 gap-1 text-center text-[10px] bg-black/20 rounded-lg p-1.5';
  statsDiv.innerHTML = `
    <div>
      <p class="font-bold text-yellow-300 text-xs">${getPPG(card)}</p>
      <p class="text-white/70">得分</p>
    </div>
    <div>
      <p class="font-bold text-yellow-300 text-xs">${card.rpg}</p>
      <p class="text-white/70">篮板</p>
    </div>
    <div>
      <p class="font-bold text-yellow-300 text-xs">${card.apg}</p>
      <p class="text-white/70">助攻</p>
    </div>
  `;
  cardDiv.appendChild(statsDiv);

  const skillDiv = document.createElement('div');
  skillDiv.className = 'mt-1.5 text-[9px] text-white/60 text-center italic leading-tight line-clamp-2';
  skillDiv.textContent = `"${card.skillDescription}"`;
  cardDiv.appendChild(skillDiv);

  cardDiv.addEventListener('click', () => {
    toggleCardSelection(safeIdx);
  });

  return cardDiv;
}

function renderPlayerCards(cards) {
  const container = document.getElementById('player-cards');
  const countEl = document.getElementById('player-count');
  if (!container) return;

  if (countEl) {
    countEl.textContent = `${cards.length} 张`;
  }
  container.innerHTML = '';

  const sorted = sortByStrength(cards);

  sorted.forEach((card, index) => {
    try {
      const cardEl = createSinglePlayerCard(card, index);
      container.appendChild(cardEl);
    } catch (e) {
      console.warn('Failed to render card:', card.name, e);
      const fallback = document.createElement('div');
      fallback.className = 'card-glow flex-shrink-0 rounded-xl p-3 w-36 sm:w-40 bg-gradient-to-b from-gray-600 to-gray-800 text-white border border-white/20 cursor-default select-none deal-anim';
      fallback.style.animationDelay = `${index * 0.3}s`;
      fallback.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center py-2">
          <span class="text-2xl mb-1">🃏</span>
          <p class="text-xs font-bold truncate">${card.name}</p>
          <p class="text-[10px] text-yellow-200">${getPokerDisplay(card.pokerValue).symbol}</p>
        </div>
      `;
      container.appendChild(fallback);
    }
  });
}

function toggleCardSelection(index) {
  if (!game.gameStarted || !game.isMyTurn) return;

  if (game.selectedIndices.has(index)) {
    game.selectedIndices.delete(index);
  } else {
    game.selectedIndices.add(index);
  }
  renderPlayerCards(game.playerCards);
  updatePlayButtonState();
}

function updatePlayButtonState() {
  const playBtn = document.getElementById('play-btn');
  const selectedCount = game.selectedIndices.size;

  if (selectedCount === 0) {
    playBtn.disabled = true;
    playBtn.textContent = '🃏 出牌';
  } else {
    const selectedCards = [...game.selectedIndices].map(i => game.playerCards[i]);
    const hand = detectHandType(selectedCards);
    if (hand.valid) {
      playBtn.disabled = false;
      playBtn.textContent = `🃏 出牌 (${HAND_TYPE_NAMES[hand.type]})`;
    } else {
      playBtn.disabled = true;
      playBtn.textContent = '🃏 牌型不合法';
    }
  }
}

function clearPlayAreas() {
  document.getElementById('play-area').innerHTML = '';
  document.getElementById('ai-landlord-play').innerHTML = '';
  document.getElementById('ai-farmer-play').innerHTML = '';
}

function renderPlayedCardElement(card) {
  try {
    const { symbol, label: cardLabel } = getPokerDisplay(card.pokerValue);
    const catColor = getCategoryColor(card.category);
    const isLegend = card.pokerValue >= 16;
    const isStar = card.pokerValue >= 14;

    const cardEl = document.createElement('div');
    cardEl.className = `play-card flex-shrink-0 rounded-lg p-2 w-24 sm:w-28 
                         bg-gradient-to-b ${catColor} text-white 
                         border border-white/20 ${isStar ? 'star-glow' : ''} 
                         ${isLegend ? 'ring-1 ring-yellow-400' : ''}`;

    const imgUrl = getPlayerImageUrl(card);

    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex justify-between items-start';
    headerDiv.innerHTML = `
      <span class="text-xs font-bold bg-black/30 px-1 py-0.5 rounded">${cardLabel}</span>
      <span class="text-[9px] bg-black/30 px-1 py-0.5 rounded-full">${getCategoryBadge(card.category)}</span>
    `;
    cardEl.appendChild(headerDiv);

    if (imgUrl) {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'flex justify-center -mx-2 mb-0.5';
      const img = createPlayerImage(imgUrl, card.name, 'w-12 h-9 object-contain drop-shadow-md');
      if (img) imgContainer.appendChild(img);
      cardEl.appendChild(imgContainer);
    }

    const infoDiv = document.createElement('div');
    infoDiv.className = 'text-center mt-1';
    infoDiv.innerHTML = `
      <p class="font-bold text-xs leading-tight truncate">${card.name}</p>
      <p class="text-[9px] text-yellow-200">${symbol}</p>
    `;
    cardEl.appendChild(infoDiv);

    return cardEl;
  } catch (e) {
    console.warn('Failed to render played card:', card.name, e);
    const fallback = document.createElement('div');
    fallback.className = 'play-card flex-shrink-0 rounded-lg p-2 w-24 sm:w-28 bg-gradient-to-b from-gray-600 to-gray-800 text-white border border-white/20';
    fallback.textContent = card.name;
    return fallback;
  }
}

function showPlayedCards(containerId, cards, label) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const isBomb = cards.length === 4 && cards.every(c => c.pokerValue === cards[0].pokerValue);

  cards.forEach((card, idx) => {
    const cardEl = renderPlayedCardElement(card);
    if (cardEl) {
      cardEl.classList.add('play-slam');
      cardEl.style.animationDelay = `${idx * 0.08}s`;
      container.appendChild(cardEl);
    }
  });

  shakeScreen(isBomb);

  if (isBomb) {
    triggerBombEffect();
  }
}

function shakeScreen(strong = false) {
  const main = document.querySelector('main') || document.body;
  main.classList.remove('screen-shake');
  void main.offsetWidth;
  main.classList.add('screen-shake');
  if (strong) {
    main.style.animationDuration = '0.6s';
  } else {
    main.style.animationDuration = '0.4s';
  }
  setTimeout(() => {
    main.classList.remove('screen-shake');
  }, strong ? 700 : 500);
}

function triggerBombEffect() {
  const oldFlash = document.querySelector('.bomb-flash');
  if (oldFlash) oldFlash.remove();
  const oldText = document.querySelector('.bomb-text');
  if (oldText) oldText.remove();

  const flash = document.createElement('div');
  flash.className = 'bomb-flash';
  document.body.appendChild(flash);

  const textDiv = document.createElement('div');
  textDiv.className = 'bomb-text';
  textDiv.innerHTML = '<span>巨星大抱团！</span>';
  document.body.appendChild(textDiv);

  setTimeout(() => {
    if (flash.parentNode) flash.remove();
  }, 1000);
  setTimeout(() => {
    if (textDiv.parentNode) textDiv.remove();
  }, 1800);
}

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast px-8 py-4 rounded-2xl text-xl font-bold shadow-2xl ${
    isError 
      ? 'bg-red-600/90 text-white border-2 border-red-400' 
      : 'bg-green-600/90 text-white border-2 border-green-400'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 1500);
}

function updateStatus(message) {
  const statusEl = document.getElementById('status-text');
  statusEl.innerHTML = message;
}

function showActionButtons(show) {
  const btns = document.getElementById('action-buttons');
  btns.classList.toggle('hidden', !show);
}

function setPassButtonEnabled(enabled) {
  document.getElementById('pass-btn').disabled = !enabled;
}

function updateActionButtonsForTurn() {
  if (!game.gameStarted) {
    showActionButtons(false);
    return;
  }

  if (game.isMyTurn) {
    showActionButtons(true);
    setPassButtonEnabled(true);
    updatePlayButtonState();
    updateStatus('<span class="text-green-300 font-bold">🎯 轮到你了！请出牌</span>');
  } else {
    showActionButtons(false);
    updateStatus('<span class="text-yellow-300">⏳ 等待别人出牌...</span>');
  }
}

// ========== 结算面板 ==========

function showEndGameModal(winnerSocketId, winnerName) {
  const modal = document.getElementById('endgame-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  const winnerText = document.getElementById('winner-text');
  if (winnerSocketId === game.mySocketId) {
    winnerText.innerHTML = `🎉🎉🎉 <span class="text-yellow-400">${game.myPlayerName} 赢了！</span> 🎉🎉🎉`;
  } else {
    const displayName = winnerName || '其他玩家';
    winnerText.innerHTML = `😞 <span class="text-red-400">${displayName}</span> 获胜`;
  }

  const scoreboard = document.getElementById('scoreboard-content');
  scoreboard.innerHTML = '';

  // 自己的信息
  const myTotalPpg = game.playerCards.reduce((sum, c) => sum + (typeof c.ppg === 'number' ? c.ppg : 0), 0);
  const myAvgPpg = game.playerCards.length > 0 ? (myTotalPpg / game.playerCards.length).toFixed(1) : '0.0';
  const myTopScorers = game.playerCards.length > 0 ? sortByStrength(game.playerCards).slice(0, 3).map(c => c.name).join(', ') : '';

  const myRow = document.createElement('div');
  myRow.className = 'bg-blue-900/30 rounded-xl p-3 border border-white/10';
  myRow.innerHTML = `
    <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-2">
        <span class="text-xl">🧑‍🦰</span>
        <div>
          <p class="text-white font-bold text-sm">${game.myPlayerName} ${winnerSocketId === game.mySocketId ? '👑' : ''}</p>
          <p class="text-white/60 text-xs">剩余 ${game.playerCards.length} 张</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-yellow-300 font-bold text-sm">${myTotalPpg.toFixed(1)} 总分</p>
        <p class="text-white/60 text-xs">均分 ${myAvgPpg}</p>
      </div>
    </div>
    ${myTopScorers ? `<div class="text-[10px] text-white/40 text-center truncate mt-1">最强: ${myTopScorers}</div>` : ''}
  `;
  scoreboard.appendChild(myRow);
}

function hideEndGameModal() {
  const modal = document.getElementById('endgame-modal');
  if (modal) modal.classList.add('hidden');
}

// ========== 出牌逻辑（通过Socket发送至服务器） ==========

function playerPlay() {
  if (!game.gameStarted || !game.isMyTurn) return;
  if (game.selectedIndices.size === 0) return;

  const selectedIndices = [...game.selectedIndices];
  const selectedCards = selectedIndices.map(i => game.playerCards[i]);

  // 本地牌型预检（仅用于UI反馈，服务器会再次验证）
  const hand = detectHandType(selectedCards);
  if (!hand.valid) {
    showToast('❌ 牌型不合法！', true);
    return;
  }

  // 保存待移除的牌信息（等待服务器确认）
  pendingPlayedCards = {
    cards: selectedCards,
    indices: selectedIndices,
  };

  // 清除选中状态
  game.selectedIndices.clear();
  updatePlayButtonState();

  // 向服务器发送出牌请求
  socket.emit('playCards', { cards: selectedCards });
}

function playerPass() {
  if (!game.gameStarted || !game.isMyTurn) return;

  // 向服务器发送过牌请求
  socket.emit('pass');

  game.selectedIndices.clear();
  renderPlayerCards(game.playerCards);
  updatePlayButtonState();
}

// ========== 发牌（从服务器接收） ==========

function initGameFromServer(cards) {
  game.playerCards = cards;
  pendingPlayedCards = null;

  hideEndGameModal();

  game.selectedIndices = new Set();
  game.gameStarted = true;
  game.isMyTurn = false;

  renderAICards('ai-landlord-cards', 0);
  renderAICards('ai-farmer-cards', 0);
  renderPlayerCards(game.playerCards);

  updateStatus('🃏 发牌完成！等待游戏开始...');

  clearPlayAreas();

  showActionButtons(false);

  const btn = document.getElementById('start-btn');
  btn.classList.remove('shuffling');
  btn.textContent = '🔄 重新连接';
  btn.disabled = false;
}

// ========== Socket.io 事件处理 ==========

socket.on('connect', () => {
  console.log('[Socket] 已连接到服务器');
  game.mySocketId = socket.id;
  updateStatus('🔄 正在连接服务器...');
});

socket.on('playerJoined', (data) => {
  console.log(`[Socket] 你已加入房间，玩家编号: ${data.playerIndex + 1}/${data.totalPlayers}，昵称: ${data.playerName}`);
  // 保存当前玩家的专属昵称
  game.myPlayerName = data.playerName || `玩家${data.playerIndex + 1}`;
  // 更新自己的名字显示
  const playerNameEl = document.getElementById('player-name');
  if (playerNameEl) {
    playerNameEl.textContent = game.myPlayerName;
  }
  updateStatus(`✅ 已加入房间 - ${game.myPlayerName}，等待其他玩家加入... (${data.totalPlayers}/3)`);
});

socket.on('waitingForPlayers', (data) => {
  console.log(`[Socket] 等待玩家加入: ${data.current}/3`);
  updateStatus(`⏳ 等待玩家加入... (${data.current}/3)`);
});

socket.on('gameStarting', (data) => {
  console.log('[Socket]', data.message);
  updateStatus(`🎲 ${data.message}`);
});

socket.on('dealCards', (data) => {
  console.log(`[Socket] 收到发牌，共 ${data.cards.length} 张，玩家索引: ${data.playerIndex}，昵称: ${data.playerName}`);
  // 如果服务器传了 playerName，更新当前玩家名称
  if (data.playerName) {
    game.myPlayerName = data.playerName;
    const playerNameEl = document.getElementById('player-name');
    if (playerNameEl) {
      playerNameEl.textContent = game.myPlayerName;
    }
  }
  initGameFromServer(data.cards);
});

socket.on('roomFull', (data) => {
  console.log('[Socket] 房间已满:', data.message);
  updateStatus(`❌ ${data.message}`);
  document.getElementById('start-btn').disabled = true;
});

socket.on('playerLeft', (data) => {
  console.log(`[Socket] 有玩家离开，剩余 ${data.remainingPlayers} 人`);
  if (data.remainingPlayers < 3 && game.gameStarted) {
    game.gameStarted = false;
    updateStatus(`⚠️ 有玩家离开了游戏 (剩余${data.remainingPlayers}人)，游戏暂停`);
  } else {
    updateStatus(`👋 有玩家离开 (剩余${data.remainingPlayers}人)`);
  }
});

socket.on('disconnect', () => {
  console.log('[Socket] 与服务器断开连接');
  updateStatus('❌ 与服务器断开连接');
  game.gameStarted = false;
  showActionButtons(false);
});

/**
 * updateTable - 服务器广播桌面最新状态
 * data格式:
 * {
 *   currentTurn: socket.id,     // 当前该谁出牌
 *   currentTurnIndex: number,
 *   lastPlayedCards: Card[],    // 桌面上刚打出的牌
 *   lastPlayer: socket.id,      // 最后出牌的人
 *   handsCount: number[],       // 所有玩家的手牌数量 [玩家0, 玩家1, 玩家2]
 *   passedCount: number,        // 连续不要的人数
 * }
 */
socket.on('updateTable', (data) => {
  console.log('[Socket] updateTable:', data);

  if (!game.gameStarted) return;

  // 1. 更新出牌区 - 显示最新打出的牌
  clearPlayAreas();

  if (data.lastPlayedCards && data.lastPlayedCards.length > 0) {
    showPlayedCards('play-area', data.lastPlayedCards, '');
  }

  // 2. 如果刚才是我们出的牌且服务器已确认，从手牌中移除
  if (data.lastPlayer === game.mySocketId && pendingPlayedCards) {
    // 服务器确认我们出牌成功，移除pending中的牌
    const indicesToRemove = [...pendingPlayedCards.indices].sort((a, b) => b - a);
    for (const idx of indicesToRemove) {
      game.playerCards.splice(idx, 1);
    }
    renderPlayerCards(game.playerCards);
    pendingPlayedCards = null;
  }

  // 3. 更新所有玩家的手牌数量
  const myCount = game.playerCards.length;
  if (data.handsCount && Array.isArray(data.handsCount) && data.handsCount.length === 3) {
    // 用自己的牌数匹配来确定自己在数组中的索引
    let myIdx = -1;
    for (let i = 0; i < data.handsCount.length; i++) {
      if (data.handsCount[i] === myCount) {
        myIdx = i;
        break;
      }
    }

    // 如果找到了自己的索引，渲染其他两位玩家的剩余牌数
    if (myIdx >= 0) {
      const otherPlayers = [];
      for (let i = 0; i < data.handsCount.length; i++) {
        if (i !== myIdx) otherPlayers.push({ index: i, count: data.handsCount[i] });
      }
      if (otherPlayers.length >= 2) {
        renderAICards('ai-landlord-cards', otherPlayers[0].count);
        renderAICards('ai-farmer-cards', otherPlayers[1].count);
      }

      // 更新其他玩家的名字显示
      if (data.playerNames && Array.isArray(data.playerNames) && data.playerNames.length === 3) {
        const aiLandlordNameEl = document.getElementById('ai-landlord-name');
        const aiFarmerNameEl = document.getElementById('ai-farmer-name');
        // 按之前逻辑：otherPlayers[0] 是地主区，otherPlayers[1] 是农民区
        if (aiLandlordNameEl && otherPlayers[0] !== undefined) {
          aiLandlordNameEl.textContent = data.playerNames[otherPlayers[0].index] || '玩家' + (otherPlayers[0].index + 1);
        }
        if (aiFarmerNameEl && otherPlayers[1] !== undefined) {
          aiFarmerNameEl.textContent = data.playerNames[otherPlayers[1].index] || '玩家' + (otherPlayers[1].index + 1);
        }
      }
    }
  }

  // 4. 判断是否轮到我
  game.isMyTurn = (data.currentTurn === game.mySocketId);
  updateActionButtonsForTurn();
});

/**
 * invalidPlay - 出牌无效（不符合规则）
 */
socket.on('invalidPlay', (data) => {
  console.log('[Socket] invalidPlay:', data.message);

  // 如果之前有pending的牌（出牌被驳回），把牌加回手牌
  if (pendingPlayedCards) {
    // 注：因为我们出牌前的预检通过了服务器却没通过，说明服务器判定不同
    // pendingPlayedCards 中的牌从未被移除，所以不需要加回
    // selectedIndices 已被清空，玩家需要重新选牌
    pendingPlayedCards = null;
  }

  // 弹出错误提示
  showToast(`❌ ${data.message}`, true);
  updateStatus(`<span class="text-red-300">❌ ${data.message}，请重新选牌</span>`);
});

/**
 * gameOver - 游戏结束
 * data格式:
 * {
 *   winner: socket.id,      // 获胜玩家的socket id
 *   winnerIndex: number,    // 获胜玩家的索引
 *   message: string,        // 胜利消息
 * }
 */
socket.on('gameOver', (data) => {
  console.log('[Socket] gameOver:', data);
  game.gameStarted = false;
  pendingPlayedCards = null;

  // 从消息中提取获胜者名字（消息格式："{name} 获胜！"）
  let winnerName = '其他玩家';
  if (data.message) {
    winnerName = data.message.replace(' 获胜！', '');
  }

  // 显示结算面板
  setTimeout(() => {
    showEndGameModal(data.winner, winnerName);
  }, 500);

  // 更新状态文字和toast
  if (data.winner === game.mySocketId) {
    updateStatus('🎉🎉🎉 恭喜你赢了！！！ 🎉🎉🎉');
    showToast('🏆 你赢了！');
  } else {
    updateStatus(`😞 ${winnerName} 获胜！`);
    showToast(`😞 ${winnerName} 获胜！`, true);
  }

  showActionButtons(false);
});

// ========== 入口 ==========

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const playBtn = document.getElementById('play-btn');
  const passBtn = document.getElementById('pass-btn');
  const restartBtn = document.getElementById('restart-btn');

  // 加载 playersData（本地参考数据）
  import('./playersData.js').then(module => {
    window.__playersData = module.default;
  });

  // Start button - 刷新/重新连接
  startBtn.addEventListener('click', () => {
    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();
    startBtn.classList.add('shuffling');
    startBtn.textContent = '🔄 连接中...';
    startBtn.disabled = true;
    setTimeout(() => {
      startBtn.classList.remove('shuffling');
      startBtn.textContent = '🔄 重新连接';
      startBtn.disabled = false;
    }, 2000);
  });

  // Play button - 出牌
  playBtn.addEventListener('click', () => {
    playerPlay();
  });

  // Pass button - 过牌/不要
  passBtn.addEventListener('click', () => {
    playerPass();
  });

  // Restart button (in endgame modal) - 重新开局
  restartBtn.addEventListener('click', () => {
    hideEndGameModal();
    // 向服务器请求重新开局
    socket.emit('requestRestart');
    updateStatus('🔄 请求重新开局...');
    // 禁用按钮防止重复点击
    restartBtn.disabled = true;
    restartBtn.textContent = '⏳ 请求中...';
    setTimeout(() => {
      restartBtn.disabled = false;
      restartBtn.textContent = '🔄 再来一局';
    }, 3000);
  });

  // 初始化状态
  showActionButtons(false);
  updateStatus('🏀 点击"开始游戏"连接到服务器');
});