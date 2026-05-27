// À ajouter temporairement dans server.js pour importer les données

import fs from 'fs';

// POST endpoint pour importer les tournois (À SUPPRIMER APRÈS L'IMPORT!)
app.post('/api/admin/import-tournaments', async (req, res) => {
  try {
    const { tournaments } = req.body;
    
    if (!tournaments || !Array.isArray(tournaments)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    let inserted = 0;
    
    for (const t of tournaments) {
      try {
        await pool.query(
          `INSERT INTO scraped_tournaments (casino, date, time, buyIn, levels)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [t.casino, t.date, t.time, t.buyIn, t.levels || null]
        );
        inserted++;
      } catch (err) {
        console.error(`Error importing tournament:`, err.message);
      }
    }

    res.json({ success: true, imported: inserted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
