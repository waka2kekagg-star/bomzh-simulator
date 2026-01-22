/**
 * БОМЖ СИМУЛЯТОР - Игровой менеджер
 * Основная логика игры: бои, прогулки, магазины, уровни
 */

const config = require('../config/gameConfig');
const GameDatabase = require('../database/GameDatabase');

class GameManager {
    constructor(db) {
        this.db = db;
    }

    // ============ СИСТЕМА УРОВНЕЙ ============

    /**
     * Рассчитывает XP для следующего уровня
     */
    getXPForLevel(level) {
        return Math.floor(config.LEVELS.baseXP * Math.pow(config.LEVELS.multiplier, level - 1));
    }

    /**
     * Добавляет XP игроку и проверяет повышение уровня
     */
    addXP(player, amount) {
        const classData = config.CLASSES[player.class.toUpperCase()];
        let xp = player.xp + amount;
        let level = player.level;
        let leveledUp = false;
        const rewards = [];

        while (level < config.LEVELS.maxLevel) {
            const required = this.getXPForLevel(level);
            if (xp >= required) {
                xp -= required;
                level++;
                leveledUp = true;

                // Проверяем награды за уровень
                const levelReward = config.LEVELS.rewards[level];
                if (levelReward) {
                    rewards.push(levelReward);
                    
                    if (levelReward.money) {
                        this.db.updatePlayerById(player.id, {
                            money: player.money + levelReward.money
                        });
                    }
                    if (levelReward.item) {
                        this.db.addItemToInventory(player.id, levelReward.item, 1);
                    }
                    if (levelReward.skillPoint) {
                        this.db.updatePlayerById(player.id, {
                            skill_points: player.skill_points + levelReward.skillPoint
                        });
                    }
                }
            } else {
                break;
            }
        }

        this.db.updatePlayerById(player.id, { xp, level });
        
        return { level, xp, leveledUp, rewards, xpGained: amount };
    }

    // ============ СИСТЕМА ХАРАКТЕРИСТИК ============

    /**
     * Обновляет характеристики игрока (голод, жажда, энергия)
     */
    updateStats(player) {
        const now = new Date();
        const lastUpdate = player.last_stat_update ? new Date(player.last_stat_update) : now;
        const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
        
        if (hoursPassed < 0.1) return player; // Меньше 6 минут - не обновляем

        let { health, hunger, thirst, energy, addiction } = player;
        const stats = config.STATS;

        // Убывание характеристик
        hunger = Math.max(0, hunger - (stats.HUNGER.decayPerHour * hoursPassed));
        thirst = Math.max(0, thirst - (stats.THIRST.decayPerHour * hoursPassed));
        energy = Math.min(stats.ENERGY.max, energy + (stats.ENERGY.regenPerHour * hoursPassed));

        // Урон от критических показателей
        let healthDamage = 0;
        if (hunger <= stats.HUNGER.criticalThreshold) {
            healthDamage += stats.HUNGER.healthDamageWhenCritical * hoursPassed;
        }
        if (thirst <= stats.THIRST.criticalThreshold) {
            healthDamage += stats.THIRST.healthDamageWhenCritical * hoursPassed;
        }

        // Регенерация здоровья (если всё ок)
        if (healthDamage === 0 && hunger > 50 && thirst > 50) {
            health = Math.min(player.max_health, health + (stats.HEALTH.regenPerHour * hoursPassed));
        } else {
            health = Math.max(0, health - healthDamage);
        }

        // Ломка от зависимости
        if (addiction >= stats.ADDICTION.withdrawalThreshold) {
            addiction = Math.max(0, addiction - (stats.ADDICTION.decayPerHour * hoursPassed));
        }

        // Проверка смерти
        const isDead = health <= 0;

        this.db.updatePlayerById(player.id, {
            health: Math.round(health),
            hunger: Math.round(hunger),
            thirst: Math.round(thirst),
            energy: Math.round(energy),
            addiction: Math.round(addiction),
            is_dead: isDead ? 1 : 0,
            last_stat_update: now.toISOString()
        });

        return {
            ...player,
            health: Math.round(health),
            hunger: Math.round(hunger),
            thirst: Math.round(thirst),
            energy: Math.round(energy),
            addiction: Math.round(addiction),
            is_dead: isDead
        };
    }

