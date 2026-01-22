/**
 * БОМЖ СИМУЛЯТОР - Игровая механика
 * Бои, прогулки, уровни, лут
 */

const config = require('../config/gameConfig');

class GameMechanics {
    
    // ============ СИСТЕМА УРОВНЕЙ ============
    
    static calculateXPForLevel(level) {
        return Math.floor(config.LEVELS.baseXP * Math.pow(config.LEVELS.multiplier, level - 1));
    }

    static calculateTotalXPForLevel(level) {
        let total = 0;
        for (let i = 1; i < level; i++) {
            total += this.calculateXPForLevel(i);
        }
        return total;
    }

    static checkLevelUp(player) {
        const xpNeeded = this.calculateXPForLevel(player.level);
        const results = { levelsGained: 0, rewards: [] };

        while (player.xp >= xpNeeded && player.level < config.LEVELS.maxLevel) {
            player.xp -= this.calculateXPForLevel(player.level);
            player.level++;
            results.levelsGained++;

            // Проверяем награды за уровень
            const reward = config.LEVELS.rewards[player.level];
            if (reward) {
                results.rewards.push(reward);
            }

            // Проверяем разблокировки
            const unlocks = config.LEVELS.unlocks[player.level];
            if (unlocks) {
                results.unlocks = unlocks;
            }
        }

        return results;
    }

    // ============ СИСТЕМА БОЁВ ============

    static calculateDamage(attacker, defender, weapon) {
        const weaponData = config.ITEMS.WEAPONS[weapon] || config.ITEMS.WEAPONS.fists;
        const classData = config.CLASSES[attacker.class?.toUpperCase()];
        
        let baseDamage = weaponData.damage || 5;
        
        // Бонус от уровня
        baseDamage += Math.floor(attacker.level * 0.5);
        
        // Бонусы класса
        if (classData?.bonuses) {
            if (classData.bonuses.stealthDamage && Math.random() < 0.3) {
                baseDamage *= (1 + classData.bonuses.stealthDamage);
            }
            if (classData.bonuses.critChance && Math.random() < classData.bonuses.critChance) {
                baseDamage *= 2;
            }
            if (classData.bonuses.berserker && attacker.health < attacker.max_health * 0.3) {
                baseDamage *= (1 + classData.bonuses.berserker);
            }
        }

        // Защита
        const armorData = config.ITEMS.ARMOR[defender.equipped_armor] || { defense: 0 };
        const defense = armorData.defense || 0;
        
        // Финальный урон
        const finalDamage = Math.max(1, Math.floor(baseDamage * (1 - defense / 100)));
        
        // Критический удар
        const isCrit = Math.random() < (weaponData.crit || 10) / 100;
        
        return {
            damage: isCrit ? finalDamage * 2 : finalDamage,
            isCrit,
            weapon: weaponData.name
        };
    }

    static calculateEnemyDamage(enemy, player) {
        const baseDamage = enemy.damage || 10;
        const armorData = config.ITEMS.ARMOR[player.equipped_armor] || { defense: 0 };
        const defense = armorData.defense || 0;
        
        return Math.max(1, Math.floor(baseDamage * (1 - defense / 100)));
    }

    static getRandomEnemy(playerLevel) {
        const enemies = Object.entries(config.ELITE_ENEMIES);
        const suitableEnemies = enemies.filter(([_, e]) => {
            const enemyLevel = Math.floor(e.xp / 10);
            return enemyLevel <= playerLevel + 5 && enemyLevel >= playerLevel - 3;
        });

        if (suitableEnemies.length === 0) {
            return { id: 'GOPNIK', ...config.ELITE_ENEMIES.GOPNIK };
        }

        const [id, data] = suitableEnemies[Math.floor(Math.random() * suitableEnemies.length)];
        return { id, ...data };
    }

    static processFightRound(attacker, defender, attackerWeapon) {
        const attackResult = this.calculateDamage(attacker, defender, attackerWeapon);
        
        return {
            damage: attackResult.damage,
            isCrit: attackResult.isCrit,
            weapon: attackResult.weapon,
            defenderHpLeft: Math.max(0, defender.health - attackResult.damage)
        };
    }

    // ============ СИСТЕМА ПРОГУЛОК ============

    static generateWalkEvents(walkType, player) {
        const walkConfig = config.WALK.duration[walkType];
        const events = [];
        const eventCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < eventCount; i++) {
            const event = this.rollWalkEvent(player, walkConfig.lootChance);
            if (event) events.push(event);
        }

