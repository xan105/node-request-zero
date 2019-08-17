Request-zero is based around the Node.js's HTTP(S) API interfaces.
It retries on error, follows redirects and provides progress when downloading (pipe stream) out of the box.
It uses promise and has no dependency.

Common use cases:
=================

```js
const request = require('request-zero');

(async () => {
    
     //Simplest call
     let res = await request("https://steamdb.info/app/220/");
     console.log(res.data); //=> '<!DOCTYPE HTML> ...'
     
     //Max retry on error and max redirection
     await request("https://steamdb.info/app/220/",{maxRetry: 2, maxRedirection: 2});
     
     //Get json data
     let json = await request.getJson("https://jsonplaceholder.typicode.com/todos/1");
     console.log(json); //=> '{ userId: 1, id: 1, title: 'delectus aut autem', completed: false }'
     
     //Get json data from github
     let json = await request.getJson("https://api.github.com/repos/user/repo/releases/latest",
                                     {headers: {"Accept" : "application/vnd.github.v3+json"}});
     console.log(json); //=> { url: '...', assets_url: '...', tag_name: '0.0.0', target_commitish: 'master', ... }
     
     //Head request
     let res = await request.head(`http://ipv4.download.thinkbroadband.com/1GB.zip`);
     console.log(res); //=> { status: 200, message: 'OK', headers: {...} }
      
     //Simple download to disk (pipe stream)
     await request.download("http://ipv4.download.thinkbroadband.com/1GB.zip", "D:/Downloads", printProgress)
     
     //Download from github ... aws redirection ... content disposition ... but custom filename
     let res = await request.download("https://github.com/xan105/Achievement-Watcher/releases/download/1.1.1/Achievement.Watcher.Setup.exe", "D:/Downloads/", {filename: "supersetup.exe"}, printProgress); 
     console.log(res); //=> { status: 200, message: 'OK', headers: {...}, path: 'D:\\Downloads\\supersetup.exe' }
     
     //Download a list of files one by one
     await request.download.all(["http://ipv4.download.thinkbroadband.com/5MB.zip",
                                 "http://ipv4.download.thinkbroadband.com/10MB.zip",
                                 "http://ipv4.download.thinkbroadband.com/20MB.zip",
                                 "http://ipv4.download.thinkbroadband.com/50MB.zip"],
                                 "D:\\Downloads", printProgress);
    
    //Upload a single file multipart/form-data
    let res = await request.upload("http://127.0.0.1/upload/test/", "Hello world", {name: "file", filename: "hello world.txt"});
    console.log(res); //=> { status: 200, message: 'OK', headers: {...}, data: 'ok' }
     
})();

//Callback example for request.download
function printProgress(percent, speed, dest){
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`${percent}% @ ${speed} kb/s [${dest}]`);
}

```
