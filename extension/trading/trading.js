const STORAGE_KEY = "tabs_manager_pro_trading_v3";
const OLD_STORAGE_KEY_V2 = "tabs_manager_pro_trading_v2";
const OLD_STORAGE_KEY_V1 = "tabs_manager_pro_trading_v1";
const PLANNER_KEY = "tabs_manager_pro_planner_v2";
const API_ENDPOINT_KEY = "tabs_manager_pro_trading_api_endpoint";

let stocks = loadStocks();
let selectedId = null;
let editingId = null;
let apiOnline = false;
let lastUpdateAt = "";

function makeId(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayString() {
  return getLocalDateString(new Date());
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function loadStocks() {
  try {
    const v3 = localStorage.getItem(STORAGE_KEY);
    if (v3) return JSON.parse(v3).map(migrateStock);

    const v2 = localStorage.getItem(OLD_STORAGE_KEY_V2);
    if (v2) return JSON.parse(v2).map(migrateStock);

    const v1 = localStorage.getItem(OLD_STORAGE_KEY_V1);
    if (v1) return JSON.parse(v1).map(migrateStock);
  } catch {
    return [];
  }

  return [];
}

function saveStocks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
}

function getApiEndpoint() {
  return (localStorage.getItem(API_ENDPOINT_KEY) || "http://127.0.0.1:8787").replace(/\/+$/, "");
}

function saveApiEndpoint() {
  const input = document.getElementById("apiEndpointInput");
  const value = (input.value || "http://127.0.0.1:8787").replace(/\/+$/, "");
  localStorage.setItem(API_ENDPOINT_KEY, value);
  input.value = value;
  setApiMessage("API Endpoint 已儲存：" + value);
}

function defaultStock() {
  return {
    id: makeId("stock"),
    symbol: "",
    name: "",
    market: "TW",
    currentPrice: "",
    changePercent: "",
    priority: "P2",
    mainRating: "B",
    tags: [],

    dayTrade: {
      timeframe: "今日盤中 / 不留倉",
      rating: "B-",
      noChase: "",
      buyZone: "",
      turnStrong: "",
      strong: "",
      stopLoss: "",
      conclusion: ""
    },

    shortTerm: {
      timeframe: "1-10 個交易日",
      rating: "B",
      buy1: "",
      buy2: "",
      takeProfit: "",
      strongResistance: "",
      stopLoss: "",
      conclusion: ""
    },

    midTerm: {
      timeframe: "2-8 週",
      rating: "B",
      idealBuy: "",
      betterBuy: "",
      turnStrong: "",
      target: "",
      defense: "",
      failure: "",
      conclusion: ""
    },

    longTerm: {
      timeframe: "3-12 個月以上",
      rating: "B",
      batch: "",
      core: "",
      noChase: "",
      takeProfit: "",
      breakLevel: "",
      conclusion: ""
    },

    backtest: {
      winRate: "",
      avgProfit: "",
      avgLoss: "",
      profitFactor: "",
      sharpe: "",
      maxDrawdown: "",
      similarity: "",
      confidence: "",
      backendScore: "",
      backendStatus: "",
      ev: 0
    },

    decision: {
      action: "觀察",
      chase: "不追",
      buyZone: "",
      stopLoss: "",
      takeProfit: "",
      risk: "中",
      summary: "",
      backendSignalMessage: ""
    },

    backend: {
      lastSyncAt: "",
      rawStatus: "",
      rawSignal: null
    },

    updatedAt: new Date().toISOString()
  };
}

function migrateStock(stock) {
  const base = defaultStock();
  const merged = {
    ...base,
    ...stock,
    dayTrade: { ...base.dayTrade, ...(stock?.dayTrade || {}) },
    shortTerm: { ...base.shortTerm, ...(stock?.shortTerm || {}) },
    midTerm: { ...base.midTerm, ...(stock?.midTerm || {}) },
    longTerm: { ...base.longTerm, ...(stock?.longTerm || {}) },
    backtest: { ...base.backtest, ...(stock?.backtest || {}) },
    decision: { ...base.decision, ...(stock?.decision || {}) },
    backend: { ...base.backend, ...(stock?.backend || {}) }
  };

  merged.priority = merged.priority || "P2";
  merged.mainRating = merged.mainRating || "B";
  merged.tags = Array.isArray(merged.tags) ? merged.tags : [];
  return merged;
}

function ratingClass(rating) {
  const r = String(rating || "B").toUpperCase();
  if (r.startsWith("A")) return "a";
  if (r.startsWith("B")) return "b";
  return "c";
}

function gradeClass(rating) {
  const r = String(rating || "B").toUpperCase();
  if (r.startsWith("A")) return "grade-a";
  if (r.startsWith("B")) return "grade-b";
  return "grade-c";
}

function riskClass(risk) {
  if (risk === "低") return "risk-low";
  if (risk === "高") return "risk-high";
  return "risk-mid";
}

function priorityClass(priority) {
  return String(priority || "P2").toLowerCase();
}

function getSelectedStock() {
  return stocks.find(s => s.id === selectedId) || null;
}

function calculateEV(backtest) {
  const winRate = toNumber(backtest.winRate) / 100;
  const lossRate = 1 - winRate;
  const avgProfit = toNumber(backtest.avgProfit);
  const avgLoss = Math.abs(toNumber(backtest.avgLoss));

  return (winRate * avgProfit) - (lossRate * avgLoss);
}

function calculateStrategyScore(stock) {
  const b = stock.backtest || {};
  const backendScore = toNumber(b.backendScore);
  if (backendScore > 0) return Math.max(0, Math.min(100, backendScore));

  const winRate = toNumber(b.winRate);
  const pf = toNumber(b.profitFactor);
  const sharpe = toNumber(b.sharpe);
  const drawdown = Math.abs(toNumber(b.maxDrawdown));
  const confidence = toNumber(b.confidence);
  const ev = calculateEV(b);

  let score = 0;

  if (winRate >= 55) score += 20;
  if (winRate >= 60) score += 10;
  if (pf >= 1.3) score += 15;
  if (pf >= 1.5) score += 10;
  if (sharpe >= 1.0) score += 10;
  if (sharpe >= 1.5) score += 10;
  if (drawdown > 0 && drawdown <= 20) score += 10;
  if (ev > 0) score += 15;
  if (confidence >= 70) score += 10;

  return Math.max(0, Math.min(100, score));
}

function deriveActionFromBacktest(stock) {
  const b = stock.backtest || {};
  const ev = calculateEV(b);
  const score = calculateStrategyScore(stock);
  const winRate = toNumber(b.winRate);
  const pf = toNumber(b.profitFactor);
  const confidence = toNumber(b.confidence);

  if (ev > 0 && score >= 70) return "建議試單";
  if (ev > 0 && winRate >= 55 && pf >= 1.3 && confidence >= 60) return "建議試單";
  if (ev > 0 && winRate >= 52) return "可小量試單";
  if (ev <= 0 && winRate > 0) return "等待回測";
  return "觀察";
}

function parseRangeNumbers(text) {
  const nums = String(text || "")
    .replace(/,/g, "")
    .match(/\d+(\.\d+)?/g);

  if (!nums || !nums.length) return null;

  const values = nums.map(Number).filter(Number.isFinite);
  if (!values.length) return null;

  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function priceInRange(price, rangeText) {
  const range = parseRangeNumbers(rangeText);
  if (!range) return false;
  return price >= range.min && price <= range.max;
}

function priceNearRange(price, rangeText, percent = 0.5) {
  const range = parseRangeNumbers(rangeText);
  if (!range || price <= 0) return false;

  const distanceToMin = Math.abs(price - range.min) / price * 100;
  const distanceToMax = Math.abs(price - range.max) / price * 100;

  return distanceToMin <= percent || distanceToMax <= percent || priceInRange(price, rangeText);
}

function textIndicatesInvalid(stock) {
  const status = String(stock.backtest?.backendStatus || stock.backend?.rawStatus || "").toUpperCase();
  if (status.includes("INVALID") || status.includes("STOP") || status.includes("BREAK")) return true;

  const msg = [
    stock.decision?.backendSignalMessage,
    stock.backend?.rawStatus,
    stock.decision?.summary
  ].join(" ").toLowerCase();

  return msg.includes("失效") || msg.includes("停損") || msg.includes("跌破");
}

function textIndicatesBuyZone(stock) {
  const status = String(stock.backtest?.backendStatus || stock.backend?.rawStatus || "").toUpperCase();
  if (status.includes("BUY") || status.includes("SUPPORT") || status.includes("WATCH_BUY_ZONE")) return true;

  const price = toNumber(stock.currentPrice);

  return (
    priceNearRange(price, stock.dayTrade?.buyZone) ||
    priceNearRange(price, stock.shortTerm?.buy1) ||
    priceNearRange(price, stock.shortTerm?.buy2) ||
    priceNearRange(price, stock.midTerm?.idealBuy) ||
    priceNearRange(price, stock.midTerm?.betterBuy) ||
    priceNearRange(price, stock.longTerm?.batch) ||
    priceNearRange(price, stock.decision?.buyZone)
  );
}

function getTriggerState(stock) {
  const s = migrateStock(stock);
  const ev = calculateEV(s.backtest);
  const score = calculateStrategyScore(s);

  if (textIndicatesInvalid(s)) return "invalid";
  if (ev > 0 && score >= 70) return "strong";
  if (textIndicatesBuyZone(s)) return "buy-zone";
  return "neutral";
}

function triggerLabel(state) {
  if (state === "invalid") return "失效 / 停損";
  if (state === "strong") return "高信心";
  if (state === "buy-zone") return "進入買區";
  return "一般";
}

function triggerClass(state) {
  if (state === "invalid") return "trigger-invalid";
  if (state === "strong") return "trigger-strong";
  if (state === "buy-zone") return "trigger-buy-zone";
  return "";
}

function setApiStatus(online, text) {
  apiOnline = online;

  const el = document.getElementById("apiStatus");
  if (el) {
    el.textContent = online ? "Online" : "Offline";
    el.className = "status-pill " + (online ? "online" : "offline");
  }

  if (text) setApiMessage(text);
}

function setApiMessage(text) {
  const el = document.getElementById("apiMessage");
  if (el) el.textContent = text;
}

function setLastUpdate(date = new Date()) {
  lastUpdateAt = date.toLocaleString("zh-TW");

  const el = document.getElementById("lastUpdateText");
  if (el) el.textContent = lastUpdateAt;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Accept": "application/json",
      ...(options.headers || {})
    },
    body: options.body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return await response.json();
}

async function checkApiHealth() {
  const endpoint = getApiEndpoint();

  try {
    const data = await fetchJson(endpoint + "/health");
    setApiStatus(true, "API 連線成功。\n" + JSON.stringify(data, null, 2));
    setLastUpdate();
  } catch (error) {
    setApiStatus(false, "API 連線失敗：\n" + error.message);
  }
}

function normalizeSignal(raw) {
  const signal = raw || {};

  const symbol = String(signal.symbol || signal.code || signal.ticker || "").trim();
  const price = signal.price ?? signal.currentPrice ?? signal.close ?? "";
  const changePercent = signal.changePercent ?? signal.change_percent ?? signal.change_pct ?? "";
  const ev = signal.ev ?? signal.expectedValue ?? signal.expected_value ?? "";
  const score = signal.score ?? signal.strategyScore ?? signal.strategy_score ?? "";
  const winRate = signal.winRate ?? signal.win_rate ?? "";
  const profitFactor = signal.profitFactor ?? signal.profit_factor ?? "";
  const maxDrawdown = signal.maxDrawdown ?? signal.max_drawdown ?? "";
  const sharpe = signal.sharpe ?? "";
  const confidence = signal.confidence ?? signal.confidenceScore ?? signal.confidence_score ?? "";
  const status = signal.status ?? signal.signal ?? signal.trigger ?? "";
  const message = signal.message ?? signal.signalMessage ?? signal.signal_message ?? signal.summary ?? "";

  return {
    raw: signal,
    symbol,
    name: signal.name || signal.stockName || signal.stock_name || "",
    price,
    changePercent,
    priority: signal.priority || "",
    action: signal.action || signal.decision || "",
    buyZone: signal.buyZone || signal.buy_zone || signal.support || "",
    stopLoss: signal.stopLoss || signal.stop_loss || signal.invalid || "",
    takeProfit: signal.takeProfit || signal.take_profit || signal.resistance || "",
    risk: signal.risk || "",
    ev,
    score,
    winRate,
    profitFactor,
    maxDrawdown,
    sharpe,
    confidence,
    status,
    message
  };
}

function applySignalToStock(stock, normalized) {
  const s = migrateStock(stock);

  if (normalized.name && !s.name) s.name = normalized.name;
  if (normalized.price !== "") s.currentPrice = String(normalized.price);
  if (normalized.changePercent !== "") s.changePercent = String(normalized.changePercent);
  if (normalized.priority) s.priority = normalized.priority;

  if (normalized.winRate !== "") s.backtest.winRate = String(normalized.winRate);
  if (normalized.profitFactor !== "") s.backtest.profitFactor = String(normalized.profitFactor);
  if (normalized.maxDrawdown !== "") s.backtest.maxDrawdown = String(normalized.maxDrawdown);
  if (normalized.sharpe !== "") s.backtest.sharpe = String(normalized.sharpe);
  if (normalized.confidence !== "") s.backtest.confidence = String(normalized.confidence);
  if (normalized.score !== "") s.backtest.backendScore = String(normalized.score);
  if (normalized.status) s.backtest.backendStatus = String(normalized.status);

  if (normalized.ev !== "") {
    s.backtest.ev = toNumber(normalized.ev);
  } else {
    s.backtest.ev = calculateEV(s.backtest);
  }

  if (normalized.action) s.decision.action = normalized.action;
  if (normalized.buyZone) s.decision.buyZone = normalized.buyZone;
  if (normalized.stopLoss) s.decision.stopLoss = normalized.stopLoss;
  if (normalized.takeProfit) s.decision.takeProfit = normalized.takeProfit;
  if (normalized.risk) s.decision.risk = normalized.risk;
  if (normalized.message) s.decision.backendSignalMessage = normalized.message;

  if (normalized.message) {
    const existing = s.decision.summary || "";
    if (!existing.includes(normalized.message)) {
      s.decision.summary = [
        normalized.message,
        existing
      ].filter(Boolean).join("\n\n");
    }
  }

  s.backend = {
    lastSyncAt: new Date().toISOString(),
    rawStatus: normalized.status,
    rawSignal: normalized.raw
  };

  s.updatedAt = new Date().toISOString();

  return s;
}

async function syncAllSignals() {
  const endpoint = getApiEndpoint();

  try {
    setApiMessage("正在從 Python Engine 同步 /signals ...");

    let payload;
    try {
      payload = await fetchJson(endpoint + "/signals");
    } catch {
      payload = { signals: [] };

      for (const stock of stocks) {
        if (!stock.symbol) continue;
        const item = await fetchJson(endpoint + "/signal/" + encodeURIComponent(stock.symbol));
        payload.signals.push(item);
      }
    }

    const signals = Array.isArray(payload) ? payload : (payload.signals || payload.data || []);
    const map = new Map();

    for (const raw of signals) {
      const n = normalizeSignal(raw);
      if (n.symbol) map.set(n.symbol, n);
    }

    let updated = 0;

    stocks = stocks.map(stock => {
      const symbol = String(stock.symbol || "").trim();
      if (!symbol || !map.has(symbol)) return stock;

      updated += 1;
      return applySignalToStock(stock, map.get(symbol));
    });

    saveStocks();
    setApiStatus(true, `同步完成：更新 ${updated} 檔股票。\n來源：${endpoint}`);
    setLastUpdate();
    render();
  } catch (error) {
    setApiStatus(false, "同步失敗：\n" + error.message);
  }
}

function openModal(id = null) {
  editingId = id;

  const stock = id ? migrateStock(stocks.find(s => s.id === id)) : defaultStock();

  document.getElementById("modalTitle").textContent = id ? "修改股票策略" : "新增股票策略";

  document.getElementById("symbolInput").value = stock.symbol || "";
  document.getElementById("nameInput").value = stock.name || "";
  document.getElementById("marketInput").value = stock.market || "TW";
  document.getElementById("priceInput").value = stock.currentPrice || "";
  document.getElementById("changeInput").value = stock.changePercent || "";
  document.getElementById("priorityInput").value = stock.priority || "P2";
  document.getElementById("mainRatingInput").value = stock.mainRating || "B";
  document.getElementById("tagsInput").value = (stock.tags || []).join(", ");

  document.getElementById("dayTimeframeInput").value = stock.dayTrade?.timeframe || "今日盤中 / 不留倉";
  document.getElementById("dayRatingInput").value = stock.dayTrade?.rating || "B-";
  document.getElementById("dayNoChaseInput").value = stock.dayTrade?.noChase || "";
  document.getElementById("dayBuyZoneInput").value = stock.dayTrade?.buyZone || "";
  document.getElementById("dayTurnStrongInput").value = stock.dayTrade?.turnStrong || "";
  document.getElementById("dayStrongInput").value = stock.dayTrade?.strong || "";
  document.getElementById("dayStopLossInput").value = stock.dayTrade?.stopLoss || "";
  document.getElementById("dayConclusionInput").value = stock.dayTrade?.conclusion || "";

  document.getElementById("shortTimeframeInput").value = stock.shortTerm?.timeframe || "1-10 個交易日";
  document.getElementById("shortRatingInput").value = stock.shortTerm?.rating || "B";
  document.getElementById("shortBuy1Input").value = stock.shortTerm?.buy1 || "";
  document.getElementById("shortBuy2Input").value = stock.shortTerm?.buy2 || "";
  document.getElementById("shortTakeProfitInput").value = stock.shortTerm?.takeProfit || "";
  document.getElementById("shortStrongResistanceInput").value = stock.shortTerm?.strongResistance || "";
  document.getElementById("shortStopLossInput").value = stock.shortTerm?.stopLoss || "";
  document.getElementById("shortConclusionInput").value = stock.shortTerm?.conclusion || "";

  document.getElementById("midTimeframeInput").value = stock.midTerm?.timeframe || "2-8 週";
  document.getElementById("midRatingInput").value = stock.midTerm?.rating || "B";
  document.getElementById("midIdealBuyInput").value = stock.midTerm?.idealBuy || "";
  document.getElementById("midBetterBuyInput").value = stock.midTerm?.betterBuy || "";
  document.getElementById("midTurnStrongInput").value = stock.midTerm?.turnStrong || "";
  document.getElementById("midTargetInput").value = stock.midTerm?.target || "";
  document.getElementById("midDefenseInput").value = stock.midTerm?.defense || "";
  document.getElementById("midFailureInput").value = stock.midTerm?.failure || "";
  document.getElementById("midConclusionInput").value = stock.midTerm?.conclusion || "";

  document.getElementById("longTimeframeInput").value = stock.longTerm?.timeframe || "3-12 個月以上";
  document.getElementById("longRatingInput").value = stock.longTerm?.rating || "B";
  document.getElementById("longBatchInput").value = stock.longTerm?.batch || "";
  document.getElementById("longCoreInput").value = stock.longTerm?.core || "";
  document.getElementById("longNoChaseInput").value = stock.longTerm?.noChase || "";
  document.getElementById("longTakeProfitInput").value = stock.longTerm?.takeProfit || "";
  document.getElementById("longBreakInput").value = stock.longTerm?.breakLevel || "";
  document.getElementById("longConclusionInput").value = stock.longTerm?.conclusion || "";

  document.getElementById("winRateInput").value = stock.backtest?.winRate || "";
  document.getElementById("avgProfitInput").value = stock.backtest?.avgProfit || "";
  document.getElementById("avgLossInput").value = stock.backtest?.avgLoss || "";
  document.getElementById("profitFactorInput").value = stock.backtest?.profitFactor || "";
  document.getElementById("sharpeInput").value = stock.backtest?.sharpe || "";
  document.getElementById("maxDrawdownInput").value = stock.backtest?.maxDrawdown || "";
  document.getElementById("similarityInput").value = stock.backtest?.similarity || "";
  document.getElementById("confidenceInput").value = stock.backtest?.confidence || "";
  document.getElementById("backendScoreInput").value = stock.backtest?.backendScore || "";
  document.getElementById("backendStatusInput").value = stock.backtest?.backendStatus || "";

  document.getElementById("decisionActionInput").value = stock.decision?.action || "觀察";
  document.getElementById("decisionChaseInput").value = stock.decision?.chase || "不追";
  document.getElementById("decisionBuyZoneInput").value = stock.decision?.buyZone || "";
  document.getElementById("decisionStopLossInput").value = stock.decision?.stopLoss || "";
  document.getElementById("decisionTakeProfitInput").value = stock.decision?.takeProfit || "";
  document.getElementById("decisionRiskInput").value = stock.decision?.risk || "中";
  document.getElementById("backendSignalMessageInput").value = stock.decision?.backendSignalMessage || "";
  document.getElementById("decisionSummaryInput").value = stock.decision?.summary || "";

  document.getElementById("modalMask").style.display = "flex";
}

function closeModal() {
  editingId = null;
  document.getElementById("modalMask").style.display = "none";
}

function readFormStock() {
  const backtest = {
    winRate: document.getElementById("winRateInput").value,
    avgProfit: document.getElementById("avgProfitInput").value,
    avgLoss: document.getElementById("avgLossInput").value,
    profitFactor: document.getElementById("profitFactorInput").value,
    sharpe: document.getElementById("sharpeInput").value,
    maxDrawdown: document.getElementById("maxDrawdownInput").value,
    similarity: document.getElementById("similarityInput").value,
    confidence: document.getElementById("confidenceInput").value,
    backendScore: document.getElementById("backendScoreInput").value,
    backendStatus: document.getElementById("backendStatusInput").value,
    ev: 0
  };

  backtest.ev = calculateEV(backtest);

  return {
    id: editingId || makeId("stock"),
    symbol: document.getElementById("symbolInput").value.trim(),
    name: document.getElementById("nameInput").value.trim(),
    market: document.getElementById("marketInput").value.trim() || "TW",
    currentPrice: document.getElementById("priceInput").value,
    changePercent: document.getElementById("changeInput").value,
    priority: document.getElementById("priorityInput").value,
    mainRating: document.getElementById("mainRatingInput").value,
    tags: document.getElementById("tagsInput").value.split(",").map(x => x.trim()).filter(Boolean),

    dayTrade: {
      timeframe: document.getElementById("dayTimeframeInput").value.trim(),
      rating: document.getElementById("dayRatingInput").value.trim(),
      noChase: document.getElementById("dayNoChaseInput").value.trim(),
      buyZone: document.getElementById("dayBuyZoneInput").value.trim(),
      turnStrong: document.getElementById("dayTurnStrongInput").value.trim(),
      strong: document.getElementById("dayStrongInput").value.trim(),
      stopLoss: document.getElementById("dayStopLossInput").value.trim(),
      conclusion: document.getElementById("dayConclusionInput").value.trim()
    },

    shortTerm: {
      timeframe: document.getElementById("shortTimeframeInput").value.trim(),
      rating: document.getElementById("shortRatingInput").value.trim(),
      buy1: document.getElementById("shortBuy1Input").value.trim(),
      buy2: document.getElementById("shortBuy2Input").value.trim(),
      takeProfit: document.getElementById("shortTakeProfitInput").value.trim(),
      strongResistance: document.getElementById("shortStrongResistanceInput").value.trim(),
      stopLoss: document.getElementById("shortStopLossInput").value.trim(),
      conclusion: document.getElementById("shortConclusionInput").value.trim()
    },

    midTerm: {
      timeframe: document.getElementById("midTimeframeInput").value.trim(),
      rating: document.getElementById("midRatingInput").value.trim(),
      idealBuy: document.getElementById("midIdealBuyInput").value.trim(),
      betterBuy: document.getElementById("midBetterBuyInput").value.trim(),
      turnStrong: document.getElementById("midTurnStrongInput").value.trim(),
      target: document.getElementById("midTargetInput").value.trim(),
      defense: document.getElementById("midDefenseInput").value.trim(),
      failure: document.getElementById("midFailureInput").value.trim(),
      conclusion: document.getElementById("midConclusionInput").value.trim()
    },

    longTerm: {
      timeframe: document.getElementById("longTimeframeInput").value.trim(),
      rating: document.getElementById("longRatingInput").value.trim(),
      batch: document.getElementById("longBatchInput").value.trim(),
      core: document.getElementById("longCoreInput").value.trim(),
      noChase: document.getElementById("longNoChaseInput").value.trim(),
      takeProfit: document.getElementById("longTakeProfitInput").value.trim(),
      breakLevel: document.getElementById("longBreakInput").value.trim(),
      conclusion: document.getElementById("longConclusionInput").value.trim()
    },

    backtest,

    decision: {
      action: document.getElementById("decisionActionInput").value,
      chase: document.getElementById("decisionChaseInput").value,
      buyZone: document.getElementById("decisionBuyZoneInput").value.trim(),
      stopLoss: document.getElementById("decisionStopLossInput").value.trim(),
      takeProfit: document.getElementById("decisionTakeProfitInput").value.trim(),
      risk: document.getElementById("decisionRiskInput").value,
      backendSignalMessage: document.getElementById("backendSignalMessageInput").value.trim(),
      summary: document.getElementById("decisionSummaryInput").value.trim()
    },

    backend: {
      lastSyncAt: "",
      rawStatus: backtest.backendStatus,
      rawSignal: null
    },

    updatedAt: new Date().toISOString()
  };
}

function saveStockFromModal() {
  const stock = readFormStock();

  if (!stock.symbol && !stock.name) {
    alert("請至少輸入股票代號或名稱");
    return;
  }

  if (editingId) {
    const oldStock = stocks.find(s => s.id === editingId);
    stock.backend = oldStock?.backend || stock.backend;
    stocks = stocks.map(s => s.id === editingId ? stock : s);
  } else {
    stocks.unshift(stock);
    selectedId = stock.id;
  }

  saveStocks();
  closeModal();
  render();
}

function deleteStock(id) {
  if (!confirm("確定刪除此股票策略？")) return;

  stocks = stocks.filter(s => s.id !== id);

  if (selectedId === id) {
    selectedId = stocks[0]?.id || null;
  }

  saveStocks();
  render();
}

function autoGenerateDecisionSummary() {
  const temp = readFormStock();
  const ev = calculateEV(temp.backtest);
  const score = calculateStrategyScore(temp);
  const derivedAction = deriveActionFromBacktest(temp);
  const state = getTriggerState(temp);

  document.getElementById("decisionActionInput").value = derivedAction;

  const buyZone =
    temp.decision.buyZone ||
    temp.dayTrade.buyZone ||
    temp.shortTerm.buy1 ||
    temp.midTerm.idealBuy ||
    temp.longTerm.batch;

  const stopLoss =
    temp.decision.stopLoss ||
    temp.dayTrade.stopLoss ||
    temp.shortTerm.stopLoss ||
    temp.midTerm.failure ||
    temp.longTerm.breakLevel;

  const takeProfit =
    temp.decision.takeProfit ||
    temp.shortTerm.takeProfit ||
    temp.midTerm.target ||
    temp.longTerm.takeProfit;

  const backendMsg = temp.decision.backendSignalMessage;

  const lines = [
    `${temp.name || temp.symbol} 目前操作結論：${derivedAction}。`,
    `觸發狀態：${triggerLabel(state)}。`,
    `優先級：${temp.priority}。P1 今日必看，P2 近期追蹤，P3 長期觀察。`,
    temp.currentPrice ? `現價：約 ${temp.currentPrice}。` : "",
    buyZone ? `低接 / 觀察區：${buyZone}。` : "",
    stopLoss ? `失效 / 停損條件：${stopLoss}。` : "",
    takeProfit ? `停利 / 壓力觀察區：${takeProfit}。` : "",
    `策略期望值 EV：約 ${ev.toFixed(2)}。`,
    `策略信心分數：約 ${score}/100。`,
    temp.backtest.winRate ? `回測勝率：${temp.backtest.winRate}%。` : "",
    temp.backtest.profitFactor ? `Profit Factor：${temp.backtest.profitFactor}。` : "",
    temp.backtest.maxDrawdown ? `最大回撤：${temp.backtest.maxDrawdown}%。` : "",
    temp.backtest.similarity ? `歷史相似度：${temp.backtest.similarity}%。` : "",
    backendMsg ? `後端訊號：${backendMsg}` : "",
    "",
    temp.dayTrade.conclusion ? `當沖：${temp.dayTrade.conclusion}` : "",
    temp.shortTerm.conclusion ? `短線：${temp.shortTerm.conclusion}` : "",
    temp.midTerm.conclusion ? `中線：${temp.midTerm.conclusion}` : "",
    temp.longTerm.conclusion ? `長線：${temp.longTerm.conclusion}` : "",
    "",
    "此內容僅供交易計畫整理，不構成投資建議。"
  ].filter(Boolean);

  document.getElementById("decisionBuyZoneInput").value = buyZone;
  document.getElementById("decisionStopLossInput").value = stopLoss;
  document.getElementById("decisionTakeProfitInput").value = takeProfit;
  document.getElementById("decisionSummaryInput").value = lines.join("\n");
}

function filteredStocks() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const priority = document.getElementById("priorityFilter").value;
  const trigger = document.getElementById("triggerFilter").value;
  const rating = document.getElementById("ratingFilter").value;
  const action = document.getElementById("actionFilter").value;

  return stocks.map(migrateStock).filter(stock => {
    if (priority && stock.priority !== priority) return false;
    if (trigger && getTriggerState(stock) !== trigger) return false;
    if (rating && stock.mainRating !== rating) return false;
    if (action && stock.decision?.action !== action) return false;

    const hay = [
      stock.symbol,
      stock.name,
      stock.market,
      stock.priority,
      stock.mainRating,
      stock.decision?.action,
      stock.decision?.summary,
      stock.decision?.backendSignalMessage,
      stock.backend?.rawStatus,
      stock.dayTrade?.conclusion,
      stock.shortTerm?.conclusion,
      stock.midTerm?.conclusion,
      stock.longTerm?.conclusion,
      ...(stock.tags || [])
    ].join(" ").toLowerCase();

    return !q || hay.includes(q);
  });
}

