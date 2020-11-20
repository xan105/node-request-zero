// From @xan105/fs <https://github.com/xan105/node-fs>

/*
MIT License

Copyright (c) 2019-2020 Anthony Beaumont

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

const fs = require('fs');
const crypto = require('crypto');

module.exports.hashFile = (filePath, algo = "sha1") => {

  let sum = crypto.createHash(algo);
  let stream = fs.createReadStream(filePath);
  
  return new Promise((resolve, reject) => {
      stream
        .on('error', (err) => {
          return reject(err);
        })
        .on('data', (chunk) => {
          try {
             sum.update(chunk);
          } catch (err) {
             return reject(err);
          }
        })
        .on('end', () => {
          return resolve(sum.digest('hex'));
        });
  });
  
}