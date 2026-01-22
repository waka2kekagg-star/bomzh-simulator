/**
 * БОМЖ СИМУЛЯТОР - База данных на sql.js
 * Чистый JavaScript, без native compilation
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let SQL = null;
let dbInstance = null;

class GameDatabase {
    constructor(db, dbPath) {
        this.db = db;
        this.dbPath = dbPath;
        this.initTables();
    }

    static async create(dbPath = './data/game.db') {
        if (dbInstance) return dbInstance;

        if (!SQL) {
            SQL = await initSqlJs();
        }

        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        let db;
        try {
            if (fs.existsSync(dbPath)) {
                const fileBuffer = fs.readFileSync(dbPath);
                db = new SQL.Database(fileBuffer);
            } else {
                db = new SQL.Database();
            }
        } catch (e) {
            console.log('Creating new database...');
            db = new SQL.Database();
        }

        dbInstance = new GameDatabase(db, dbPath);
        return dbInstance;
    }

    save() {
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        } catch (e) {
            console.error('Save error:', e.message);
        }
    }

    initTables() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS players (
                id TEXT PRIMARY KEY,
                discord_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                country TEXT NOT NULL,
                class TEXT NOT NULL,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                skill_points INTEGER DEFAULT 0,
                health INTEGER DEFAULT 100,
                max_health INTEGER DEFAULT 100,
                hunger INTEGER DEFAULT 100,
                thirst INTEGER DEFAULT 100,
                energy INTEGER DEFAULT 100,
                addiction INTEGER DEFAULT 0,
                money INTEGER DEFAULT 100,
                bank INTEGER DEFAULT 0,
                rep_cops INTEGER DEFAULT 0,
                rep_bandits INTEGER DEFAULT 0,
                rep_street INTEGER DEFAULT 0,
                trait_aggressive INTEGER DEFAULT 0,
                trait_greedy INTEGER DEFAULT 0,
                trait_loyal INTEGER DEFAULT 0,
                trait_addict INTEGER DEFAULT 0,
                equipped_weapon TEXT DEFAULT 'fists',
                equipped_armor TEXT DEFAULT 'rags',
                equipped_backpack TEXT DEFAULT 'plastic_bag',
                total_fights INTEGER DEFAULT 0,
                fights_won INTEGER DEFAULT 0,
                fights_lost INTEGER DEFAULT 0,
                bosses_killed INTEGER DEFAULT 0,
                total_money_earned INTEGER DEFAULT 0,
                total_items_found INTEGER DEFAULT 0,
                walks_completed INTEGER DEFAULT 0,
                players_killed INTEGER DEFAULT 0,
                deaths INTEGER DEFAULT 0,
                daily_streak INTEGER DEFAULT 0,
                last_daily TEXT,
                last_walk TEXT,
                last_fight TEXT,
                last_stat_update TEXT,
                created_at TEXT,
                updated_at TEXT,
                is_dead INTEGER DEFAULT 0,
                is_in_fight INTEGER DEFAULT 0,
                is_walking INTEGER DEFAULT 0,
                walk_ends_at TEXT,
                current_location TEXT DEFAULT 'lobby'
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                quantity INTEGER DEFAULT 1,
                durability INTEGER DEFAULT 100,
                enchantments TEXT,
                obtained_at TEXT
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS active_fights (
                id TEXT PRIMARY KEY,
                player1_id TEXT NOT NULL,
                player2_id TEXT,
                enemy_type TEXT,
                enemy_id TEXT,
                player1_hp INTEGER,
                player2_hp INTEGER,
                enemy_hp INTEGER,
                current_turn TEXT,
                round INTEGER DEFAULT 1,
                channel_id TEXT,
                message_id TEXT,
                started_at TEXT,
                expires_at TEXT
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS active_walks (
                id TEXT PRIMARY KEY,
                player_id TEXT NOT NULL,
                walk_type TEXT NOT NULL,
                started_at TEXT,
                ends_at TEXT NOT NULL,
                events_log TEXT DEFAULT '[]',
                loot_collected TEXT DEFAULT '[]',
                channel_id TEXT,
                message_id TEXT
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS world_bosses (
                id TEXT PRIMARY KEY,
                boss_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                current_hp INTEGER,
                max_hp INTEGER,
                is_alive INTEGER DEFAULT 1,
                killed_by TEXT,
                killed_at TEXT,
                respawns_at TEXT,
                damage_dealt TEXT DEFAULT '{}'
            )
        `);

        this.save();
    }

    // Хелперы
    run(sql, params = []) {
        this.db.run(sql, params);
        this.save();
    }

    get(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    }

    all(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    // ============ ИГРОКИ ============

    createPlayer(discordId, name, country, playerClass) {
        const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        this.run(`
            INSERT INTO players (id, discord_id, name, country, class, last_stat_update, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, discordId, name, country, playerClass, now, now, now]);
        
        // Стартовые предметы
        const config = require('../config/gameConfig');
        const classData = config.CLASSES[playerClass.toUpperCase()];
        if (classData?.startingItems) {
            for (const itemId of classData.startingItems) {
                this.addItemToInventory(id, itemId, 1);
            }
        }
        
        return this.getPlayer(discordId);
    }

    getPlayer(discordId) {
        return this.get('SELECT * FROM players WHERE discord_id = ?', [discordId]);
    }

    getPlayerById(playerId) {
        return this.get('SELECT * FROM players WHERE id = ?', [playerId]);
    }

    updatePlayer(discordId, updates) {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        this.run(`UPDATE players SET ${setClause}, updated_at = ? WHERE discord_id = ?`, 
                 [...values, new Date().toISOString(), discordId]);
    }

    updatePlayerById(playerId, updates) {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        this.run(`UPDATE players SET ${setClause}, updated_at = ? WHERE id = ?`, 
                 [...values, new Date().toISOString(), playerId]);
    }

    deletePlayer(discordId) {
        const player = this.getPlayer(discordId);
        if (player) {
            this.run('DELETE FROM inventory WHERE player_id = ?', [player.id]);
            this.run('DELETE FROM active_walks WHERE player_id = ?', [player.id]);
        }
        this.run('DELETE FROM players WHERE discord_id = ?', [discordId]);
    }

    // ============ ИНВЕНТАРЬ ============

    addItemToInventory(playerId, itemId, quantity = 1, durability = 100) {
        const existing = this.get(
            'SELECT * FROM inventory WHERE player_id = ? AND item_id = ? AND durability = ?',
            [playerId, itemId, durability]
        );

        if (existing) {
            this.run('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [quantity, existing.id]);
        } else {
            this.run(
                'INSERT INTO inventory (player_id, item_id, quantity, durability, obtained_at) VALUES (?, ?, ?, ?, ?)',
                [playerId, itemId, quantity, durability, new Date().toISOString()]
            );
        }
    }

    removeItemFromInventory(playerId, itemId, quantity = 1) {
        const existing = this.get(
            'SELECT * FROM inventory WHERE player_id = ? AND item_id = ?',
            [playerId, itemId]
        );
        if (!existing) return false;

        if (existing.quantity <= quantity) {
            this.run('DELETE FROM inventory WHERE id = ?', [existing.id]);
        } else {
            this.run('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [quantity, existing.id]);
        }
        return true;
    }

    getInventory(playerId) {
        return this.all('SELECT * FROM inventory WHERE player_id = ?', [playerId]);
    }

    hasItem(playerId, itemId, quantity = 1) {
        const result = this.get(
            'SELECT SUM(quantity) as total FROM inventory WHERE player_id = ? AND item_id = ?',
            [playerId, itemId]
        );
        return (result?.total || 0) >= quantity;
    }

    // ============ БОИ ============

    createFight(fightId, player1Id, player2Id, enemyType, enemyId, p1Hp, p2Hp, enemyHp, channelId) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
        this.run(`
            INSERT INTO active_fights 
            (id, player1_id, player2_id, enemy_type, enemy_id, player1_hp, player2_hp, enemy_hp, current_turn, channel_id, started_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [fightId, player1Id, player2Id, enemyType, enemyId, p1Hp, p2Hp, enemyHp, player1Id, channelId, now.toISOString(), expiresAt]);
    }

    getFight(fightId) {
        return this.get('SELECT * FROM active_fights WHERE id = ?', [fightId]);
    }

    getPlayerFight(playerId) {
        return this.get('SELECT * FROM active_fights WHERE player1_id = ? OR player2_id = ?', [playerId, playerId]);
    }

    updateFight(fightId, updates) {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        this.run(`UPDATE active_fights SET ${setClause} WHERE id = ?`, [...values, fightId]);
    }

    deleteFight(fightId) {
        this.run('DELETE FROM active_fights WHERE id = ?', [fightId]);
    }

    // ============ ПРОГУЛКИ ============

    createWalk(walkId, playerId, walkType, endsAt, channelId) {
        this.run(`
            INSERT INTO active_walks (id, player_id, walk_type, ends_at, channel_id, started_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [walkId, playerId, walkType, endsAt, channelId, new Date().toISOString()]);
    }

    getPlayerWalk(playerId) {
        return this.get('SELECT * FROM active_walks WHERE player_id = ?', [playerId]);
    }

    updateWalk(walkId, updates) {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        this.run(`UPDATE active_walks SET ${setClause} WHERE id = ?`, [...values, walkId]);
    }

    deleteWalk(walkId) {
        this.run('DELETE FROM active_walks WHERE id = ?', [walkId]);
    }

    // ============ БОССЫ ============

    getWorldBoss(bossId, guildId) {
        return this.get('SELECT * FROM world_bosses WHERE boss_id = ? AND guild_id = ?', [bossId, guildId]);
    }

    createOrUpdateWorldBoss(bossId, guildId, maxHp) {
        const existing = this.getWorldBoss(bossId, guildId);
        if (existing) return existing;
        
        const id = `boss_${bossId}_${guildId}`;
        this.run(`
            INSERT INTO world_bosses (id, boss_id, guild_id, current_hp, max_hp, is_alive)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [id, bossId, guildId, maxHp, maxHp]);
        
        return this.getWorldBoss(bossId, guildId);
    }

    damageBoss(bossId, guildId, playerId, damage) {
        const boss = this.getWorldBoss(bossId, guildId);
        if (!boss || !boss.is_alive) return null;
        
        const damageDealt = JSON.parse(boss.damage_dealt || '{}');
        damageDealt[playerId] = (damageDealt[playerId] || 0) + damage;
        
        const newHp = Math.max(0, boss.current_hp - damage);
        const isDead = newHp <= 0;
        
        if (isDead) {
            this.run(`
                UPDATE world_bosses 
                SET current_hp = ?, is_alive = 0, damage_dealt = ?, killed_by = ?, killed_at = ?
                WHERE boss_id = ? AND guild_id = ?
            `, [newHp, JSON.stringify(damageDealt), playerId, new Date().toISOString(), bossId, guildId]);
        } else {
            this.run(`
                UPDATE world_bosses 
                SET current_hp = ?, damage_dealt = ?
                WHERE boss_id = ? AND guild_id = ?
            `, [newHp, JSON.stringify(damageDealt), bossId, guildId]);
        }
        
        return { ...boss, current_hp: newHp, is_alive: !isDead, damage_dealt: damageDealt };
    }

    // ============ ЛИДЕРБОРД ============

    getLeaderboard(sortBy = 'level', limit = 10) {
        const validColumns = ['level', 'money', 'fights_won', 'bosses_killed', 'total_money_earned'];
        const column = validColumns.includes(sortBy) ? sortBy : 'level';
        
        return this.all(`
            SELECT discord_id, name, country, class, level, xp, money, 
                   fights_won, bosses_killed, total_money_earned
            FROM players 
            ORDER BY ${column} DESC, level DESC
            LIMIT ?
        `, [limit]);
    }

    close() {
        if (this.db) {
            this.save();
            this.db.close();
        }
    }
}

module.exports = GameDatabase;
