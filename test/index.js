'use strict';

const { test } = require('tap');
const EventEmitter = require('events');
const SubstrateEngine = require('..');

const script = {
  config: {
    target: 'wss://moonriver-rpc.dwellir.com',
    phases: [{ duration: 1, arrivalCount: 1 }]
  },
  scenarios: [
    {
      engine: 'substrate',
      flow: [
        {
          call: {
            method: 'api.rpc.chain.getHeader()'
          }
        }
      ]
    }]
};

test('Engine interface', (t) => {
  const events = new EventEmitter();
  const engine = new SubstrateEngine(script, events, {});
  const scenario = engine.createScenario(script.scenarios[0], events);
  t.ok(engine, 'Can construct an engine');
  t.equal(typeof scenario, 'function', 'Can create a scenario');
  scenario();
  t.end();
});