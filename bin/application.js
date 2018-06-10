const path = require('path');
const fs   = require('fs');
const exec = require('child_process').execSync;
const app  = require('../app.json');
let posts  = require('../drafts/index.json');

function Application(context, options = {}) {
  const ROOT = path.join(__dirname, '../drafts');
  const DEST = path.join(ROOT, date('yyyy/mm/dd'));
  const JSON = path.join(ROOT, 'index.json');

  this.ctx       = context;
  this.options   = options;
  this.paths = {
    ROOT,
    DEST,
    JSON
  };
}

/**
 * [CLI OP] 显示帮助信息
 *
 * @param  {Context} ctx
 *
 * @return {void}
 */
Application.prototype.opGuide = function () {
  this.ctx.blank();
  this.ctx.info('USAGE:\tstage [command] [...arguments]');
  this.ctx.info('Commands:');
  this.ctx.info('\tstart\t[name]\tStart new post');
  this.ctx.info('\ttrash\t[name]\tDelete the post');
  this.ctx.info('Options:');
  this.ctx.info('\t-h\tShow this message');
  this.ctx.info('\t-f\tForce to create new post');
  this.ctx.blank();
}

/**
 * [CLI OP] 开始编写文章
 *
 * @param  {Context} ctx
 * @param  {string} name    命令行参数：文章名称
 * @param  {Object} options 创建文章时所加参数
 *
 * @return {void}
 */
Application.prototype.opStart = function(ctx, name, options = {}) {
  if (name === null || name === undefined) {
    return ctx.warn('ERROR: missing post name.');
  }

  name = name.trim();

  if(posts[name] !== undefined && options.indexOf('-f') === -1) {
    return ctx.warn('ERROR: same post already exists.')
  }

  exec('mkdir -p ' + DESTPATH);

  let PostFileName = name + '.md';
  let PostFile     = path.join(DESTPATH, PostFileName);
  let metainfo     = `# ${name}\r\n\r\n`;
      metainfo    += `> Author : ${app.author}\r\n\r\n`;
      metainfo    += `> Date   : ${date('yyyy/mm/dd')}\r\n\r\n`;
      metainfo    += `> License: ${app.license}\r\n\r\n`;

  fs.writeFile(PostFile, metainfo, 'utf8', function(err) {
    if(err) {
      throw err;
    }

    posts[name] = path.join(date('yyyy/mm/dd'), PostFileName);
    fs.writeFileSync(JSONPATH, JSON.stringify(posts, null, 2));
  });

  ctx.info('INFO: file created at '+ PostFile);
}

/**
 * [CLI OP] 删除已有文章
 *
 * @param  {Context} ctx
 * @param  {String} name 文章名称
 *
 * @return {void}
 */
function opTrash(ctx, name) {
  if(!name || !posts[name]) {
    return ctx.warn('ERROR: cannot found post.');
  }

  name = name.trim()

  exec('rm -f ' + path.join(__dirname, '../', 'drafts', posts[name]));

  delete posts[name];
  fs.writeFileSync(path.join(__dirname, '../', 'drafts/index.json'), JSON.stringify(posts, null, 2));

  ctx.log('NOTICE: post has been trashed.');
}

export default Application;
