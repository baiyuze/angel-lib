  


const path = require('path');
const AngelServer = require('../server/index.js');
const cluster = require('cluster');
const cp = require('child_process')
let angelServer = new AngelServer({
  routerUrl: path.join(process.cwd(), 'app/router.js'),//路由地址
  configUrl: path.join(process.cwd(), 'config/config.default.js') //默认读取config/config.default.js
});

let server = angelServer.server;
let app = angelServer.app;

let worker = cluster.worker;

process.send({test: 1});

process.on('message', (msg) => {
  console.log(msg,'------process------');
});

app.message.action



