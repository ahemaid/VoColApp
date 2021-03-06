var express = require('express');
var router = express.Router();
var fs = require('fs');
var escapeHtml = require('escape-html');
var shell = require('shelljs');

/* GET users listing. */
router.get('/', function(req, res) {

  var path = "helper/tools/evolution/evolutionReport.txt";
  var diffArray = [];
  var history = [];
  var emptyFile = false;

  fs.exists(path, function(exists) {
    if (exists) {
      var evolutionReport = fs.readFileSync(path).toString();
      if (evolutionReport.includes('+') || evolutionReport.includes('-')) {
        emptyFile = true;
      }
      var arrayLines = evolutionReport.split("\n");
      console.log(arrayLines);

      arrayLines.pop();
      var i = 1;
      var j = 0;
      var k = 0;
      var commitDate;
      var version;
      arrayLines.forEach(function(element) {
        if (element.includes('Date')) {
          element = element.substr(5);
          // get the date value
          commitDate = element.split(" ")[0];
          // reverse the date to look like yyyy-mm-dd
          commitDate = commitDate.split('-').reverse().join('-')
          if (j === 10) {
            j = 0;
            i++;
          }
          version = 'Version:' + i + '.' + j;
          var commitObject = {
            id: k,
            content: version,
            start: commitDate,
            link: '#' + version
          };
          history.push(commitObject);
          j++;
          k++;
        }
        if (element.charAt(0) == '+') {
          element = element.substr(2);
          if (!element.includes("_:file:"))
            diffArray.push({
              'event': 'add',
              'value': element,
              'version': version,
              'date': commitDate
            });
        } else if (element.charAt(0) == '-') {
          element = element.substr(2);
          if (!element.includes("_:file:"))
            diffArray.push({
              'event': 'del',
              'value': element,
              'version': version,
              'date': commitDate
            });
        }
      });
    }
    if (emptyFile === true)
      res.render('evolution', {
        title: 'Evolution Report',
        evolutionReport: diffArray,
        history: history
      });
    else
      res.render('emptyPage', {
        title: 'Empty Page'
      });
  });
});

module.exports = router;
