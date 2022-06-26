'use strict';

const { test } = require('tap');
const EventEmitter = require('events');
const SubstrateEngine = require('..');
const utils = require('./../utils');

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
  t.end();
});

test('Render Variables', (t) => {
  let context = {
    vars: {
      varA: "I am A",
      varB: "I am B",
      varC: {
        nested2: {
          nested3: "World"
        }
      }
    }
  }

  let simple = "Hello, {{ varA }} | {{ varB }} | {{ missingVar }}"
  let actual = utils.template(simple, context);
  let expected = "Hello, I am A | I am B | "

  t.equal(actual, expected, "Render top level variables")

  let nested = "Hello {{ varC.nested2.nested3 }}";
  actual = utils.template(nested, context);
  expected = "Hello World"
  t.equal(actual, expected, "Render nested variables")

  t.end()
});