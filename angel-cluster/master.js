const cluster = require('cluster');
const { cpus } = require('os'); 
const AngelServer = require('../server/index.js');
const path = require('path');

let cpusNum = cpus().length;

//更改负载均衡策略
//默认的是操作系统抢占式，就是在一堆工作进程中，闲着的进程对到来的请求进行争抢，谁抢到谁服务。
//对于是否繁忙是由CPU和I/O决定的，但是影响抢占的是CPU，
//对于不同的业务，会有的I/O繁忙，但CPU空闲的情况，这时会造成负载不均衡的情况。
//因此我们使用node的另一种策略，名为轮叫制度。
//启动轮回调度策略
cluster.schedulingPolicy = cluster.SCHED_RR;

//超时
let timeout = null;

//重启次数
let limit = 10;
// 时间
let during = 60000;
let restart = [];

if(cluster.isMaster) {
  //fork多个工作进程
  for(let i = 0; i < cpusNum; i++) {
    creatServer();
  }

} else {
  //worker
  let angelServer = new AngelServer({
    routerUrl: path.join(process.cwd(), 'app/router.js'),//路由地址
    configUrl: path.join(process.cwd(), 'config/config.default.js') //默认读取config/config.default.js
  });

  //服务器优雅退出
  angelServer.app.on('error', err => {
    //发送一个自杀信号
    process.send({ act: 'suicide' });
    cluster.worker.disconnect();
    angelServer.server.close(() => {
      //所有已有连接断开后，退出进程
      process.exit(1);
    });
    //5秒后退出进程
    timeout = setTimeout(() => {
      process.exit(1);
    },5000);
  });
}

// master.js
//创建服务进程  
function creatServer() {
  //检查启动是否太过频繁
  if(isRestartNum()) {
    process.emit('giveup', length, during);
    return;
  }
  let worker = cluster.fork();
  console.log(`工作进程已经重启pid: ${worker.process.pid}`);
  //监听message事件，监听自杀信号，如果有子进程发送自杀信号，则立即重启进程。
  //平滑重启 重启在前，自杀在后。
  worker.on('message', (msg) => {
    //msg为自杀信号，则重启进程
    if(msg.act == 'suicide') {
      creatServer();
    }
  });
  //清理定时器。
  worker.on('disconnect', () => {
    clearTimeout(timeout);
  });

}

// function sendInfo() {
//   //发送一个自杀信号
//   process.send({ act: 'suicide' });
//   cluster.worker.disconnect();
//   //5秒后退出进程
//   timeout = setTimeout(() => {
//     process.exit(1);
//   },5000);
// }

//检查启动次数是否太过频繁，超过一定次数，重新启动。
function isRestartNum() {

  //记录重启的时间
  let time = Date.now();
  let length = restart.push(time);
  if(length > limit) {
    //取出最后10个
    restart = restart.slice(limit * -1);
  }
  //1分钟重启的次数是否太过频繁
  return restart.length >= limit && restart[restart.length - 1] - restart[0] < during;
}

