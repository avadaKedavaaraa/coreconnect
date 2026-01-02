
import app from './index.js';

export default async (req, res) => {
  req.url = '/config';
  await app(req, res);
}
