/**
 * БОМЖ СИМУЛЯТОР - UI Компоненты
 * Discord кнопки, меню, embeds
 */

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder 
} = require('discord.js');
const config = require('../config/gameConfig');

class UIBuilder {
    
    // ============ ЦВЕТА ============
    
    static colors = {
        primary: 0x5865F2,
        success: 0x57F287,
        danger: 0xED4245,
        warning: 0xFEE75C,
        info: 0x5865F2,
        rare: 0x9B59B6,
        epic: 0xE91E63,
        legendary: 0xFFD700,
        common: 0x95A5A6
    };

    // ============ СОЗДАНИЕ ПЕРСОНАЖА ============

    /**
     * Меню выбора страны
     */
    static countrySelectMenu() {
        const options = Object.entries(config.COUNTRIES).map(([id, country]) => ({
            label: country.name.replace(/^.*\s/, ''), // Убираем эмодзи
            value: id.toLowerCase(),
            emoji: country.emoji,
            description: `Валюта: ${country.currency}`
        }));

        const select = new StringSelectMenuBuilder()
            .setCustomId('select_country')
            .setPlaceholder('🌍 Выбери страну')
            .addOptions(options);

        return new ActionRowBuilder().addComponents(select);
    }

    /**
     * Меню выбора класса
     */
    static classSelectMenu() {
        const options = Object.entries(config.CLASSES).map(([id, cls]) => ({
            label: cls.name.replace(/^.*\s/, ''),
            value: id.toLowerCase(),
            emoji: cls.emoji,
            description: cls.description.substring(0, 50) + '...'
        }));

        const select = new StringSelectMenuBuilder()
            .setCustomId('select_class')
            .setPlaceholder('👤 Выбери путь')
            .addOptions(options);

        return new ActionRowBuilder().addComponents(select);
    }

    /**
     * Embed создания персонажа
     */
    static createCharacterEmbed(step = 'name') {
        const embed = new EmbedBuilder()
            .setColor(this.colors.primary)
            .setTitle('🏚️ БОМЖ СИМУЛЯТОР')
            .setDescription('Создай своего бомжа и подними его до миллиардера!')
            .setFooter({ text: 'Бомж Симулятор v1.0' });

        switch (step) {
            case 'name':
                embed.addFields({
                    name: '📝 Шаг 1: Имя',
                    value: 'Напиши имя для своего персонажа (до 20 символов)'
                });
                break;
            case 'country':
                embed.addFields({
                    name: '🌍 Шаг 2: Страна',
                    value: 'Выбери страну, где будет жить твой бомж'
                });
                break;
            case 'class':
                embed.addFields({
                    name: '👤 Шаг 3: Путь',
                    value: 'Выбери жизненный путь своего персонажа'
                });
                break;
        }

        return embed;
    }

    /**
     * Embed информации о классе
     */
    static classInfoEmbed(classId) {
        const cls = config.CLASSES[classId.toUpperCase()];
        if (!cls) return null;

        const bonusesText = Object.entries(cls.bonuses)
            .map(([key, value]) => `• ${this.formatBonusName(key)}: +${Math.round(value * 100)}%`)
            .join('\n');

        return new EmbedBuilder()
            .setColor(this.colors.info)
            .setTitle(`${cls.emoji} ${cls.name}`)
            .setDescription(cls.description)
            .addFields(
                { name: '💪 Бонусы', value: bonusesText, inline: true },
                { name: '⚠️ Слабость', value: this.formatWeakness(cls.weakness), inline: true },
                { name: '🎒 Стартовые предметы', value: cls.startingItems.map(i => this.getItemEmoji(i)).join(' '), inline: true }
            );
    }

    // ============ ГЛАВНОЕ ЛОББИ ============

