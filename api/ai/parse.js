
import app from '../index.js';

export default async (req, res) => {
  req.url = '/ai/parse';
  await app(req, res);
}