    /**
     * Использование предмета
     */
    useItem(player, itemId) {
        // Находим предмет в конфиге
        let itemData = null;
        let category = null;
        
        for (const cat of ['FOOD', 'DRINKS', 'CONSUMABLES', 'SPECIAL']) {
            if (config.ITEMS[cat]?.[itemId]) {
                itemData = config.ITEMS[cat][itemId];
                category = cat;
                break;
            }
        }

        if (!itemData) return { success: false, message: 'Предмет не найден' };
        if (!this.db.hasItem(player.id, itemId)) {
            return { success: false, message: 'У тебя нет этого предмета' };
        }

        const updates = {};
        const effects = [];

        // Применяем эффекты
        if (itemData.hunger) {
            updates.hunger = Math.min(100, player.hunger + itemData.hunger);
            effects.push(`🍖 Голод +${itemData.hunger}`);
        }
        if (itemData.thirst) {
            updates.thirst = Math.min(100, player.thirst + itemData.thirst);
            effects.push(`💧 Жажда +${itemData.thirst}`);
        }
        if (itemData.health) {
            updates.health = Math.min(player.max_health, player.health + itemData.health);
            effects.push(`❤️ Здоровье ${itemData.health > 0 ? '+' : ''}${itemData.health}`);
        }
        if (itemData.energy) {
            updates.energy = Math.min(100, player.energy + itemData.energy);
            effects.push(`⚡ Энергия +${itemData.energy}`);
        }
        if (itemData.addiction) {
            updates.addiction = Math.min(100, player.addiction + itemData.addiction);
            effects.push(`🌀 Зависимость +${itemData.addiction}`);
            
            // Обновляем трейт
            updates.trait_addict = player.trait_addict + config.PERSONALITY.actions.USE_DRUGS.addict;
        }

        // Убираем предмет из инвентаря
        this.db.removeItemFromInventory(player.id, itemId, 1);
        
        // Обновляем игрока
        if (Object.keys(updates).length > 0) {
            this.db.updatePlayerById(player.id, updates);
        }

        return {
            success: true,
            item: itemData,
            effects,
            message: `Использовал ${itemData.emoji} ${itemData.name}`
        };
    }

    // ============ СИСТЕМА БОЁВ ============

    /**
     * Рассчитывает урон
     */
    calculateDamage(attacker, defender, isPlayer = true) {
        let baseDamage = 5;
        let defense = 0;

        if (isPlayer) {
            // Урон от оружия
            const weapon = config.ITEMS.WEAPONS[attacker.equipped_weapon];
            if (weapon) {
                baseDamage = weapon.damage;
            }

            // Бонусы класса
            const classData = config.CLASSES[attacker.class.toUpperCase()];
            if (classData) {
                // Берсерк для наркомана
                if (classData.bonuses.berserker && attacker.health < attacker.max_health * 0.3) {
                    baseDamage *= (1 + classData.bonuses.berserker);
                }
                // Скрытый урон для вора
                if (classData.bonuses.stealthDamage) {
                    baseDamage *= (1 + classData.bonuses.stealthDamage * 0.5);
                }
            }

            // Защита противника
            if (defender.equipped_armor) {
                const armor = config.ITEMS.ARMOR[defender.equipped_armor];
                if (armor) defense = armor.defense;
            }
        } else {
            // NPC/Босс атакует
            baseDamage = attacker.damage || 10;
            
            // Защита игрока
            const armor = config.ITEMS.ARMOR[defender.equipped_armor];
            if (armor) defense = armor.defense;
        }

        // Случайный разброс ±20%
        const variance = 0.8 + Math.random() * 0.4;
        let finalDamage = Math.floor((baseDamage - defense * 0.5) * variance);
        
        // Крит
        const critChance = isPlayer ? 0.1 : 0.05;
        const isCrit = Math.random() < critChance;
        if (isCrit) finalDamage = Math.floor(finalDamage * 1.5);

        return {
            damage: Math.max(1, finalDamage),
            isCrit,
            blocked: Math.floor(defense * 0.5)
        };
    }

