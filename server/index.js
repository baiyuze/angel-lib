const Koa = require('koa');
const app = new Koa();
const koaNunjucks = require('koa-nunjucks-2');
const koaStatic = require('koa-static');
const KoaRouter = require('koa-router');
const router = new KoaRouter();
const path = require('path');
const colors = require('colors');
const compress = require('koa-compress');
const AngelLogger = require('../angel-logger')
const cluster = require('cluster');
const http = require('http');

class AngelConfig {
  constructor(options) {
    this.config = require(options.configUrl);
    this.app = app;
    this.router = require(options.routerUrl);
    this.setDefaultConfig(); 
    this.setServerConfig();
    
  }

  setDefaultConfig() {
    //静态文件根目录
    this.config.root = this.config.root ? this.config.root : path.join(process.cwd(), 'app/static');
    //默认静态配置
    this.config.static = this.config.static ? this.config.static : {};
  }

  setServerConfig() {
    this.port = this.config.listen.port;

    //cookie签名验证
    this.app.keys = this.config.keys ? this.config.keys : this.app.keys;

  }
}

//启动服务器
class AngelServer extends AngelConfig {
  constructor(options) {
    super(options);
    this.startService();
  }

  startService() {
    //开启gzip压缩
    this.app.use(compress(this.config.compress));

      //模板语法
    this.app.use(koaNunjucks({
      ext: 'html',
      path: path.join(process.cwd(), 'app/views'),
      nunjucksConfig: {
        trimBlocks: true
      }
    }));
    this.app.use(async (ctx, next) => {
      ctx.logger = new AngelLogger().logger;
      await next();
    })
  
    //访问日志
    this.app.use(async (ctx, next) => {
      await next();
      // console.log(ctx.logger,'loggerloggerlogger');
      const rt = ctx.response.get('X-Response-Time');
      ctx.logger.info(`angel ${ctx.method}`.green,` ${ctx.url} - `,`${rt}`.green);
    });
    
    // 响应时间
    this.app.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      ctx.set('X-Response-Time', `${ms}ms`);
    });

    this.app.use(router.routes())
      .use(router.allowedMethods());

    // 静态资源
    this.app.use(koaStatic(this.config.root, this.config.static));
  
    // 启动服务器
    this.server = this.app.listen(this.port, () => {
      console.log(`当前服务器已经启动,请访问`,`http://127.0.0.1:${this.port}`.green);
      this.router({
        router,
        config: this.config,
        app: this.app
      });
    });
  }
}

module.exports = AngelServer;
