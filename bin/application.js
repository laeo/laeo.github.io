const path = require('path');
const fs   = require('fs');
const exec = require('child_process').execSync;
const date = require('./polyfill.date.js');
const app  = require('../app.json');

function Application(context, options = {}) {
  const ROOT = path.join(__dirname, '../drafts');
  const DEST = path.join(ROOT, date('yyyy/mm/dd'));
  const JSON = path.join(ROOT, 'index.json');

  this.ctx      = context;
  this.options  = options;
  this.date     = date('yyyy/mm/dd');
  this.rootPath = path.join(__dirname, '../');
  this.drafts   = this.readDraftRecords();
}

Application.prototype.terminate = function(cmd = 'help', params = [], options = []) {
  try {
    switch (cmd) {
    case 'start':
      this.opStart(params.shift());
      break;
    case 'trash':
      this.opTrash(params.shift());
      break;
    case '-h':
    case 'help':
    default:
      this.opGuide();
    }
  } catch (e) {
    this.ctx.clear();
    this.ctx.warn(e.message);
    return;
  }

  this.ctx.flush();
};

Application.prototype.getRootPath = function(subPath = null) {
  return path.join(this.rootPath, subPath);
};

Application.prototype.getDraftsPath = function(subPath = null) {
  return path.join(this.getRootPath('drafts'), subPath);
};

Application.prototype.getRelativeDraftPath = function(draftName, suffix = '.md') {
  return path.join(this.date, draftName);
};

Application.prototype.getAbsoluteDraftPath = function(draftName, suffix = '.md') {
  return this.getDraftsPath(this.getRelativeDraftPath(draftName, suffix));
};

Application.prototype.readDraftRecords = function() {
  let raw = fs.readFileSync(this.getDraftsPath('index.json'), 'utf8');
  try {
    return JSON.parse(raw);
  } catch(e) {
    throw new Error('drafts record file was broken, it must be a json file.');
  }
};

Application.prototype.storeDraftRecords = function(drafts) {
  if (!drafts instanceof Array) {
    throw new Error('drafts that will be stored is must ARRAY.');
  }

  let raw = JSON.stringify(drafts, null, 2);
  fs.writeFileSync(this.getDraftsPath('index.json'), raw, 'utf8');
};

Application.prototype.makeDraftTemplate = function(name) {
  let metainfo     = `# ${name}\r\n\r\n`;
    metainfo    += `> Author : ${app.author}\r\n\r\n`;
    metainfo    += `> Date   : ${date('yyyy/mm/dd')}\r\n\r\n`;
    metainfo    += `> License: ${app.license}\r\n\r\n`;

  return metainfo;
};

/**
 * [CLI OP] 显示帮助信息
 *
 * @param  {Context} ctx
 *
 * @return {void}
 */
Application.prototype.opGuide = function () {
  // this.ctx.blank();
  this.ctx.info('USAGE:\tstage [command] [...arguments]');
  this.ctx.info('Commands:');
  this.ctx.info('\tstart\t[name]\tStart new post');
  this.ctx.info('\ttrash\t[name]\tDelete the post');
  this.ctx.info('Options:');
  this.ctx.info('\t-h\tShow the message');
  // this.ctx.info('\t-f\tForce to create new post');
  this.ctx.blank();
}

/**
 * [CLI OP] 开始编写文章
 *
 * @param  {string} name    命令行参数：文章名称
 * @param  {Object} options 创建文章时所加参数
 *
 * @return {void}
 */
Application.prototype.opStart = function(name, options = {}) {
  if (name === null || name === undefined) {
    return this.ctx.warn('ERROR: missing post name.');
  }

  name = name.trim();

  if (name.length === 0) {
    return this.ctx.warn('ERROR: post name is required.');
  }

  if(this.drafts[name] !== undefined) {
    return this.ctx.warn('ERROR: same post already exists.');
  }

  exec('mkdir -p ' + this.getDraftsPath(date('yyyy/mm/dd')));

  // let postFileName = name + '.md';
  let postFile     = this.getAbsoluteDraftPath(name)

  fs.writeFile(postFile, this.makeDraftTemplate(name), 'utf8', err => {
    if(err) {
      throw err;
    }

    this.drafts.push({
      id:    Date.now(),
      title: name,
      path:  this.getRelativeDraftPath(name)
    });


    this.storeDraftRecords(this.drafts);
    this.ctx.info('INFO: draft created in '+ postFile);
  });
}

/**
 * [CLI OP] 删除已有文章
 *
 * @param  {String} name 文章名称
 *
 * @return {void}
 */
Application.prototype.opTrash = function(name) {
  if(!name || !this.drafts[name]) {
    return this.ctx.warn('ERROR: cannot found post.');
  }

  name = name.trim()
  if (name.length == 0) {
    return this.ctx.warn('ERROR: post name is required.');
  }

  let deleted = this.getDraftsPath(this.drafts[name]);

  exec('rm -f ' + deleted);

  let index = this.drafts.findIndex(item => {
    return item.title == name;
  });

  if (index === -1) {
    return this.ctx.warn('ERROR: post not found.');
  }

  this.drafts.splice(index, 1);
  this.storeDraftRecords(this.drafts);
  this.ctx.log('NOTICE: draft deleted ' + deleted);
}

module.exports = Application;
