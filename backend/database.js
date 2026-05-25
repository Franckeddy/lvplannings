import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    casino TEXT NOT NULL,
    buyin INTEGER,
    levels TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tournaments_user_id ON tournaments(user_id);
  CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(date);
`);

function initializeHugoData() {
  const existingUser = db.prepare('SELECT id FROM users WHERE name = ?').get('HUGO');

  if (!existingUser) {
    const insertUser = db.prepare('INSERT INTO users (name) VALUES (?)');
    const result = insertUser.run('HUGO');
    const userId = result.lastInsertRowid;

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

    const insertTournament = db.prepare(
      'INSERT INTO tournaments (user_id, date, time, casino, buyin, levels) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const tournament of hugoTournaments) {
      insertTournament.run(
        userId,
        tournament.date,
        tournament.time,
        tournament.casino,
        tournament.buyin,
        tournament.levels
      );
    }

    console.log('Données d\'HUGO initialisées avec succès');
  }
}

initializeHugoData();

export default db;
