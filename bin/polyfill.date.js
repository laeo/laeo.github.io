/**
 * Simple Date formatter
 *
 * @param  {string} format yyyy-mm-dd
 *
 * @return {string}
 */
module.exports = function date(format = 'yyyy-mm-dd', moment = Date.now()) {
  moment = moment instanceof Date ? moment : new Date(moment);

  let year  = moment.getFullYear();
  let month = ('0' + (moment.getMonth() + 1)).slice(-2);
  let day   = ('0' + moment.getDate()).slice(-2);

  return format.replace('yyyy', year).replace('mm', month).replace('dd', day);
}