    /**
     * Embed лобби игрока
     */
    static lobbyEmbed(player, gameManager) {
        const classData = config.CLASSES[player.class.toUpperCase()];
        const countryData = config.COUNTRIES[player.country.toUpperCase()];
        
        const xpForNext = gameManager.getXPForLevel(player.level);
        const xpBar = this.createProgressBar(player.xp, xpForNext, 15);
        
        const embed = new EmbedBuilder()
            .setColor(this.colors.primary)
            .setTitle(`${countryData.emoji} ${player.name}`)
            .setDescription(`${classData.emoji} ${classData.name} • Ур. ${player.level}`)
            .addFields(
                { 
                    name: '📊 Характеристики', 
                    value: gameManager.formatStats(player),
                    inline: false 
                },
                {
                    name: '📈 Опыт',
                    value: `${xpBar} ${player.xp}/${xpForNext}`,
                    inline: false
                },
                {
                    name: '💰 Деньги',
                    value: `${player.money.toLocaleString()} ${countryData.currency}`,
                    inline: true
                },
                {
                    name: '🎭 Личность',
                    value: gameManager.getDominantTrait(player),
                    inline: true
                },
                {
                    name: '⭐ Репутация',
                    value: [
                        `👮 Легавые: ${player.rep_cops}`,
                        `🔪 Решалы: ${player.rep_bandits}`,
                        `🏚️ Район: ${player.rep_street}`
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({ text: `Побед: ${player.fights_won} • Боссов: ${player.bosses_killed}` });

        return embed;
    }

    /**
     * Кнопки главного лобби
     */
    static lobbyButtons() {
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('walk')
                .setLabel('Прогулка')
                .setEmoji('🚶')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('daily')
                .setLabel('Сундук')
                .setEmoji('🎁')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('district')
                .setLabel('На район')
                .setEmoji('🏘️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('inventory')
                .setLabel('Инвентарь')
                .setEmoji('🎒')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('stats')
                .setLabel('Статистика')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('leaderboard')
                .setLabel('Топ')
                .setEmoji('🏆')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('settings')
                .setLabel('⚙️')
                .setStyle(ButtonStyle.Secondary)
        );

        return [row1, row2];
    }

    // ============ РАЙОН ============

    /**
     * Embed района
     */
    static districtEmbed(player) {
        const countryData = config.COUNTRIES[player.country.toUpperCase()];
        
        return new EmbedBuilder()
            .setColor(this.colors.warning)
            .setTitle(`🏘️ Район • ${countryData.name}`)
            .setDescription('Добро пожаловать на район. Здесь можно найти всё... и потерять тоже.')
            .addFields(
                { name: '🏪 Ларёк', value: 'Еда, напитки, сигареты', inline: true },
                { name: '🏦 Ломбард', value: 'Продай ненужное', inline: true },
                { name: '👮 Легавые', value: 'Стукани или подружись', inline: true },
                { name: '🔪 Решалы', value: 'Оружие и защита', inline: true },
                { name: '⚔️ Арена', value: 'Бои с бомжами', inline: true },
                { name: '👹 Боссы', value: 'Рейды на боссов', inline: true }
            );
    }

    /**
     * Кнопки района
     */
    static districtButtons(player) {
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('shop_larek')
                .setLabel('Ларёк')
                .setEmoji('🏪')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('shop_lombard')
                .setLabel('Ломбард')
                .setEmoji('🏦')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('npc_cops')
                .setLabel('Легавые')
                .setEmoji('👮')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('shop_reshaly')
                .setLabel('Решалы')
                .setEmoji('🔪')
                .setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('arena_pve')
                .setLabel('Бой')
                .setEmoji('⚔️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('arena_boss')
                .setLabel('Боссы')
                .setEmoji('👹')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(player.level < 10),
            new ButtonBuilder()
                .setCustomId('arena_pvp')
                .setLabel('PvP')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('back_lobby')
                .setLabel('Назад')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Secondary)
        );

        return [row1, row2];
    }

    // ============ МАГАЗИНЫ ============

    /**
     * Embed магазина
     */
    static shopEmbed(shopType, player) {
        const shop = config.SHOPS[shopType.toUpperCase()];
        if (!shop) return null;

        const items = shop.items.map(itemId => {
            const item = this.findItem(itemId);
            if (!item) return null;
            
            let price = Math.ceil(item.price * shop.priceMultiplier);
            
            // Скидки
            if (shopType === 'reshaly' && player.rep_bandits > 0) {
                const discount = player.rep_bandits * shop.discountPerReputation;
                price = Math.ceil(price * (1 - discount));
            }
            
            return `${item.emoji} **${item.name}** - ${price}💵`;
        }).filter(Boolean).join('\n');

        return new EmbedBuilder()
            .setColor(this.colors.success)
            .setTitle(shop.name)
            .setDescription(items || 'Магазин пуст')
            .addFields({
                name: '💰 Твои деньги',
                value: `${player.money.toLocaleString()}💵`,
                inline: true
            });
    }

    /**
     * Меню выбора товара в магазине
     */
    static shopItemSelect(shopType) {
        const shop = config.SHOPS[shopType.toUpperCase()];
        if (!shop) return null;

        const options = shop.items.map(itemId => {
            const item = this.findItem(itemId);
            if (!item) return null;
            
            return {
                label: item.name,
                value: `buy_${shopType}_${itemId}`,
                emoji: item.emoji,
                description: `${Math.ceil(item.price * shop.priceMultiplier)}💵`
            };
        }).filter(Boolean);

        if (options.length === 0) return null;

        const select = new StringSelectMenuBuilder()
            .setCustomId(`shop_buy_${shopType}`)
            .setPlaceholder('Выбери товар')
            .addOptions(options);

        return new ActionRowBuilder().addComponents(select);
    }

    // ============ БОИ ============

    /**
     * Embed боя
     */
    static fightEmbed(fight, player, enemy, round = 1) {
        const playerHpBar = this.createProgressBar(fight.player1_hp, player.max_health, 15);
        const enemyHpBar = this.createProgressBar(fight.enemy_hp, enemy.health, 15);

        return new EmbedBuilder()
            .setColor(this.colors.danger)
            .setTitle(`⚔️ БОЙ • Раунд ${round}`)
            .addFields(
                {
                    name: `${player.name}`,
                    value: `❤️ ${playerHpBar} ${fight.player1_hp}/${player.max_health}`,
                    inline: false
                },
                {
                    name: 'VS',
                    value: '⚔️',
                    inline: false
                },
                {
                    name: `${enemy.name}`,
                    value: `❤️ ${enemyHpBar} ${fight.enemy_hp}/${enemy.health}`,
                    inline: false
                }
            );
    }

    /**
     * Кнопки боя
     */
    static fightButtons(fightId) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`fight_attack_${fightId}`)
                .setLabel('Атака')
                .setEmoji('⚔️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`fight_defend_${fightId}`)
                .setLabel('Защита')
                .setEmoji('🛡️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`fight_item_${fightId}`)
                .setLabel('Предмет')
                .setEmoji('🎒')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`fight_flee_${fightId}`)
                .setLabel('Бежать')
                .setEmoji('🏃')
                .setStyle(ButtonStyle.Secondary)
        );
    }

