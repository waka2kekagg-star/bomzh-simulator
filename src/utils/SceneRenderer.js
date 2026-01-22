/**
 * БОМЖ СИМУЛЯТОР - Рендерер сцен
 * Композиция персонажей на фонах с HP барами
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class SceneRenderer {
    constructor() {
        this.assetsPath = path.join(__dirname, '../../assets');
        this.cachePath = path.join(__dirname, '../../cache/scenes');
        this.ensureDirs();
    }

    ensureDirs() {
        const dirs = [this.cachePath, this.assetsPath];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // ============ ПУТИ К АССЕТАМ ============

    getAssetPath(type, name) {
        const paths = {
            lobby: `lobby/${name}.png`,
            district: `district/${name}.png`,
            shop: `shops/${name}.png`,
            arena: `arenas/${name}.png`,
            boss: `bosses/${name}.png`,
            class: `classes/${name}.png`,
            enemy: `enemies/${name}.png`,
            ui: `ui/${name}.png`
        };
        return path.join(this.assetsPath, paths[type] || `${type}/${name}.png`);
    }

    // ============ ГЕНЕРАЦИЯ HP БАРА (SVG) ============

    createHealthBarSVG(current, max, width = 150, height = 16, color = '#22c55e') {
        const percentage = Math.max(0, Math.min(100, (current / max) * 100));
        const fillWidth = (percentage / 100) * (width - 4);
        
        // Цвет зависит от HP
        if (percentage < 25) color = '#ef4444';      // красный
        else if (percentage < 50) color = '#f59e0b'; // оранжевый
        else if (percentage < 75) color = '#eab308'; // жёлтый
        
        return Buffer.from(`
            <svg width="${width}" height="${height}">
                <rect x="0" y="0" width="${width}" height="${height}" rx="3" fill="#1f2937"/>
                <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="2" fill="#374151"/>
                <rect x="2" y="2" width="${fillWidth}" height="${height - 4}" rx="2" fill="${color}"/>
                <text x="${width / 2}" y="${height / 2 + 4}" font-family="Arial" font-size="10" 
                      fill="white" text-anchor="middle" font-weight="bold">
                    ${current}/${max}
                </text>
            </svg>
        `);
    }

    // ============ ГЕНЕРАЦИЯ ТЕКСТОВОЙ ПЛАШКИ ============

    createTextLabel(text, options = {}) {
        const {
            fontSize = 14,
            padding = 8,
            bgColor = '#000000cc',
            textColor = '#ffffff',
            maxWidth = 300
        } = options;

        const width = Math.min(maxWidth, text.length * fontSize * 0.6 + padding * 2);
        const height = fontSize + padding * 2;

        return Buffer.from(`
            <svg width="${width}" height="${height}">
                <rect x="0" y="0" width="${width}" height="${height}" rx="4" fill="${bgColor}"/>
                <text x="${width / 2}" y="${height / 2 + fontSize / 3}" 
                      font-family="Arial" font-size="${fontSize}" fill="${textColor}" 
                      text-anchor="middle" font-weight="bold">
                    ${text}
                </text>
            </svg>
        `);
    }

    // ============ РЕНДЕР ЛОББИ ============

    async renderLobby(player, country, variant = 1) {
        const bgPath = this.getAssetPath('lobby', `${country}_${variant}`);
        const charPath = this.getAssetPath('class', player.class);

        // Проверяем существование файлов
        if (!fs.existsSync(bgPath)) {
            console.warn(`Background not found: ${bgPath}`);
            return null;
        }

        try {
            const composites = [];

            // Персонаж (если есть)
            if (fs.existsSync(charPath)) {
                const character = await sharp(charPath)
                    .resize(100, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();
                composites.push({ input: character, left: 350, top: 420 });
            }

            // Имя игрока
            const nameLabel = this.createTextLabel(player.name, { fontSize: 16 });
            composites.push({ input: nameLabel, left: 320, top: 390 });

            // Статы
            const statsLabel = this.createTextLabel(
                `❤️${player.health} 🍖${player.hunger} 💧${player.thirst} ⚡${player.energy}`,
                { fontSize: 12, maxWidth: 250 }
            );
            composites.push({ input: statsLabel, left: 280, top: 550 });

            const result = await sharp(bgPath)
                .resize(800, 600)
                .composite(composites)
                .png()
                .toBuffer();

            return result;
        } catch (error) {
            console.error('Lobby render error:', error);
            return null;
        }
    }

    // ============ РЕНДЕР РАЙОНА ============

    async renderDistrict(player, timeOfDay = 'day') {
        const bgPath = this.getAssetPath('district', timeOfDay);
        const charPath = this.getAssetPath('class', player.class);

        if (!fs.existsSync(bgPath)) return null;

        try {
            const composites = [];

            if (fs.existsSync(charPath)) {
                const character = await sharp(charPath)
                    .resize(80, 100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();
                composites.push({ input: character, left: 260, top: 280 });
            }

            return await sharp(bgPath)
                .resize(600, 400)
                .composite(composites)
                .png()
                .toBuffer();
        } catch (error) {
            console.error('District render error:', error);
            return null;
        }
    }

    // ============ РЕНДЕР БОЯ ============

    async renderFight(player, enemy, fight, arenaType = 'podezd') {
        const bgPath = this.getAssetPath('arena', arenaType);
        const playerCharPath = this.getAssetPath('class', player.class);
        const enemyPath = this.getAssetPath('enemy', enemy.id?.toLowerCase() || 'gopnik');

        if (!fs.existsSync(bgPath)) {
            console.warn(`Arena not found: ${bgPath}`);
            return null;
        }

        try {
            const composites = [];

            // Игрок (слева)
            if (fs.existsSync(playerCharPath)) {
                const playerSprite = await sharp(playerCharPath)
                    .resize(100, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();
                composites.push({ input: playerSprite, left: 100, top: 220 });
            }

            // Враг (справа)
            if (fs.existsSync(enemyPath)) {
                const enemySprite = await sharp(enemyPath)
                    .resize(100, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .flop() // отзеркалить
                    .toBuffer();
                composites.push({ input: enemySprite, left: 400, top: 220 });
            }

            // Имена
            const playerLabel = this.createTextLabel(player.name, { fontSize: 12 });
            composites.push({ input: playerLabel, left: 80, top: 195 });

            const enemyLabel = this.createTextLabel(enemy.name || 'Враг', { fontSize: 12 });
            composites.push({ input: enemyLabel, left: 380, top: 195 });

            // HP бары
            const playerHP = this.createHealthBarSVG(fight.player1_hp, player.max_health, 120, 14);
            composites.push({ input: playerHP, left: 70, top: 345 });

            const enemyHP = this.createHealthBarSVG(fight.enemy_hp, enemy.health, 120, 14, '#ef4444');
            composites.push({ input: enemyHP, left: 410, top: 345 });

            // Раунд
            const roundLabel = this.createTextLabel(`Раунд ${fight.round}`, { fontSize: 14 });
            composites.push({ input: roundLabel, left: 250, top: 30 });

            // VS
            const vsLabel = this.createTextLabel('VS', { fontSize: 20, bgColor: '#dc2626' });
            composites.push({ input: vsLabel, left: 275, top: 250 });

            return await sharp(bgPath)
                .resize(600, 400)
                .composite(composites)
                .png()
                .toBuffer();
        } catch (error) {
            console.error('Fight render error:', error);
            return null;
        }
    }

    // ============ РЕНДЕР БОССА ============

    async renderBoss(player, bossId, bossState) {
        const bgPath = this.getAssetPath('arena', 'wasteland'); // Босс-арена
        const playerCharPath = this.getAssetPath('class', player.class);
        const bossPath = this.getAssetPath('boss', bossId.toLowerCase());

        if (!fs.existsSync(bgPath)) return null;

        try {
            const composites = [];

            // Игрок (слева, маленький)
            if (fs.existsSync(playerCharPath)) {
                const playerSprite = await sharp(playerCharPath)
                    .resize(80, 100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();
                composites.push({ input: playerSprite, left: 80, top: 250 });
            }

            // Босс (справа, большой)
            if (fs.existsSync(bossPath)) {
                const bossSprite = await sharp(bossPath)
                    .resize(180, 220, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();
                composites.push({ input: bossSprite, left: 350, top: 130 });
            }

            // HP бар босса (большой, сверху)
            const bossHP = this.createHealthBarSVG(bossState.current_hp, bossState.max_hp, 400, 20, '#fbbf24');
            composites.push({ input: bossHP, left: 100, top: 50 });

            // Имя босса
            const config = require('../config/gameConfig');
            const bossData = config.BOSSES[bossId.toUpperCase()];
            const bossLabel = this.createTextLabel(
                `👑 ${bossData?.name || bossId}`, 
                { fontSize: 16, bgColor: '#7c3aedcc' }
            );
            composites.push({ input: bossLabel, left: 200, top: 20 });

            return await sharp(bgPath)
                .resize(600, 400)
                .composite(composites)
                .png()
                .toBuffer();
        } catch (error) {
            console.error('Boss render error:', error);
            return null;
        }
    }

    // ============ РЕНДЕР МАГАЗИНА ============

    async renderShop(shopType, player) {
        const bgPath = this.getAssetPath('shop', shopType.toLowerCase());
        const charPath = this.getAssetPath('class', player.class);

        if (!fs.existsSync(bgPath)) return null;

        try {
            const composites = [];

            // Персонаж у прилавка
            if (fs.existsSync(charPath)) {
                const character = await sharp(charPath)
                    .resize(70, 90, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();
                composites.push({ input: character, left: 50, top: 280 });
            }

            // Деньги игрока
            const moneyLabel = this.createTextLabel(`💰 ${player.money}`, { fontSize: 14 });
            composites.push({ input: moneyLabel, left: 500, top: 20 });

            return await sharp(bgPath)
                .resize(600, 400)
                .composite(composites)
                .png()
                .toBuffer();
        } catch (error) {
            console.error('Shop render error:', error);
            return null;
        }
    }

    // ============ РЕНДЕР ПРОФИЛЯ ============

    async renderProfile(player) {
        const charPath = this.getAssetPath('class', player.class);
        
        // Создаём фон профиля
        const width = 400;
        const height = 300;
        
        try {
            // Базовый градиентный фон
            const bgSvg = Buffer.from(`
                <svg width="${width}" height="${height}">
                    <defs>
                        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#1e293b"/>
                            <stop offset="100%" style="stop-color:#0f172a"/>
                        </linearGradient>
                    </defs>
                    <rect width="${width}" height="${height}" fill="url(#bg)"/>
                    <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
                          rx="10" fill="none" stroke="#334155" stroke-width="2"/>
                </svg>
            `);

            const composites = [];

            // Персонаж
            if (fs.existsSync(charPath)) {
                const character = await sharp(charPath)
                    .resize(100, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();
                composites.push({ input: character, left: 30, top: 50 });
            }

            // Имя и уровень
            const nameLabel = this.createTextLabel(`${player.name} [Ур.${player.level}]`, { fontSize: 18 });
            composites.push({ input: nameLabel, left: 150, top: 30 });

            // Класс
            const config = require('../config/gameConfig');
            const classData = config.CLASSES[player.class?.toUpperCase()];
            const classLabel = this.createTextLabel(
                `${classData?.emoji || ''} ${classData?.name || player.class}`,
                { fontSize: 12, bgColor: '#4338cacc' }
            );
            composites.push({ input: classLabel, left: 150, top: 60 });

            // HP бар
            const hpBar = this.createHealthBarSVG(player.health, player.max_health, 200, 16);
            composites.push({ input: hpBar, left: 150, top: 100 });

            // Статы текстом
            const stats = [
                `🍖 Голод: ${player.hunger}/100`,
                `💧 Жажда: ${player.thirst}/100`,
                `⚡ Энергия: ${player.energy}/100`,
                `💰 Деньги: ${player.money}`,
                `⚔️ Побед: ${player.fights_won}`
            ];

            let y = 140;
            for (const stat of stats) {
                const label = this.createTextLabel(stat, { fontSize: 11, bgColor: '#00000000' });
                composites.push({ input: label, left: 150, top: y });
                y += 25;
            }

            return await sharp(bgSvg)
                .composite(composites)
                .png()
                .toBuffer();
        } catch (error) {
            console.error('Profile render error:', error);
            return null;
        }
    }

    // ============ УТИЛИТЫ ============

    // Получить случайную арену
    getRandomArena() {
        const arenas = ['podezd', 'garazhi', 'wasteland', 'parking', 'alley', 'junkyard'];
        return arenas[Math.floor(Math.random() * arenas.length)];
    }

    // Получить время суток
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 15) return 'day';
        if (hour >= 15 && hour < 20) return 'evening';
        return 'night';
    }

    // Проверить наличие ассетов
    checkAssets() {
        const required = [
            'lobby/russia_1.png',
            'district/day.png',
            'shops/larek.png',
            'arenas/podezd.png',
            'classes/thief.png'
        ];

        const missing = [];
        for (const asset of required) {
            const fullPath = path.join(this.assetsPath, asset);
            if (!fs.existsSync(fullPath)) {
                missing.push(asset);
            }
        }

        return {
            ok: missing.length === 0,
            missing
        };
    }
}

module.exports = new SceneRenderer();
