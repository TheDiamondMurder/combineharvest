const balanceEl = document.querySelector("#balance");
const bonusTimer = document.querySelector("#bonus-timer");
const claimBonus = document.querySelector("#claim-bonus");
const betInput = document.querySelector("#bet");
const message = document.querySelector("#message");
const tabs = document.querySelectorAll(".game-tab");
const views = document.querySelectorAll(".game-view");
const moneyCanvas = document.querySelector("#money-canvas");
const moneyCtx = moneyCanvas.getContext("2d");

const storageKey = "jakublabsFakeCasino";
const day = 24 * 60 * 60 * 1000;
let state = loadState();
let blackjack = null;
let rocket = null;
let slotsRunning = false;
let blackjackBusy = false;

function loadState() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  return saved || { balance: 5000, nextBonusAt: 0 };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function formatCoins(value) {
  return Math.floor(value).toLocaleString();
}

function setMessage(text) {
  message.textContent = text;
  message.classList.remove("message-pop");
  void message.offsetWidth;
  message.classList.add("message-pop");
}

function updateBalance() {
  balanceEl.textContent = formatCoins(state.balance);
  saveState();
}

function getBet() {
  return Math.max(10, Math.floor(Number(betInput.value) || 10));
}

function canBet(amount) {
  if (state.balance < amount) {
    setMessage("Not enough fake coins. Wait for the daily bonus.");
    return false;
  }
  return true;
}

function chargeBet(amount) {
  if (!canBet(amount)) {
    return false;
  }
  state.balance -= amount;
  updateBalance();
  return true;
}

function pay(amount, text) {
  state.balance += Math.floor(amount);
  updateBalance();
  setMessage(text);
}

function drawMoneyGraphic() {
  const width = moneyCanvas.width;
  const height = moneyCanvas.height;
  const money = `${formatCoins(state.balance)} coins`;
  const gradient = moneyCtx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111113");
  gradient.addColorStop(0.48, "#030303");
  gradient.addColorStop(1, "#17180e");
  moneyCtx.fillStyle = gradient;
  moneyCtx.fillRect(0, 0, width, height);

  moneyCtx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  moneyCtx.lineWidth = 1;
  for (let position = 0; position <= width; position += 72) {
    moneyCtx.beginPath();
    moneyCtx.moveTo(position, 0);
    moneyCtx.lineTo(position, height);
    moneyCtx.stroke();
    moneyCtx.beginPath();
    moneyCtx.moveTo(0, position);
    moneyCtx.lineTo(width, position);
    moneyCtx.stroke();
  }

  moneyCtx.fillStyle = "#a6a6a0";
  moneyCtx.font = "760 46px Inter, Arial, sans-serif";
  moneyCtx.textAlign = "center";
  moneyCtx.fillText("im a professional gambling addict and i have", width / 2, 345);

  moneyCtx.fillStyle = "#e9ff70";
  moneyCtx.font = "900 148px Inter, Arial, sans-serif";
  moneyCtx.fillText(money, width / 2, 570);

  moneyCtx.fillStyle = "#a6a6a0";
  moneyCtx.font = "760 46px Inter, Arial, sans-serif";
  moneyCtx.fillText("left", width / 2, 675);

  moneyCtx.strokeStyle = "rgba(233, 255, 112, 0.45)";
  moneyCtx.lineWidth = 4;
  moneyCtx.beginPath();
  moneyCtx.moveTo(260, 760);
  moneyCtx.lineTo(940, 760);
  moneyCtx.stroke();

  moneyCtx.fillStyle = "rgba(245, 245, 240, 0.82)";
  moneyCtx.font = "820 42px Inter, Arial, sans-serif";
  moneyCtx.fillText("jakublabs.xyz", width / 2, 1044);

  const link = document.createElement("a");
  link.href = moneyCanvas.toDataURL("image/png");
  link.download = "fake-casino-balance.png";
  link.click();
}

