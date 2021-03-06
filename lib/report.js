/** @module report */

var Promise = require('bluebird');
var log = require('./log');
var fsp = require('./fsp');
var messages = require('./messages');

function groupResultsWithSimilarBrowserVersions(results) {
  var browsers = {};
  results.forEach(function(row) {
    var browser = row[0];
    var version = parseVersion(row[1], browser);
    var count = +row[2];

    if (!browsers[browser]) {
      browsers[browser] = {count: count, versions: {}};
    }
    else {
      browsers[browser].count += count;
    }

    var versions = browsers[browser].versions;
    if (!versions[version]) {
      versions[version] = {count: count};
    }
    else {
      versions[version].count += count;
    }
  });
  return browsers;
}

function extractBrowserData(groups, total, threshold) {
  var browsers = [];
  Object.keys(groups).forEach(function(browser) {
    var percentOfTotal = convertToPercentage(groups[browser].count / total);
    if (percentOfTotal > threshold) {
      browsers.push({
        name: browser,
        count: groups[browser].count,
        percentOfTotal: percentOfTotal
      });
    }
  });
  return browsers;
}

function extractBrowserVersionData(groups, total, threshold) {
  var versions = [];

  Object.keys(groups).forEach(function(browserName) {
    var browser = groups[browserName];
    Object.keys(browser.versions).forEach(function(versionNumber) {
      var version = browser.versions[versionNumber];
      var percentOfTotal = convertToPercentage(version.count / total);
      var percentOfBrowser = convertToPercentage(version.count / browser.count);
      if (percentOfTotal > threshold) {
        versions.push({
          name: browserName,
          version: versionNumber,
          count: version.count,
          percentOfTotal: percentOfTotal,
          percentOfBrowser: percentOfBrowser
        });
      }
    });
  });

  return versions;
}


function parseVersion(fullVersion, browser) {
  var pattern = /^v?(\d+)\.?(\d+)?/i;
  var matches = pattern.exec(fullVersion);
  if (!matches) {
    log.trace(messages.report.PARSE_ERROR, browser, fullVersion);
    return '(unknown)';
  }
  var version = matches[0];
  var majorVersion = +matches[1];
  var minorVersion = +matches[2];

  if (browser == 'Safari' && majorVersion > 10) {
    log.trace(messages.report.WEBKIT_VERSION_DETECTED, version);
    return '(unknown)';
  }
  return version;
}

function convertToPercentage(num) {
  var decimalPoints = 5;
  var percentage = num * 100;
  var power = Math.pow(10, decimalPoints);
  return Math.round(percentage * power) / power;
}

function sortDescendingByCount(a, b) {
  return b.count - a.count;
}

function saveReport(report, file) {
  return fsp.outputJson(file, report)
      .then(function() {
        log.success('*Success!* Report saved to "%s"', file);
      });
}

module.exports = {

  generate: function(results) {

    var metric = this.config.metric;
    var total = +results.totalsForAllResults[metric];
    var threshold = +this.config.threshold;
    var groups = groupResultsWithSimilarBrowserVersions(results.rows);

    var browsers = extractBrowserData(groups, total, threshold);
    var versions = extractBrowserVersionData(groups, total, threshold);

    var report = {
      total: total,
      metric: metric.slice(3),
      viewId: this.config.ids.slice(3),
      dateRange: 'Last ' + this.config.days + ' days',
      generatedOn: new Date().toString(),
      browsers: browsers.sort(sortDescendingByCount),
      versions: versions.sort(sortDescendingByCount)
    };

    return saveReport(report, this.config.outputFile);
  }
};