function renderStats() {
  const total = stocks.length;
  const p1 = stocks.filter(s => s.priority === "P1").length;
  const p2 = stocks.filter(s => s.priority === "P2").length;
  const p3 = stocks.filter(s => s.priority === "P3").length;
  const positiveEV = stocks.filter(s => calculateEV(migrateStock(s).backtest) > 0).length;
  const strong = stocks.filter(s => getTriggerState(s) === "strong").length;
  const buyZone = stocks.filter(s => getTriggerState(s) === "buy-zone").length;
  const invalid = stocks.filter(s => getTriggerState(s) === "invalid").length;

  document.getElementById("stats").innerHTML = `
    <div class="stat"><strong>${total}</strong><span>自選股</span></div>
    <div class="stat"><strong>${p1}</strong><span>P1 今日必看</span></div>
    <div class="stat"><strong>${p2}</strong><span>P2 近期追蹤</span></div>
    <div class="stat"><strong>${p3}</strong><span>P3 長期觀察</span></div>
    <div class="stat"><strong>${positiveEV}</strong><span>EV > 0</span></div>
    <div class="stat"><strong>${strong}</strong><span>高信心</span></div>
    <div class="stat"><strong>${buyZone}</strong><span>進入買區</span></div>
    <div class="stat"><strong>${invalid}</strong><span>失效 / 停損</span></div>
  `;
}

