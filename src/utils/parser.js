'use strict';
const _ = require('lodash');

const pageBreak = String.fromCharCode(12);
function parse (text) {
  // split into pages
  var pages = text.split(pageBreak);
  var pageTypes = {};

  var docs = _.chain(pages).map(_extractDocs).filter(p => p).flatten();

  return docs;

  // return pages.filter(p => _getPageType(p) === 'form1449A').join('/n/n==================/n/n')

  // return _.chain(pages)
  //   .map(_extractDocs)
  //   .filter(p => p)
  //   .flatten();
  // var index = text.indexOf('Page 4 of 5');
  // var split = text.split(String.fromCharCode(12));
  // console.log(split.length);
  // console.log(text.charCodeAt(index-1));
}

function _extractDocs (p) {
  var pType = _getPageType(p);
  switch (pType) {
    case 'form1449':
      return _extractDocs1449(p);
  }
}

function _extractDocs1449 (p) {
  var usDocsStart = p.search(/U. *S. PATENT DOCUMENTS/);
  var foreignDocsStart = p.indexOf('FOREIGN PATENT DOCUMENTS');
  var nplDocsStart = p.indexOf('OTHER DOCUMENTS');

  var usDocsText = p.slice(usDocsStart, foreignDocsStart);
  var foreignDocsText = p.slice(foreignDocsStart, nplDocsStart);
  var nplDocsText = p.slice(nplDocsStart);

  // extract us docs
  // common case
  var usDocRegExp = /(\S*)[\t\r\n\f]*(\d{2}\/\d{2}\/\d{4})[\t\r\n\f]*(.*?)[\t\r\n\f]+/g;
  var usDocs = _.chain([usDocRegExp])
    .map(re => _findAllMatches(usDocsText, re))
    .flatten()
    .map(match => ({
      documentNumber: match[1].replace(/,/g, ''),
      publicationDate: match[2],
      inventor: match[3],
      country: 'US'
    }))
    .value();
  return usDocs;
}

function _getPageType (p) {
  const regExps = {
    form892: t => /PTO-892/.test(t) && t.includes('PATENT DOCUMENTS'),
    form1449: t => /PTO-1449/.test(t) && t.includes('PATENT DOCUMENTS'),
    form1449A: t => /1449A?\/PTO/.test(t),
    form1449B: t => /1449B\/PTO/.test(t)
  };
  var types = Object.keys(regExps);
  return _.find(types, t => regExps[t](p));
}

function _findAllMatches (str, regExp) {
  var matchArrays = [];
  var match;
  while ((match = regExp.exec(str)) !== null) {
    matchArrays.push(match);
  }
  return matchArrays;
}

module.exports = {
  parse
};
