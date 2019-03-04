const webpack = require('webpack');
const path = require('path');
const colors = require('colors');

const chokidar = require('chokidar');
const cluster = require('cluster');

const KoaRouter = require('koa-router');
const router = new KoaRouter();
const Koa = require('koa');

const chalk = require('chalk');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const compress = require('koa-compress');

app = new Koa();


//核心
//配置核心配置
class AngelCore {
  constructor(options) {
    this.webpackConfig = require(options.url);
    this.config = options.configUrl ? require(options.configUrl) : require(path.join(process.cwd(), 'config/config.default.js'));
  }
  
}

//处理webpack配置
class dealWebpackConfig extends AngelCore {
  constructor(options) {
    super(options);
    this.readConfig();
  }
  //处理webpack环境变量问题
  readConfig() {
    this.webpackConfig.mode = this.config.env.NODE_ENV;
    this.webpackConfig.plugins.push(new ProgressBarPlugin({
      format: ` ٩(๑❛ᴗ❛๑)۶ build [:bar] ${chalk.green.bold(':percent')}  (:elapsed 秒)`,
      complete: '-',
      clear: false
    }));
    this.compiler = webpack(this.webpackConfig); //webpack进度处理完成
    //导入webpack配置
    this.devMiddleware = require('koa-webpack-dev-middleware')(this.compiler, this.config.webpack.options);
    this.hotMiddleware = require('koa-webpack-hot-middleware')(this.compiler);
  }

}
//运行
class angelWebpack extends dealWebpackConfig {
  constructor(options) {
    super(options);
    this.runWebpack();
  }
  //运行webpack
  runWebpack() {
    app.use(this.devMiddleware);
    app.use(this.hotMiddleware);

  }
}

//重新启动一个koa服务器
class koaServer extends angelWebpack {
  constructor(options) {
    super(options);
    this.startKoa();
  }

  startKoa() {
    
    //fork新进程
    let port = this.config.webpack.listen.port ? this.config.webpack.listen.port : 9999;
    //开启gzip压缩
  
    app.use(compress(this.config.compress));

    //访问日志
    app.use(async (ctx, next) => {
      await next();
      const rt = ctx.response.get('X-Response-Time');
      console.log(`webpack' ${ctx.method}`.green,` ${ctx.url} - `,`${rt}`.green);
    });

    router.get('/',(ctx) => {
      ctx.body = 'webpack';
    });

    app.use(router.routes()).use(router.allowedMethods());
    this.watchDir();
    app.listen(port, () => {
      console.log('webpack服务器已经启动,请访问',`http://127.0.0.1:${port}`.green);
    });
  }

  watchDir() {
    let worker = cluster.fork();
    const watchConfig = {
      dir: [ 'app', 'lib', 'bin', 'config'],
      options: {}
    };
    chokidar.watch(watchConfig.dir, watchConfig.options).on('change', filePath =>{
      console.log(`**********************${filePath}**********************`);
      worker && worker.kill();
      worker = cluster.fork().on('listening', (address) =>{
        console.log(`[master] 监听: id ${worker.id}, pid:${worker.process.pid} ,地址:http://127.0.0.1:${address.port}`);
      });
    });
  }

}

module.exports = koaServer;