    /**
     * Создаёт бой с NPC
     */
    startPvEFight(player, enemyType) {
        const enemy = config.ELITE_ENEMIES[enemyType.toUpperCase()];
        if (!enemy) return { success: false, message: 'Враг не найден' };

        const fightId = `fight_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        this.db.createFight(
            fightId,
            player.id,
            null,
            'pve',
            enemyType,
            player.health,
            null,
            enemy.health,
            null
        );

        this.db.updatePlayerById(player.id, { is_in_fight: 1 });

        return {
            success: true,
            fightId,
            enemy: {
                ...enemy,
                type: enemyType,
                currentHp: enemy.health
            },
            playerHp: player.health
        };
    }

    /**
     * Создаёт PvP бой
     */
    startPvPFight(player1, player2) {
        const fightId = `pvp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        this.db.createFight(
            fightId,
            player1.id,
            player2.id,
            'pvp',
            null,
            player1.health,
            player2.health,
            null,
            null
        );

        this.db.updatePlayerById(player1.id, { is_in_fight: 1 });
        this.db.updatePlayerById(player2.id, { is_in_fight: 1 });

        return {
            success: true,
            fightId,
            player1: { ...player1, currentHp: player1.health },
            player2: { ...player2, currentHp: player2.health }
        };
    }

    /**
     * Выполняет ход в бою
     */
    processFightTurn(fightId, attackerId, action = 'attack') {
        const fight = this.db.getFight(fightId);
        if (!fight) return { success: false, message: 'Бой не найден' };

        const attacker = this.db.getPlayerById(attackerId);
        const isPvE = fight.enemy_type === 'pve';
        
        let result = {
            success: true,
            fightEnded: false,
            winner: null,
            logs: []
        };

        if (action === 'attack') {
            if (isPvE) {
                // Игрок атакует NPC
                const enemy = config.ELITE_ENEMIES[fight.enemy_id.toUpperCase()];
                const playerDamage = this.calculateDamage(attacker, enemy, true);
                
                let newEnemyHp = fight.enemy_hp - playerDamage.damage;
                result.logs.push({
                    attacker: attacker.name,
                    target: enemy.name,
                    damage: playerDamage.damage,
                    isCrit: playerDamage.isCrit,
                    message: `${attacker.name} ${playerDamage.isCrit ? '💥 КРИТ! ' : ''}наносит ${playerDamage.damage} урона`
                });

                if (newEnemyHp <= 0) {
                    // Победа!
                    result.fightEnded = true;
                    result.winner = 'player';
                    result.rewards = this.processFightRewards(attacker, enemy, fight.enemy_id);
                } else {
                    // Враг атакует в ответ
                    const enemyDamage = this.calculateDamage(enemy, attacker, false);
                    let newPlayerHp = fight.player1_hp - enemyDamage.damage;
                    
                    result.logs.push({
                        attacker: enemy.name,
                        target: attacker.name,
                        damage: enemyDamage.damage,
                        isCrit: enemyDamage.isCrit,
                        message: `${enemy.name} ${enemyDamage.isCrit ? '💥 КРИТ! ' : ''}наносит ${enemyDamage.damage} урона`
                    });

                    if (newPlayerHp <= 0) {
                        // Поражение
                        result.fightEnded = true;
                        result.winner = 'enemy';
                        this.processFightLoss(attacker);
                    } else {
                        // Обновляем бой
                        this.db.updateFight(fightId, {
                            player1_hp: newPlayerHp,
                            enemy_hp: newEnemyHp,
                            round: fight.round + 1
                        });
                    }

                    result.playerHp = Math.max(0, newPlayerHp);
                }
                
                result.enemyHp = Math.max(0, newEnemyHp);
            } else {
                // PvP бой - сложнее, обрабатываем по очереди
                // TODO: Полная реализация PvP
            }
        } else if (action === 'flee') {
            // Попытка побега
            const classData = config.CLASSES[attacker.class.toUpperCase()];
            let escapeChance = 0.3;
            
            if (classData?.bonuses?.escapeChance) {
                escapeChance += classData.bonuses.escapeChance;
            }

            if (Math.random() < escapeChance) {
                result.fightEnded = true;
                result.escaped = true;
                result.logs.push({ message: `${attacker.name} успешно сбежал!` });
            } else {
                // Не удалось сбежать, враг атакует
                const enemy = isPvE ? config.ELITE_ENEMIES[fight.enemy_id.toUpperCase()] : null;
                if (enemy) {
                    const enemyDamage = this.calculateDamage(enemy, attacker, false);
                    const newPlayerHp = fight.player1_hp - enemyDamage.damage;
                    
                    result.logs.push({
                        message: `Побег не удался! ${enemy.name} наносит ${enemyDamage.damage} урона`
                    });

                    if (newPlayerHp <= 0) {
                        result.fightEnded = true;
                        result.winner = 'enemy';
                        this.processFightLoss(attacker);
                    } else {
                        this.db.updateFight(fightId, { player1_hp: newPlayerHp });
                    }
                    
                    result.playerHp = Math.max(0, newPlayerHp);
                }
            }
        }

        // Завершаем бой если нужно
        if (result.fightEnded) {
            this.db.deleteFight(fightId);
            this.db.updatePlayerById(attacker.id, { is_in_fight: 0 });
        }

        return result;
    }