        return events;
    }

    static rollWalkEvent(player, lootChanceBonus = 0) {
        const classData = config.CLASSES[player.class?.toUpperCase()];
        const lootBonus = classData?.bonuses?.lootChance || 0;
        const totalLootChance = lootChanceBonus + lootBonus;

        const roll = Math.random();
        let cumulative = 0;

        for (const [eventType, eventData] of Object.entries(config.WALK.events)) {
            let chance = eventData.chance;
            if (['FIND_ITEM', 'FIND_RARE', 'TREASURE'].includes(eventType)) {
                chance *= (1 + totalLootChance);
            }
            
            cumulative += chance;
            if (roll < cumulative) {
                return this.processWalkEvent(eventType, eventData, player);
            }
        }

        return null;
    }

    static processWalkEvent(eventType, eventData, player) {
        const event = { type: eventType, description: eventData.description || eventType };

        switch (eventType) {
            case 'FIND_MONEY':
                const [min, max] = eventData.reward.money;
                event.money = Math.floor(Math.random() * (max - min + 1)) + min;
                event.description = `Нашёл ${event.money} денег!`;
                break;

            case 'FIND_ITEM':
                event.item = this.getRandomItem('common');
                event.description = `Нашёл: ${event.item.name}`;
                break;

            case 'FIND_RARE':
                event.item = this.getRandomItem('rare');
                event.description = `Редкая находка: ${event.item.name}!`;
                break;

            case 'TREASURE':
                event.item = this.getRandomItem('epic');
                const [tMin, tMax] = eventData.reward.money;
                event.money = Math.floor(Math.random() * (tMax - tMin + 1)) + tMin;
                event.description = `СОКРОВИЩЕ! ${event.item.name} и ${event.money} денег!`;
                break;

            case 'FIGHT_RANDOM':
                event.enemy = this.getRandomEnemy(player.level);
                event.description = `Напал ${event.enemy.name}!`;
                break;

            case 'POLICE_CHECK':
                event.description = 'Проверка документов...';
                event.reputationCheck = 'cops';
                break;

            case 'BOSS_ENCOUNTER':
                const bosses = Object.keys(config.BOSSES);
                event.bossId = bosses[Math.floor(Math.random() * bosses.length)];
                event.description = `Встреча с боссом: ${config.BOSSES[event.bossId].name}!`;
                break;

            case 'NOTHING':
            default:
                event.description = 'Ничего интересного не произошло.';
        }

        return event;
    }

    // ============ СИСТЕМА ЛУТА ============

    static getRandomItem(rarity = 'common') {
        const rarityMap = { common: ['common'], uncommon: ['common', 'uncommon'], 
                          rare: ['uncommon', 'rare'], epic: ['rare', 'epic'], legendary: ['epic', 'legendary'] };
        
        const allowedRarities = rarityMap[rarity] || ['common'];
        const allItems = [];

        for (const category of Object.values(config.ITEMS)) {
            for (const [itemId, itemData] of Object.entries(category)) {
                if (allowedRarities.includes(itemData.rarity)) {
                    allItems.push({ id: itemId, ...itemData });
                }
            }
        }

        return allItems.length > 0 ? allItems[Math.floor(Math.random() * allItems.length)] : 
               { id: 'bread_stale', ...config.ITEMS.FOOD.bread_stale };
    }

    static generateDailyChest(player) {
        const roll = Math.random();
        let cumulative = 0;
        let chestType = 'common';

        for (const [type, data] of Object.entries(config.DAILY.chest)) {
            cumulative += data.chance;
            if (roll < cumulative) {
                chestType = type;
                break;
            }
        }

        // Бонус за стрик
        let multiplier = 1;
        for (const [streak, bonus] of Object.entries(config.DAILY.streakBonus)) {
            if (player.daily_streak >= parseInt(streak)) {
                multiplier = bonus.multiplier;
            }
        }

        const chestData = config.DAILY.chest[chestType];
        const [minMoney, maxMoney] = chestData.money;
        const money = Math.floor((Math.random() * (maxMoney - minMoney + 1) + minMoney) * multiplier);

        const items = [];
        for (let i = 0; i < chestData.items; i++) {
            items.push(this.getRandomItem(chestData.rarity));
        }

        return { type: chestType, money, items, streak: player.daily_streak + 1 };
    }

    // ============ ХАРАКТЕРИСТИКИ ============

    static updateStats(player, hoursPassed) {
        const updates = {};

        // Голод
        const hungerLoss = Math.floor(config.STATS.HUNGER.decayPerHour * hoursPassed);
        updates.hunger = Math.max(0, player.hunger - hungerLoss);

        // Жажда
        const thirstLoss = Math.floor(config.STATS.THIRST.decayPerHour * hoursPassed);
        updates.thirst = Math.max(0, player.thirst - thirstLoss);

        // Урон от критических уровней
        let healthDamage = 0;
        if (updates.hunger < config.STATS.HUNGER.criticalThreshold) {
            healthDamage += config.STATS.HUNGER.healthDamageWhenCritical * hoursPassed;
        }
        if (updates.thirst < config.STATS.THIRST.criticalThreshold) {
            healthDamage += config.STATS.THIRST.healthDamageWhenCritical * hoursPassed;
        }

        // Регенерация здоровья
        const healthRegen = config.STATS.HEALTH.regenPerHour * hoursPassed;
        updates.health = Math.min(player.max_health, Math.max(0, player.health + healthRegen - healthDamage));

        // Энергия
        const energyRegen = config.STATS.ENERGY.regenPerHour * hoursPassed;
        updates.energy = Math.min(config.STATS.ENERGY.max, player.energy + energyRegen);

        // Проверка смерти
        if (updates.health <= 0) {
            updates.is_dead = 1;
            updates.deaths = player.deaths + 1;
            updates.money = Math.floor(player.money * (1 - config.STATS.HEALTH.deathPenalty));
        }

        return updates;
    }

    static useItem(player, itemId) {
        const item = this.findItemData(itemId);
        if (!item) return { success: false, message: 'Предмет не найден' };

        const effects = {};

        if (item.hunger) effects.hunger = Math.min(100, player.hunger + item.hunger);
        if (item.thirst) effects.thirst = Math.min(100, player.thirst + item.thirst);
        if (item.health) effects.health = Math.min(player.max_health, player.health + item.health);
        if (item.energy) effects.energy = Math.min(100, player.energy + item.energy);
        if (item.addiction) effects.addiction = Math.min(100, player.addiction + item.addiction);

        return { success: true, effects, item };
    }

    static findItemData(itemId) {
        for (const category of Object.values(config.ITEMS)) {
            if (category[itemId]) {
                return { id: itemId, ...category[itemId] };
            }
        }
        return null;
    }

    // ============ ЛИЧНОСТЬ ============

    static updatePersonality(player, action) {
        const actionEffects = config.PERSONALITY.actions[action];
        if (!actionEffects) return {};

        const updates = {};
        for (const [trait, change] of Object.entries(actionEffects)) {
            const currentTrait = player[`trait_${trait}`] || 0;
            updates[`trait_${trait}`] = Math.max(-100, Math.min(100, currentTrait + change));
        }

        return updates;
    }

    static getPersonalityTitle(player) {
        const traits = [];
        
        for (const [traitId, traitData] of Object.entries(config.PERSONALITY.traits)) {
            const playerValue = player[`trait_${traitId.toLowerCase()}`] || 0;
            if (Math.abs(playerValue) >= Math.abs(traitData.threshold) * 0.7) {
                if (playerValue >= traitData.threshold) {
                    traits.push(traitData.description);
                }
            }
        }

        return traits.length > 0 ? traits.join(', ') : 'Обычный бомж';
    }

    // ============ РЕПУТАЦИЯ ============

    static getReputationLevel(player, faction) {
        const rep = player[`rep_${faction}`] || 0;
        const factionData = config.REPUTATION[faction.toUpperCase()];
        if (!factionData) return null;

        let currentLevel = null;
        for (const [threshold, levelData] of Object.entries(factionData.levels)) {
            if (rep >= parseInt(threshold)) {
                currentLevel = levelData;
            }
        }

        return currentLevel;
    }

    static applyReputationEffects(player, action, faction) {
        const effects = {
            cops: { betray: -20, help: 15, snitch: 25, resist: -15 },
            bandits: { betray: -30, help: 20, buy_weapon: 5, refuse_deal: -10 },
            street: { help_homeless: 15, steal_from_homeless: -25, share_food: 10, fight_win: 5 }
        };

        const factionEffects = effects[faction];
        if (!factionEffects || !factionEffects[action]) return 0;

        return factionEffects[action];
    }
}

module.exports = GameMechanics;
