(() => {
  "use strict";

  const DEFAULTS = Object.freeze({
    payType: "hourly",
    hourlyPay: 20,
    annualSalary: 60000,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    afterTax: true,
    taxPercent: 25,
    currency: "USD"
  });
  const SETTINGS_KEY = "worthMyTime.settings.v1";
  const HISTORY_KEY = "worthMyTime.history.v1";
  const SUPPORTED_CURRENCIES = new Set(["USD", "CAD", "GBP", "EUR", "AUD", "INR", "JPY"]);

  const form = document.querySelector("#calculator-form");
  const payTypeInputs = [...document.querySelectorAll('input[name="payType"]')];
  const hourlyField = document.querySelector("#hourly-field");
  const salaryField = document.querySelector("#salary-field");
  const weeksField = document.querySelector("#weeks-field");
  const hourlyPay = document.querySelector("#hourly-pay");
  const annualSalary = document.querySelector("#annual-salary");
  const hoursPerWeek = document.querySelector("#hours-per-week");
  const weeksPerYear = document.querySelector("#weeks-per-year");
  const afterTax = document.querySelector("#after-tax");
  const taxField = document.querySelector("#tax-field");
  const taxPercent = document.querySelector("#tax-percent");
  const currency = document.querySelector("#currency");
  const itemName = document.querySelector("#item-name");
  const itemPrice = document.querySelector("#item-price");
  const currencySymbols = [...document.querySelectorAll(".currency-symbol")];
  const resultHeading = document.querySelector("#result-heading");
  const rateLine = document.querySelector("#rate-line");
  const metrics = document.querySelector("#metrics");
  const exactHours = document.querySelector("#exact-hours");
  const workdays = document.querySelector("#workdays");
  const workweeks = document.querySelector("#workweeks");
  const insight = document.querySelector("#insight");
  const shareButton = document.querySelector("#share-button");
  const shareStatus = document.querySelector("#share-status");
  const resetButton = document.querySelector("#reset-button");
  const clearHistoryButton = document.querySelector("#clear-history-button");
  const historyEmpty = document.querySelector("#history-empty");
  const historyList = document.querySelector("#history-list");

  let latestResult = null;
  let history = readStored(HISTORY_KEY, []);
  if (!Array.isArray(history)) history = [];

  function readStored(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeStored(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function parseMoney(value) {
    const cleaned = String(value).replace(/[^0-9.-]/g, "");
    if (!cleaned || cleaned === "." || cleaned === "-") return NaN;
    return Number(cleaned);
  }

  function currencyFormatter(code, options = {}) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: code === "JPY" ? 0 : 2,
      maximumFractionDigits: code === "JPY" ? 0 : 2,
      ...options
    });
  }

  function moneyInputFormatter(code) {
    return new Intl.NumberFormat(undefined, {
      useGrouping: true,
      minimumFractionDigits: code === "JPY" ? 0 : 2,
      maximumFractionDigits: code === "JPY" ? 0 : 2
    });
  }

  function formatMoney(value, code = currency.value) {
    return currencyFormatter(code).format(value);
  }

  function formatInput(element) {
    const value = parseMoney(element.value);
    if (Number.isFinite(value) && value >= 0) element.value = moneyInputFormatter(currency.value).format(value);
  }

  function getPayType() {
    return payTypeInputs.find((input) => input.checked)?.value || "hourly";
  }

  function setError(element, errorId, message) {
    element.setAttribute("aria-invalid", message ? "true" : "false");
    document.querySelector(`#${errorId}`).textContent = message;
  }

  function validateAndCalculate() {
    const payType = getPayType();
    const hourly = parseMoney(hourlyPay.value);
    const salary = parseMoney(annualSalary.value);
    const weeklyHours = Number(hoursPerWeek.value);
    const yearlyWeeks = Number(weeksPerYear.value);
    const deductions = Number(taxPercent.value);
    const price = parseMoney(itemPrice.value);
    let valid = true;

    setError(hourlyPay, "hourly-error", "");
    setError(annualSalary, "salary-error", "");
    setError(hoursPerWeek, "hours-error", "");
    setError(weeksPerYear, "weeks-error", "");
    setError(taxPercent, "tax-error", "");
    setError(itemPrice, "price-error", "");

    if (payType === "hourly" && (!Number.isFinite(hourly) || hourly <= 0)) {
      setError(hourlyPay, "hourly-error", "Enter an hourly pay greater than zero.");
      valid = false;
    }
    if (payType === "salary" && (!Number.isFinite(salary) || salary <= 0)) {
      setError(annualSalary, "salary-error", "Enter an annual salary greater than zero.");
      valid = false;
    }
    if (!Number.isFinite(weeklyHours) || weeklyHours <= 0 || weeklyHours > 168) {
      setError(hoursPerWeek, "hours-error", "Enter weekly hours between 0 and 168.");
      valid = false;
    }
    if (payType === "salary" && (!Number.isFinite(yearlyWeeks) || yearlyWeeks <= 0 || yearlyWeeks > 53)) {
      setError(weeksPerYear, "weeks-error", "Enter weeks between 1 and 53.");
      valid = false;
    }
    if (afterTax.checked && (!Number.isFinite(deductions) || deductions < 0 || deductions >= 100)) {
      setError(taxPercent, "tax-error", "Enter a percentage from 0 to 99.9.");
      valid = false;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError(itemPrice, "price-error", "Enter a valid price of zero or more.");
      valid = false;
    }

    if (!valid) return { valid: false, hasPrice: Number.isFinite(price) && price > 0 };

    const grossHourly = payType === "hourly" ? hourly : salary / (yearlyWeeks * weeklyHours);
    const effectiveHourly = afterTax.checked ? grossHourly * (1 - deductions / 100) : grossHourly;
    if (!Number.isFinite(effectiveHourly) || effectiveHourly <= 0) return { valid: false, hasPrice: price > 0 };

    return {
      valid: true,
      hasPrice: price > 0,
      item: itemName.value.trim(),
      price,
      currency: currency.value,
      grossHourly,
      effectiveHourly,
      totalHours: price / effectiveHourly,
      weeklyHours,
      afterTax: afterTax.checked
    };
  }

  function plural(value, singular, pluralForm = `${singular}s`) {
    return `${value} ${value === 1 ? singular : pluralForm}`;
  }

  function durationPhrase(totalHours) {
    const roundedMinutes = Math.max(0, Math.round(totalHours * 60));
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;
    if (hours === 0) return plural(minutes, "minute");
    if (minutes === 0) return plural(hours, "hour");
    return `${plural(hours, "hour")} ${plural(minutes, "minute")}`;
  }

  function compactUnit(value, unit) {
    const rounded = Math.abs(value - Math.round(value)) < 0.05 ? Math.round(value) : Number(value.toFixed(1));
    return plural(rounded, unit);
  }

  function headlineTime(result) {
    if (result.totalHours < 8) return durationPhrase(result.totalHours);
    if (result.totalHours < result.weeklyHours) return compactUnit(result.totalHours / 8, "workday");
    return compactUnit(result.totalHours / result.weeklyHours, "workweek");
  }

  function insightFor(totalHours) {
    if (totalHours < 1) return "A relatively small time cost.";
    if (totalHours < 4) return "Worth considering against your priorities.";
    if (totalHours < 8) return "This is close to a full workday.";
    if (totalHours <= 40) return "This represents several workdays of your time.";
    return "This represents more than a workweek of your time.";
  }

  function renderResult(result = validateAndCalculate()) {
    if (!result.valid) {
      latestResult = null;
      resultHeading.textContent = result.hasPrice ? "Check your pay details to calculate." : "Enter a price to see its time cost.";
      rateLine.textContent = "Your valid hourly rate will appear here.";
      metrics.hidden = true;
      insight.textContent = "Your result is an estimate based on the details you enter.";
      shareButton.disabled = true;
      return;
    }

    if (!result.hasPrice) {
      latestResult = null;
      resultHeading.textContent = "Enter a price to see its time cost.";
      rateLine.textContent = `At your ${result.afterTax ? "take-home " : ""}rate of ${formatMoney(result.effectiveHourly, result.currency)}/hour`;
      metrics.hidden = true;
      insight.textContent = "Your result is an estimate based on the details you enter.";
      shareButton.disabled = true;
      return;
    }

    latestResult = result;
    resultHeading.textContent = result.item
      ? `To afford ${result.item}, you work ${headlineTime(result)}.`
      : `This purchase costs you ${headlineTime(result)} of work.`;
    rateLine.textContent = `At your ${result.afterTax ? "take-home " : ""}rate of ${formatMoney(result.effectiveHourly, result.currency)}/hour`;
    exactHours.textContent = result.totalHours.toFixed(2);
    workdays.textContent = (result.totalHours / 8).toFixed(2);
    workweeks.textContent = (result.totalHours / result.weeklyHours).toFixed(2);
    metrics.hidden = false;
    insight.textContent = insightFor(result.totalHours);
    shareButton.disabled = false;
  }

  function currentSettings() {
    return {
      payType: getPayType(),
      hourlyPay: parseMoney(hourlyPay.value),
      annualSalary: parseMoney(annualSalary.value),
      hoursPerWeek: Number(hoursPerWeek.value),
      weeksPerYear: Number(weeksPerYear.value),
      afterTax: afterTax.checked,
      taxPercent: Number(taxPercent.value),
      currency: currency.value
    };
  }

  function saveSettings() {
    const settings = currentSettings();
    const numericKeys = ["hourlyPay", "annualSalary", "hoursPerWeek", "weeksPerYear", "taxPercent"];
    if (numericKeys.every((key) => Number.isFinite(settings[key]))) writeStored(SETTINGS_KEY, settings);
  }

  function applySettings(settings) {
    const safe = { ...DEFAULTS, ...(settings && typeof settings === "object" ? settings : {}) };
    payTypeInputs.forEach((input) => { input.checked = input.value === (safe.payType === "salary" ? "salary" : "hourly"); });
    hourlyPay.value = Number.isFinite(Number(safe.hourlyPay)) ? safe.hourlyPay : DEFAULTS.hourlyPay;
    annualSalary.value = Number.isFinite(Number(safe.annualSalary)) ? safe.annualSalary : DEFAULTS.annualSalary;
    hoursPerWeek.value = Number.isFinite(Number(safe.hoursPerWeek)) ? safe.hoursPerWeek : DEFAULTS.hoursPerWeek;
    weeksPerYear.value = Number.isFinite(Number(safe.weeksPerYear)) ? safe.weeksPerYear : DEFAULTS.weeksPerYear;
    afterTax.checked = Boolean(safe.afterTax);
    taxPercent.value = Number.isFinite(Number(safe.taxPercent)) ? safe.taxPercent : DEFAULTS.taxPercent;
    currency.value = SUPPORTED_CURRENCIES.has(safe.currency) ? safe.currency : DEFAULTS.currency;
    updateConditionalFields();
    updateCurrencyDisplay();
  }

  function updateConditionalFields() {
    const salarySelected = getPayType() === "salary";
    hourlyField.hidden = salarySelected;
    salaryField.hidden = !salarySelected;
    weeksField.hidden = !salarySelected;
    taxField.hidden = !afterTax.checked;
  }

  function updateCurrencyDisplay() {
    const code = SUPPORTED_CURRENCIES.has(currency.value) ? currency.value : DEFAULTS.currency;
    const parts = currencyFormatter(code, { currencyDisplay: "narrowSymbol" }).formatToParts(0);
    const symbol = parts.find((part) => part.type === "currency")?.value || code;
    currencySymbols.forEach((node) => { node.textContent = symbol; });
    [hourlyPay, annualSalary, itemPrice].forEach(formatInput);
  }

  function saveHistory(result) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      item: result.item || "Untitled purchase",
      price: result.price,
      currency: result.currency,
      time: durationPhrase(result.totalHours),
      totalHours: result.totalHours,
      timestamp: new Date().toISOString()
    };
    history = [entry, ...history].slice(0, 10);
    writeStored(HISTORY_KEY, history);
    renderHistory();
  }

  function renderHistory() {
    historyList.textContent = "";
    const validHistory = history.filter((entry) => entry && Number.isFinite(Number(entry.price)) && SUPPORTED_CURRENCIES.has(entry.currency)).slice(0, 10);
    historyEmpty.hidden = validHistory.length > 0;
    clearHistoryButton.hidden = validHistory.length === 0;

    validHistory.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-item";
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = entry.id;
      button.setAttribute("aria-label", `Reload ${entry.item}, ${formatMoney(Number(entry.price), entry.currency)}, ${entry.time}`);
      const date = new Date(entry.timestamp);
      button.innerHTML = `<span class="history-name"></span><span class="history-price"></span><span class="history-time"></span><span class="history-date"></span>`;
      button.querySelector(".history-name").textContent = entry.item;
      button.querySelector(".history-price").textContent = formatMoney(Number(entry.price), entry.currency);
      button.querySelector(".history-time").textContent = entry.time;
      button.querySelector(".history-date").textContent = Number.isNaN(date.getTime()) ? "Saved locally" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      li.append(button);
      historyList.append(li);
    });
  }

  function reloadHistoryEntry(id) {
    const entry = history.find((candidate) => candidate.id === id);
    if (!entry) return;
    itemName.value = entry.item === "Untitled purchase" ? "" : entry.item;
    itemPrice.value = Number(entry.price);
    currency.value = entry.currency;
    updateCurrencyDisplay();
    saveSettings();
    renderResult();
    document.querySelector("#result-card").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function shareText(result) {
    const subject = result.item ? `${result.item} (${formatMoney(result.price, result.currency)})` : `A ${formatMoney(result.price, result.currency)} purchase`;
    return `${subject} costs me ${durationPhrase(result.totalHours)} of work at my ${result.afterTax ? "take-home " : ""}rate.`;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy failed");
  }

  async function handleShare() {
    if (!latestResult) return;
    const text = shareText(latestResult);
    shareStatus.textContent = "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Worth My Time", text });
        shareStatus.textContent = "Shared";
      } else {
        await copyText(text);
        shareStatus.textContent = "Copied to clipboard";
      }
    } catch (error) {
      if (error?.name !== "AbortError") shareStatus.textContent = "Couldn’t share this result";
    }
    window.setTimeout(() => { shareStatus.textContent = ""; }, 3000);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateAndCalculate();
    renderResult(result);
    if (result.valid && result.hasPrice) saveHistory(result);
  });

  form.addEventListener("input", (event) => {
    if (event.target.matches('input[name="payType"], #after-tax')) updateConditionalFields();
    saveSettings();
    renderResult();
  });

  currency.addEventListener("change", () => {
    updateCurrencyDisplay();
    saveSettings();
    renderResult();
  });

  [hourlyPay, annualSalary, itemPrice].forEach((element) => {
    element.addEventListener("focus", () => {
      const value = parseMoney(element.value);
      if (Number.isFinite(value)) element.value = String(value);
      element.select();
    });
    element.addEventListener("blur", () => {
      formatInput(element);
      saveSettings();
      renderResult();
    });
  });

  shareButton.addEventListener("click", handleShare);
  historyList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (button) reloadHistoryEntry(button.dataset.id);
  });
  clearHistoryButton.addEventListener("click", () => {
    if (!window.confirm("Clear all recent calculations? This cannot be undone.")) return;
    history = [];
    writeStored(HISTORY_KEY, history);
    renderHistory();
  });
  resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset the calculator to its default settings? Your history will be kept.")) return;
    applySettings(DEFAULTS);
    itemName.value = "";
    itemPrice.value = "0";
    formatInput(itemPrice);
    saveSettings();
    renderResult();
    hourlyPay.focus();
  });

  applySettings(readStored(SETTINGS_KEY, DEFAULTS));
  renderHistory();
  renderResult();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
})();
