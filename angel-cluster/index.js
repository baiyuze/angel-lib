const cluster = require('cluster');
const http = require('http');
const cpus = require('os').cpus();
const cfork = require('cfork');
const AngelServer = require('../server/index.js');
const path = require('path');
const util = require('util');
//启动轮回调度策略
cluster.schedulingPolicy = cluster.SCHED_RR;

cfork({
  exec: 'lib/angel-cluster/worker.js',
  // slaves: ['/your/app/slave.js'],
  count: require('os').cpus().length,
})
.on('fork', worker => {
  console.warn('进程pid fork进程', Date(), worker.process.pid);
  worker.on('message', (msg) => {
    console.log(msg,'==--=')
    if(msg.test == 1) {
      worker.send('test')
    }
  });
})
.on('disconnect', worker => {
  console.warn('进程断开连接,优雅断开 ====== [%s] [master:%s] wroker:%s disconnect, exitedAfterDisconnect: %s, state: %s.',
    Date(), process.pid, worker.process.pid, worker.exitedAfterDisconnect, worker.state);
})
.on('exit', (worker, code, signal) => {
  const exitCode = worker.process.exitCode;
  const err = new Error(util.format('工作进程退出worker ====== %s died (code: %s, signal: %s, exitedAfterDisconnect: %s, state: %s)',
    worker.process.pid, exitCode, signal, worker.exitedAfterDisconnect, worker.state));
  err.name = 'WorkerDiedError';
  console.error('报错[%s] [master:%s] wroker exit: %s ======-------======', Date(), process.pid, err.stack);
})
.on('unexpectedExit', (worker, code, signal) => {
  // logger what you want
  console.log('======unexpectedExit=====-------')
})
.on('reachReforkLimit', () => {
  // do what you want
  console.log('======reachReforkLimit=====-------')

})
process.on('uncaughtException', err => {
  console.log('======uncaughtException=====-------')

  // do what you want
});
// createWork();


//自动重启进程保证进程数量不变
// function createWork() {
//   let worker = cluster.fork();
//   worker.on('message', (msg) => {
//     if(msg.act === 'suicide') {
//       createWork();
//       console.log('工作进程以重启, pid:' + worker.process.pid);
//     }
//   })
//   worker.on('exit', () => {
//     console.log(worker.process.pid + '被销毁');
//   });
// }

 