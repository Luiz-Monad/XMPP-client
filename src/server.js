const fs = require('fs');
const express = require('express');

const config = JSON.parse(fs.readFileSync('./dev_config.json'));

const app = express();

const cors = require('cors')
app.options('*', cors())

const serveStatic = require('serve-static');
app.use(serveStatic('./public'));

app.listen(config.http.port, function () {
    console.log('Kaiwa running at: ' + config.http.baseUrl);
});
