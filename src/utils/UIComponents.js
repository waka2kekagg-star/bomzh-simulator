/**
 * БОМЖ СИМУЛЯТОР - UI Компоненты Discord
 * Эмбеды, кнопки, меню
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
        StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config/gameConfig');
const path = require('path');

class UIComponents {

    // ============ ЭМБЕДЫ ============

    static createPlayerEmbed(player, imagePath = null) {
        const classData = config.CLASSES[player.class.toUpperCase()];
        const countryData = config.COUNTRIES[player.country.toUpperCase()];
        
        const xpNeeded = Math.floor(config.LEVELS.baseXP * Math.pow(config.LEVELS.multiplier, player.level - 1));
        const xpProgress = Math.floor((player.xp / xpNeeded) * 100);

        const embed = new EmbedBuilder()
            .setColor(config.DISCORD.colors.info)
            .setTitle(`${countryData?.emoji || '🏠'} ${player.name}`)
            .setDescription(`*${classData?.name || player.class}*`)
            .addFields(
                { name: '📊 Уровень', value: `**${player.level}** (${player.xp}/${xpNeeded} XP)`, inline: true },
                { name: '💰 Деньги', value: `${player.money} ${countryData?.currency || '💵'}`, inline: true },
                { name: '🏦 Банк', value: `${player.bank} ${countryData?.currency || '💵'}`, inline: true },
                { name: '\u200B', value: '**━━━ Характеристики ━━━**', inline: false },
                { name: '❤️ Здоровье', value: this.createProgressBar(player.health, player.max_health), inline: true },
                { name: '🍖 Голод', value: this.createProgressBar(player.hunger, 100), inline: true },
                { name: '💧 Жажда', value: this.createProgressBar(player.thirst, 100), inline: true },
                { name: '⚡ Энергия', value: this.createProgressBar(player.energy, 100), inline: true },
                { name: '🌀 Зависимость', value: this.createProgressBar(player.addiction, 100, true), inline: true },
                { name: '\u200B', value: '**━━━ Репутация ━━━**', inline: false },
                { name: '👮 Легавые', value: this.getRepBar(player.rep_cops), inline: true },
                { name: '🔪 Решалы', value: this.getRepBar(player.rep_bandits), inline: true },
                { name: '🏚️ Район', value: this.getRepBar(player.rep_street), inline: true }
            )
            .setFooter({ text: `ID: ${player.id} | Боёв выиграно: ${player.fights_won}` })
            .setTimestamp();

        if (imagePath) {
            embed.setThumbnail('attachment://character.png');
        }

        return embed;
    }

    static createLobbyEmbed(player, imagePath = null) {
        const countryData = config.COUNTRIES[player.country.toUpperCase()];
        
        const embed = new EmbedBuilder()
            .setColor(config.DISCORD.colors.info)
            .setTitle(`🏠 Лобби - ${player.name}`)
            .setDescription(`${countryData?.emoji || ''} ${countryData?.name || player.country}\n\nДобро пожаловать домой, бродяга.`)
            .addFields(
                { name: '❤️', value: `${player.health}/${player.max_health}`, inline: true },
                { name: '🍖', value: `${player.hunger}/100`, inline: true },
                { name: '💧', value: `${player.thirst}/100`, inline: true },
                { name: '⚡', value: `${player.energy}/100`, inline: true },
                { name: '💰', value: `${player.money}`, inline: true },
                { name: '📊', value: `Ур. ${player.level}`, inline: true }
            )
            .setFooter({ text: 'Выбери действие' });

        if (imagePath) {
            embed.setImage('attachment://lobby.png');
        }

        return embed;
    }

    static createDistrictEmbed(player, timeOfDay = 'day', imagePath = null) {
        const timeEmojis = { day: '☀️', evening: '🌅', night: '🌙' };
        const timeNames = { day: 'День', evening: 'Вечер', night: 'Ночь' };

        const embed = new EmbedBuilder()
            .setColor(timeOfDay === 'night' ? 0x1a1a2e : config.DISCORD.colors.info)
            .setTitle(`🏘️ На районе ${timeEmojis[timeOfDay]}`)
            .setDescription(`*${timeNames[timeOfDay]}*\n\nМестные обитатели косятся на тебя. Куда пойдёшь?`)
            .addFields(
                { name: '🏪 Ларёк', value: 'Купить еду и напитки', inline: true },
                { name: '🏦 Ломбард', value: 'Продать ценности', inline: true },
                { name: '👮 Легавые', value: 'Стукануть или подружиться', inline: true },
                { name: '🔪 Решалы', value: 'Купить оружие', inline: true },
                { name: '⚔️ Бой', value: 'Найти приключения', inline: true },
                { name: '🚪 Назад', value: 'Вернуться в лобби', inline: true }
            );

        if (imagePath) {
            embed.setImage('attachment://district.png');
        }

        return embed;
    }

    static createShopEmbed(shopType, items, player) {
        const shopData = config.SHOPS[shopType.toUpperCase()];
        
        const embed = new EmbedBuilder()
            .setColor(config.DISCORD.colors.info)
            .setTitle(`${shopData?.name || shopType}`)
            .setDescription(`💰 Твои деньги: **${player.money}**`)
            .setFooter({ text: 'Выбери товар для покупки' });

        for (const item of items.slice(0, 10)) {
            const itemData = this.findItemData(item.id || item);
            if (itemData) {
                embed.addFields({
                    name: `${itemData.emoji || '📦'} ${itemData.name}`,
                    value: `💰 ${item.price || itemData.price}`,
                    inline: true
                });
            }
        }

        return embed;
    }

    static createFightEmbed(fight, player1, player2OrEnemy, isEnemy = true) {
        const embed = new EmbedBuilder()
            .setColor(config.DISCORD.colors.error)
            .setTitle('⚔️ БОЙ!')
            .setDescription(isEnemy 
                ? `**${player1.name}** vs **${player2OrEnemy.name}**`
                : `**${player1.name}** vs **${player2OrEnemy.name}**`)
            .addFields(
                { name: `❤️ ${player1.name}`, value: this.createHealthBar(fight.player1_hp, player1.max_health), inline: true },
                { name: 'VS', value: '⚔️', inline: true },
                { name: `❤️ ${player2OrEnemy.name}`, value: this.createHealthBar(isEnemy ? fight.enemy_hp : fight.player2_hp, isEnemy ? player2OrEnemy.health : player2OrEnemy.max_health), inline: true }
            )
            .addFields({ name: '🎲 Раунд', value: `${fight.round}`, inline: false })
            .setFooter({ text: `Ход: ${fight.current_turn === player1.id ? player1.name : player2OrEnemy.name}` });

        return embed;
    }

    static createBossEmbed(boss, bossState, imagePath = null) {
        const bossData = config.BOSSES[boss.toUpperCase()];
        
        const embed = new EmbedBuilder()
            .setColor(config.DISCORD.colors.legendary)
            .setTitle(`👑 БОСС: ${bossData?.name || boss}`)
            .setDescription(bossData?.description || 'Могущественный противник')
            .addFields(
                { name: '❤️ Здоровье', value: this.createHealthBar(bossState.current_hp, bossState.max_hp), inline: false },
                { name: '⚔️ Урон', value: `${bossData?.damage || 50}`, inline: true },
                { name: '🛡️ Защита', value: `${bossData?.defense || 20}`, inline: true },
                { name: '📊 Уровень', value: `${bossData?.level || 10}`, inline: true }
            )
            .setFooter({ text: bossState.is_alive ? 'Босс активен!' : 'Босс повержен' });

        if (imagePath) {
            embed.setImage('attachment://boss.png');
        }

        return embed;
    }

    static createWalkEmbed(walkType, player, events = []) {
        const walkConfig = config.WALK.duration[walkType];
        
        const embed = new EmbedBuilder()
            .setColor(config.DISCORD.colors.success)
            .setTitle('🚶 Прогулка')
            .setDescription(`${player.name} отправился на прогулку...`)
            .addFields(
                { name: '⏱️ Длительность', value: `${walkConfig.minutes} минут`, inline: true },
                { name: '⚡ Энергия', value: `-${walkConfig.energyCost}`, inline: true },
                { name: '🎲 Шанс лута', value: `${Math.floor(walkConfig.lootChance * 100)}%`, inline: true }
            );

        if (events.length > 0) {
            const eventLog = events.map(e => `• ${e.description}`).join('\n');
            embed.addFields({ name: '📜 События', value: eventLog || 'Ничего не произошло', inline: false });
        }

        return embed;
    }

    static createInventoryEmbed(player, inventory, page = 1) {
        const itemsPerPage = 10;
        const startIndex = (page - 1) * itemsPerPage;
        const pageItems = inventory.slice(startIndex, startIndex + itemsPerPage);
        const totalPages = Math.ceil(inventory.length / itemsPerPage);

        const embed = new EmbedBuilder()
            .setColor(config.DISCORD.colors.info)
            .setTitle(`🎒 Инвентарь - ${player.name}`)
            .setDescription(`Предметов: ${inventory.length}`)
            .setFooter({ text: `Страница ${page}/${totalPages || 1}` });

        for (const invItem of pageItems) {
            const itemData = this.findItemData(invItem.item_id);
            if (itemData) {
                embed.addFields({
                    name: `${itemData.emoji || '📦'} ${itemData.name} x${invItem.quantity}`,
                    value: `Прочность: ${invItem.durability}%`,
                    inline: true
                });
            }
        }

        if (pageItems.length === 0) {
            embed.setDescription('Инвентарь пуст 😢');
        }

        return embed;
    }

    static createDailyEmbed(chestResult, player) {
        const rarityColors = {
            common: 0x808080, uncommon: 0x00ff00, rare: 0x0099ff,
            epic: 0x9900ff, legendary: 0xffd700
        };

        const rarityNames = {
            common: '⬜ Обычный', uncommon: '🟩 Необычный', rare: '🟦 Редкий',
            epic: '🟪 Эпический', legendary: '🟨 ЛЕГЕНДАРНЫЙ'
        };

        const embed = new EmbedBuilder()
            .setColor(rarityColors[chestResult.type] || config.DISCORD.colors.info)
            .setTitle(`🎁 Ежедневный сундук!`)
            .setDescription(`${rarityNames[chestResult.type]} сундук\n\n🔥 Стрик: **${chestResult.streak}** дней`)
            .addFields(
                { name: '💰 Деньги', value: `+${chestResult.money}`, inline: true }
            );

        if (chestResult.items.length > 0) {
            const itemsList = chestResult.items.map(i => `${i.emoji || '📦'} ${i.name}`).join('\n');
            embed.addFields({ name: '📦 Предметы', value: itemsList, inline: false });
        }

        return embed;
    }

    static createLeaderboardEmbed(leaderboard, sortBy) {
        const sortNames = {
            level: '📊 Уровень', money: '💰 Богатство', fights_won: '⚔️ Победы',
            bosses_killed: '👑 Боссы', total_money_earned: '💵 Всего заработано'
        };

        const embed = new EmbedBuilder()
            .setColor(config.DISCORD.colors.legendary)
            .setTitle(`🏆 Таблица лидеров`)
            .setDescription(`Сортировка: ${sortNames[sortBy] || sortBy}`)
            .setTimestamp();

        const medals = ['🥇', '🥈', '🥉'];
        
        leaderboard.forEach((player, index) => {
            const medal = medals[index] || `${index + 1}.`;
            const classData = config.CLASSES[player.class?.toUpperCase()];
            
            embed.addFields({
                name: `${medal} ${player.name}`,
                value: `${classData?.emoji || ''} Ур.${player.level} | 💰${player.money} | ⚔️${player.fights_won}`,
                inline: false
            });
        });

        return embed;
    }

    // ============ КНОПКИ ============

    static createLobbyButtons() {
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('walk').setLabel('🚶 Прогулка').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('daily').setLabel('🎁 Сундук').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('district').setLabel('🏘️ На район').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('inventory').setLabel('🎒 Инвентарь').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('profile').setLabel('👤 Профиль').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('leaderboard').setLabel('🏆 Топ').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('quests').setLabel('📜 Задания').setStyle(ButtonStyle.Secondary)
        );

        return [row1, row2];
    }

    static createDistrictButtons() {
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shop_larek').setLabel('🏪 Ларёк').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('shop_lombard').setLabel('🏦 Ломбард').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('npc_cops').setLabel('👮 Легавые').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('shop_reshaly').setLabel('🔪 Решалы').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fight_search').setLabel('⚔️ Бой').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('boss_list').setLabel('👑 Боссы').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('back_lobby').setLabel('🚪 Назад').setStyle(ButtonStyle.Secondary)
        );

        return [row1, row2];
    }

    static createFightButtons(isPlayerTurn = true) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('fight_attack')
                .setLabel('⚔️ Атака')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!isPlayerTurn),
            new ButtonBuilder()
                .setCustomId('fight_defend')
                .setLabel('🛡️ Защита')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!isPlayerTurn),
            new ButtonBuilder()
                .setCustomId('fight_item')
                .setLabel('🎒 Предмет')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isPlayerTurn),
            new ButtonBuilder()
                .setCustomId('fight_flee')
                .setLabel('🏃 Побег')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!isPlayerTurn)
        );
    }

    static createWalkButtons() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('walk_short').setLabel('🚶 Короткая (30м)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('walk_medium').setLabel('🚶‍♂️ Средняя (1ч)').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('walk_long').setLabel('🏃 Длинная (2ч)').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('back_lobby').setLabel('❌ Отмена').setStyle(ButtonStyle.Secondary)
        );
    }

    static createShopButtons(items, shopType) {
        const rows = [];
        const chunks = this.chunkArray(items.slice(0, 20), 5);

        for (const chunk of chunks) {
            const row = new ActionRowBuilder();
            for (const item of chunk) {
                const itemData = this.findItemData(item.id || item);
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`buy_${shopType}_${item.id || item}`)
                        .setLabel(`${itemData?.emoji || '📦'} ${item.price || itemData?.price || 0}`)
                        .setStyle(ButtonStyle.Primary)
                );
            }
            rows.push(row);
        }

        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('back_district').setLabel('🚪 Выйти').setStyle(ButtonStyle.Secondary)
        ));

        return rows.slice(0, 5);
    }

    static createInventoryButtons(page, totalPages) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('inv_prev')
                .setLabel('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId('inv_use')
                .setLabel('✋ Использовать')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('inv_equip')
                .setLabel('⚔️ Экипировать')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('inv_drop')
                .setLabel('🗑️ Выбросить')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('inv_next')
                .setLabel('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages)
        );
    }

    // ============ МЕНЮ ВЫБОРА ============

    static createClassSelectMenu() {
        const options = Object.entries(config.CLASSES).map(([id, data]) => ({
            label: data.name,
            description: data.description.substring(0, 100),
            value: id.toLowerCase(),
            emoji: data.emoji
        }));

        return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_class')
                .setPlaceholder('Выбери класс персонажа')
                .addOptions(options)
        );
    }

    static createCountrySelectMenu() {
        const options = Object.entries(config.COUNTRIES).map(([id, data]) => ({
            label: data.name,
            value: id.toLowerCase(),
            emoji: data.emoji
        }));

        return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_country')
                .setPlaceholder('Выбери страну')
                .addOptions(options)
        );
    }

    static createItemSelectMenu(inventory, action = 'use') {
        const options = inventory.slice(0, 25).map(invItem => {
            const itemData = this.findItemData(invItem.item_id);
            return {
                label: `${itemData?.name || invItem.item_id} x${invItem.quantity}`,
                value: `${invItem.id}`,
                emoji: itemData?.emoji || '📦'
            };
        });

        if (options.length === 0) {
            options.push({ label: 'Инвентарь пуст', value: 'empty', emoji: '❌' });
        }

        return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`select_item_${action}`)
                .setPlaceholder('Выбери предмет')
                .addOptions(options)
        );
    }

    // ============ УТИЛИТЫ ============

    static createProgressBar(current, max, inverse = false) {
        const percentage = Math.floor((current / max) * 100);
        const filled = Math.floor(percentage / 10);
        const empty = 10 - filled;
        
        const filledChar = inverse ? '🟥' : '🟩';
        const emptyChar = '⬛';
        
        return `${filledChar.repeat(filled)}${emptyChar.repeat(empty)} ${current}/${max}`;
    }

    static createHealthBar(current, max) {
        const percentage = Math.floor((current / max) * 100);
        const filled = Math.floor(percentage / 10);
        const empty = 10 - filled;
        
        let color = '🟩';
        if (percentage < 30) color = '🟥';
        else if (percentage < 60) color = '🟨';
        
        return `${color.repeat(filled)}⬛`.repeat(empty) + ` ${current}/${max}`;
    }

    static getRepBar(rep) {
        const normalized = Math.floor((rep + 100) / 20);
        const bar = '▰'.repeat(Math.max(0, normalized)) + '▱'.repeat(Math.max(0, 10 - normalized));
        return `${bar} (${rep >= 0 ? '+' : ''}${rep})`;
    }

    static findItemData(itemId) {
        for (const category of Object.values(config.ITEMS)) {
            if (category[itemId]) {
                return { id: itemId, ...category[itemId] };
            }
        }
        return null;
    }

    static chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static async createAttachment(imagePath, name) {
        try {
            return new AttachmentBuilder(imagePath, { name });
        } catch {
            return null;
        }
    }
}

module.exports = UIComponents;
