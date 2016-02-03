'use strict';
var crypto = require('crypto');
var router = require('koa-router')();
var path = require('path');
var fse = require('fs-extra');
var request = require('request');
var parser = require('../utils/parser');

module.exports = router;

var tempFolder = 'c:\\temp';
var baseHotFolder = 'C:\\AbbyyHotFolder';
var pdfFileRegExp = /.*\.pdf$/i;

router
  .get('/', executeOCR);

function * executeOCR () {
  var url = this.query.url;
  var parse = this.query.parse === 'true';
  if (!url) throw new Error('Missing required parameter - url');

  var urlSplit = url.split('/');
  var pdfFile = urlSplit[urlSplit.length - 1];
  if (!pdfFileRegExp.test(pdfFile)) throw new Error('Only expecting url to pdf files');

  var textFile = pdfFile.replace(/\.pdf$/, '.txt');
  // download to temp location
  // get checksum
  // check if there's already an existing file in HotFolder
  // if there is, use that, if not, copy temp to HotFolder

  var tempFile = yield _download(url);
  var hash = yield _getHash(tempFile);
  var subFolder = _toSingleNumber(hash);
  var hotFolder = path.join(baseHotFolder, subFolder, hash);

  var exists = yield _exists(hotFolder);
  if (!exists) {
    // doesn't exist, create and copy temp file over
    yield _ensureDir(hotFolder);
    yield _move(tempFile, path.join(hotFolder, pdfFile));
  } else {
    // exists, delete temp file
    yield _remove(tempFile);
  }

  var outputTextFile = path.join(hotFolder, textFile);
  // this.body = 'created';
  yield _waitUntilFileCreated(outputTextFile);

  var text = yield _readFile(outputTextFile);

  // var index = text.indexOf('Page 4 of 5');
  // var split = text.split(String.fromCharCode(12));
  // console.log(split.length);
  // console.log(text.charCodeAt(index-1));
  // this.body = parse ? parser.parse(text) : text;
  this.body = parser.parse(text);
}

function _toSingleNumber (s) {
  var max = 4;
  var total = 0;
  for (var i = 0; i < s.length; i++) total += s.charCodeAt(i);
  return (total % max + 1) + '';
}

function * _waitUntilFileCreated (path) {
  var exists = false;
  while (!exists) {
    exists = yield _exists(path);
    yield _sleep(300);
  }
}

function _getRandomName () {
  const max = 2000;
  const min = 1;
  return Math.floor(Math.random() * (max - min)) + min;
}

// returns downloaded file path
function * _download (url) {
  yield _ensureDir(tempFolder);
  return new Promise((resolve, reject) => {
    var tempDownloadTarget = path.join(tempFolder, _getRandomName() + '.pdf');
    request(url, (err, msg, body) => {
      if (err) reject(err);
      if (msg.statusCode !== 200) {
        reject(new Error('Error downloading file: status ' + msg.statusCode));
      } else {
        resolve(tempDownloadTarget);
      }
    })
    .pipe(fse.createWriteStream(tempDownloadTarget));
  });
}

// wait till the file is created
function * _readFile (path) {
  return new Promise((resolve, reject) => {
    fse.readFile(path, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

function * _getHash (file) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha1');
    const input = fse.createReadStream(file);
    input
      .on('end', () => {
        hash.end();
        const hashValue = hash.read().toString('hex');
        resolve(hashValue);
      })
      .on('error', () => { resolve('file_not_found'); })
      .pipe(hash);
  });
}

function * _exists (path) {
  return new Promise((resolve, reject) => {
    fse.access(path, (err) => {
      resolve(!err);
    });
  });
}

function * _move (src, dest) {
  return new Promise((resolve, reject) => {
    fse.move(src, dest, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function * _remove (path) {
  return new Promise((resolve, reject) => {
    fse.remove(path, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function * _ensureDir (path) {
  return new Promise((resolve, reject) => {
    fse.ensureDir(path, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function _sleep (ms) {
  return (cb) => {
    setTimeout(cb, ms);
  };
}
