const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');
const moment = require('moment');
const colors = require('colors');

class Child extends EventEmitter {
  constructor(options){
    super(options);
    //初始化进程
  }

  initChild(exec, args) {
    let stdio = ['pipe', 'pipe', 'pipe', 'ipc'];
    args = args || [];
    let worker = spawn(exec, args, {
      cwd: process.cwd(),
      // env: env,
      stdio: stdio
    });
    let pid = worker.pid;

    if (worker.stdout && worker.stderr) {
      worker.stdout.on('data', (chunk) => {
        console.log(`${colors.cyan(moment().format('YYYY-MM-DD HH-MM-SS'))} pid: ${colors.green(pid)} STDOUT`, chunk.toString().trimRight());
      });
      
      worker.stderr.on('data', (chunk) => {
        console.error(`${colors.cyan(moment().format('YYYY-MM-DD HH-MM-SS'))} pid: ${colors.green(pid)} STDERR`, chunk.toString().trimRight());
        this.emit('WORK_ERROR', chunk);
      });
      process.nextTick(() => {
        this.emit('WORK_READY');
      });
      worker.on('exit', (code) => {
        this.emit('WORK_EXIT')
      });
      worker.on('close', (code) => {
        this.emit('WORK_CLOSE')
      });
    }
    return worker;
  }
}

module.exports = Child;