function renderStockList() {
  const list = filteredStocks();
  const el = document.getElementById("stockList");

  if (!list.length) {
    el.innerHTML = `<div class="empty">尚無符合條件的股票</div>`;
    return;
  }

  el.innerHTML = list.map(stock => {
    const ev = calculateEV(stock.backtest);
    const score = calculateStrategyScore(stock);
    const state = getTriggerState(stock);

    return `
      <div class="stock-item ${stock.id === selectedId ? "active" : ""} ${triggerClass(state)}" data-action="select-stock" data-id="${stock.id}">
        <div class="stock-title">${escapeHtml(stock.name || "(未命名)")} ${escapeHtml(stock.symbol || "")}</div>
        <div class="stock-sub">
          現價：${escapeHtml(stock.currentPrice || "-")}
          ｜漲跌：${escapeHtml(stock.changePercent || "-")}%
          ｜EV：${ev.toFixed(2)}
          ｜Score：${score}
          ｜狀態：${triggerLabel(state)}
        </div>
        <div class="meta">
          <span class="tag ${priorityClass(stock.priority)}">${escapeHtml(stock.priority || "P2")}</span>
          <span class="tag ${ratingClass(stock.mainRating)}">${escapeHtml(stock.mainRating || "B")}</span>
          <span class="tag ${riskClass(stock.decision?.risk)}">風險 ${escapeHtml(stock.decision?.risk || "中")}</span>
          <span class="tag ${triggerClass(state)}">${triggerLabel(state)}</span>
          <span class="tag">${escapeHtml(stock.decision?.action || "觀察")}</span>
          ${(stock.tags || []).slice(0, 3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function renderDetail() {
  const selected = getSelectedStock();
  const stock = selected ? migrateStock(selected) : null;
  const el = document.getElementById("detailPanel");

  if (!stock) {
    el.className = "empty";
    el.innerHTML = "請選擇或新增一檔股票。";
    return;
  }

  const ev = calculateEV(stock.backtest);
  const score = calculateStrategyScore(stock);
  const state = getTriggerState(stock);

  el.className = "detail-card " + triggerClass(state);

  el.innerHTML = `
    <div class="detail-header">
      <div>
        <div class="detail-title">${escapeHtml(stock.name || "(未命名)")} ${escapeHtml(stock.symbol || "")}</div>
        <div class="detail-sub">
          市場：${escapeHtml(stock.market || "TW")}
          ｜現價：${escapeHtml(stock.currentPrice || "-")}
          ｜漲跌：${escapeHtml(stock.changePercent || "-")}%
          ｜更新：${escapeHtml(new Date(stock.updatedAt || Date.now()).toLocaleString("zh-TW"))}
        </div>
        <div class="meta">
          <span class="tag ${priorityClass(stock.priority)}">${escapeHtml(stock.priority || "P2")}</span>
          <span class="tag ${ratingClass(stock.mainRating)}">主評級 ${escapeHtml(stock.mainRating || "B")}</span>
          <span class="tag ${riskClass(stock.decision?.risk)}">風險 ${escapeHtml(stock.decision?.risk || "中")}</span>
          <span class="tag ${triggerClass(state)}">${triggerLabel(state)}</span>
          <span class="tag">${escapeHtml(stock.decision?.action || "觀察")}</span>
          ${(stock.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>

      <div class="actions">
        <button data-action="edit-stock" data-id="${stock.id}">修改</button>
        <button data-action="sync-one" data-id="${stock.id}">同步此股</button>
        <button class="primary" data-action="send-planner" data-id="${stock.id}">轉 Planner 任務</button>
        <button class="danger" data-action="delete-stock" data-id="${stock.id}">刪除</button>
      </div>
    </div>

    <div class="card-grid">
      ${renderDayTradeCard(stock.dayTrade)}
      ${renderShortCard(stock.shortTerm)}
      ${renderMidCard(stock.midTerm)}
      ${renderLongCard(stock.longTerm)}
    </div>

    <div class="backend-card">
      <h3>後端訊號</h3>
      <div class="kv">
        <div><strong>API 狀態：</strong>${apiOnline ? "Online" : "Offline"}</div>
        <div><strong>Last API update：</strong>${escapeHtml(lastUpdateAt || "-")}</div>
        <div><strong>此股同步時間：</strong>${stock.backend?.lastSyncAt ? escapeHtml(new Date(stock.backend.lastSyncAt).toLocaleString("zh-TW")) : "-"}</div>
        <div><strong>Backend status：</strong>${escapeHtml(stock.backtest?.backendStatus || stock.backend?.rawStatus || "-")}</div>
        <div><strong>Signal message：</strong>${escapeHtml(stock.decision?.backendSignalMessage || "-")}</div>
      </div>
    </div>

    <div class="backtest-card">
      <h3>回測信心指標</h3>
      <div class="kv">
        <div><strong>EV：</strong>${ev.toFixed(2)}</div>
        <div><strong>策略分數：</strong>${score}/100</div>
        <div><strong>勝率：</strong>${escapeHtml(stock.backtest.winRate || "-")}%</div>
        <div><strong>Profit Factor：</strong>${escapeHtml(stock.backtest.profitFactor || "-")}</div>
        <div><strong>Sharpe：</strong>${escapeHtml(stock.backtest.sharpe || "-")}</div>
        <div><strong>最大回撤：</strong>${escapeHtml(stock.backtest.maxDrawdown || "-")}%</div>
        <div><strong>歷史相似度：</strong>${escapeHtml(stock.backtest.similarity || "-")}%</div>
        <div><strong>信心度：</strong>${escapeHtml(stock.backtest.confidence || "-")}%</div>
      </div>
      <div class="score-bar">
        <div class="score-fill ${score >= 70 ? "strong" : score >= 45 ? "warn" : "danger"}" style="width:${score}%"></div>
      </div>
    </div>

    <div class="decision-card">
      <h3>AI Decision Assistant</h3>
      <div class="kv">
        <div><strong>操作結論：</strong>${escapeHtml(stock.decision?.action || "觀察")}</div>
        <div><strong>可否追價：</strong>${escapeHtml(stock.decision?.chase || "不追")}</div>
        <div><strong>低接區：</strong>${escapeHtml(stock.decision?.buyZone || "-")}</div>
        <div><strong>停損線：</strong>${escapeHtml(stock.decision?.stopLoss || "-")}</div>
        <div><strong>停利 / 壓力區：</strong>${escapeHtml(stock.decision?.takeProfit || "-")}</div>
        <div><strong>風險等級：</strong>${escapeHtml(stock.decision?.risk || "中")}</div>
      </div>

      <h3>操作提醒</h3>
      <div class="ai-summary">${escapeHtml(stock.decision?.summary || "尚未建立操作提醒。")}</div>
    </div>
  `;
}

function renderDayTradeCard(data) {
  return `
    <div class="strategy-card ${gradeClass(data?.rating)}">
      <h3>當沖</h3>
      <div class="kv">
        <div><strong>時效：</strong>${escapeHtml(data?.timeframe || "-")}</div>
        <div><strong>評級：</strong>${escapeHtml(data?.rating || "-")}</div>
        <div><strong>不追：</strong>${escapeHtml(data?.noChase || "-")}</div>
        <div><strong>低接觀察：</strong>${escapeHtml(data?.buyZone || "-")}</div>
        <div><strong>轉強：</strong>${escapeHtml(data?.turnStrong || "-")}</div>
        <div><strong>強勢：</strong>${escapeHtml(data?.strong || "-")}</div>
        <div><strong>停損：</strong>${escapeHtml(data?.stopLoss || "-")}</div>
        <div><strong>結論：</strong>${escapeHtml(data?.conclusion || "-")}</div>
      </div>
    </div>
  `;
}

function renderShortCard(data) {
  return `
    <div class="strategy-card ${gradeClass(data?.rating)}">
      <h3>短線</h3>
      <div class="kv">
        <div><strong>時效：</strong>${escapeHtml(data?.timeframe || "-")}</div>
        <div><strong>評級：</strong>${escapeHtml(data?.rating || "-")}</div>
        <div><strong>第一買區：</strong>${escapeHtml(data?.buy1 || "-")}</div>
        <div><strong>第二買區：</strong>${escapeHtml(data?.buy2 || "-")}</div>
        <div><strong>停利：</strong>${escapeHtml(data?.takeProfit || "-")}</div>
        <div><strong>強壓：</strong>${escapeHtml(data?.strongResistance || "-")}</div>
        <div><strong>停損：</strong>${escapeHtml(data?.stopLoss || "-")}</div>
        <div><strong>結論：</strong>${escapeHtml(data?.conclusion || "-")}</div>
      </div>
    </div>
  `;
}

function renderMidCard(data) {
  return `
    <div class="strategy-card ${gradeClass(data?.rating)}">
      <h3>中線</h3>
      <div class="kv">
        <div><strong>時效：</strong>${escapeHtml(data?.timeframe || "-")}</div>
        <div><strong>評級：</strong>${escapeHtml(data?.rating || "-")}</div>
        <div><strong>理想買區：</strong>${escapeHtml(data?.idealBuy || "-")}</div>
        <div><strong>更好買區：</strong>${escapeHtml(data?.betterBuy || "-")}</div>
        <div><strong>轉強：</strong>${escapeHtml(data?.turnStrong || "-")}</div>
        <div><strong>目標：</strong>${escapeHtml(data?.target || "-")}</div>
        <div><strong>防守：</strong>${escapeHtml(data?.defense || "-")}</div>
        <div><strong>失敗：</strong>${escapeHtml(data?.failure || "-")}</div>
        <div><strong>結論：</strong>${escapeHtml(data?.conclusion || "-")}</div>
      </div>
    </div>
  `;
}

function renderLongCard(data) {
  return `
    <div class="strategy-card ${gradeClass(data?.rating)}">
      <h3>長線</h3>
      <div class="kv">
        <div><strong>時效：</strong>${escapeHtml(data?.timeframe || "-")}</div>
        <div><strong>評級：</strong>${escapeHtml(data?.rating || "-")}</div>
        <div><strong>分批：</strong>${escapeHtml(data?.batch || "-")}</div>
        <div><strong>核心區：</strong>${escapeHtml(data?.core || "-")}</div>
        <div><strong>不追：</strong>${escapeHtml(data?.noChase || "-")}</div>
        <div><strong>停利觀察：</strong>${escapeHtml(data?.takeProfit || "-")}</div>
        <div><strong>破壞：</strong>${escapeHtml(data?.breakLevel || "-")}</div>
        <div><strong>結論：</strong>${escapeHtml(data?.conclusion || "-")}</div>
      </div>
    </div>
  `;
}

async function syncOneStock(id) {
  const stock = stocks.find(s => s.id === id);
  if (!stock || !stock.symbol) return;

  const endpoint = getApiEndpoint();

  try {
    setApiMessage(`正在同步 ${stock.symbol} ...`);

    const raw = await fetchJson(endpoint + "/signal/" + encodeURIComponent(stock.symbol));
    const normalized = normalizeSignal(raw);

    stocks = stocks.map(item => {
      if (item.id !== id) return item;
      return applySignalToStock(item, normalized);
    });

    saveStocks();
    setApiStatus(true, `已同步 ${stock.symbol}。\n${normalized.message || ""}`);
    setLastUpdate();
    render();
  } catch (error) {
    setApiStatus(false, `同步 ${stock.symbol} 失敗：\n${error.message}`);
  }
}

function sendToPlanner(id) {
  const stock = migrateStock(stocks.find(s => s.id === id));
  if (!stock) return;

  let planner = {};

  try {
    planner = JSON.parse(localStorage.getItem(PLANNER_KEY) || "{}");
  } catch {
    planner = {};
  }

  const date = todayString();

  if (!planner[date]) {
    planner[date] = {
      focus: [],
      schedules: [],
      tasks: [],
      tabs: [],
      worklogs: [],
      notes: ""
    };
  }

  const ev = calculateEV(stock.backtest);
  const score = calculateStrategyScore(stock);
  const state = getTriggerState(stock);

  planner[date].tasks.push({
    id: makeId("task"),
    title: `檢查 ${stock.name || stock.symbol}：${stock.decision?.action || "觀察"} / ${triggerLabel(state)}`,
    status: "todo",
    priority: stock.priority || "P2",
    category: "Trading",
    tags: ["stock", stock.symbol, triggerLabel(state), ...(stock.tags || [])].filter(Boolean),
    url: "",
    note: [
      `股票：${stock.name || ""} ${stock.symbol || ""}`,
      `優先級：${stock.priority || "P2"}`,
      `觸發狀態：${triggerLabel(state)}`,
      `現價：${stock.currentPrice || "-"}`,
      `EV：${ev.toFixed(2)}`,
      `Score：${score}`,
      `勝率：${stock.backtest?.winRate || "-"}%`,
      `Profit Factor：${stock.backtest?.profitFactor || "-"}`,
      `最大回撤：${stock.backtest?.maxDrawdown || "-"}%`,
      `低接區：${stock.decision?.buyZone || "-"}`,
      `停損線：${stock.decision?.stopLoss || "-"}`,
      `停利 / 壓力區：${stock.decision?.takeProfit || "-"}`,
      "",
      stock.decision?.backendSignalMessage ? `後端訊號：${stock.decision.backendSignalMessage}` : "",
      "",
      stock.decision?.summary || ""
    ].filter(Boolean).join("\n")
  });

  localStorage.setItem(PLANNER_KEY, JSON.stringify(planner));
  alert("已轉成 Planner 今日任務，並帶入後端 signal message。");
}

function seedExamples() {
  if (stocks.length > 0 && !confirm("目前已有資料，仍要加入範例？")) return;

  const example = defaultStock();

  example.symbol = "2308";
  example.name = "台達電";
  example.currentPrice = "2165";
  example.changePercent = "-";
  example.priority = "P1";
  example.mainRating = "A-";
  example.tags = ["電源", "AI", "核心持股"];

  example.dayTrade = {
    timeframe: "今日盤中 / 不留倉",
    rating: "B-",
    noChase: "2165 不追",
    buyZone: "2150-2160",
    turnStrong: "站回 2180",
    strong: "站回 2200",
    stopLoss: "跌破 2150 拉不回",
    conclusion: "當沖 B-，今天走勢偏弱，除非站回 2180-2200，否則不適合追。"
  };

  example.shortTerm = {
    timeframe: "1-10 個交易日",
    rating: "B",
    buy1: "2150-2160",
    buy2: "2100-2130",
    takeProfit: "2220-2250",
    strongResistance: "2280",
    stopLoss: "跌破 2100",
    conclusion: "短線可低接，但不是最強。比台光電弱。"
  };

  example.midTerm = {
    timeframe: "2-8 週",
    rating: "A-",
    idealBuy: "2100-2130",
    betterBuy: "2050-2080",
    turnStrong: "站回 2220",
    target: "2280-2350",
    defense: "2050",
    failure: "跌破 2050",
    conclusion: "台達電中線比短線好，適合等低接，不適合追。"
  };

  example.longTerm = {
    timeframe: "3-12 個月以上",
    rating: "A",
    batch: "2050-2130",
    core: "1950-2050",
    noChase: "2200 以上",
    takeProfit: "2350-2500",
    breakLevel: "跌破 1900",
    conclusion: "長線還是核心型標的，但今天這種盤中轉弱，不要急著追。"
  };

  example.backtest = {
    winRate: "57",
    avgProfit: "6.5",
    avgLoss: "3.8",
    profitFactor: "1.45",
    sharpe: "1.25",
    maxDrawdown: "16",
    similarity: "72",
    confidence: "68",
    backendScore: "70",
    backendStatus: "WATCH_BUY_ZONE",
    ev: 0
  };

  example.backtest.ev = calculateEV(example.backtest);

  example.decision = {
    action: "等待回測",
    chase: "不追",
    buyZone: "2100-2130",
    stopLoss: "跌破 2050",
    takeProfit: "2280-2350",
    risk: "中",
    backendSignalMessage: "現價接近短線第一買區，等待支撐確認。",
    summary: "台達電短線偏弱，但中長線仍有價值。短線不追，等 2100-2130 觀察；若跌破 2050，策略失效。"
  };

  example.backend = {
    lastSyncAt: new Date().toISOString(),
    rawStatus: "WATCH_BUY_ZONE",
    rawSignal: null
  };

  stocks.unshift(example);
  selectedId = example.id;
  saveStocks();
  render();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(stocks, null, 2)], {
    type: "application/json;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "tabs_manager_pro_trading_backup.json";
  a.click();

  URL.revokeObjectURL(url);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("讀取檔案失敗"));

    reader.readAsText(file, "utf-8");
  });
}

async function importJson(file) {
  const text = await readFile(file);
  const data = JSON.parse(text);

  if (!Array.isArray(data)) {
    alert("JSON 格式錯誤，必須是股票陣列");
    return;
  }

  stocks = data.map(migrateStock);
  selectedId = stocks[0]?.id || null;
  saveStocks();
  render();
}

function clearAll() {
  if (!confirm("確定清空全部 Trading Mode 資料？")) return;

  stocks = [];
  selectedId = null;
  saveStocks();
  render();
}

function render() {
  if (!selectedId && stocks.length) {
    selectedId = stocks[0].id;
  }

  renderStats();
  renderStockList();
  renderDetail();
}

document.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === "select-stock") {
    selectedId = id;
    render();
  }

  if (action === "edit-stock") {
    openModal(id);
  }

  if (action === "delete-stock") {
    deleteStock(id);
  }

  if (action === "send-planner") {
    sendToPlanner(id);
  }

  if (action === "sync-one") {
    syncOneStock(id);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("apiEndpointInput").value = getApiEndpoint();

  document.getElementById("saveApiBtn").addEventListener("click", saveApiEndpoint);
  document.getElementById("checkApiBtn").addEventListener("click", checkApiHealth);
  document.getElementById("syncSignalsBtn").addEventListener("click", syncAllSignals);

  document.getElementById("addStockBtn").addEventListener("click", () => openModal());
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("cancelBtn").addEventListener("click", closeModal);
  document.getElementById("saveStockBtn").addEventListener("click", saveStockFromModal);
  document.getElementById("autoDecisionBtn").addEventListener("click", autoGenerateDecisionSummary);

  document.getElementById("searchInput").addEventListener("input", render);
  document.getElementById("priorityFilter").addEventListener("change", render);
  document.getElementById("triggerFilter").addEventListener("change", render);
  document.getElementById("ratingFilter").addEventListener("change", render);
  document.getElementById("actionFilter").addEventListener("change", render);

  document.getElementById("seedBtn").addEventListener("click", seedExamples);
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("clearAllBtn").addEventListener("click", clearAll);

  document.getElementById("importJsonInput").addEventListener("change", event => {
    if (event.target.files[0]) {
      importJson(event.target.files[0]);
    }
  });

  render();
});