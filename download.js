"use strict";

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const urlParser = require('url');

const download = module.exports = (href, destDir, option, callbackProgress = ()=>{} ) => { 

  if (typeof option === 'function') {
		callbackProgress = option
		option = null;
	}
	
	if (!option) option = {};
	
	let options = {
    timeout : option.timeout || 3000,
    maxRedirection: (option.maxRedirection || option.maxRedirection == 0) ? option.maxRedirection : 3,
    maxRetry: (option.maxRetry || option.maxRetry == 0) ? option.maxRetry : 3,
    headers : {
      'User-Agent': 'Chrome/'
    },
    filename: option.filename
  };
  
  if (option.headers) {
    Object.assign(options.headers,option.headers);
  }

  return new Promise((resolve, reject) => {
  
    if (!href) return reject( {error:"BAD URL", message:`URL is ${typeof(url)}`} );
    if (!destDir || typeof(destDir) !== 'string') return reject( {error:"ERR_INVALID_ARG_TYPE", message:`destDir is ${typeof(destDir)}`} )
  
    let url = urlParser.parse(href);
    if(!url.hostname || !url.protocol) return reject( {error:"BAD URL", message:`URL is malformed`} );
    url.headers = options.headers;
    
    let destPath = '';
    
    const lib = (url.protocol === "https:") ? https : http;
    let req = lib.get(url, (res) => {

      if (res.statusCode >= 200 && res.statusCode < 300) {  
      
        let destFile; 
        
        if (options.filename) {
          destFile = options.filename;
        } else {
          try {
            let matches = res.headers['content-disposition'].match(/.(?:filename=)(.*)/);
            if (matches.length >= 2) destFile = matches[1]
            if (!destFile) throw "Unable to parse content-disposition";
          }catch(err){
            destFile = url.pathname.split('/').pop();
          }
        }

        destPath = path.join(destDir,destFile);
        
          fs.mkdir(destDir, { recursive: true }, (err) => {
             if (err) { 
               reject( {error: err.code, message: err.message} );
               req.abort(); 
             }
             else 
             {     
                  let stats = { 
                    size : res.headers['content-length'],
                    speed : [],
                    averageSpeed : 0,
                    time : {
                      started: Date.now(),
                      elapsed : 0,
                      previousElapsed : 0
                    }             
                  };
                  
                  let file = fs.createWriteStream(destPath);

                  file.on('error', (err) => {
                    reject( {error: err.code, message: err.message} );
                    file.end();
                    fs.unlink(destPath, () => {
                       req.abort();
                    });
                  });
                  
                  res.pipe(file);

                  res.on('data', () => {
  
                        stats.time.elapsed = Math.floor((Date.now() - stats.time.started) / 1000);
                        if ( stats.time.elapsed >= 1 ) {
                          let currentSpeed = Math.floor((file.bytesWritten / 1000) / stats.time.elapsed);
                          stats.speed.push(currentSpeed);
                          
                          if ( stats.speed.length >= 1 && stats.time.elapsed == stats.time.previousElapsed+1) { 
                            let sum = stats.speed.reduce((a, b) => a + b, 0);
                            stats.averageSpeed = Math.floor(sum / stats.speed.length);
                            stats.speed = [];
                          } 
                        }
                        let percent = Math.floor(100-(((stats.size-file.bytesWritten)/stats.size)*100))
                        callbackProgress(percent, stats.averageSpeed, destFile);
                        stats.time.previousElapsed = stats.time.elapsed;
                        
                  }).on('end', () => {
                  
                        file.end();
                        if (res.complete) {
                            callbackProgress(100, 0, destFile);
                            resolve({
                                status: res.statusCode,
                                message: res.statusMessage,
                                headers: res.headers,
                                path: destPath
                            });
                        } else {
                            option.maxRetry = options.maxRetry - 1;
                            if (option.maxRetry < 0) {
                                reject( {error: 'EINTERRUPTED', message: 'The connection was terminated while the message was still being sent'} );
                                fs.unlink(destPath, () => {});
                            } else {
                                return resolve(download(href, destDir, option, callbackProgress));
                            }                         
                        }
    
                  }).on('error', (err) => {
                  
                        file.end();
                        option.maxRetry = options.maxRetry - 1;
                        if (option.maxRetry < 0) {
                          reject({
                              error: err.code, 
                              message: err.message,
                              headers: res.headers
                          });
                          fs.unlink(destPath, () => {
                              req.abort();
                          });    
                        }else {
                          return resolve(download(href, destDir, option, callbackProgress));
                        } 
                        
                  });
             }
           });
         
        } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {

              option.maxRedirection = options.maxRedirection - 1;
              if (option.maxRedirection < 0) {
                return reject( {error:"EREDIRECTMAX", message:"Maximum redirection reached"} );
              } else {
                let redirect = (urlParser.parse(res.headers.location).hostname) ? res.headers.location : `${url.protocol}//${url.hostname}/${res.headers.location}`;
                return resolve(download(redirect, destDir, option, callbackProgress));
              }
              
        } else {

             option.maxRetry = options.maxRetry - 1;
             if (option.maxRetry < 0) {
                 reject({
                    error: res.statusCode, 
                    message: res.statusMessage,
                    headers: res.headers
                 });
                 fs.unlink(destPath, () => {
                    req.abort();
                 });    
             } else {
                 return resolve(download(href, destDir, option, callbackProgress));
             } 
              
        }
        
      }).setTimeout(3000, () => {
          req.abort();
      }).on('error', (err) => {
             option.maxRetry = options.maxRetry - 1;
             if (option.maxRetry < 0) {
                 reject({
                    error: res.statusCode, 
                    message: res.statusMessage
                 });
                 fs.unlink(destPath, () => {
                    req.abort();
                 });    
             } else {
                 return resolve(download(href, destDir, option, callbackProgress));
             }        
      });

  });            
}

module.exports.all = async (listURL, destDir, callbackProgress = ()=>{} ) => {

  if (!Array.isArray(listURL)) { throw "download file list must be an array !"; }
  
  let count = 0; 
  let slice_size = (100/listURL.length);
  let list = [];

  for (let file in listURL) { 
    let progressPercent = Math.floor((count/listURL.length)*100);
    try {

      let destination = (Array.isArray(destDir)) ? destDir[file] : destDir; 
      
      list.push(await download(listURL[file], destination, function(itemPercent, speed, destFile){  
            let percent = progressPercent + Math.floor((slice_size/100)*itemPercent);
            callbackProgress(percent, speed, destFile);
      })); 
    }
    catch(e) {}
    count = count + 1;
  }
  
  return list;
}