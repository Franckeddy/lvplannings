import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// GET tous les utilisateurs
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY name').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET un utilisateur par ID
app.get('/api/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST créer un nouvel utilisateur
app.post('/api/users', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const result = db.prepare('INSERT INTO users (name) VALUES (?)').run(name);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Cet utilisateur existe déjà' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET tous les tournois d'un utilisateur
app.get('/api/users/:userId/tournaments', (req, res) => {
  try {
    const tournaments = db.prepare(
      'SELECT * FROM tournaments WHERE user_id = ? ORDER BY date, time'
    ).all(req.params.userId);
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET le résumé d'un utilisateur (stats)
app.get('/api/users/:userId/summary', (req, res) => {
  try {
    const userId = req.params.userId;

    const tournaments = db.prepare(
      'SELECT * FROM tournaments WHERE user_id = ?'
    ).all(userId);

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
app.post('/api/users/:userId/tournaments', (req, res) => {
  try {
    const { date, time, casino, buyin, levels } = req.body;
    const userId = req.params.userId;

    if (!date || !time || !casino || !levels) {
      return res.status(400).json({
        error: 'Les champs date, time, casino et levels sont requis'
      });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const result = db.prepare(
      'INSERT INTO tournaments (user_id, date, time, casino, buyin, levels) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, date, time, casino, buyin || null, levels);

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT mettre à jour un tournoi
app.put('/api/tournaments/:id', (req, res) => {
  try {
    const { date, time, casino, buyin, levels } = req.body;
    const tournamentId = req.params.id;

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }

    db.prepare(
      'UPDATE tournaments SET date = ?, time = ?, casino = ?, buyin = ?, levels = ? WHERE id = ?'
    ).run(
      date || tournament.date,
      time || tournament.time,
      casino || tournament.casino,
      buyin !== undefined ? buyin : tournament.buyin,
      levels || tournament.levels,
      tournamentId
    );

    const updatedTournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    res.json(updatedTournament);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE supprimer un tournoi
app.delete('/api/tournaments/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET tous les tournois scrapés
app.get('/api/scraped-tournaments', (req, res) => {
  try {
    const { date, casino, minBuyIn, maxBuyIn } = req.query;

    let query = 'SELECT * FROM scraped_tournaments WHERE 1=1';
    const params = [];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    if (casino) {
      query += ' AND casino LIKE ?';
      params.push(`%${casino}%`);
    }

    if (minBuyIn) {
      query += ' AND buyIn >= ?';
      params.push(parseInt(minBuyIn));
    }

    if (maxBuyIn) {
      query += ' AND buyIn <= ?';
      params.push(parseInt(maxBuyIn));
    }

    query += ' ORDER BY date, time';

    const tournaments = db.prepare(query).all(...params);
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET les casinos disponibles dans les tournois scrapés
app.get('/api/scraped-tournaments/casinos', (req, res) => {
  try {
    const casinos = db.prepare(`
      SELECT DISTINCT casino, COUNT(*) as count
      FROM scraped_tournaments
      GROUP BY casino
      ORDER BY casino
    `).all();
    res.json(casinos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET les statistiques des tournois scrapés
app.get('/api/scraped-tournaments/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT casino) as casinos,
        COUNT(DISTINCT date) as dates,
        AVG(buyIn) as avgBuyIn,
        MIN(buyIn) as minBuyIn,
        MAX(buyIn) as maxBuyIn,
        MIN(date) as startDate,
        MAX(date) as endDate
      FROM scraped_tournaments
    `).get();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET suggestions de tournois pour autocomplétion (par date)
app.get('/api/scraped-tournaments/suggestions', (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Le paramètre date est requis' });
    }

    const tournaments = db.prepare(`
      SELECT
        id,
        casino,
        date,
        time,
        buyIn,
        levels,
        SUBSTR(time, 1, 5) as displayTime
      FROM scraped_tournaments
      WHERE date = ?
      ORDER BY time, casino
    `).all(date);

    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET timeline de tous les tournois (groupés par date)
app.get('/api/scraped-tournaments/timeline', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT
        id,
        casino,
        date,
        time,
        buyIn,
        levels,
        SUBSTR(time, 1, 5) as displayTime
      FROM scraped_tournaments
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date, time, casino';

    const tournaments = db.prepare(query).all(...params);

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

app.listen(PORT, () => {
  console.log(`Serveur API démarré sur http://localhost:${PORT}`);
});
