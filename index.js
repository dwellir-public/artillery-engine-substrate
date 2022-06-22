'use strict';

const async = require('async');
const _ = require('lodash');
const debug = require('debug')('ws');
const engineUtil = require('artillery-core/lib/engine_util');
const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;

module.exports = SubstrateEngine;

function SubstrateEngine(script) {
  this.config = script.config;
}

SubstrateEngine.prototype.createScenario = function (scenarioSpec, ee) {
  const self = this;
  const tasks = _.map(scenarioSpec.flow, function (rs) {
    if (rs.think) {
      return engineUtil.createThink(
        rs,
        _.get(self.config, 'defaults.think', {})
      );
    }

    return self.step(rs, ee);
  });

  return self.compile(tasks, scenarioSpec.flow, ee);
};

SubstrateEngine.prototype.step = function (requestSpec, ee) {
  const self = this;

  if (requestSpec.loop) {
    const steps = _.map(requestSpec.loop, function (rs) {
      return self.step(rs, ee);
    });

    return engineUtil.createLoopWithCount(requestSpec.count || -1, steps, {
      loopValue: requestSpec.loopValue || '$loopCount',
      overValues: requestSpec.over,
      whileTrue: self.config.processor
        ? self.config.processor[requestSpec.whileTrue]
        : undefined
    });
  }


  if (requestSpec.think) {
    return engineUtil.createThink(
      requestSpec,
      _.get(self.config, 'defaults.think', {})
    );
  }


  if (requestSpec.function) {
    return function (context, callback) {
      const processFunc = self.config.processor[requestSpec.function];
      if (processFunc) {
        processFunc(context, ee, function () {
          return callback(null, context);
        });
      }
    };
  }


  if (requestSpec.log) {
    return function (context, callback) {
      console.log(template(requestSpec.log, context));
      return process.nextTick(function () {
        callback(null, context);
      });
    };
  }


  if (requestSpec.connect) {
    return function (context, callback) {
      return process.nextTick(function () {
        callback(null, context);
      });
    };
  }


  if (requestSpec.call || requestSpec.send) {
    return call(requestSpec.call || requestSpec.send, ee);
  }


  return function (context, callback) {
    return callback(null, context);
  };
};


function call(spec, ee) {
  return function (context, callback) {
    ee.emit('counter', 'ws.messages_sent', 1);
    ee.emit('rate', 'ws.send_rate');
    let api = context.api;
    let method = spec.method || spec;
    let fn = template(method, context);
    exec(api, fn)
      .then((response) => {
        let varName = spec.saveTo || 'data';
        context.vars[varName] = response;
        return callback(null, context)
      }).catch((err) => {
        debug("err:", err)
        console.log("err:", err);
        return callback(err, null);
      });
  }
}

function exec(api, fn) {
  if (!api) {
    throw 'api not initialised';
  }

  if (fn.substring(0, 4) !== "api.") {
    throw `${method} should start with api.<>`;
  }
  try {
    return eval(fn)
  } catch (e) {
    throw `execution of method ${fn} failed with error ${e}`
  }
}
SubstrateEngine.prototype.compile = function (tasks, scenarioSpec, ee) {
  const config = this.config;

  return function scenario(initialContext, callback) {

    function init(cb) {
      ee.emit('started');

      const wsProvider = new WsProvider(config.target);
      ApiPromise
        .create({ provider: wsProvider })
        .then((api) => {
          initialContext.api = api;
          return cb(null, initialContext);

        }).catch(err => {
          console.error("Init error:", err)
          ee.emit('error', err.message || err.code);
          return cb(err, {});
        });
    }


    initialContext._successCount = 0;

    const steps = _.flatten([init, tasks]);

    async.waterfall(steps, function scenarioWaterfallCb(err, context) {
      if (err) {
        debug(err);
      }

      return callback(err, context);
    });
  };
};

function template(str, context) {
  let vars = context.vars;
  const RX = /{{{?[\s$\w|.]+}}}?/g;
  let result = str.substring(0, str.length);

  while (result.search(RX) > -1) {
    let templateStr = result.match(RX)[0];
    const varNames = templateStr.replace(/{/g, '').replace(/}/g, '').trim().split('.');
    let varValue = getValue(vars, varNames);
    if (typeof varValue === 'object') {
      varValue = JSON.stringify(varValue);
    }
    result = result.replace(templateStr, varValue);
  }

  return result;
}

function getValue(outer, fields) {
  if (typeof outer === 'undefined') return '';
  if (fields.length == 0) return outer;

  return getValue(outer[fields[0]], fields.slice(1))
}