import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// GET tous les utilisateurs
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET un utilisateur par ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST créer un nouvel utilisateur
app.post('/api/users', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const result = await pool.query(
      'INSERT INTO users (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Code PostgreSQL pour violation de contrainte UNIQUE
      return res.status(409).json({ error: 'Cet utilisateur existe déjà' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer un utilisateur et ses tournois
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Supprimer d'abord les tournois de cet utilisateur
    await pool.query('DELETE FROM tournaments WHERE user_id = $1', [userId]);

    // Puis supprimer l'utilisateur
    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET tous les tournois d'un utilisateur avec les autres participants
app.get('/api/users/:userId/tournaments', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Récupérer les tournois de l'utilisateur
    const result = await pool.query(
      `SELECT 
        t.id, t.user_id, t.date, t.time, t.casino, t.buyin, t.levels, 
        t.user_note, t.scraped_tournament_id, t.name, t.day, t.is_restart as "isRestart",
        st.structure_chips as "structureChips",
        st.structure_levels as "structureLevels",
        st.structure_guarantee as "structureGuarantee"
      FROM tournaments t
      LEFT JOIN scraped_tournaments st ON t.scraped_tournament_id = st.id
      WHERE t.user_id = $1 
      ORDER BY t.date, t.time`,
      [userId]
    );

    // Pour chaque tournoi, récupérer les autres participants
    const tournamentsWithParticipants = await Promise.all(
      result.rows.map(async (tournament) => {
        const participantsResult = await pool.query(
          `SELECT DISTINCT u.id, u.name 
           FROM tournaments t2
           JOIN users u ON t2.user_id = u.id
           WHERE t2.date = $1 AND t2.time = $2 AND t2.casino = $3 AND t2.user_id != $4
           ORDER BY u.name`,
          [tournament.date, tournament.time, tournament.casino, userId]
        );
        return {
          ...tournament,
          participants: participantsResult.rows
        };
      })
    );

    res.json(tournamentsWithParticipants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET le résumé d'un utilisateur (stats)
app.get('/api/users/:userId/summary', async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await pool.query(
      'SELECT * FROM tournaments WHERE user_id = $1',
      [userId]
    );
    const tournaments = result.rows;

    const totalBuyins = tournaments.reduce((sum, t) => sum + (t.buyin || 0), 0);
    const casinos = [...new Set(tournaments.map(t => t.casino))];
    const dates = [...new Set(tournaments.map(t => t.date))];

    res.json({
      totalTournaments: tournaments.length,
      totalBuyins,
      casinos,
      numberOfDays: dates.length,
      startDate: dates[0],
      endDate: dates[dates.length - 1]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST ajouter un tournoi pour un utilisateur
app.post('/api/users/:userId/tournaments', async (req, res) => {
  try {
    const { date, time, casino, buyin, levels, user_note, scraped_tournament_id, name, day, isRestart } = req.body;
    const userId = req.params.userId;

    if (!date || !time || !casino) {
      return res.status(400).json({
        error: 'Les champs date, time et casino sont requis'
      });
    }

    // Vérifier que l'utilisateur existe
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const result = await pool.query(
      'INSERT INTO tournaments (user_id, date, time, casino, buyin, levels, user_note, scraped_tournament_id, name, day, is_restart) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [userId, date, time, casino, buyin || null, levels || '-', user_note || null, scraped_tournament_id || null, name || null, day || null, isRestart || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT mettre à jour un tournoi
app.put('/api/tournaments/:id', async (req, res) => {
  try {
    const { date, time, casino, buyin, levels, user_note } = req.body;
    const tournamentId = req.params.id;

    const tournamentResult = await pool.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }
    const tournament = tournamentResult.rows[0];

    const result = await pool.query(
      'UPDATE tournaments SET date = $1, time = $2, casino = $3, buyin = $4, levels = $5, user_note = $6 WHERE id = $7 RETURNING *',
      [
        date || tournament.date,
        time || tournament.time,
        casino || tournament.casino,
        buyin !== undefined ? buyin : tournament.buyin,
        levels || tournament.levels,
        user_note !== undefined ? user_note : tournament.user_note,
        tournamentId
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH mettre à jour uniquement la note d'un tournoi
app.patch('/api/tournaments/:id/note', async (req, res) => {
  try {
    const { user_note } = req.body;
    const tournamentId = req.params.id;

    const result = await pool.query(
      'UPDATE tournaments SET user_note = $1 WHERE id = $2 RETURNING *',
      [user_note || null, tournamentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur PATCH /note:', error.message);
    // Si la colonne n'existe pas, essayer de la créer
    if (error.message.includes('user_note')) {
      try {
        await pool.query('ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS user_note TEXT');
        // Réessayer la mise à jour
        const { user_note } = req.body;
        const result = await pool.query(
          'UPDATE tournaments SET user_note = $1 WHERE id = $2 RETURNING *',
          [user_note || null, req.params.id]
        );
        return res.json(result.rows[0]);
      } catch (retryError) {
        return res.status(500).json({ error: retryError.message });
      }
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer un tournoi
app.delete('/api/tournaments/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tournaments WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET tous les tournois scrapés
app.get('/api/scraped-tournaments', async (req, res) => {
  try {
    const { date, casino, minBuyIn, maxBuyIn } = req.query;

    let query = 'SELECT * FROM scraped_tournaments WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (date) {
      query += ` AND date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (casino) {
      query += ` AND casino ILIKE $${paramIndex}`;
      params.push(`%${casino}%`);
      paramIndex++;
    }

    if (minBuyIn) {
      query += ` AND buyin >= $${paramIndex}`;
      params.push(parseInt(minBuyIn));
      paramIndex++;
    }

    if (maxBuyIn) {
      query += ` AND buyin <= $${paramIndex}`;
      params.push(parseInt(maxBuyIn));
      paramIndex++;
    }

    query += ' ORDER BY date, time';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET les casinos disponibles dans les tournois scrapés
app.get('/api/scraped-tournaments/casinos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT casino, COUNT(*) as count
      FROM scraped_tournaments
      GROUP BY casino
      ORDER BY casino
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET les statistiques des tournois scrapés
app.get('/api/scraped-tournaments/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT casino) as casinos,
        COUNT(DISTINCT date) as dates,
        AVG(buyin) as "avgBuyIn",
        MIN(buyin) as "minBuyIn",
        MAX(buyin) as "maxBuyIn",
        MIN(date) as "startDate",
        MAX(date) as "endDate"
      FROM scraped_tournaments
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET suggestions de tournois pour autocomplétion (par date)
app.get('/api/scraped-tournaments/suggestions', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Le paramètre date est requis' });
    }

    const result = await pool.query(`
      SELECT
        id,
        casino,
        date,
        time,
        buyin as "buyIn",
        levels,
        SUBSTRING(time FROM 1 FOR 5) as "displayTime",
        structure_chips as "structureChips",
        structure_levels as "structureLevels",
        structure_guarantee as "structureGuarantee"
      FROM scraped_tournaments
      WHERE date = $1
      ORDER BY time, casino
    `, [date]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET timeline de tous les tournois (groupés par date)
app.get('/api/scraped-tournaments/timeline', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT
        id,
        casino,
        date,
        time,
        buyin as "buyIn",
        levels,
        SUBSTRING(time FROM 1 FOR 5) as "displayTime",
        structure_chips as "structureChips",
        structure_levels as "structureLevels",
        structure_guarantee as "structureGuarantee",
        name,
        day,
        is_restart as "isRestart",
        is_manual as "isManual"
      FROM scraped_tournaments
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ' ORDER BY date, time, casino';

    const result = await pool.query(query, params);
    const tournaments = result.rows;

    // Grouper par date
    const groupedByDate = tournaments.reduce((acc, tournament) => {
      if (!acc[tournament.date]) {
        acc[tournament.date] = [];
      }
      acc[tournament.date].push(tournament);
      return acc;
    }, {});

    // Transformer en tableau avec info de date
    const timeline = Object.keys(groupedByDate).sort().map(date => ({
      date,
      tournaments: groupedByDate[date],
      count: groupedByDate[date].length
    }));

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST créer un tournoi manuel dans scraped_tournaments
app.post('/api/scraped-tournaments/manual', async (req, res) => {
  try {
    const { date, time, casino, buyin, levels, structure_levels, structure_chips, is_manual } = req.body;

    if (!date || !time || !casino) {
      return res.status(400).json({
        error: 'Les champs date, time et casino sont requis'
      });
    }

    const result = await pool.query(
      `INSERT INTO scraped_tournaments 
        (date, time, casino, buyin, levels, structure_levels, structure_chips, is_manual) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING 
        id, casino, date, time, 
        buyin as "buyIn", 
        levels, 
        SUBSTRING(time FROM 1 FOR 5) as "displayTime",
        structure_levels as "structureLevels",
        structure_chips as "structureChips",
        is_manual as "isManual"`,
      [date, time, casino, buyin || null, levels || '-', structure_levels || null, structure_chips || null, is_manual || true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur création tournoi manuel:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer un tournoi de scraped_tournaments (uniquement les manuels)
app.delete('/api/scraped-tournaments/:id', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Vérifier si c'est un tournoi manuel
    const checkResult = await pool.query(
      'SELECT is_manual FROM scraped_tournaments WHERE id = $1',
      [tournamentId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }

    // Supprimer aussi les références dans la table tournaments des utilisateurs
    await pool.query(
      'DELETE FROM tournaments WHERE scraped_tournament_id = $1',
      [tournamentId]
    );

    // Supprimer le tournoi
    await pool.query(
      'DELETE FROM scraped_tournaments WHERE id = $1',
      [tournamentId]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression tournoi:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Serveur API démarré sur le port ${PORT}`);
});
