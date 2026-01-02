
import app from '../index.js';

export default async (req, res) => {
  req.url = '/admin/upload';
  await app(req, res);
}
