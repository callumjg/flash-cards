import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import comp from 'express-static-gzip';
import apiRouter from './routes/api';
import errorHandler from './middleware/errorHandler';
import renderApp from './middleware/renderApp';

const server = express();
const buildPath = path.join('dist/public');

server.use(cookieParser());
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(comp(buildPath, { enableBrotli: true, orderPreference: ['br'] }));
server.use('/api/v1', apiRouter);
server.use(express.static('dist/public'));
server.use(errorHandler);

server.post('/rapidid', (req, res) => {
  console.log(req);
  console.log('Body');
  console.log(req.body);
  console.log('headers');
  console.log(req.headers);
  console.log('query');
  console.log(req.query);
  console.log('Params');
  console.log(req.params);
  res.send();
});
server.get('*', renderApp);

export default server;
