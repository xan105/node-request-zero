"use strict";

const http = require('http');
const https = require('https');
const urlParser = require('url');
const download = require('./download.js');

const request = module.exports = (href, payload, option = {}) => {
  
  if (typeof payload === 'object') {
		option = payload
		payload = null;
	}
  
  let options = {
    method: option.method || "GET",
    timeout : option.timeout || 3000,
    maxRedirection: (option.maxRedirection || option.maxRedirection == 0) ? option.maxRedirection : 3,
    maxRetry: (option.maxRetry || option.maxRetry == 0) ? option.maxRetry : 0,
    headers : {
      'User-Agent': 'Chrome/'
    }
  };
  
  if (option.headers) {
    Object.assign(options.headers,option.headers);
  }

  return new Promise((resolve, reject) => {
  
    if (!href) return reject( {error:"BAD URL", message:`URL is ${typeof(url)}`} );
  
    let url = urlParser.parse(href);
    if(!url.hostname || !url.protocol) return reject( {error:"BAD URL", message:`URL is malformed`} );
    url.headers = options.headers;
    url.method = options.method;
  
    const lib = (url.protocol === "https:") ? https : http;
    let req = lib.request(url, (res) => {

      if(url.method === "HEAD") {
        resolve({
          status: res.statusCode,
          message: res.statusMessage,
          headers: res.headers
        });
      }
      else if (res.statusCode >= 200 && res.statusCode < 300) {
      
          let data = [];
          res.on('data', (chunk) => { 
              data.push(chunk);
          }).on('end', () => { 
              if (res.complete) {
                resolve({
                    status: res.statusCode,
                    message: res.statusMessage,
                    headers: res.headers,
                    data: data.join('')
                });
              }else{
                  option.maxRetry = options.maxRetry - 1;
                  if (option.maxRetry < 0) {
                    reject( {error: 'EINTERRUPTED', message: 'The connection was terminated while the message was still being sent'} );
                  } else {
                    return resolve(request(href, option));
                  } 
              }
          }).on('error', (err) => {
              option.maxRetry = options.maxRetry - 1;
              if (option.maxRetry < 0) {
                reject({
                  error: err.code, 
                  message: err.message,
                  headers: res.headers
                });
                req.abort();    
              } else {
                return resolve(request(href, option));
              }    
          });

      }
      else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        
        if (options.maxRedirection < 0) {
          return reject( {error:"EREDIRECTMAX", message:"Maximum redirection reached"} );
        } else {
          let redirect = (urlParser.parse(res.headers.location).hostname) ? res.headers.location : `${url.protocol}//${url.hostname}/${res.headers.location}`;
          option.maxRedirection = options.maxRedirection - 1;
          return resolve(request(redirect, option));
        }
        
      }
      else {
      
         option.maxRetry = options.maxRetry - 1;
         if (option.maxRetry < 0) {
             reject({
              error: res.statusCode, 
              message: res.statusMessage,
              headers: res.headers
             });
             req.abort();    
         } else {
             return resolve(request(href, option));
         } 

      }
      
    }).setTimeout(options.timeout, () => {
            req.abort();
    }).on('error', (err) =>  {
            option.maxRetry = options.maxRetry - 1;
            if (option.maxRetry < 0) {
               reject({
                error: err.code, 
                message: err.message
               });
               req.abort();    
            } else {
               return resolve(request(href, option));
            }   
    });

    if (url.method === "POST") {  
        if (!payload) {
          reject( {error: "ERR_INVALID_ARG_TYPE", message: `payload is ${typeof(options.payload)}`} );
          req.abort();
        } else {
          req.write(payload); 
        }
    }

    req.end();
  });
  
}

module.exports.post = (url, payload, option = {} ) => {
  option.method = "POST";
  return request(url, payload, option);
}

module.exports.get = (url, option = {} ) => {
  option.method = "GET";
  return request(url, option);
}

module.exports.head = (url, option = {} ) => {
  option.method = "HEAD";
  return request(url, option);
}

module.exports.getJson = async (url, option = {} ) => {

  if (!option.headers) option.headers = {};
  if (!option.headers['Accept']) option.headers['Accept'] = 'application/json, application/json;indent=2';
  option.method = "GET";

  try {
     let json = (await request(url, option)).data;
     return JSON.parse(json);
  }catch(err){
     throw err;
  }

}

module.exports.upload = async (url, content, filename, option = {} ) => {
  
  try {

    if(!content) throw {error: "ERR_INVALID_ARG_TYPE", message: `content is ${typeof(content)}`};
    
    if (typeof filename === 'object') {
      option = filename
      filename = Date.now();
	  }

    const crlf = "\r\n";
    let headers = 'Content-Disposition: form-data; name="file"; filename="'+filename+'"' + crlf;
    let boundary = `--${Math.random().toString(16)}`;
    let delimeter = {
       start: `${crlf}--${boundary}`,
       end: `${crlf}--${boundary}--`
    }
        
    let payload = Buffer.concat([
        Buffer.from(delimeter.start + crlf + headers + crlf),
        Buffer.from(content),
        Buffer.from(delimeter.end)]
    );
    
    if (!option.headers) option.headers = {};
    option.headers['Content-Type'] = "multipart/form-data; boundary=" + boundary;
    option.headers['Content-Length'] = payload.length;
    option.method = "POST";

    let result = await request(url, payload, option);
    return result;
  
  }catch(err){
    throw err;
  }
}

module.exports.download = download;