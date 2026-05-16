import { Router } from 'express';
import { buildJsonLd } from '../services/jsonld.service.js';

const router = Router();

router.get('/:mid/export/jsonld', async (req, res) => {
  const jsonld = await buildJsonLd(req.params.mid);
  if (!jsonld) { res.status(404).json({ error: 'Module not found' }); return; }
  res.setHeader('Content-Type', 'application/ld+json');
  res.json(jsonld);
});

export default router;
