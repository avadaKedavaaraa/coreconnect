
import app from './index.js';

export default async (req, res) => {
  req.url = '/me';
  await app(req, res);
}
