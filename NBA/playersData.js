/**
 * playersData.js
 * 
 * 54张扑克牌绑定NBA球员数据 (3-A各4张 + 2各4张 + 小王 + 大王)
 * pokerValue: 3=3, 4=4, ..., 10=10, J=11, Q=12, K=13, A=14, 2=15, 小王=16, 大王=17
 */

const playersData = [
  // ===== 大王 (17) - Michael Jordan =====
  {
    id: 'big_joker',
    name: 'Michael Jordan',
    nbaId: 893,
    pokerValue: 17,
    ppg: 30.1,
    rpg: 6.2,
    apg: 5.3,
    skillDescription: '【神之降临】锁定胜局：出牌后强制获得本回合胜利，无视任何牌型大小。',
    category: 'legend'
  },

  // ===== 小王 (16) - LeBron James =====
  {
    id: 'small_joker',
    name: 'LeBron James',
    nbaId: 2544,
    pokerValue: 16,
    ppg: 27.1,
    rpg: 7.5,
    apg: 7.4,
    skillDescription: '【全能王者】可以当作任何一张牌使用，配合任意牌型打出。',
    category: 'legend'
  },

  // ===== 2 (15) x4 =====
  {
    id: '2_01',
    name: 'Nikola Jokić',
    nbaId: 203999,
    pokerValue: 15,
    ppg: 20.9,
    rpg: 10.7,
    apg: 6.9,
    skillDescription: '【约老师魔术】出牌后可立即从牌堆摸回一张牌。',
    category: 'center'
  },
  {
    id: '2_02',
    name: 'Shaquille O\'Neal',
    nbaId: 406,
    pokerValue: 15,
    ppg: 23.7,
    rpg: 10.9,
    apg: 2.5,
    skillDescription: '【内线统治】对子牌型威力翻倍，对手无法用对子压制。',
    category: 'center'
  },
  {
    id: '2_03',
    name: 'Kareem Abdul-Jabbar',
    nbaId: 76003,
    pokerValue: 15,
    ppg: 24.6,
    rpg: 11.2,
    apg: 3.6,
    skillDescription: '【天勾传承】出牌时无视对手一张防守牌。',
    category: 'center'
  },
  {
    id: '2_04',
    name: 'Tim Duncan',
    nbaId: 1495,
    pokerValue: 15,
    ppg: 19.0,
    rpg: 10.8,
    apg: 3.0,
    skillDescription: '【基本功】稳定的力量，连续出牌时点数+1。',
    category: 'forward'
  },

  // ===== A (14) x4 =====
  {
    id: 'A_01',
    name: 'Stephen Curry',
    nbaId: 201939,
    pokerValue: 14,
    ppg: 24.8,
    rpg: 4.7,
    apg: 6.4,
    skillDescription: '【三分雨】连出三张及以上时触发，额外获得一次出牌机会。',
    category: 'guard'
  },
  {
    id: 'A_02',
    name: 'Magic Johnson',
    nbaId: 77142,
    pokerValue: 14,
    ppg: 19.5,
    rpg: 7.2,
    apg: 11.2,
    skillDescription: '【表演时刻】可以替队友（上家或下家）出手一次牌。',
    category: 'guard'
  },
  {
    id: 'A_03',
    name: 'Larry Bird',
    nbaId: 77144,
    pokerValue: 14,
    ppg: 24.3,
    rpg: 10.0,
    apg: 6.3,
    skillDescription: '【大鸟预言】出牌前可以宣言一张牌，若对手有则强制其弃掉。',
    category: 'forward'
  },
  {
    id: 'A_04',
    name: 'Hakeem Olajuwon',
    nbaId: 165,
    pokerValue: 14,
    ppg: 21.8,
    rpg: 11.1,
    apg: 2.5,
    skillDescription: '【梦幻脚步】出牌后可以弃掉对手一张牌。',
    category: 'center'
  },

  // ===== K (13) x4 =====
  {
    id: 'K_01',
    name: 'Kevin Durant',
    nbaId: 201142,
    pokerValue: 13,
    ppg: 27.3,
    rpg: 7.0,
    apg: 4.4,
    skillDescription: '【死神镰刀】单张出牌时点数视为+1。',
    category: 'forward'
  },
  {
    id: 'K_02',
    name: 'Kobe Bryant',
    nbaId: 977,
    pokerValue: 13,
    ppg: 25.0,
    rpg: 5.2,
    apg: 4.7,
    skillDescription: '【曼巴精神】处于落后时出牌点数+2。',
    category: 'guard'
  },
  {
    id: 'K_03',
    name: 'Giannis Antetokounmpo',
    nbaId: 203507,
    pokerValue: 13,
    ppg: 23.4,
    rpg: 9.8,
    apg: 4.9,
    skillDescription: '【希腊怪物】如果手牌只剩这张牌，牌力翻倍。',
    category: 'forward'
  },
  {
    id: 'K_04',
    name: 'Dirk Nowitzki',
    nbaId: 1717,
    pokerValue: 13,
    ppg: 20.7,
    rpg: 7.5,
    apg: 2.4,
    skillDescription: '【金鸡独立】出牌时不可被任何技能影响。',
    category: 'forward'
  },

  // ===== Q (12) x4 =====
  {
    id: 'Q_01',
    name: 'Dwyane Wade',
    nbaId: 2548,
    pokerValue: 12,
    ppg: 22.0,
    rpg: 4.7,
    apg: 5.4,
    skillDescription: '【闪电侠】出牌速度+1，可以在任意时机额外插入出牌。',
    category: 'guard'
  },
  {
    id: 'Q_02',
    name: 'Oscar Robertson',
    nbaId: 76505,
    pokerValue: 12,
    ppg: 25.7,
    rpg: 7.5,
    apg: 9.5,
    skillDescription: '【三双机器】一次出三张牌时获得额外回合。',
    category: 'guard'
  },
  {
    id: 'Q_03',
    name: 'Kevin Garnett',
    nbaId: 708,
    pokerValue: 12,
    ppg: 17.8,
    rpg: 10.0,
    apg: 3.7,
    skillDescription: '【铁血防守】对手出单张时，可用此牌将其压回手牌。',
    category: 'forward'
  },
  {
    id: 'Q_04',
    name: 'David Robinson',
    nbaId: 764,
    pokerValue: 12,
    ppg: 21.1,
    rpg: 10.6,
    apg: 2.5,
    skillDescription: '【海军上将】出牌后可让对手本回合跳过出牌。',
    category: 'center'
  },

  // ===== J (11) x4 =====
  {
    id: 'J_01',
    name: 'Chris Paul',
    nbaId: 101108,
    pokerValue: 11,
    ppg: 17.5,
    rpg: 4.5,
    apg: 9.4,
    skillDescription: '【控卫之神】可以重新分配本回合要出的牌型。',
    category: 'guard'
  },
  {
    id: 'J_02',
    name: 'John Stockton',
    nbaId: 3044,
    pokerValue: 11,
    ppg: 13.1,
    rpg: 2.7,
    apg: 10.5,
    skillDescription: '【助攻大师】出此牌后队友下一张牌点数+1。',
    category: 'guard'
  },
  {
    id: 'J_03',
    name: 'Julius Erving',
    nbaId: 76667,
    pokerValue: 11,
    ppg: 22.0,
    rpg: 6.7,
    apg: 3.9,
    skillDescription: '【J博士】空中接力：此牌与上家出的最后一张牌连成顺子。',
    category: 'forward'
  },
  {
    id: 'J_04',
    name: 'Scottie Pippen',
    nbaId: 937,
    pokerValue: 11,
    ppg: 16.1,
    rpg: 6.4,
    apg: 5.2,
    skillDescription: '【皮蓬防守】可以复制对手上一轮出的牌型及点数。',
    category: 'forward'
  },

  // ===== 10 (10) x4 =====
  {
    id: '10_01',
    name: 'James Harden',
    nbaId: 201935,
    pokerValue: 10,
    ppg: 25.1,
    rpg: 5.6,
    apg: 6.8,
    skillDescription: '【后撤步】出牌后可以收回此牌重新选择时机出。',
    category: 'guard'
  },
  {
    id: '10_02',
    name: 'Jerry West',
    nbaId: 78396,
    pokerValue: 10,
    ppg: 27.0,
    rpg: 5.8,
    apg: 6.7,
    skillDescription: '【关键先生】作为最后一手出牌时点数视为15。',
    category: 'guard'
  },
  {
    id: '10_03',
    name: 'Moses Malone',
    nbaId: 76504,
    pokerValue: 10,
    ppg: 20.6,
    rpg: 12.2,
    apg: 1.4,
    skillDescription: '【进攻篮板】出牌后可以从弃牌堆回收一张牌到手中。',
    category: 'center'
  },
  {
    id: '10_04',
    name: 'Isiah Thomas',
    nbaId: 78412,
    pokerValue: 10,
    ppg: 19.2,
    rpg: 3.6,
    apg: 9.3,
    skillDescription: '【坏孩子】出牌后让对手随机弃掉一张牌。',
    category: 'guard'
  },

  // ===== 9 (9) x4 =====
  {
    id: '9_01',
    name: 'Luka Dončić',
    nbaId: 1629029,
    pokerValue: 9,
    ppg: 28.7,
    rpg: 8.7,
    apg: 8.3,
    skillDescription: '【东契奇节奏】出牌后可以从队友手牌中借一张牌（下回合归还）。',
    category: 'guard'
  },
  {
    id: '9_02',
    name: 'Allen Iverson',
    nbaId: 947,
    pokerValue: 9,
    ppg: 26.7,
    rpg: 3.7,
    apg: 6.2,
    skillDescription: '【答案】单打出牌时对手无法用任何牌压制。',
    category: 'guard'
  },
  {
    id: '9_03',
    name: 'Charles Barkley',
    nbaId: 787,
    pokerValue: 9,
    ppg: 22.1,
    rpg: 11.7,
    apg: 3.9,
    skillDescription: '【查尔斯爵士】以矮打高：点数比对手牌小3以上时触发，强制压过对手。',
    category: 'forward'
  },
  {
    id: '9_04',
    name: 'Karl Malone',
    nbaId: 639,
    pokerValue: 9,
    ppg: 25.0,
    rpg: 10.1,
    apg: 3.6,
    skillDescription: '【邮差】此牌作为连对的一对时，该连对点数+1。',
    category: 'forward'
  },

  // ===== 8 (8) x4 =====
  {
    id: '8_01',
    name: 'Joel Embiid',
    nbaId: 203954,
    pokerValue: 8,
    ppg: 27.9,
    rpg: 11.2,
    apg: 3.6,
    skillDescription: '【大帝降临】作为单张出牌时点数视为+2。',
    category: 'center'
  },
  {
    id: '8_02',
    name: 'Kawhi Leonard',
    nbaId: 202695,
    pokerValue: 8,
    ppg: 20.0,
    rpg: 6.4,
    apg: 3.0,
    skillDescription: '【卡哇伊锁防】出此牌后可封住对手最大的牌一回合。',
    category: 'forward'
  },
  {
    id: '8_03',
    name: 'Russell Westbrook',
    nbaId: 201566,
    pokerValue: 8,
    ppg: 21.8,
    rpg: 7.0,
    apg: 8.4,
    skillDescription: '【威少暴冲】可以连续出多张相同点数牌，每次+1威力。',
    category: 'guard'
  },
  {
    id: '8_04',
    name: 'Gary Payton',
    nbaId: 707,
    pokerValue: 8,
    ppg: 16.3,
    rpg: 3.9,
    apg: 6.7,
    skillDescription: '【手套】出牌后可以查看对手一张手牌并选择是否弃掉。',
    category: 'guard'
  },

  // ===== 7 (7) x4 =====
  {
    id: '7_01',
    name: 'Anthony Davis',
    nbaId: 203076,
    pokerValue: 7,
    ppg: 24.1,
    rpg: 10.6,
    apg: 2.3,
    skillDescription: '【浓眉遮天】可以盖住自己本轮已出的牌，待后续回合再开启。',
    category: 'forward'
  },
  {
    id: '7_02',
    name: 'Carmelo Anthony',
    nbaId: 2546,
    pokerValue: 7,
    ppg: 22.5,
    rpg: 6.2,
    apg: 2.7,
    skillDescription: '【万花筒】此牌可以拆成两张半张使用（视为点数3.5）。',
    category: 'forward'
  },
  {
    id: '7_03',
    name: 'Patrick Ewing',
    nbaId: 720,
    pokerValue: 7,
    ppg: 21.0,
    rpg: 9.8,
    apg: 1.9,
    skillDescription: '【大猩猩灌篮】出对子时此牌可使对子点数变为14。',
    category: 'center'
  },
  {
    id: '7_04',
    name: 'James Worthy',
    nbaId: 78696,
    pokerValue: 7,
    ppg: 17.6,
    rpg: 5.1,
    apg: 3.0,
    skillDescription: '【关键抢断】出此牌后可随机获得对手一张牌加入手牌。',
    category: 'forward'
  },

  // ===== 6 (6) x4 =====
  {
    id: '6_01',
    name: 'Damian Lillard',
    nbaId: 203081,
    pokerValue: 6,
    ppg: 25.1,
    rpg: 4.2,
    apg: 6.7,
    skillDescription: '【看表时刻】最后一轮压轴出牌时点数翻倍。',
    category: 'guard'
  },
  {
    id: '6_02',
    name: 'Vince Carter',
    nbaId: 1713,
    pokerValue: 6,
    ppg: 16.7,
    rpg: 4.3,
    apg: 3.1,
    skillDescription: '【半人半神】跳过此回合，下一回合出牌点数+3。',
    category: 'guard'
  },
  {
    id: '6_03',
    name: 'Ray Allen',
    nbaId: 701,
    pokerValue: 6,
    ppg: 18.9,
    rpg: 4.1,
    apg: 3.4,
    skillDescription: '【君子雷】底角三分：作为连牌末尾出牌时威力+2。',
    category: 'guard'
  },
  {
    id: '6_04',
    name: 'Reggie Miller',
    nbaId: 3996,
    pokerValue: 6,
    ppg: 18.2,
    rpg: 3.0,
    apg: 3.0,
    skillDescription: '【米勒时刻】关键时刻（剩2张手牌时）此牌点数变为14。',
    category: 'guard'
  },

  // ===== 5 (5) x4 =====
  {
    id: '5_01',
    name: 'Kyrie Irving',
    nbaId: 202681,
    pokerValue: 5,
    ppg: 23.3,
    rpg: 4.0,
    apg: 5.7,
    skillDescription: '【关键先生】运球过人：出此牌可以立刻再出一张小王或大王。',
    category: 'guard'
  },
  {
    id: '5_02',
    name: 'Jason Kidd',
    nbaId: 467,
    pokerValue: 5,
    ppg: 12.6,
    rpg: 6.3,
    apg: 8.7,
    skillDescription: '【基不攻】可以将此牌与手牌中任意一张牌组合成对子。',
    category: 'guard'
  },
  {
    id: '5_03',
    name: 'Steve Nash',
    nbaId: 959,
    pokerValue: 5,
    ppg: 14.3,
    rpg: 3.0,
    apg: 8.5,
    skillDescription: '【风之子】盘活队友：队友（农民）出牌后你可跟一张此牌，跟牌点数+1。',
    category: 'guard'
  },
  {
    id: '5_04',
    name: 'Bob Cousy',
    nbaId: 76001,
    pokerValue: 5,
    ppg: 18.4,
    rpg: 5.2,
    apg: 7.5,
    skillDescription: '【后场魔术】每回合首次出牌时可额外摸一张牌。',
    category: 'guard'
  },

  // ===== 4 (4) x4 =====
  {
    id: '4_01',
    name: 'Paul Pierce',
    nbaId: 1718,
    pokerValue: 4,
    ppg: 19.7,
    rpg: 5.6,
    apg: 3.5,
    skillDescription: '【真理】出牌后可以宣言一个数字，该数字的牌本局视为不存在。',
    category: 'forward'
  },
  {
    id: '4_02',
    name: 'Chris Bosh',
    nbaId: 2547,
    pokerValue: 4,
    ppg: 19.2,
    rpg: 8.5,
    apg: 2.0,
    skillDescription: '【龙王怒吼】作为三带一中的"一"时，三张主牌点数+1。',
    category: 'forward'
  },
  {
    id: '4_03',
    name: 'Dennis Rodman',
    nbaId: 56,
    pokerValue: 4,
    ppg: 7.3,
    rpg: 13.1,
    apg: 1.8,
    skillDescription: '【大虫篮板】出牌后可再摸一张牌（篮板球）。',
    category: 'forward'
  },
  {
    id: '4_04',
    name: 'Tony Parker',
    nbaId: 2225,
    pokerValue: 4,
    ppg: 15.5,
    rpg: 2.7,
    apg: 5.6,
    skillDescription: '【法国跑车】加速运转：出牌后可以让队友出一张牌。',
    category: 'guard'
  },

  // ===== 3 (3) x4 =====
  {
    id: '3_01',
    name: 'Klay Thompson',
    nbaId: 202691,
    pokerValue: 3,
    ppg: 19.5,
    rpg: 3.5,
    apg: 2.3,
    skillDescription: '【汤神爆发】单节37分：连续出三张相同点数时，下一张牌点数变为15。',
    category: 'guard'
  },
  {
    id: '3_02',
    name: 'Manu Ginóbili',
    nbaId: 1932,
    pokerValue: 3,
    ppg: 13.3,
    rpg: 3.5,
    apg: 3.8,
    skillDescription: '【妖刀出鞘】蛇形突破：出牌顺序可以任意变化，不受轮次限制。',
    category: 'guard'
  },
  {
    id: '3_03',
    name: 'Draymond Green',
    nbaId: 203110,
    pokerValue: 3,
    ppg: 8.7,
    rpg: 6.9,
    apg: 5.5,
    skillDescription: '【追梦防守】可以抵消对手一次技能效果。',
    category: 'forward'
  },
  {
    id: '3_04',
    name: 'Robert Horry',
    nbaId: 588,
    pokerValue: 3,
    ppg: 7.0,
    rpg: 4.8,
    apg: 2.1,
    skillDescription: '【关键三分】出此牌作为最后一手时，此牌点数变为14。',
    category: 'forward'
  }
];

// 按pokerValue排序
playersData.sort((a, b) => b.pokerValue - a.pokerValue);

export default playersData;
