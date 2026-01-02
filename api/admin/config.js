
import app from '../index.js';

export default async (req, res) => {
  req.url = '/admin/config';
  await app(req, res);
}
