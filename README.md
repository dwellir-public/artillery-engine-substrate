# Artillery Substrate Engine
[![npm version](https://badge.fury.io/js/artillery-engine-substrate.svg)](https://badge.fury.io/js/artillery-engine-substrate) ![Publish Node.js Package](https://github.com/dwellir-public/artillery-engine-substrate/actions/workflows/deploy.yml/badge.svg)

Stress test substrate based nodes with [Artillery.io](https://artillery.io/)

Sponsored by [Kusama Treasury](https://kusama.polkassembly.io/motion/456)  

## Introduction 
This project is the continuation of [RPC-perf](https://github.com/dwellir-public/rpc-perf) toolkit. The RPC-perf project served as a good proof of concept but lacked comprehensive workload modelling. 

We chose [Artillery.io](https://artillery.io/) because of its maturity, easy of use, modularity and the capability to use polkadot.js client to generate load.

This Substrate Engine for Artillery makes it easy to script virtual user flows in yaml and stress test any substrate based node without developing any code.

## How to use

### Prerequisites
- node.js version > 16
- npm > 6

### Installation:
- Install artillery and substrate plugin
```sh
npm install -g artillery
npm install -g artillery-engine-substrate
```

### Quickstart
- Create a test script or copy `example/script-basic.yml` to get started
- Run the scenarios 
```sh
artillery run --output report.json script.yml
```
- Generate Report
```sh
artillery report report.json
```
You can learn more about [Artillery Test Scripts](https://www.artillery.io/docs/guides/guides/test-script-reference) in the documentation.
### Configuration
```yml
config:
  target: "wss://westend.my-node.xyz"
  phases:
    - duration: 3
      arrivalRate: 1
      name: Engine test phase
  engines:
   substrate: {}
```

`config.target`: The substrate node endpoint (websocket) to connect to.

`config.phases`: Learn more about [load phases](https://www.artillery.io/docs/guides/guides/test-script-reference#phases---load-phases) in artillery documentation.  

`config.engines`: This initializes the artillery Substrate engine.  
  

### Define your scenario

Artillery lets you define multiple scenarios. Each user is randomly assigned a scenario and runs till all the steps in a scenario has ran.

```yml
scenarios:
  - engine: substrate
    name: my_scenario
    flow:
      - connect: "{{ target }}"
      - loop:
        - call: 
            method: api.rpc.chain.getHeader()
            saveTo: header
        - log: "Current hash: {{ header.hash }}"
        - call:
            method: api.rpc.chain.getBlock({{ header.hash }})
            saveTo: block
        - log: "Current Block Number: {{ block.block.header.number }}"
        count: 2
```

To make a call to a rpc method exposed by the node, you can add multiple `call` steps. Refer [substrate json-rpc](https://polkadot.js.org/docs/substrate/rpc/) documentation to see common methods exposed by substrate nodes.  

The response of the call can be accessed by variable `data`. Remember, this can get overwritten by the next `call` action. 

You have the option to instead declare your own variable to save the response to. This can be useful if you want to keep a variable and use it in a action later down in the flow. It is achieved by expanding `call` action to declare a `method` and `saveTo` field. 

If you want to log certain values, you can use `log` action to do so.

```yml
scenarios:
  - engine: substrate
    name: my_scenario
    flow:
      - connect: "{{ target }}"
      - call: api.rpc.chain.getHeader()
      - log: "Current header hash: {{ data.hash }}"
      - call: 
          method: api.rpc.chain.getBlock({{ data.hash }})
          saveTo: blockResponse
      - log: "Current Block Number: {{ blockResponse.block.header.number }}"
```

The actions can also be looped as shown below.

```yml
scenarios:
  - engine: substrate
    name: my_scenario
    flow:
      - connect: "{{ target }}"
      - loop:
        - call: api.rpc.chain.getHeader()
        ...
        count: 100
```
### Advanced usage
It is generally not required to develop any code to run Test Scripts with artillery.

However, the plugin allows using custom javascript functions for complex actions that may not be possible to implement via 
the yaml test script.
 
Let's look at an example, consider the following multi query operation:
```js
const [{ nonce: accountNonce }, now] = await Promise.all([
   userContext.api.query.system.account(ALICE),
   userContext.api.query.timestamp.now()
]);
```

Set config.processor with the path to the file with the custom function.

```yml
config:
  target: "..."
  processor: "./functions.js"
```

Define a scenario with your function
```yml
scenarios:
  - engine: substrate
    name: complex_call
    flow:
      - function: "someComplexCall"
      - log: "Account Nonce {{ accountNonce }}"
      - log: "Last block timestamp {{ now }}"
```

And finally define your function

```js
module.exports = { someComplexCall };
async function someComplexCall(userContext, events, done) {
  const ACCOUNT = '5G********tQY';
  const [{ nonce: accountNonce }, now] = await Promise.all([
   userContext.api.query.system.account(ACCOUNT),
   userContext.api.query.timestamp.now()
  ]);

  userContext.vars.accountNonce = accountNonce;
  userContext.vars.now = now;
  return done();
}
```

Run the scenario and generate the report:

```sh
artillery run --output report.json my-scenario.yml
artillery report report.json
```

### Running with docker
In some cases you may need to test from systems without development tools. You can run and get reports with using docker with: 
```sh
docker run -v $(pwd)/example:/scripts dwellir/artillery-substrate run --output /scripts/report.json /scripts/script.yml
docker run -v $(pwd)/example:/scripts dwellir/artillery-substrate report /scripts/report.json
```

## Contributing to the Artillery Substrate Engine
Bare in mind that Artillery is a rich ecosystem with multiple [plugins](https://www.npmjs.com/search?q=artillery-plugin).
Review the existing plugins in case someone is already working on the required functionality.

If you are looking to contribute to this engine, you can fork the repository and send a `Pull Request`.

### Developing
Please not that:
- Code structure and nomenclature follows Artillery.io conventions.
- The engine logic is in two files, `index.js` and `util.js`.
- When adding a new functionality, please also add a `test` for it.
- To run the tests, use `npm test`.

Few ideas about the improvements that can be made to the engine
- Support for [batch transactions](https://polkadot.js.org/docs/api/cookbook/tx#how-can-i-batch-transactions)
- Documented Examples, including Parachain Specific.

## License and Copyright

Artillery Substrate Engine is Open Source licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)

©2022 [Dwellir AB](https://dwellir.com), Authors and Contributors.