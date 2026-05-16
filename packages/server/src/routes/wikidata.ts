import { Router } from 'express';
import { searchWikidata } from '../services/wikidata.service.js';

const router = Router();

router.get('/search', async (req, res) => {
  const q = req.query.q as string;
  const lang = (req.query.lang as string) || 'de';
  if (!q) { res.status(400).json({ error: 'q parameter is required' }); return; }

  try {
    const results = await searchWikidata(q, lang);
    res.json(results);
  } catch (err) {
    console.error('Wikidata search error:', err);
    res.status(502).json({ error: 'Wikidata search failed' });
  }
});

export default router;
