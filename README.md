# Artillery Engine for perf testing Substrate based nodes

[![npm version](https://badge.fury.io/js/artillery-engine-substrate.svg)](https://badge.fury.io/js/artillery-engine-substrate) ![Publish Node.js Package](https://github.com/dwellir-public/artillery-engine-substrate/actions/workflows/deploy.yml/badge.svg)

Stress test substrate based nodes with [Artillery.io](https://artillery.io/)

Sponsored by [Kusama Treasury](https://kusama.polkassembly.io/motion/456)  

## Motivation
We started with looking for a tool to stress test substrate based nodes and previously built a [RPC-perf](https://github.com/dwellir-public/rpc-perf) toolkit. The RPC-perf project served as a good proof of concept but it was lacking in comprehensive workload modelling. 

We chose Artillery because of its modularity and ease of use. We started hacking around it and were able to build this custom engine that is integrated with polkadot.js and makes it easy to script various flows to stress test any substrate based nodes.

## Documentation
### Prerequisites
- node.js version > 14
- npm > 6
### Installation:
- Install artillery and substrate plugin
```sh
npm install -g artillery
npm install -g artillery-engine-substrate
```

### Usage
- Create a script or copy `example/script-basic.yml` to get started
- Run the scenarios
```sh
artillery run --output report.json script.yml
```
- Generate Report
```sh
artillery report report.json
```
### For developers:
If you are looking to use artillery with substrate engine, you can follow the `example/` to get started.

If you are looking to contribute to the engine, you can fork the repository and send a `Pull Request`. Make sure to add test for your changes and all test pass. 

Following are few ideas about the improvements that can be made to the engine
- Support batch transaction
- Improve documentation

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

`config.phases`: Learn more about [load phases](https://docs-nine-inky.vercel.app/docs/guides/guides/test-script-reference#phases---load-phases) in artillery documentation.  

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

The plugin also enable things that is not easy to script via the yaml file.  
Let's try to make a multi query operation
```js
const [{ nonce: accountNonce }, now] = await Promise.all([
   userContext.api.query.system.account(ALICE),
   userContext.api.query.timestamp.now()
]);
```

This can be achieved by defining your custom function. Lets look at an example:

Set config.processor with path to the file with custom function.

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

### Run the scenario

```sh
artillery run my-scenario.yml
```

If artillery and engine are installed only in the project, use
```sh
$(npm bin)/artillery run script.yml
```
### Generate HTML report
```sh
artillery run --output report.json my-scenario.yml
artillery report report.json
```

For non-global installation, use
```sh
$(npm bin)/artillery run --output report.json my-scenario.yml
$(npm bin)/artillery report report.json

```

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)