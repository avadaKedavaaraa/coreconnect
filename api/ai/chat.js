
import app from '../index.js';

export default async (req, res) => {
  req.url = '/ai/chat';
  await app(req, res);
}
