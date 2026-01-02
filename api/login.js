
import app from './index.js';

export default async (req, res) => {
  req.url = '/login';
  await app(req, res);
}