function updateBonusTimer() {
  const now = Date.now();

  if (now >= state.nextBonusAt) {
    bonusTimer.textContent = "ready";
    claimBonus.disabled = false;
    return;
  }

  claimBonus.disabled = true;
  const remaining = state.nextBonusAt - now;
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  bonusTimer.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

claimBonus.addEventListener("click", () => {
  if (Date.now() < state.nextBonusAt) {
    return;
  }

  state.balance += 1000;
  state.nextBonusAt = Date.now() + day;
  updateBalance();
  updateBonusTimer();
  setMessage("Daily 1,000 fake coins claimed.");
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    views.forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.game}`).classList.add("active");
  });
});

function createDeck() {
  const suits = ["\u2660", "\u2665", "\u2666", "\u2663"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return suits.flatMap((suit) => ranks.map((rank) => ({ rank, suit }))).sort(() => Math.random() - 0.5);
}

function cardValue(card) {
  if (card.rank === "A") return 11;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return Number(card.rank);
}

function handValue(hand) {
  let total = hand.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function setBlackjackButtons(disabled) {
  document.querySelector("#blackjack-deal").disabled = disabled || !!blackjack?.active;
  document.querySelector("#blackjack-hit").disabled = disabled || !blackjack?.active;
  document.querySelector("#blackjack-stand").disabled = disabled || !blackjack?.active;
}

function createCardElement(card, hidden = false) {
  const item = document.createElement("span");
  item.className = hidden ? "card hidden-card" : "card";

  if (!hidden && (card.suit === "\u2665" || card.suit === "\u2666")) {
    item.classList.add("red");
  }

  item.textContent = hidden ? "?" : `${card.rank}${card.suit}`;
  return item;
}

function renderCards(target, hand, hiddenIndexes = []) {
  document.querySelector(target).replaceChildren(
    ...hand.map((card, index) => createCardElement(card, hiddenIndexes.includes(index))),
  );
}

function renderBlackjack() {
  renderCards("#dealer-cards", blackjack.dealer, blackjack.hideDealerHole ? [1] : []);
  renderCards("#player-cards", blackjack.player);
}

async function dealInitialBlackjackCards(deck) {
  blackjack.dealer = [];
  blackjack.player = [];

  blackjack.player.push(deck.pop());
  renderBlackjack();
  await sleep(320);
  blackjack.dealer.push(deck.pop());
  renderBlackjack();
  await sleep(320);
  blackjack.player.push(deck.pop());
  renderBlackjack();
  await sleep(320);
  blackjack.dealer.push(deck.pop());
  renderBlackjack();
}

async function resolveNaturalBlackjack() {
  const player = handValue(blackjack.player);
  const dealer = handValue(blackjack.dealer);

  if (player !== 21) {
    return false;
  }

  blackjack.active = false;
  blackjack.hideDealerHole = false;
  setMessage("Blackjack. Revealing dealer card...");
  renderBlackjack();
  await sleep(700);

  if (dealer === 21) {
    pay(blackjack.bet, "Both hit blackjack. Push.");
  } else {
    pay(blackjack.bet * 2.5, `Blackjack. Paid 1.5x profit on ${formatCoins(blackjack.bet)}.`);
  }

  return true;
}

async function resolveDealerTurn() {
  blackjack.hideDealerHole = false;
  renderBlackjack();
  await sleep(700);

  while (handValue(blackjack.dealer) < 17) {
    setMessage("Dealer draws...");
    await sleep(520);
    blackjack.dealer.push(blackjack.deck.pop());
    renderBlackjack();
    await sleep(520);
  }

  blackjack.active = false;
  const player = handValue(blackjack.player);
  const dealer = handValue(blackjack.dealer);

  if (dealer > 21 || player > dealer) pay(blackjack.bet * 2, `You win blackjack. ${player} beats ${dealer}.`);
  else if (player === dealer) pay(blackjack.bet, `Push. Both had ${player}.`);
  else setMessage(`Dealer wins. ${dealer} beats ${player}.`);
}

document.querySelector("#blackjack-deal").addEventListener("click", async () => {
  if (blackjackBusy) return;
  const bet = getBet();
  if (!chargeBet(bet)) return;
  const deck = createDeck();
  blackjackBusy = true;
  blackjack = {
    bet,
    deck,
    dealer: [],
    player: [],
    active: true,
    hideDealerHole: true,
  };
  setBlackjackButtons(true);
  setMessage("Dealing...");
  await dealInitialBlackjackCards(deck);
  if (await resolveNaturalBlackjack()) {
    blackjackBusy = false;
    setBlackjackButtons(false);
    return;
  }
  setMessage(`Blackjack started. Your hand is ${handValue(blackjack.player)}.`);
  blackjackBusy = false;
  setBlackjackButtons(false);
});

document.querySelector("#blackjack-hit").addEventListener("click", async () => {
  if (!blackjack?.active || blackjackBusy) return;
  blackjackBusy = true;
  setBlackjackButtons(true);
  setMessage("Drawing a card...");
  await sleep(260);
  blackjack.player.push(blackjack.deck.pop());
  renderBlackjack();
  await sleep(320);
  const value = handValue(blackjack.player);
  if (value > 21) {
    blackjack.active = false;
    setMessage("Bust. The fake house wins.");
  } else if (value === 21) {
    setMessage("21. Dealer's turn...");
    await sleep(520);
    await resolveDealerTurn();
  } else {
    setMessage(`Your hand is ${value}.`);
  }
  blackjackBusy = false;
  setBlackjackButtons(false);
});

document.querySelector("#blackjack-stand").addEventListener("click", async () => {
  if (!blackjack?.active || blackjackBusy) return;
  blackjackBusy = true;
  setBlackjackButtons(true);
  setMessage("Dealer reveals the hidden card...");
  await resolveDealerTurn();
  blackjackBusy = false;
  setBlackjackButtons(false);
});

const plinkoMultipliers = [0.2, 0.5, 1, 2, 5, 2, 1, 0.5, 0.2];
const plinkoBoard = document.querySelector("#plinko-board");
const plinkoStage = document.querySelector("#plinko-stage");

function buildPlinkoBoard() {
  const pieces = [];
  const rows = 8;

  for (let row = 0; row < rows; row += 1) {
    const count = row + 3;
    for (let col = 0; col < count; col += 1) {
      const peg = document.createElement("span");
      peg.className = "peg";
      peg.dataset.row = row;
      peg.dataset.col = col;
      peg.style.left = `${50 + (col - (count - 1) / 2) * 9}%`;
      peg.style.top = `${12 + row * 8}%`;
      pieces.push(peg);
    }
  }

  plinkoMultipliers.forEach((multiplier, index) => {
    const slot = document.createElement("span");
    slot.className = "plinko-slot";
    slot.textContent = `${multiplier}x`;
    slot.style.left = `${7 + index * 10.75}%`;
    pieces.push(slot);
  });

  plinkoBoard.replaceChildren(...pieces);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function flashPeg(row, col) {
  const peg = plinkoBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (!peg) return;
  peg.classList.add("hit");
  setTimeout(() => peg.classList.remove("hit"), 180);
}

function placeBall(ball, x, y, rotation = 0) {
  ball.style.left = `${x}%`;
  ball.style.top = `${y}%`;
  ball.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
}

function createPlinkoPath() {
  const rows = 8;
  const path = [];
  let slot = 4;
  let x = 50;
  let rotation = 0;

  path.push({ x, y: 5, rotation, row: -1, col: -1 });

  for (let row = 0; row < rows; row += 1) {
    const count = row + 3;
    const drift = Math.random() > 0.5 ? 1 : -1;
    const pegCol = Math.max(0, Math.min(count - 1, Math.round((count - 1) / 2 + slot - 4)));
    const bounce = drift * (3.5 + Math.random() * 2.5);
    const wobble = (Math.random() - 0.5) * 2.5;

    slot = Math.max(0, Math.min(8, slot + drift));
    x = Math.max(6, Math.min(94, x + bounce + wobble));
    rotation += drift * (28 + Math.random() * 24);

    path.push({
      x,
      y: 13 + row * 8,
      rotation,
      row,
      col: pegCol,
    });

    x = 7 + slot * 10.75 + 4 + (Math.random() - 0.5) * 3;
    rotation += drift * 18;
    path.push({
      x,
      y: 17 + row * 8,
      rotation,
      row,
      col: pegCol,
    });
  }

  path.push({
    x: 7 + slot * 10.75 + 4,
    y: 88,
    rotation: rotation + 90,
    row: rows,
    col: slot,
  });

  return { path, slot };
}

document.querySelector("#drop-plinko").addEventListener("click", async () => {
  const bet = getBet();
  if (!chargeBet(bet)) return;

  const ball = document.createElement("span");
  ball.className = "plinko-ball active";
  plinkoStage.append(ball);

  const { path, slot } = createPlinkoPath();
  placeBall(ball, path[0].x, path[0].y, path[0].rotation);
  await sleep(40);

  for (let step = 1; step < path.length; step += 1) {
    const point = path[step];
    placeBall(ball, point.x, point.y, point.rotation);
    if (point.row >= 0 && point.row < 8) {
      flashPeg(point.row, point.col);
    }
    await sleep(105 + Math.random() * 45);
  }

  ball.classList.add("settled");
  await sleep(220);
  const multiplier = plinkoMultipliers[slot];
  const payout = bet * multiplier;
  pay(payout, `Plinko landed on ${multiplier}x. Paid ${formatCoins(payout)} fake coins.`);
  setTimeout(() => ball.remove(), 900);
});

document.querySelector("#rocket-start").addEventListener("click", () => {
  if (rocket?.active) return;
  const bet = getBet();
  if (!chargeBet(bet)) return;
  rocket = {
    bet,
    active: true,
    multiplier: 1,
    crashAt: 1 + Math.random() * Math.random() * 8,
    timer: null,
  };
  setMessage("Rocket launched. Cash out before it crashes.");
  rocket.timer = setInterval(() => {
    rocket.multiplier += 0.05;
    document.querySelector("#rocket-multiplier").textContent = `${rocket.multiplier.toFixed(2)}x`;
    document.querySelector("#rocket-ship").style.transform = `translateY(-${Math.min(120, rocket.multiplier * 18)}px)`;
    if (rocket.multiplier >= rocket.crashAt) {
      clearInterval(rocket.timer);
      rocket.active = false;
      document.querySelector("#rocket-ship").style.transform = "translateY(0)";
      setMessage(`Rocket crashed at ${rocket.crashAt.toFixed(2)}x.`);
    }
  }, 150);
});

document.querySelector("#rocket-cashout").addEventListener("click", () => {
  if (!rocket?.active) return;
  clearInterval(rocket.timer);
  rocket.active = false;
  const payout = rocket.bet * rocket.multiplier;
  document.querySelector("#rocket-ship").style.transform = "translateY(0)";
  pay(payout, `Cashed out at ${rocket.multiplier.toFixed(2)}x for ${formatCoins(payout)} fake coins.`);
});

function pokerRank(hand) {
  const counts = hand.reduce((map, card) => {
    map[card.rank] = (map[card.rank] || 0) + 1;
    return map;
  }, {});
  const values = Object.values(counts).sort((a, b) => b - a);
  if (values[0] === 4) return ["four of a kind", 25];
  if (values[0] === 3 && values[1] === 2) return ["full house", 10];
  if (values[0] === 3) return ["three of a kind", 4];
  if (values[0] === 2 && values[1] === 2) return ["two pair", 3];
  if (values[0] === 2) return ["pair", 1.5];
  return ["high card", 0];
}

document.querySelector("#poker-deal").addEventListener("click", () => {
  const bet = getBet();
  if (!chargeBet(bet)) return;
  const hand = createDeck().slice(0, 5);
  renderCards("#poker-hand", hand);
  const [rank, multiplier] = pokerRank(hand);
  if (multiplier > 0) pay(bet * multiplier, `${rank}. Paid ${multiplier}x.`);
  else setMessage("High card. No payout.");
});

const slotSymbols = ["7", "\u2605", "\u25c6", "\u262d", "BAR"];
document.querySelector("#spin-slots").addEventListener("click", async () => {
  if (slotsRunning) return;
  const bet = getBet();
  if (!chargeBet(bet)) return;
  slotsRunning = true;
  const spinButton = document.querySelector("#spin-slots");
  const reels = [...document.querySelectorAll("#slots-reels span")];
  spinButton.disabled = true;
  reels.forEach((reel) => reel.classList.add("spinning"));

  for (let tick = 0; tick < 18; tick += 1) {
    reels.forEach((reel) => {
      reel.textContent = slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
    });
    await sleep(70 + tick * 8);
  }

  const result = Array.from({ length: 3 }, () => slotSymbols[Math.floor(Math.random() * slotSymbols.length)]);
  reels.forEach((reel, index) => {
    reel.textContent = result[index];
    reel.classList.remove("spinning");
    reel.classList.add("landed");
    setTimeout(() => reel.classList.remove("landed"), 420);
  });
  const unique = new Set(result).size;
  if (unique === 1) pay(bet * 8, `Triple ${result[0]}. Paid 8x.`);
  else if (unique === 2) pay(bet * 2, "Two matching symbols. Paid 2x.");
  else setMessage("No match. The fake reels were cold.");
  spinButton.disabled = false;
  slotsRunning = false;
});

document.querySelector("#generate-money-graphic").addEventListener("click", () => {
  drawMoneyGraphic();
  setMessage("Balance graphic downloaded.");
});

buildPlinkoBoard();
updateBalance();
updateBonusTimer();
setBlackjackButtons(false);
setInterval(updateBonusTimer, 1000);
