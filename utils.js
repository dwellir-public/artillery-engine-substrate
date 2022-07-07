// Copyright 2021-2022 Dwellir AB authors & contributors
// SPDX-License-Identifier: Apache-2.0

module.exports = { template, call };

function getValue(outer, fields) {
  if (typeof outer === 'undefined') return '';
  if (fields.length == 0) return outer;

  return getValue(outer[fields[0]], fields.slice(1))
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

function call(context, spec, callback) {
  let method = spec.method || spec;
  let fn = template(method, context);
  exec(context.api, fn)
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
