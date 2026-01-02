
import app from '../index.js';

export default async (req, res) => {
  req.url = '/admin/items';
  await app(req, res);
}
