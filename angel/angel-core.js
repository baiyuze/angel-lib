const glob = require('glob');
const fs = require('fs');
const path = require('path');
const colors = require('colors');


class Angel {
  constructor(ctx) {
    this.ctx = ctx;
    this.config = require(path.join(process.cwd(),'config/config.default.js'));
  }
}

class AngelFileLoad extends Angel {
  constructor(ctx) {
    super(ctx);
    this.readLoadFile();
  }

  readLoadFile() {
    // let angelDir = ['controller', 'service','test'];
    let angelDir = ['test'];
    //读取文件夹
    angelDir.forEach(async (dirName, index) => {
      let currentDirFile = fs.readdirSync(path.join(process.cwd(), `app/${dirName}`));
      this[dirName] = {};
      //读取文件
      currentDirFile.forEach((fileName) => {
        try {
          let Func = require(path.join(process.cwd(), `app/${dirName}/${fileName}`));
          this[dirName][fileName] = new Func(this.ctx);
        } catch (error) {
          console.error(new Error(`app/${dirName}/${fileName} 必须是一个构造函数`) );
        }
      })
    });

  }

}

module.exports = AngelFileLoad;
