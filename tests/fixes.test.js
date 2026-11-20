/**
 * Unit tests for local fixes: manageIndicator inputs, quote symbol matching.
 * Offline — no TradingView connection needed.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { manageIndicator } from '../src/core/chart.js';
import { _symbolMatches } from '../src/core/data.js';

function deps(studiesBefore, studiesAfter, inputValues) {
  const calls = [];
  let listCalls = 0;
  const evaluate = async (expr) => {
    calls.push(expr);
    if (expr.includes('getAllStudies')) return listCalls++ === 0 ? studiesBefore : studiesAfter;
    if (expr.includes('setInputValues')) return { updated: inputValues };
    return undefined;
  };
  return { _deps: { evaluate }, calls };
}

describe('manageIndicator add — inputs applied after creation', () => {
  it('does not pass inputs to createStudy', async () => {
    const { _deps, calls } = deps(['a'], ['a', 'new1'], { length: 50 });
    await manageIndicator({ action: 'add', indicator: 'Moving Average Exponential', inputs: '{"length":50}', _deps });
    const create = calls.find(c => c.includes('createStudy'));
    assert.ok(create.includes('createStudy("Moving Average Exponential", false, false)'));
  });

  it('applies inputs to the new study and returns them', async () => {
    const { _deps, calls } = deps(['a'], ['a', 'new1'], { length: 50 });
    const r = await manageIndicator({ action: 'add', indicator: 'Moving Average Exponential', inputs: { length: 50 }, _deps });
    assert.equal(r.success, true);
    assert.equal(r.entity_id, 'new1');
    assert.deepEqual(r.updated_inputs, { length: 50 });
    assert.ok(calls.some(c => c.includes('getStudyById("new1")')));
  });

  it('returns a clear hint when no study was created', async () => {
    const { _deps } = deps(['a', 'b', 'c', 'd', 'e'], ['a', 'b', 'c', 'd', 'e']);
    const r = await manageIndicator({ action: 'add', indicator: 'Moving Average Exponential', _deps });
    assert.equal(r.success, false);
    assert.equal(r.studies_on_chart, 5);
    assert.match(r.hint, /limit/);
  });
});

describe('quote symbol matching', () => {
  it('matches same symbol with/without exchange', () => {
    assert.equal(_symbolMatches('NASDAQ:NVDA', 'NVDA'), true);
    assert.equal(_symbolMatches('NASDAQ:NVDA', 'nasdaq:nvda'), true);
  });
  it('detects a different symbol or exchange', () => {
    assert.equal(_symbolMatches('KUCOIN:BTCUSDT', 'BVB:SNG'), false);
    assert.equal(_symbolMatches('KUCOIN:BTCUSDT', 'BYBIT:BTCUSDT'), false);
  });
});

import { selectTarget, isChartTarget } from '../src/connection.js';

describe('CDP target selection', () => {
  const tooltip = { type: 'page', url: 'file:///C:/Program%20Files/WindowsApps/TradingView.Desktop_3.5.1/resources/app.asar/app/tooltip/index.html' };
  const newTab = { type: 'page', url: 'file:///C:/Program%20Files/WindowsApps/TradingView.Desktop_3.5.1/resources/app.asar/app/new-tab/index.html' };
  const chart = { type: 'page', url: 'https://www.tradingview.com/chart/VlAHUq1s/' };
  const web = { type: 'page', url: 'https://www.tradingview.com/symbols/BTCUSD/' };

  it('prefers the chart tab', () => {
    assert.equal(selectTarget([tooltip, newTab, web, chart]), chart);
  });
  it('never selects internal app windows (file://)', () => {
    assert.equal(selectTarget([tooltip, newTab]), null);
  });
  it('falls back to a real tradingview web page', () => {
    assert.equal(selectTarget([tooltip, web]), web);
  });
  it('isChartTarget recognises only chart pages', () => {
    assert.equal(isChartTarget(chart), true);
    assert.equal(isChartTarget(tooltip), false);
    assert.equal(isChartTarget(null), false);
  });
});
