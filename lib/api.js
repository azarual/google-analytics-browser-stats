/** @module api */

var request = require('./request');
var params = require('./params');
var log = require('./log');
var messages = require('./messages');

module.exports = {

  /**
   * Makes a request to the Google Analytics Core Reporting API using the
   * data stored on `this.config` and `this.tokenData.accessToken`.
   * The result of the request is returned as stores on `this.results`.
   *
   * @method query
   * @returns {Promise} A promise that resolves to the result of the request.
   */
  query: function(accessToken) {

    log.trace(messages.api.QUERY_START);

    var data = {
      ids: this.config.ids,
      metric: this.config.metric,
      days: this.config.days,
      accessToken: accessToken
    };

    return request.get(params.forApiQuery(data))
        .then(function(body) {

      var results = JSON.parse(body);
      if (results.error) {
        throw new Error('(' + results.error.code + ') ' +
            results.error.message);
      }
      return results;
    });

  }
};
