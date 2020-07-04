function Context() {
  this.sendStack = [];
  this.flushed = false;
}

Context.prototype.write = function(data = null) {
  this.sendStack.push(data);
  return this;
};

Context.prototype.writeLine = function(data = null) {
  return this.write(data + "\r\n");
};

Context.prototype.blank = function() {
  return this.writeLine('')
};

Context.prototype.log = function(log) {
  return this.writeLine(log);
};

Context.prototype.info = function(info) {
  return this.writeLine("\033[32m" + info + "\033[0m");
};

Context.prototype.warn = function(warn) {
  return this.writeLine("\033[31m" + warn + "\033[0m");
};

Context.prototype.clear = function() {
  this.sendStack = [];
  return this;
};

Context.prototype.flush = function() {
  if (!this.flushed) {
    process.stdout.write(this.sendStack.join(''));
    this.flushed = true;
  }
};

module.exports = Context;