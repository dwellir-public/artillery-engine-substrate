// Copyright 2021-2022 Dwellir AB authors & contributors
// SPDX-License-Identifier: Apache-2.0

'use strict';

const async = require('async');
const _ = require('lodash');
const debug = require('debug')('ws');
const engineUtil = require('artillery-core/lib/engine_util');
const ApiPromise = require('@polkadot/api').ApiPromise;
const WsProvider = require('@polkadot/api').WsProvider;
const utils = require('./utils');

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
      console.log(utils.template(requestSpec.log, context));
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
    let spec= requestSpec.call || requestSpec.send;
    return function (context, callback) {
      ee.emit('counter', 'ws.messages_sent', 1);
      ee.emit('rate', 'ws.send_rate');
      utils.call(context, spec, callback);  
    }
  }

  return function (context, callback) {
    return callback(null, context);
  };
};

SubstrateEngine.prototype.compile = function (tasks, _scenarioSpec, ee) {
  const config = this.config;

  return function scenario(substrateContext, callback) {

    function init(cb) {
      ee.emit('started');

      const wsProvider = new WsProvider(config.target);
      ApiPromise
        .create({ provider: wsProvider })
        .then((api) => {
          substrateContext.api = api;
          return cb(null, substrateContext);

        }).catch(err => {
          console.error("Init error:", err)
          ee.emit('error', err.message || err.code);
          return cb(err, {});
        });
    }


    substrateContext._successCount = 0;

    const steps = _.flatten([init, tasks]);

    async.waterfall(steps, function scenarioWaterfallCb(err, context) {
      if (err) {
        debug(err);
      }

      return callback(err, context);
    });
  };
};