    /**
     * Embed результата боя
     */
    static fightResultEmbed(result, player, enemy) {
        const isVictory = result.winner === 'player';
        
        const embed = new EmbedBuilder()
            .setColor(isVictory ? this.colors.success : this.colors.danger)
            .setTitle(isVictory ? '🎉 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ');

        if (isVictory && result.rewards) {
            embed.setDescription(`Ты победил ${enemy.name}!`)
                .addFields(
                    { name: '💰 Деньги', value: `+${result.rewards.money}💵`, inline: true },
                    { name: '⭐ Опыт', value: `+${result.rewards.xp} XP`, inline: true }
                );
            
            if (result.rewards.items.length > 0) {
                const itemNames = result.rewards.items.map(id => this.getItemEmoji(id)).join(' ');
                embed.addFields({ name: '🎁 Лут', value: itemNames, inline: false });
            }
        } else if (!isVictory) {
            embed.setDescription(`${enemy.name} победил тебя...`)
                .addFields({
                    name: '💸 Потери',
                    value: 'Потерял часть денег при побеге',
                    inline: false
                });
        } else if (result.escaped) {
            embed.setTitle('🏃 ПОБЕГ!')
                .setColor(this.colors.warning)
                .setDescription('Удалось сбежать!');
        }

        return embed;
    }