    /**
     * Обработка наград за победу
     */
    processFightRewards(player, enemy, enemyType) {
        const rewards = {
            xp: enemy.xp || 20,
            money: Math.floor(Math.random() * 50) + 10,
            items: [],
            reputation: {}
        };

        // Лут с врага
        if (enemy.loot) {
            for (const itemId of enemy.loot) {
                if (Math.random() < 0.3) { // 30% шанс на каждый предмет
                    this.db.addItemToInventory(player.id, itemId, 1);
                    rewards.items.push(itemId);
                }
            }
        }

        // Добавляем XP и деньги
        this.addXP(player, rewards.xp);
        this.db.updatePlayerById(player.id, {
            money: player.money + rewards.money,
            total_fights: player.total_fights + 1,
            fights_won: player.fights_won + 1,
            total_money_earned: player.total_money_earned + rewards.money,
            trait_aggressive: player.trait_aggressive + config.PERSONALITY.actions.FIGHT_WIN.aggressive,
            rep_bandits: player.rep_bandits + 2, // Уважение от решал
            rep_street: player.rep_street + 1
        });

        return rewards;
    }

    /**
     * Обработка поражения
     */
    processFightLoss(player) {
        const moneyLost = Math.floor(player.money * config.STATS.HEALTH.deathPenalty);
        
        this.db.updatePlayerById(player.id, {
            health: 1, // Оставляем 1 HP
            money: player.money - moneyLost,
            total_fights: player.total_fights + 1,
            fights_lost: player.fights_lost + 1,
            deaths: player.deaths + 1,
            trait_aggressive: player.trait_aggressive + config.PERSONALITY.actions.FIGHT_LOSE.aggressive,
            is_in_fight: 0
        });

        return { moneyLost };
    }

    // ============ СИСТЕМА ПРОГУЛОК ============

