'use strict';

const { test } = require('tap');
const EventEmitter = require('events');
const SubstrateEngine = require('..');

const script = {
  config: {
    target: 'some-node'
  },
  scenarios: [{
    name: 'Get Rpc methods',
    engine: 'substrate',
    flow: [
      {
        get: {
          method: 'rpcMethods'
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
  t.end();
});