    // ============ ПРОГУЛКИ ============

    /**
     * Меню выбора прогулки
     */
    static walkSelectMenu() {
        const options = [
            {
                label: 'Короткая прогулка',
                value: 'short',
                emoji: '🚶',
                description: '30 мин • 20⚡ • 40% шанс лута'
            },
            {
                label: 'Обычная прогулка',
                value: 'medium',
                emoji: '🏃',
                description: '60 мин • 40⚡ • 60% шанс лута'
            },
            {
                label: 'Долгая прогулка',
                value: 'long',
                emoji: '🏃‍♂️',
                description: '120 мин • 70⚡ • 85% шанс лута'
            }
        ];

        const select = new StringSelectMenuBuilder()
            .setCustomId('select_walk')
            .setPlaceholder('Выбери тип прогулки')
            .addOptions(options);

        return new ActionRowBuilder().addComponents(select);
    }

    /**
     * Embed активной прогулки
     */
    static walkActiveEmbed(walk, player) {
        const endsAt = new Date(walk.ends_at);
        const now = new Date();
        const minutesLeft = Math.max(0, Math.ceil((endsAt - now) / 60000));

        return new EmbedBuilder()
            .setColor(this.colors.info)
            .setTitle('🚶 Прогулка')
            .setDescription(`${player.name} гуляет по району...`)
            .addFields({
                name: '⏱️ Осталось',
                value: `${minutesLeft} мин.`,
                inline: true
            });
    }

    /**
     * Embed результатов прогулки
     */
    static walkResultEmbed(results, player) {
        const embed = new EmbedBuilder()
            .setColor(this.colors.success)
            .setTitle('🏁 Прогулка завершена!')
            .setDescription(`${player.name} вернулся с прогулки`);

        // События
        if (results.events.length > 0) {
            const eventsText = results.events
                .map(e => e.description)
                .join('\n');
            embed.addFields({ name: '📜 События', value: eventsText, inline: false });
        }

        // Награды
        const rewards = [];
        if (results.money > 0) rewards.push(`💰 +${results.money}`);
        if (results.xp > 0) rewards.push(`⭐ +${results.xp} XP`);
        if (results.loot.length > 0) {
            rewards.push(`🎁 ${results.loot.map(id => this.getItemEmoji(id)).join(' ')}`);
        }

        if (rewards.length > 0) {
            embed.addFields({ name: '🎉 Награды', value: rewards.join('\n'), inline: false });
        }

        // Урон
        if (results.damage > 0) {
            embed.addFields({ name: '💔 Урон', value: `-${results.damage} HP`, inline: true });
        }

        return embed;
    }

    // ============ ИНВЕНТАРЬ ============

    /**
     * Embed инвентаря
     */
    static inventoryEmbed(player, inventory, page = 1, itemsPerPage = 10) {
        const backpack = config.ITEMS.BACKPACKS[player.equipped_backpack];
        const totalSlots = backpack?.slots || 5;
        const usedSlots = inventory.reduce((sum, item) => sum + item.quantity, 0);

        const startIndex = (page - 1) * itemsPerPage;
        const pageItems = inventory.slice(startIndex, startIndex + itemsPerPage);
        const totalPages = Math.ceil(inventory.length / itemsPerPage);

        let itemsText = '';
        if (pageItems.length === 0) {
            itemsText = '*Пусто...*';
        } else {
            itemsText = pageItems.map((inv, idx) => {
                const item = this.findItem(inv.item_id);
                if (!item) return null;
                return `${startIndex + idx + 1}. ${item.emoji} **${item.name}** x${inv.quantity}`;
            }).filter(Boolean).join('\n');
        }

        return new EmbedBuilder()
            .setColor(this.colors.info)
            .setTitle(`🎒 Инвентарь • ${player.name}`)
            .setDescription(itemsText)
            .addFields(
                { name: '📦 Место', value: `${usedSlots}/${totalSlots}`, inline: true },
                { name: '💰 Деньги', value: `${player.money}💵`, inline: true },
                { name: '📄 Страница', value: `${page}/${totalPages || 1}`, inline: true }
            )
            .addFields(
                { name: '⚔️ Оружие', value: this.getItemEmoji(player.equipped_weapon), inline: true },
                { name: '🛡️ Броня', value: this.getItemEmoji(player.equipped_armor), inline: true },
                { name: '🎒 Рюкзак', value: this.getItemEmoji(player.equipped_backpack), inline: true }
            );
    }

