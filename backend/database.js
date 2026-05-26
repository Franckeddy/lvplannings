import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Fonction pour initialiser les tables
async function initializeTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        casino TEXT NOT NULL,
        buyin INTEGER,
        levels TEXT NOT NULL,
        user_note TEXT,
        scraped_tournament_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS scraped_tournaments (
        id SERIAL PRIMARY KEY,
        casino TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        buyIn INTEGER,
        levels TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tournaments_user_id ON tournaments(user_id);
      CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(date);
      CREATE INDEX IF NOT EXISTS idx_scraped_tournaments_date ON scraped_tournaments(date);
      CREATE INDEX IF NOT EXISTS idx_scraped_tournaments_casino ON scraped_tournaments(casino);
    `);

    console.log('✓ Tables PostgreSQL créées avec succès');

    // Migration: Ajouter la colonne user_note si elle n'existe pas
    await migrateUserNoteColumn(client);

    // Initialiser les données d'HUGO si elles n'existent pas
    await initializeHugoData(client);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Migration pour ajouter la colonne user_note
async function migrateUserNoteColumn(client) {
  try {
    // Migration user_note
    const checkUserNote = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name = 'user_note'
    `);

    if (checkUserNote.rows.length === 0) {
      await client.query(`
        ALTER TABLE tournaments 
        ADD COLUMN user_note TEXT
      `);
      console.log('✓ Migration: colonne user_note ajoutée');
    }

    // Migration scraped_tournament_id
    const checkScrapedId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name = 'scraped_tournament_id'
    `);

    if (checkScrapedId.rows.length === 0) {
      await client.query(`
        ALTER TABLE tournaments 
        ADD COLUMN scraped_tournament_id INTEGER
      `);
      console.log('✓ Migration: colonne scraped_tournament_id ajoutée');
    }
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }
}

// Fonction pour initialiser les données d'HUGO
async function initializeHugoData(client) {
  try {
    const result = await client.query('SELECT id FROM users WHERE name = $1', ['HUGO']);

    if (result.rows.length === 0) {
      const insertUserResult = await client.query(
        'INSERT INTO users (name) VALUES ($1) RETURNING id',
        ['HUGO']
      );
      const userId = insertUserResult.rows[0].id;

      const hugoTournaments = [
        { date: '04-juin', time: '11:00', casino: 'The Orleans', buyin: 400, levels: '30/40 mn' },
        { date: '04-juin', time: '13:00', casino: 'WSOP Daily', buyin: 250, levels: '30 mn' },
        { date: '04-juin', time: '19:00', casino: 'Aria', buyin: 300, levels: '25 mn' },
        { date: '05-juin', time: '11:00', casino: 'The Orleans', buyin: 300, levels: '30 mn' },
        { date: '05-juin', time: '13:00', casino: 'WSOP Daily', buyin: 250, levels: '30 mn' },
        { date: '05-juin', time: '18:00', casino: 'The Orleans', buyin: 200, levels: '20/30 mn' },
        { date: '06-juin', time: '10:00', casino: 'WSOP', buyin: 1500, levels: '60 mn' },
        { date: '06-juin', time: '19:00', casino: 'Aria', buyin: 300, levels: '25 mn' },
        { date: '07-juin', time: '10:00', casino: 'WSOP', buyin: 500, levels: '30 mn' },
        { date: '07-juin', time: '13:00', casino: 'WSOP Daily', buyin: 250, levels: '30 mn' },
        { date: '08-juin', time: '11:00', casino: 'WSOP', buyin: null, levels: 'DAY 2 MS' },
        { date: '08-juin', time: '11:00', casino: 'WSOP', buyin: null, levels: 'DAY 2 500$ Freezout' },
        { date: '08-juin', time: '13:00', casino: 'WSOP Daily', buyin: 250, levels: '30 mn' },
        { date: '08-juin', time: '19:00', casino: 'Aria', buyin: 300, levels: '25 mn' },
        { date: '09-juin', time: '11:00', casino: 'The Orleans', buyin: 300, levels: '30 mn' },
        { date: '09-juin', time: '13:00', casino: 'WSOP Daily', buyin: 250, levels: '30 mn' },
        { date: '09-juin', time: '19:00', casino: 'Aria', buyin: 300, levels: '25 mn' },
        { date: '10-juin', time: '13:00', casino: 'WSOP Daily', buyin: 250, levels: '30 mn' },
        { date: '11-juin', time: '11:00', casino: 'The Orleans', buyin: 400, levels: '30/40 mn' },
        { date: '11-juin', time: '13:00', casino: 'WSOP Daily', buyin: 250, levels: '30 mn' },
        { date: '12-juin', time: '11:00', casino: 'The Orleans', buyin: 400, levels: '30/40 mn' },
        { date: '12-juin', time: '13:00', casino: 'WSOP Daily', buyin: 250, levels: '30 mn' }
      ];

      for (const tournament of hugoTournaments) {
        await client.query(
          'INSERT INTO tournaments (user_id, date, time, casino, buyin, levels, user_note) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, tournament.date, tournament.time, tournament.casino, tournament.buyin, tournament.levels, tournament.user_note]
        );
      }

      console.log('✓ Données d\'HUGO initialisées avec succès');
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des données HUGO:', error);
  }
}

// Initialiser les tables au démarrage
initializeTables().catch(err => {
  console.error('Erreur fatale lors de l\'initialisation:', err);
  process.exit(1);
});

export default pool;