    /**
     * Начинает прогулку
     */
    startWalk(player, walkType = 'medium') {
        const walkConfig = config.WALK.duration[walkType];
        if (!walkConfig) return { success: false, message: 'Неверный тип прогулки' };

        if (player.energy < walkConfig.energyCost) {
            return { success: false, message: `Недостаточно энергии! Нужно ${walkConfig.energyCost}⚡` };
        }

        if (player.is_walking) {
            return { success: false, message: 'Ты уже на прогулке!' };
        }

        const walkId = `walk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const endsAt = new Date(Date.now() + walkConfig.minutes * 60 * 1000).toISOString();

        this.db.createWalk(walkId, player.id, walkType, endsAt, null);
        this.db.updatePlayerById(player.id, {
            is_walking: 1,
            walk_ends_at: endsAt,
            energy: player.energy - walkConfig.energyCost
        });

        return {
            success: true,
            walkId,
            duration: walkConfig.minutes,
            endsAt
        };
    }

    /**
     * Завершает прогулку и генерирует результаты
     */
    completeWalk(walkId) {
        const walk = this.db.getWalk(walkId);
        if (!walk) return { success: false, message: 'Прогулка не найдена' };

        const player = this.db.getPlayerById(walk.player_id);
        const walkConfig = config.WALK.duration[walk.walk_type];
        const classData = config.CLASSES[player.class.toUpperCase()];

        const results = {
            events: [],
            loot: [],
            money: 0,
            xp: 10,
            damage: 0
        };

        // Генерируем события
        const numEvents = Math.floor(walkConfig.minutes / 20); // 1 событие на 20 минут
        
        for (let i = 0; i < numEvents; i++) {
            const event = this.rollWalkEvent(player, classData, walkConfig.lootChance);
            results.events.push(event);

            if (event.money) results.money += event.money;
            if (event.xp) results.xp += event.xp;
            if (event.damage) results.damage += event.damage;
            if (event.item) {
                results.loot.push(event.item);
                this.db.addItemToInventory(player.id, event.item, 1);
            }
        }

        // Бонус класса вора к луту
        if (classData?.bonuses?.lootChance && Math.random() < classData.bonuses.lootChance) {
            const bonusItem = this.getRandomItem('common');
            results.loot.push(bonusItem);
            this.db.addItemToInventory(player.id, bonusItem, 1);
            results.events.push({
                type: 'BONUS_LOOT',
                description: 'Твои воровские навыки помогли найти дополнительный лут!',
                item: bonusItem
            });
        }

        // Применяем результаты
        const xpResult = this.addXP(player, results.xp);
        
        this.db.updatePlayerById(player.id, {
            money: player.money + results.money,
            health: Math.max(1, player.health - results.damage),
            is_walking: 0,
            walk_ends_at: null,
            walks_completed: player.walks_completed + 1,
            total_money_earned: player.total_money_earned + results.money,
            total_items_found: player.total_items_found + results.loot.length
        });

        // Удаляем прогулку
        this.db.deleteWalk(walkId);

        return {
            success: true,
            results,
            levelUp: xpResult.leveledUp ? xpResult : null
        };
    }

    /**
     * Генерирует случайное событие прогулки
     */
    rollWalkEvent(player, classData, lootChance) {
        const events = config.WALK.events;
        const roll = Math.random();
        let cumulative = 0;

        for (const [eventType, eventData] of Object.entries(events)) {
            cumulative += eventData.chance;
            if (roll < cumulative) {
                return this.processWalkEvent(eventType, eventData, player, classData);
            }
        }

        return { type: 'NOTHING', description: 'Ничего интересного не произошло' };
    }

    /**
     * Обрабатывает конкретное событие
     */
    processWalkEvent(type, data, player, classData) {
        const event = { type, description: '' };

        switch (type) {
            case 'NOTHING':
                event.description = 'Прогулялся без приключений';
                break;

            case 'FIND_MONEY':
                const money = Math.floor(Math.random() * (data.reward.money[1] - data.reward.money[0])) + data.reward.money[0];
                event.money = money;
                event.description = `💵 Нашёл ${money} на земле!`;
                event.xp = 5;
                break;

            case 'FIND_ITEM':
                const item = this.getRandomItem('common');
                event.item = item;
                event.description = `📦 Нашёл ${this.getItemName(item)}!`;
                event.xp = 10;
                break;

            case 'FIND_RARE':
                const rareItem = this.getRandomItem('rare');
                event.item = rareItem;
                event.description = `✨ Нашёл редкий предмет: ${this.getItemName(rareItem)}!`;
                event.xp = 25;
                break;

            case 'FIGHT_RANDOM':
                const enemies = Object.keys(config.ELITE_ENEMIES);
                const enemyType = enemies[Math.floor(Math.random() * enemies.length)];
                const enemy = config.ELITE_ENEMIES[enemyType];
                
                // Автобой (упрощённый)
                const playerPower = player.level * 10 + (player.health / 2);
                const enemyPower = enemy.health + enemy.damage * 5;
                
                if (Math.random() < (playerPower / (playerPower + enemyPower))) {
                    event.description = `⚔️ Встретил ${enemy.name} и победил!`;
                    event.xp = enemy.xp;
                    event.money = Math.floor(Math.random() * 30) + 10;
                    if (enemy.loot && Math.random() < 0.2) {
                        event.item = enemy.loot[Math.floor(Math.random() * enemy.loot.length)];
                    }
                } else {
                    event.description = `⚔️ Встретил ${enemy.name} и еле сбежал!`;
                    event.damage = Math.floor(Math.random() * 20) + 10;
                    event.xp = 5;
                }
                break;

            case 'POLICE_CHECK':
                if (player.rep_cops >= 50) {
                    event.description = '👮 Легавые узнали тебя и отпустили';
                    event.xp = 5;
                } else if (player.rep_cops <= -50) {
                    event.description = '👮 Легавые задержали тебя! Потерял время и деньги';
                    event.money = -Math.floor(player.money * 0.1);
                } else {
                    event.description = '👮 Легавые проверили документы и отпустили';
                }
                break;

            case 'TREASURE':
                const treasureItem = this.getRandomItem('epic');
                const treasureMoney = Math.floor(Math.random() * (data.reward.money[1] - data.reward.money[0])) + data.reward.money[0];
                event.item = treasureItem;
                event.money = treasureMoney;
                event.description = `🎁 ДЖЕКПОТ! Нашёл тайник с ${this.getItemName(treasureItem)} и ${treasureMoney}💵!`;
                event.xp = 50;
                break;

            case 'BOSS_ENCOUNTER':
                event.description = '👹 Издалека заметил опасного босса... В следующий раз..';
                event.xp = 15;
                break;
        }

        return event;
    }

    // ============ МАГАЗИНЫ ============

    /**
     * Покупка в магазине
     */
    buyItem(player, shopType, itemId, quantity = 1) {
        const shop = config.SHOPS[shopType.toUpperCase()];
        if (!shop) return { success: false, message: 'Магазин не найден' };

        // Находим предмет
        let itemData = null;
        for (const category of Object.values(config.ITEMS)) {
            if (category[itemId]) {
                itemData = { id: itemId, ...category[itemId] };
                break;
            }
        }

        if (!itemData) return { success: false, message: 'Предмет не найден' };

        // Рассчитываем цену
        let price = itemData.price * shop.priceMultiplier * quantity;

        // Скидки от репутации (для решал)
        if (shopType.toUpperCase() === 'RESHALY' && player.rep_bandits > 0) {
            price *= (1 - player.rep_bandits * shop.discountPerReputation);
        }

        // Бонус бизнесмена
        const classData = config.CLASSES[player.class.toUpperCase()];
        if (classData?.bonuses?.buyDiscount) {
            price *= (1 - classData.bonuses.buyDiscount);
        }

        price = Math.ceil(price);

        if (player.money < price) {
            return { success: false, message: `Не хватает денег! Нужно ${price}💵` };
        }

        // Проверяем место в инвентаре
        const backpack = config.ITEMS.BACKPACKS[player.equipped_backpack];
        const currentSlots = this.db.getInventoryCount(player.id);
        if (currentSlots + quantity > (backpack?.slots || 5)) {
            return { success: false, message: 'Нет места в рюкзаке!' };
        }

        // Совершаем покупку
        this.db.updatePlayerById(player.id, { money: player.money - price });
        this.db.addItemToInventory(player.id, itemId, quantity);
        this.db.logTransaction(player.id, 'buy', -price, itemId, { shop: shopType, quantity });

        return {
            success: true,
            item: itemData,
            price,
            quantity,
            message: `Купил ${itemData.emoji} ${itemData.name} x${quantity} за ${price}💵`
        };
    }

    /**
     * Продажа в ломбарде
     */
    sellItem(player, itemId, quantity = 1) {
        if (!this.db.hasItem(player.id, itemId, quantity)) {
            return { success: false, message: 'У тебя нет этого предмета' };
        }

        // Находим предмет
        let itemData = null;
        for (const category of Object.values(config.ITEMS)) {
            if (category[itemId]) {
                itemData = { id: itemId, ...category[itemId] };
                break;
            }
        }

        if (!itemData) return { success: false, message: 'Предмет не найден' };
        if (!itemData.price) return { success: false, message: 'Этот предмет нельзя продать' };

        // Рассчитываем цену
        let sellPrice = itemData.price * config.SHOPS.LOMBARD.sellPriceMultiplier * quantity;

        // Бонус бизнесмена
        const classData = config.CLASSES[player.class.toUpperCase()];
        if (classData?.bonuses?.sellPrice) {
            sellPrice *= (1 + classData.bonuses.sellPrice);
        }

        sellPrice = Math.floor(sellPrice);

        // Продаём
        this.db.removeItemFromInventory(player.id, itemId, quantity);
        this.db.updatePlayerById(player.id, {
            money: player.money + sellPrice,
            total_money_earned: player.total_money_earned + sellPrice
        });
        this.db.logTransaction(player.id, 'sell', sellPrice, itemId, { quantity });

        return {
            success: true,
            item: itemData,
            price: sellPrice,
            quantity,
            message: `Продал ${itemData.emoji} ${itemData.name} x${quantity} за ${sellPrice}💵`
        };
    }

    // ============ ЕЖЕДНЕВНЫЕ НАГРАДЫ ============

    /**
     * Получение ежедневной награды
     */
    claimDaily(player) {
        const now = new Date();
        const lastDaily = player.last_daily ? new Date(player.last_daily) : null;
        
        // Проверяем, прошло ли 24 часа
        if (lastDaily) {
            const hoursSinceLastDaily = (now - lastDaily) / (1000 * 60 * 60);
            if (hoursSinceLastDaily < 24) {
                const hoursLeft = Math.ceil(24 - hoursSinceLastDaily);
                return { success: false, message: `Сундук будет доступен через ${hoursLeft} ч.` };
            }
        }

        // Определяем стрик
        let streak = player.daily_streak;
        if (lastDaily) {
            const daysSinceLastDaily = (now - lastDaily) / (1000 * 60 * 60 * 24);
            if (daysSinceLastDaily > 2) {
                streak = 1; // Сброс стрика
            } else {
                streak++;
            }
        } else {
            streak = 1;
        }

        // Определяем редкость сундука
        const chestRoll = Math.random();
        let chestType = 'common';
        let cumulative = 0;
        
        for (const [type, data] of Object.entries(config.DAILY.chest)) {
            cumulative += data.chance;
            if (chestRoll < cumulative) {
                chestType = type;
                break;
            }
        }

        const chest = config.DAILY.chest[chestType];
        
        // Генерируем награды
        const rewards = {
            chestType,
            money: Math.floor(Math.random() * (chest.money[1] - chest.money[0])) + chest.money[0],
            items: [],
            streak
        };

        // Бонус за стрик
        const streakBonus = Object.entries(config.DAILY.streakBonus)
            .filter(([days]) => streak >= parseInt(days))
            .pop();
        
        if (streakBonus) {
            rewards.money = Math.floor(rewards.money * streakBonus[1].multiplier);
            if (streakBonus[1].bonusItem) {
                rewards.items.push(this.getRandomItem(chest.rarity));
            }
        }

        // Добавляем предметы
        for (let i = 0; i < chest.items; i++) {
            const item = this.getRandomItem(chest.rarity);
            rewards.items.push(item);
            this.db.addItemToInventory(player.id, item, 1);
        }

        // Обновляем игрока
        this.db.updatePlayerById(player.id, {
            money: player.money + rewards.money,
            daily_streak: streak,
            last_daily: now.toISOString(),
            total_money_earned: player.total_money_earned + rewards.money
        });

        return { success: true, rewards };
    }

    // ============ УТИЛИТЫ ============

    /**
     * Получает случайный предмет заданной редкости
     */
    getRandomItem(rarity) {
        const itemsOfRarity = [];
        
        for (const category of Object.values(config.ITEMS)) {
            for (const [id, item] of Object.entries(category)) {
                if (item.rarity === rarity || 
                    (rarity === 'common' && !item.rarity)) {
                    itemsOfRarity.push(id);
                }
            }
        }

        if (itemsOfRarity.length === 0) {
            return 'bread_stale'; // Фоллбек
        }

        return itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
    }

    /**
     * Получает название предмета
     */
    getItemName(itemId) {
        for (const category of Object.values(config.ITEMS)) {
            if (category[itemId]) {
                return `${category[itemId].emoji} ${category[itemId].name}`;
            }
        }
        return itemId;
    }

    /**
     * Получает данные предмета
     */
    getItemData(itemId) {
        for (const category of Object.values(config.ITEMS)) {
            if (category[itemId]) {
                return { id: itemId, ...category[itemId] };
            }
        }
        return null;
    }

    /**
     * Форматирует характеристики для отображения
     */
    formatStats(player) {
        const stats = config.STATS;
        const getBar = (current, max, length = 10) => {
            const filled = Math.round((current / max) * length);
            return '█'.repeat(filled) + '░'.repeat(length - filled);
        };

        return [
            `${stats.HEALTH.emoji} ${getBar(player.health, player.max_health)} ${player.health}/${player.max_health}`,
            `${stats.HUNGER.emoji} ${getBar(player.hunger, 100)} ${player.hunger}/100`,
            `${stats.THIRST.emoji} ${getBar(player.thirst, 100)} ${player.thirst}/100`,
            `${stats.ENERGY.emoji} ${getBar(player.energy, 100)} ${player.energy}/100`,
            `${stats.ADDICTION.emoji} ${getBar(player.addiction, 100)} ${player.addiction}/100`
        ].join('\n');
    }

    /**
     * Определяет доминирующий трейт личности
     */
    getDominantTrait(player) {
        const traits = [
            { name: 'aggressive', value: player.trait_aggressive, positive: 'Агрессивный', negative: 'Миролюбивый' },
            { name: 'greedy', value: player.trait_greedy, positive: 'Жадный', negative: 'Щедрый' },
            { name: 'loyal', value: player.trait_loyal, positive: 'Верный', negative: 'Предатель' },
            { name: 'addict', value: player.trait_addict, positive: 'Зависимый', negative: 'Трезвенник' }
        ];

        const dominant = traits.reduce((max, trait) => 
            Math.abs(trait.value) > Math.abs(max.value) ? trait : max
        );

        if (Math.abs(dominant.value) < 20) return 'Неопределённая личность';
        
        return dominant.value > 0 ? dominant.positive : dominant.negative;
    }
}

module.exports = GameManager;
