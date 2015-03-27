var app = require('http').createServer(handler)
  , fs = require('fs')
  ,url = require('url')
  ,path = require('path');


app.listen(8080);

var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};


function handler(req, res) {
    var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd(), uri);
    path.exists(filename, function(exists) {
        if(!exists) {
            console.log("not exists: " + filename);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write('404 Not Found\n');
            res.end();
            return;
        }
        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
        res.writeHead(200, {'Content-Type':mimeType});

        fs.readFile(filename,
        function (err, data) {
          if (err) {
            res.writeHead(500);
            return res.end(filename);
          }

          res.writeHead(200);
          res.end(data);
        });

    });
}





