(function () {
  'use strict';

  var MAX_DIGITS = 12;

  var OPERATORS = {
    '+': { symbol: '+', run: function (a, b) { return a + b; } },
    '-': { symbol: '−', run: function (a, b) { return a - b; } },
    '*': { symbol: '×', run: function (a, b) { return a * b; } },
    '/': { symbol: '÷', run: function (a, b) { return a / b; } }
  };

  var resultEl = document.getElementById('result');
  var expressionEl = document.getElementById('expression');
  var keysEl = document.getElementById('keys');

  var state;
  function resetState() {
    state = {
      current: '0',     // number being typed or shown, as a string
      stored: null,     // first number, waiting for an operator to finish
      operator: null,   // '+', '-', '*', '/'
      fresh: false,     // true: the next digit starts a new number
      expression: '',   // small line above the result
      error: ''         // message shown instead of the result
    };
  }
  resetState();

  /* ---------- Helpers ---------- */

  // Removes floating-point noise: 0.1 + 0.2 -> 0.3
  function tidy(n) {
    return String(parseFloat(n.toPrecision(12)));
  }

  // Adds thousands separators for display: 1234567.8 -> 1,234,567.8
  function pretty(str) {
    if (/e/i.test(str)) return str.replace('e+', 'e');
    var negative = str.charAt(0) === '-';
    var body = negative ? str.slice(1) : str;
    var parts = body.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (negative ? '-' : '') + parts.join('.');
  }

  function fail(message) {
    resetState();
    state.error = message;
  }

  // Returns the result as a string, or null if it can't be calculated
  function calculate(a, b, op) {
    if (op === '/' && b === 0) {
      fail("Can't divide by zero");
      return null;
    }
    var value = OPERATORS[op].run(a, b);
    if (!isFinite(value)) {
      fail('Number is too large');
      return null;
    }
    return tidy(value);
  }

  /* ---------- Actions ---------- */

  function inputDigit(d) {
    if (state.error) resetState();
    if (state.fresh) {
      state.current = d;
      state.fresh = false;
      if (!state.operator) state.expression = '';
      return;
    }
    if (state.current.replace(/[-.]/g, '').length >= MAX_DIGITS) return;
    state.current = state.current === '0' ? d : state.current + d;
  }

  function inputDecimal() {
    if (state.error) resetState();
    if (state.fresh) {
      state.current = '0.';
      state.fresh = false;
      if (!state.operator) state.expression = '';
      return;
    }
    if (state.current.indexOf('.') === -1) state.current += '.';
  }

  function chooseOperator(op) {
    if (state.error) resetState();

    // Changing your mind: 5 + then × -> use ×
    if (state.operator && state.fresh) {
      state.operator = op;
      state.expression = pretty(state.stored) + ' ' + OPERATORS[op].symbol;
      return;
    }

    // Chaining: 5 + 3 then × -> show 8 and wait for the next number
    if (state.operator) {
      var chained = calculate(parseFloat(state.stored), parseFloat(state.current), state.operator);
      if (chained === null) return;
      state.stored = chained;
      state.current = chained;
    } else {
      state.stored = String(parseFloat(state.current));
    }

    state.operator = op;
    state.fresh = true;
    state.expression = pretty(state.stored) + ' ' + OPERATORS[op].symbol;
  }

  function equals() {
    if (state.error || !state.operator) return;
    var a = parseFloat(state.stored);
    var b = parseFloat(state.current);
    var op = state.operator;
    var expression = pretty(state.stored) + ' ' + OPERATORS[op].symbol + ' ' + pretty(String(b)) + ' =';
    var answer = calculate(a, b, op);
    if (answer === null) return;
    state.current = answer;
    state.stored = null;
    state.operator = null;
    state.fresh = true;
    state.expression = expression;
  }

  function percent() {
    if (state.error) return;
    var value = parseFloat(state.current);
    // 200 + 10 %  ->  10% of 200 = 20
    if (state.operator && state.stored !== null) {
      value = parseFloat(state.stored) * value / 100;
    } else {
      value = value / 100;
    }
    state.current = tidy(value);
    state.fresh = true;
  }

  function negate() {
    if (state.error || state.current === '0') return;
    state.current = state.current.charAt(0) === '-' ? state.current.slice(1) : '-' + state.current;
  }

  function backspace() {
    if (state.error) { resetState(); return; }
    if (state.fresh) return;
    state.current = state.current.slice(0, -1);
    if (state.current === '' || state.current === '-') state.current = '0';
  }

  var ACTIONS = {
    digit: function (v) { inputDigit(v); },
    decimal: inputDecimal,
    operator: function (v) { chooseOperator(v); },
    equals: equals,
    percent: percent,
    negate: negate,
    backspace: backspace,
    clear: resetState
  };

  /* ---------- Display ---------- */

  function render() {
    var text = state.error || pretty(state.current);
    resultEl.textContent = text;
    expressionEl.textContent = state.expression;

    resultEl.classList.toggle('is-error', !!state.error);
    resultEl.classList.toggle('is-long', !state.error && text.length > 9 && text.length <= 12);
    resultEl.classList.toggle('is-longer', !state.error && text.length > 12);

    var opButtons = keysEl.querySelectorAll('[data-action="operator"]');
    for (var i = 0; i < opButtons.length; i++) {
      var active = state.operator === opButtons[i].getAttribute('data-value') && state.fresh;
      opButtons[i].classList.toggle('is-active', active);
    }
  }

  /* ---------- Input: mouse, touch and keyboard ---------- */

  keysEl.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-action]');
    if (!button) return;
    ACTIONS[button.getAttribute('data-action')](button.getAttribute('data-value'));
    render();
  });

  var KEY_ALIASES = { 'x': '*', 'X': '*', ',': '.', '=': 'Enter', 'Delete': 'Escape' };

  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    var key = KEY_ALIASES[event.key] || event.key;
    var button = keysEl.querySelector('[data-key="' + key + '"]');
    if (!button) return;

    // Stops Enter from also "clicking" a button that has focus
    event.preventDefault();

    ACTIONS[button.getAttribute('data-action')](button.getAttribute('data-value'));
    render();

    button.classList.add('is-pressed');
    setTimeout(function () { button.classList.remove('is-pressed'); }, 110);
  });

  render();
})();
