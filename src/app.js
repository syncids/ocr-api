const path = require('path');
const fs = require('fs');
const koa = require('koa');
const cors = require('koa-cors');
const error = require('koa-error');
const bodyParser = require('koa-bodyparser');

const port = process.env.PORT || 3002;
const environment = process.env.NODE_ENV;

const app = koa();
app.use(error());
app.use(cors());
app.use(bodyParser());

console.log('About to crank up node');
console.log('PORT=' + port);
console.log('NODE_ENV=' + environment);

const apiPaths = ['api', 'api2'];
apiPaths.forEach(apiRoot => {
  const dir = path.join(__dirname, apiRoot);
  if (!fs.existsSync(dir)) return;
  const apiFiles = fs.readdirSync(dir);
  apiFiles.forEach(file => {
    const p = `/${apiRoot}/${file.split('.')[0]}`;
    app.use(require(`.${p}`).prefix(p).routes());
  });
});

app.listen(port);