    /**
     * Кнопки инвентаря
     */
    static inventoryButtons(page, totalPages, hasItems) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`inv_prev_${page}`)
                .setLabel('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId(`inv_use`)
                .setLabel('Использовать')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!hasItems),
            new ButtonBuilder()
                .setCustomId(`inv_equip`)
                .setLabel('Экипировать')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!hasItems),
            new ButtonBuilder()
                .setCustomId(`inv_sell`)
                .setLabel('Продать')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!hasItems),
            new ButtonBuilder()
                .setCustomId(`inv_next_${page}`)
                .setLabel('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages)
        );
    }

    // ============ ЕЖЕДНЕВНЫЙ СУНДУК ============

    /**
     * Embed ежедневной награды
     */
    static dailyRewardEmbed(rewards, player) {
        const chestEmojis = {
            common: '📦',
            uncommon: '🎁',
            rare: '💎',
            epic: '👑',
            legendary: '🌟'
        };

        const embed = new EmbedBuilder()
            .setColor(this.colors[rewards.chestType] || this.colors.common)
            .setTitle(`${chestEmojis[rewards.chestType]} Ежедневный сундук!`)
            .setDescription(`🔥 Серия: ${rewards.streak} дней подряд!`);

        const rewardsList = [];
        if (rewards.money > 0) rewardsList.push(`💰 ${rewards.money}`);
        if (rewards.items.length > 0) {
            rewardsList.push(`🎁 ${rewards.items.map(id => this.getItemEmoji(id)).join(' ')}`);
        }

        embed.addFields({
            name: '🎉 Награды',
            value: rewardsList.join('\n') || 'Пусто...',
            inline: false
        });

        return embed;
    }

    // ============ УТИЛИТЫ ============

    static createProgressBar(current, max, length = 10) {
        const percentage = Math.max(0, Math.min(1, current / max));
        const filled = Math.round(percentage * length);
        const empty = length - filled;
        
        const filledChar = percentage > 0.6 ? '🟩' : percentage > 0.3 ? '🟨' : '🟥';
        return filledChar.repeat(filled) + '⬜'.repeat(empty);
    }

    static findItem(itemId) {
        for (const category of Object.values(config.ITEMS)) {
            if (category[itemId]) {
                return { id: itemId, ...category[itemId] };
            }
        }
        return null;
    }

    static getItemEmoji(itemId) {
        const item = this.findItem(itemId);
        return item ? `${item.emoji}` : '❓';
    }

    static formatBonusName(key) {
        const names = {
            lootChance: 'Шанс лута',
            stealthDamage: 'Урон из скрытности',
            pickpocket: 'Карманная кража',
            sellPrice: 'Цена продажи',
            buyDiscount: 'Скидка покупки',
            charisma: 'Харизма',
            escapeChance: 'Шанс побега',
            manipulate: 'Манипуляция',
            trapDamage: 'Урон ловушек',
            critChance: 'Крит. шанс',
            painResist: 'Сопр. боли',
            berserker: 'Берсерк',
            maxHealth: 'Макс. здоровье',
            healthRegen: 'Регенерация',
            drunkResist: 'Сопр. алкоголю'
        };
        return names[key] || key;
    }

    static formatWeakness(weakness) {
        const weaknesses = {
            cops: '👮 Легавые (+30% урона)',
            bandits: '🔪 Решалы (лёгкая добыча)',
            elites: '👹 Элитные бомжи',
            withdrawal: '💊 Ломка без веществ',
            liver: '🍺 Быстрое отравление'
        };
        return weaknesses[weakness] || weakness;
    }
}

module.exports = UIBuilder;
