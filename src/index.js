/**
 * БОМЖ СИМУЛЯТОР - Главный файл Discord бота
 */

const { Client, GatewayIntentBits, Collection, Events, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const GameDatabase = require('./database/GameDatabase');
const GameMechanics = require('./game/GameMechanics');
const UIComponents = require('./utils/UIComponents');
const SceneRenderer = require('./utils/SceneRenderer');
const config = require('./config/gameConfig');
const path = require('path');
require('dotenv').config();

// Инициализация
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

let db = null; // Инициализируется асинхронно
client.cooldowns = new Collection();
client.tempData = {}; // Для хранения временных данных создания персонажа

// ============ SLASH КОМАНДЫ ============

const commands = [
    new SlashCommandBuilder()
        .setName('start')
        .setDescription('Создать персонажа и начать игру'),
    
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Открыть игровое меню (лобби)'),
    
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Посмотреть профиль')
        .addUserOption(opt => opt.setName('player').setDescription('Игрок')),
    
    new SlashCommandBuilder()
        .setName('top')
        .setDescription('Таблица лидеров')
        .addStringOption(opt => 
            opt.setName('sort')
                .setDescription('Сортировка')
                .addChoices(
                    { name: 'Уровень', value: 'level' },
                    { name: 'Деньги', value: 'money' },
                    { name: 'Победы', value: 'fights_won' },
                    { name: 'Боссы', value: 'bosses_killed' }
                )),
    
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Забрать ежедневный сундук'),
    
    new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Удалить персонажа (необратимо!)')
];

// ============ РЕГИСТРАЦИЯ КОМАНД ============

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('Регистрация slash команд...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        console.log('Команды зарегистрированы!');
    } catch (error) {
        console.error('Ошибка регистрации команд:', error);
    }
}

// ============ ОБРАБОТЧИКИ КОМАНД ============

async function handleStart(interaction) {
    const existingPlayer = db.getPlayer(interaction.user.id);
    
    if (existingPlayer) {
        return interaction.reply({ 
            content: '❌ У тебя уже есть персонаж! Используй `/play` или `/delete` чтобы удалить.',
            flags: 64 // ephemeral
        });
    }

    const embed = new (require('discord.js').EmbedBuilder)()
        .setColor(config.DISCORD.colors.info)
        .setTitle('🎮 Создание персонажа')
        .setDescription('Добро пожаловать в **Бомж Симулятор**!\n\nВыбери класс для своего бомжа:')
        .addFields(
            { name: '🗡️ Вор', value: 'Мастер краж (+25% лут)', inline: true },
            { name: '💼 Бизнесмен', value: 'Торговец (+30% продажа)', inline: true },
            { name: '🦊 Хитрый', value: 'Манипулятор (+35% побег)', inline: true },
            { name: '💉 Наркоман', value: 'Берсерк (+30% крит)', inline: true },
            { name: '🍺 Алкаш', value: 'Танк (+25% HP)', inline: true }
        );

    const classMenu = UIComponents.createClassSelectMenu();

    await interaction.reply({ embeds: [embed], components: [classMenu], flags: 64 });
}

async function handlePlay(interaction) {
    const player = db.getPlayer(interaction.user.id);
    
    if (!player) {
        return interaction.reply({ content: '❌ Сначала создай персонажа командой `/start`', flags: 64 });
    }

    // Обновляем характеристики по времени
    if (player.last_stat_update) {
        const hoursPassed = (Date.now() - new Date(player.last_stat_update).getTime()) / 3600000;
        if (hoursPassed >= 0.1) {
            const statUpdates = GameMechanics.updateStats(player, hoursPassed);
            statUpdates.last_stat_update = new Date().toISOString();
            db.updatePlayer(interaction.user.id, statUpdates);
            Object.assign(player, statUpdates);
        }
    }

    // Проверка смерти
    if (player.is_dead) {
        const embed = new (require('discord.js').EmbedBuilder)()
            .setColor(0x000000)
            .setTitle('💀 Ты мёртв!')
            .setDescription('Твой бомж погиб от голода, жажды или ран.\n\nНажми кнопку чтобы возродиться (потеряешь 50% денег).');
        
        const row = new (require('discord.js').ActionRowBuilder)().addComponents(
            new (require('discord.js').ButtonBuilder)()
                .setCustomId('respawn')
                .setLabel('🔄 Возродиться')
                .setStyle(require('discord.js').ButtonStyle.Primary)
        );
        
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    // Рендерим сцену лобби
    const variant = Math.floor(Math.random() * 3) + 1;
    const sceneBuffer = await SceneRenderer.renderLobby(player, player.country, variant);

    const embed = UIComponents.createLobbyEmbed(player, sceneBuffer ? 'scene.png' : null);
    const buttons = UIComponents.createLobbyButtons();

    const replyOptions = { embeds: [embed], components: buttons };
    
    if (sceneBuffer) {
        const attachment = new AttachmentBuilder(sceneBuffer, { name: 'scene.png' });
        replyOptions.files = [attachment];
        embed.setImage('attachment://scene.png');
    }

    await interaction.reply(replyOptions);
}

async function handleProfile(interaction) {
    const targetUser = interaction.options?.getUser('player') || interaction.user;
    const player = db.getPlayer(targetUser.id);

    if (!player) {
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({ content: '❌ Игрок не найден', flags: 64 });
        }
        return interaction.reply({ content: '❌ Игрок не найден', flags: 64 });
    }

    const embed = UIComponents.createPlayerEmbed(player, null);
    
    // Если это кнопка - update, если команда - reply
    if (interaction.isButton()) {
        await interaction.update({ embeds: [embed], components: UIComponents.createLobbyButtons() });
    } else {
        await interaction.reply({ embeds: [embed] });
    }
}

async function handleTop(interaction) {
    const sortBy = interaction.options?.getString('sort') || 'level';
    const leaderboard = db.getLeaderboard(sortBy, 10);

    const embed = UIComponents.createLeaderboardEmbed(leaderboard, sortBy);
    
    if (interaction.isButton()) {
        await interaction.update({ embeds: [embed], components: UIComponents.createLobbyButtons() });
    } else {
        await interaction.reply({ embeds: [embed] });
    }
}

async function handleDaily(interaction) {
    const player = db.getPlayer(interaction.user.id);
    
    if (!player) {
        return interaction.reply({ content: '❌ Сначала создай персонажа!', flags: 64 });
    }

    // Проверка кулдауна
    if (player.last_daily) {
        const lastDaily = new Date(player.last_daily);
        const now = new Date();
        const hoursSince = (now - lastDaily) / 3600000;
        
        if (hoursSince < 24) {
            const hoursLeft = Math.ceil(24 - hoursSince);
            if (interaction.isButton()) {
                return interaction.reply({ content: `⏰ Следующий сундук через **${hoursLeft}** ч.`, flags: 64 });
            }
            return interaction.reply({ content: `⏰ Следующий сундук через **${hoursLeft}** ч.`, flags: 64 });
        }

        // Проверка стрика
        if (hoursSince > 48) {
            db.updatePlayer(interaction.user.id, { daily_streak: 0 });
            player.daily_streak = 0;
        }
    }

    const chest = GameMechanics.generateDailyChest(player);

    // Выдаём награды
    db.updatePlayer(interaction.user.id, {
        money: player.money + chest.money,
        daily_streak: chest.streak,
        last_daily: new Date().toISOString()
    });

    for (const item of chest.items) {
        db.addItemToInventory(player.id, item.id, 1);
    }

    const embed = UIComponents.createDailyEmbed(chest, player);
    
    if (interaction.isButton()) {
        await interaction.update({ embeds: [embed], components: UIComponents.createLobbyButtons() });
    } else {
        await interaction.reply({ embeds: [embed] });
    }
}

async function handleDelete(interaction) {
    const player = db.getPlayer(interaction.user.id);
    
    if (!player) {
        return interaction.reply({ content: '❌ У тебя нет персонажа', flags: 64 });
    }

    const row = new (require('discord.js').ActionRowBuilder)().addComponents(
        new (require('discord.js').ButtonBuilder)()
            .setCustomId('confirm_delete')
            .setLabel('🗑️ Да, удалить навсегда')
            .setStyle(require('discord.js').ButtonStyle.Danger),
        new (require('discord.js').ButtonBuilder)()
            .setCustomId('cancel_delete')
            .setLabel('❌ Отмена')
            .setStyle(require('discord.js').ButtonStyle.Secondary)
    );

    await interaction.reply({
        content: `⚠️ **ВНИМАНИЕ!**\n\nТы уверен что хочешь удалить персонажа **${player.name}**?\n\n- Уровень: ${player.level}\n- Деньги: ${player.money}\n- Побед: ${player.fights_won}\n\n**Это действие НЕОБРАТИМО!**`,
        components: [row],
        flags: 64
    });
}

// ============ ОБРАБОТЧИКИ КНОПОК ============

async function handleButton(interaction) {
    const customId = interaction.customId;
    const player = db.getPlayer(interaction.user.id);

    if (!player && !['confirm_delete', 'cancel_delete'].includes(customId)) {
        return interaction.reply({ content: '❌ Сначала создай персонажа!', flags: 64 });
    }

    // Кулдаун
    const cooldownKey = `${interaction.user.id}_${customId.split('_')[0]}`;
    const now = Date.now();
    const cooldown = client.cooldowns.get(cooldownKey);
    
    if (cooldown && now < cooldown) {
        const secondsLeft = Math.ceil((cooldown - now) / 1000);
        return interaction.reply({ content: `⏰ Подожди ${secondsLeft} сек.`, flags: 64 });
    }

    switch (customId) {
        // Лобби
        case 'walk':
            await handleWalkMenu(interaction, player);
            break;
        case 'walk_short':
        case 'walk_medium':
        case 'walk_long':
            await handleStartWalk(interaction, player, customId.split('_')[1]);
            break;
        case 'daily':
            await handleDaily(interaction);
            break;
        case 'district':
            await handleDistrict(interaction, player);
            break;
        case 'inventory':
            await handleInventory(interaction, player);
            break;
        case 'profile':
            await handleProfile(interaction);
            break;
        case 'leaderboard':
            await handleTop(interaction);
            break;
        case 'back_lobby':
            await handleBackToLobby(interaction, player);
            break;

        // Район
        case 'shop_larek':
            await handleShop(interaction, player, 'LAREK');
            break;
        case 'shop_lombard':
            await handleLombard(interaction, player);
            break;
        case 'shop_reshaly':
            await handleShop(interaction, player, 'RESHALY');
            break;
        case 'npc_cops':
            await handleCops(interaction, player);
            break;
        case 'fight_search':
            await handleFightSearch(interaction, player);
            break;
        case 'boss_list':
            await handleBossList(interaction, player);
            break;
        case 'back_district':
            await handleDistrict(interaction, player);
            break;

        // Бой
        case 'fight_attack':
            await handleFightAttack(interaction, player);
            break;
        case 'fight_defend':
            await handleFightDefend(interaction, player);
            break;
        case 'fight_flee':
            await handleFightFlee(interaction, player);
            break;

        // Инвентарь
        case 'inv_prev':
        case 'inv_next':
            await handleInventoryPage(interaction, player, customId === 'inv_next' ? 1 : -1);
            break;

        // Системные
        case 'respawn':
            await handleRespawn(interaction, player);
            break;
        case 'confirm_delete':
            db.deletePlayer(interaction.user.id);
            await interaction.update({ content: '✅ Персонаж удалён. Используй `/start` чтобы начать заново.', components: [], embeds: [] });
            break;
        case 'cancel_delete':
            await interaction.update({ content: '❌ Удаление отменено.', components: [], embeds: [] });
            break;

        default:
            if (customId.startsWith('buy_')) {
                await handleBuyItem(interaction, player, customId);
            } else if (customId.startsWith('boss_fight_')) {
                await handleBossFight(interaction, player, customId.replace('boss_fight_', ''));
            }
    }
}

// ============ ДОПОЛНИТЕЛЬНЫЕ ОБРАБОТЧИКИ ============

async function handleWalkMenu(interaction, player) {
    if (player.is_walking) {
        const walk = db.getPlayerWalk(player.id);
        if (walk) {
            const endsAt = new Date(walk.ends_at);
            const minutesLeft = Math.ceil((endsAt - Date.now()) / 60000);
            return interaction.reply({ 
                content: `🚶 Ты уже на прогулке! Осталось: ${minutesLeft} мин.`,
                flags: 64 
            });
        }
    }

    const embed = new (require('discord.js').EmbedBuilder)()
        .setColor(config.DISCORD.colors.info)
        .setTitle('🚶 Выбери тип прогулки')
        .setDescription(`⚡ Твоя энергия: **${player.energy}/100**`)
        .addFields(
            { name: '🚶 Короткая', value: '30 мин | -20 ⚡ | Шанс лута: 40%', inline: false },
            { name: '🚶‍♂️ Средняя', value: '1 час | -40 ⚡ | Шанс лута: 60%', inline: false },
            { name: '🏃 Длинная', value: '2 часа | -70 ⚡ | Шанс лута: 85%', inline: false }
        );

    const buttons = UIComponents.createWalkButtons();
    await interaction.reply({ embeds: [embed], components: [buttons] });
}

async function handleStartWalk(interaction, player, walkType) {
    const walkConfig = config.WALK.duration[walkType];
    
    if (player.energy < walkConfig.energyCost) {
        return interaction.reply({ 
            content: `❌ Недостаточно энергии! Нужно: ${walkConfig.energyCost}, у тебя: ${player.energy}`,
            flags: 64 
        });
    }

    const walkId = `walk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const endsAt = new Date(Date.now() + walkConfig.minutes * 60000).toISOString();

    // Генерируем события
    const events = GameMechanics.generateWalkEvents(walkType, player);

    db.createWalk(walkId, player.id, walkType, endsAt, interaction.channelId);
    db.updatePlayer(interaction.user.id, { 
        energy: player.energy - walkConfig.energyCost,
        is_walking: 1,
        walk_ends_at: endsAt
    });

    // Сохраняем события
    db.updateWalk(walkId, { events_log: JSON.stringify(events) });

    const embed = UIComponents.createWalkEmbed(walkType, player);
    embed.setDescription(`${player.name} ушёл гулять...\n\n⏰ Вернётся через **${walkConfig.minutes}** минут.`);

    await interaction.update({ embeds: [embed], components: [] });

    // Таймер завершения
    setTimeout(async () => {
        await completeWalk(interaction.channelId, player, walkId, events);
    }, walkConfig.minutes * 60000);
}

async function completeWalk(channelId, player, walkId, events) {
    try {
        const channel = await client.channels.fetch(channelId);
        const freshPlayer = db.getPlayer(player.discord_id);
        
        if (!freshPlayer) return;

        // Применяем награды
        let totalMoney = 0;
        const itemsFound = [];
        let xpGained = 50;

        for (const event of events) {
            if (event.money) totalMoney += event.money;
            if (event.item) {
                itemsFound.push(event.item);
                db.addItemToInventory(freshPlayer.id, event.item.id, 1);
            }
        }

        db.updatePlayer(player.discord_id, {
            money: freshPlayer.money + totalMoney,
            xp: freshPlayer.xp + xpGained,
            is_walking: 0,
            walk_ends_at: null,
            walks_completed: freshPlayer.walks_completed + 1,
            total_items_found: freshPlayer.total_items_found + itemsFound.length,
            total_money_earned: freshPlayer.total_money_earned + totalMoney
        });

        db.deleteWalk(walkId);

        // Проверяем левел ап
        const levelResult = GameMechanics.checkLevelUp({ ...freshPlayer, xp: freshPlayer.xp + xpGained });

        const embed = UIComponents.createWalkEmbed('medium', freshPlayer, events);
        embed.setTitle('🚶 Прогулка завершена!')
            .setColor(config.DISCORD.colors.success)
            .addFields(
                { name: '💰 Найдено денег', value: `${totalMoney}`, inline: true },
                { name: '📦 Предметов', value: `${itemsFound.length}`, inline: true },
                { name: '✨ Опыт', value: `+${xpGained}`, inline: true }
            );

        if (levelResult.levelsGained > 0) {
            embed.addFields({
                name: '🎉 LEVEL UP!',
                value: `Новый уровень: **${freshPlayer.level + levelResult.levelsGained}**`,
                inline: false
            });
        }

        await channel.send({ content: `<@${player.discord_id}>`, embeds: [embed] });
    } catch (error) {
        console.error('Error completing walk:', error);
    }
}

async function handleDistrict(interaction, player) {
    const timeOfDay = SceneRenderer.getTimeOfDay();

    // Рендерим сцену района
    const sceneBuffer = await SceneRenderer.renderDistrict(player, timeOfDay);

    const embed = UIComponents.createDistrictEmbed(player, timeOfDay, sceneBuffer ? 'scene.png' : null);
    const buttons = UIComponents.createDistrictButtons();

    const replyOptions = { embeds: [embed], components: buttons };
    
    if (sceneBuffer) {
        const attachment = new AttachmentBuilder(sceneBuffer, { name: 'scene.png' });
        replyOptions.files = [attachment];
        embed.setImage('attachment://scene.png');
    }

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(replyOptions);
    } else {
        await interaction.update(replyOptions);
    }
}

async function handleShop(interaction, player, shopType) {
    const shopData = config.SHOPS[shopType];
    const items = shopData.items.map(itemId => {
        const itemData = UIComponents.findItemData(itemId);
        return {
            id: itemId,
            price: Math.floor((itemData?.price || 100) * shopData.priceMultiplier)
        };
    });

    // Рендерим сцену магазина
    const sceneBuffer = await SceneRenderer.renderShop(shopType, player);

    const embed = UIComponents.createShopEmbed(shopType, items, player);
    const buttons = UIComponents.createShopButtons(items, shopType.toLowerCase());

    const replyOptions = { embeds: [embed], components: buttons };
    
    if (sceneBuffer) {
        const attachment = new AttachmentBuilder(sceneBuffer, { name: 'scene.png' });
        replyOptions.files = [attachment];
        embed.setImage('attachment://scene.png');
    }

    await interaction.update(replyOptions);
}

async function handleBuyItem(interaction, player, customId) {
    const parts = customId.split('_');
    const shopType = parts[1].toUpperCase();
    const itemId = parts.slice(2).join('_');

    const shopData = config.SHOPS[shopType];
    const itemData = UIComponents.findItemData(itemId);

    if (!itemData) {
        return interaction.reply({ content: '❌ Предмет не найден', flags: 64 });
    }

    const price = Math.floor((itemData.price || 100) * shopData.priceMultiplier);

    if (player.money < price) {
        return interaction.reply({ content: `❌ Недостаточно денег! Нужно: ${price}`, flags: 64 });
    }

    db.updatePlayer(interaction.user.id, { money: player.money - price });
    db.addItemToInventory(player.id, itemId, 1);

    await interaction.reply({ 
        content: `✅ Куплено: **${itemData.name}** за ${price} 💰`,
        flags: 64 
    });
}

async function handleLombard(interaction, player) {
    const inventory = db.getInventory(player.id);
    const sellableItems = inventory.filter(item => {
        const itemData = UIComponents.findItemData(item.item_id);
        return itemData && ['WEAPONS', 'ARMOR', 'BOSS_LOOT', 'SPECIAL'].some(cat => 
            config.ITEMS[cat]?.[item.item_id]
        );
    });

    const embed = new (require('discord.js').EmbedBuilder)()
        .setColor(config.DISCORD.colors.info)
        .setTitle('🏦 Ломбард')
        .setDescription(`💰 Твои деньги: **${player.money}**\n\nВыбери предмет для продажи:`);

    if (sellableItems.length === 0) {
        embed.setDescription('У тебя нет предметов для продажи.');
    } else {
        for (const item of sellableItems.slice(0, 10)) {
            const itemData = UIComponents.findItemData(item.item_id);
            const sellPrice = Math.floor((itemData?.price || 100) * config.SHOPS.LOMBARD.sellPriceMultiplier);
            embed.addFields({
                name: `${itemData?.emoji || '📦'} ${itemData?.name || item.item_id}`,
                value: `Продать за: ${sellPrice} 💰`,
                inline: true
            });
        }
    }

    const row = new (require('discord.js').ActionRowBuilder)().addComponents(
        new (require('discord.js').ButtonBuilder)()
            .setCustomId('back_district')
            .setLabel('🚪 Выйти')
            .setStyle(require('discord.js').ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function handleCops(interaction, player) {
    const repLevel = GameMechanics.getReputationLevel(player, 'cops');

    const embed = new (require('discord.js').EmbedBuilder)()
        .setColor(config.DISCORD.colors.info)
        .setTitle('👮 Легавые')
        .setDescription(`Твой статус: **${repLevel?.title || 'Нейтрал'}**\n\nРепутация: ${player.rep_cops}`)
        .addFields(
            { name: '🐀 Стукнуть', value: 'Сдать бомжа (+15 репутации, -20 район)', inline: true },
            { name: '🤝 Помочь', value: 'Помочь с расследованием (+10 репутации)', inline: true }
        );

    const row = new (require('discord.js').ActionRowBuilder)().addComponents(
        new (require('discord.js').ButtonBuilder)()
            .setCustomId('cop_snitch')
            .setLabel('🐀 Стукнуть')
            .setStyle(require('discord.js').ButtonStyle.Danger),
        new (require('discord.js').ButtonBuilder)()
            .setCustomId('cop_help')
            .setLabel('🤝 Помочь')
            .setStyle(require('discord.js').ButtonStyle.Primary),
        new (require('discord.js').ButtonBuilder)()
            .setCustomId('back_district')
            .setLabel('🚪 Уйти')
            .setStyle(require('discord.js').ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

async function handleFightSearch(interaction, player) {
    if (player.is_in_fight) {
        return interaction.reply({ content: '❌ Ты уже в бою!', flags: 64 });
    }

    const enemy = GameMechanics.getRandomEnemy(player.level);
    const fightId = `fight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.createFight(fightId, player.id, null, 'ELITE', enemy.id, player.health, null, enemy.health, interaction.channelId);
    db.updatePlayer(interaction.user.id, { is_in_fight: 1 });

    const fight = { player1_hp: player.health, enemy_hp: enemy.health, round: 1, current_turn: player.id };
    
    // Рендерим боевую сцену
    const arenaType = SceneRenderer.getRandomArena();
    const sceneBuffer = await SceneRenderer.renderFight(player, enemy, fight, arenaType);

    const embed = UIComponents.createFightEmbed(fight, player, enemy, true);
    const buttons = UIComponents.createFightButtons(true);

    const replyOptions = { embeds: [embed], components: [buttons] };
    
    if (sceneBuffer) {
        const attachment = new AttachmentBuilder(sceneBuffer, { name: 'fight.png' });
        replyOptions.files = [attachment];
        embed.setImage('attachment://fight.png');
    }

    await interaction.update(replyOptions);
}

async function handleFightAttack(interaction, player) {
    const fight = db.getPlayerFight(player.id);
    if (!fight) return interaction.reply({ content: '❌ Бой не найден', flags: 64 });

    const enemy = config.ELITE_ENEMIES[fight.enemy_id];
    if (!enemy) return;

    // Урон игрока
    const playerDamage = GameMechanics.calculateDamage(player, enemy, player.equipped_weapon);
    let newEnemyHp = Math.max(0, fight.enemy_hp - playerDamage.damage);

    let resultText = `⚔️ Ты нанёс **${playerDamage.damage}** урона!`;
    if (playerDamage.isCrit) resultText += ' 💥 КРИТ!';

    // Проверяем победу
    if (newEnemyHp <= 0) {
        // Победа!
        const xpReward = enemy.xp || 30;
        const moneyReward = Math.floor(Math.random() * 50) + 20;

        db.updatePlayer(interaction.user.id, {
            is_in_fight: 0,
            xp: player.xp + xpReward,
            money: player.money + moneyReward,
            fights_won: player.fights_won + 1,
            total_fights: player.total_fights + 1
        });

        // Лут
        const lootItems = [];
        if (enemy.loot && Math.random() < 0.5) {
            const lootId = enemy.loot[Math.floor(Math.random() * enemy.loot.length)];
            db.addItemToInventory(player.id, lootId, 1);
            lootItems.push(lootId);
        }

        db.deleteFight(fight.id);

        // Обновляем личность
        const personalityUpdates = GameMechanics.updatePersonality(player, 'FIGHT_WIN');
        if (Object.keys(personalityUpdates).length > 0) {
            db.updatePlayer(interaction.user.id, personalityUpdates);
        }

        const embed = new (require('discord.js').EmbedBuilder)()
            .setColor(config.DISCORD.colors.success)
            .setTitle('🎉 ПОБЕДА!')
            .setDescription(`Ты победил **${enemy.name}**!`)
            .addFields(
                { name: '✨ Опыт', value: `+${xpReward}`, inline: true },
                { name: '💰 Деньги', value: `+${moneyReward}`, inline: true }
            );

        if (lootItems.length > 0) {
            const lootData = lootItems.map(id => UIComponents.findItemData(id)?.name || id).join(', ');
            embed.addFields({ name: '📦 Лут', value: lootData, inline: false });
        }

        const buttons = UIComponents.createLobbyButtons();
        return interaction.update({ embeds: [embed], components: buttons });
    }

    // Ход врага
    const enemyDamage = GameMechanics.calculateEnemyDamage(enemy, player);
    const newPlayerHp = Math.max(0, fight.player1_hp - enemyDamage);

    resultText += `\n🔪 ${enemy.name} нанёс тебе **${enemyDamage}** урона!`;

    // Проверяем поражение
    if (newPlayerHp <= 0) {
        db.updatePlayer(interaction.user.id, {
            is_in_fight: 0,
            health: 1,
            fights_lost: player.fights_lost + 1,
            total_fights: player.total_fights + 1
        });
        db.deleteFight(fight.id);

        const embed = new (require('discord.js').EmbedBuilder)()
            .setColor(config.DISCORD.colors.error)
            .setTitle('💀 ПОРАЖЕНИЕ')
            .setDescription(`**${enemy.name}** победил тебя!\n\nТы еле выжил...`);

        const buttons = UIComponents.createLobbyButtons();
        return interaction.update({ embeds: [embed], components: buttons });
    }

    // Продолжаем бой
    db.updateFight(fight.id, {
        player1_hp: newPlayerHp,
        enemy_hp: newEnemyHp,
        round: fight.round + 1
    });

    const updatedFight = { player1_hp: newPlayerHp, enemy_hp: newEnemyHp, round: fight.round + 1, current_turn: player.id };
    const embed = UIComponents.createFightEmbed(updatedFight, player, enemy, true);
    embed.setDescription(resultText);

    const buttons = UIComponents.createFightButtons(true);
    await interaction.update({ embeds: [embed], components: [buttons] });
}

async function handleFightDefend(interaction, player) {
    const fight = db.getPlayerFight(player.id);
    if (!fight) return interaction.reply({ content: '❌ Бой не найден', flags: 64 });

    const enemy = config.ELITE_ENEMIES[fight.enemy_id];
    
    // Защита уменьшает урон на 50%
    const enemyDamage = Math.floor(GameMechanics.calculateEnemyDamage(enemy, player) * 0.5);
    const newPlayerHp = Math.max(0, fight.player1_hp - enemyDamage);

    db.updateFight(fight.id, { player1_hp: newPlayerHp, round: fight.round + 1 });

    const updatedFight = { player1_hp: newPlayerHp, enemy_hp: fight.enemy_hp, round: fight.round + 1, current_turn: player.id };
    const embed = UIComponents.createFightEmbed(updatedFight, player, enemy, true);
    embed.setDescription(`🛡️ Ты защитился! Получил только **${enemyDamage}** урона.`);

    const buttons = UIComponents.createFightButtons(true);
    await interaction.update({ embeds: [embed], components: [buttons] });
}

async function handleFightFlee(interaction, player) {
    const fight = db.getPlayerFight(player.id);
    if (!fight) return;

    const classData = config.CLASSES[player.class?.toUpperCase()];
    const escapeChance = 0.4 + (classData?.bonuses?.escapeChance || 0);

    if (Math.random() < escapeChance) {
        db.updatePlayer(interaction.user.id, { is_in_fight: 0 });
        db.deleteFight(fight.id);

        const embed = new (require('discord.js').EmbedBuilder)()
            .setColor(config.DISCORD.colors.warning)
            .setTitle('🏃 Побег!')
            .setDescription('Ты успешно сбежал из боя!');

        const buttons = UIComponents.createLobbyButtons();
        return interaction.update({ embeds: [embed], components: buttons });
    }

    // Неудачный побег - враг бьёт
    const enemy = config.ELITE_ENEMIES[fight.enemy_id];
    const enemyDamage = GameMechanics.calculateEnemyDamage(enemy, player);
    const newPlayerHp = Math.max(0, fight.player1_hp - enemyDamage);

    db.updateFight(fight.id, { player1_hp: newPlayerHp });

    const updatedFight = { player1_hp: newPlayerHp, enemy_hp: fight.enemy_hp, round: fight.round, current_turn: player.id };
    const embed = UIComponents.createFightEmbed(updatedFight, player, enemy, true);
    embed.setDescription(`❌ Побег не удался! ${enemy.name} нанёс **${enemyDamage}** урона!`);

    const buttons = UIComponents.createFightButtons(true);
    await interaction.update({ embeds: [embed], components: [buttons] });
}

async function handleBossList(interaction, player) {
    const embed = new (require('discord.js').EmbedBuilder)()
        .setColor(config.DISCORD.colors.legendary)
        .setTitle('👑 Мировые Боссы')
        .setDescription('Выбери босса для атаки:');

    const rows = [];
    const row = new (require('discord.js').ActionRowBuilder)();

    for (const [bossId, bossData] of Object.entries(config.BOSSES)) {
        const bossState = db.getWorldBoss(bossId, interaction.guildId) || 
                         db.createOrUpdateWorldBoss(bossId, interaction.guildId, bossData.health);

        embed.addFields({
            name: `${bossData.emoji} ${bossData.name}`,
            value: `Ур. ${bossData.level} | ❤️ ${bossState.current_hp}/${bossState.max_hp}\n${bossState.is_alive ? '✅ Активен' : '💀 Повержен'}`,
            inline: true
        });

        if (bossState.is_alive && row.components.length < 5) {
            row.addComponents(
                new (require('discord.js').ButtonBuilder)()
                    .setCustomId(`boss_fight_${bossId}`)
                    .setLabel(bossData.emoji)
                    .setStyle(require('discord.js').ButtonStyle.Danger)
                    .setDisabled(player.level < bossData.level - 5)
            );
        }
    }

    if (row.components.length > 0) rows.push(row);
    
    rows.push(new (require('discord.js').ActionRowBuilder)().addComponents(
        new (require('discord.js').ButtonBuilder)()
            .setCustomId('back_district')
            .setLabel('🚪 Назад')
            .setStyle(require('discord.js').ButtonStyle.Secondary)
    ));

    await interaction.update({ embeds: [embed], components: rows });
}

async function handleBossFight(interaction, player, bossId) {
    const bossData = config.BOSSES[bossId.toUpperCase()];
    if (!bossData) return;

    const bossState = db.getWorldBoss(bossId, interaction.guildId);
    if (!bossState || !bossState.is_alive) {
        return interaction.reply({ content: '❌ Босс уже повержен!', flags: 64 });
    }

    // Наносим урон
    const damage = GameMechanics.calculateDamage(player, bossData, player.equipped_weapon);
    const result = db.damageBoss(bossId, interaction.guildId, player.id, damage.damage);

    let resultText = `⚔️ Ты нанёс **${damage.damage}** урона боссу!`;
    if (damage.isCrit) resultText += ' 💥 КРИТ!';

    // Босс атакует в ответ
    const bossDamage = Math.floor(bossData.damage * (1 - (config.ITEMS.ARMOR[player.equipped_armor]?.defense || 0) / 100));
    db.updatePlayer(interaction.user.id, { health: Math.max(1, player.health - bossDamage) });
    resultText += `\n🔥 Босс нанёс тебе **${bossDamage}** урона!`;

    // Проверяем смерть босса
    if (!result.is_alive) {
        const xpReward = bossData.level * 50;
        const moneyReward = bossData.level * 100;
        
        db.updatePlayer(interaction.user.id, {
            xp: player.xp + xpReward,
            money: player.money + moneyReward,
            bosses_killed: player.bosses_killed + 1
        });

        // Лут
        if (bossData.loot && bossData.loot.length > 0) {
            const lootId = bossData.loot[Math.floor(Math.random() * bossData.loot.length)];
            db.addItemToInventory(player.id, lootId, 1);
            resultText += `\n\n🎁 Получен: **${UIComponents.findItemData(lootId)?.name || lootId}**!`;
        }

        resultText += `\n\n🎉 **БОСС ПОВЕРЖЕН!**\n+${xpReward} XP | +${moneyReward} 💰`;
    }

    // Рендерим сцену босса
    const sceneBuffer = await SceneRenderer.renderBoss(player, bossId, result);

    const embed = UIComponents.createBossEmbed(bossId, result, sceneBuffer ? 'boss.png' : null);
    embed.setDescription(resultText);

    const replyOptions = { embeds: [embed] };
    
    if (sceneBuffer) {
        const attachment = new AttachmentBuilder(sceneBuffer, { name: 'boss.png' });
        replyOptions.files = [attachment];
        embed.setImage('attachment://boss.png');
    }

    await interaction.reply(replyOptions);
}

async function handleInventory(interaction, player, page = 1) {
    const inventory = db.getInventory(player.id);
    const totalPages = Math.ceil(inventory.length / 10) || 1;
    
    const embed = UIComponents.createInventoryEmbed(player, inventory, page);
    const buttons = UIComponents.createInventoryButtons(page, totalPages);

    await interaction.update({ embeds: [embed], components: [buttons] });
}

async function handleInventoryPage(interaction, player, direction) {
    const inventory = db.getInventory(player.id);
    const totalPages = Math.ceil(inventory.length / 10) || 1;
    
    // Получаем текущую страницу из футера
    const currentEmbed = interaction.message.embeds[0];
    const footerText = currentEmbed?.footer?.text || 'Страница 1/1';
    const currentPage = parseInt(footerText.match(/\d+/)?.[0] || '1');
    
    const newPage = Math.max(1, Math.min(totalPages, currentPage + direction));
    
    const embed = UIComponents.createInventoryEmbed(player, inventory, newPage);
    const buttons = UIComponents.createInventoryButtons(newPage, totalPages);

    await interaction.update({ embeds: [embed], components: [buttons] });
}

async function handleBackToLobby(interaction, player) {
    const variant = Math.floor(Math.random() * 3) + 1;
    const sceneBuffer = await SceneRenderer.renderLobby(player, player.country, variant);

    const embed = UIComponents.createLobbyEmbed(player, sceneBuffer ? 'scene.png' : null);
    const buttons = UIComponents.createLobbyButtons();

    const replyOptions = { embeds: [embed], components: buttons };
    
    if (sceneBuffer) {
        const attachment = new AttachmentBuilder(sceneBuffer, { name: 'scene.png' });
        replyOptions.files = [attachment];
        embed.setImage('attachment://scene.png');
    }

    await interaction.update(replyOptions);
}

async function handleRespawn(interaction, player) {
    const moneyLost = Math.floor(player.money * 0.5);
    
    db.updatePlayer(interaction.user.id, {
        is_dead: 0,
        health: Math.floor(player.max_health * 0.5),
        hunger: 50,
        thirst: 50,
        energy: 30,
        money: player.money - moneyLost
    });

    const embed = new (require('discord.js').EmbedBuilder)()
        .setColor(config.DISCORD.colors.success)
        .setTitle('🔄 Возрождение')
        .setDescription(`Ты очнулся в больнице...\n\n💸 Потеряно: ${moneyLost} денег`);

    const buttons = UIComponents.createLobbyButtons();
    await interaction.update({ embeds: [embed], components: buttons });
}

// ============ ОБРАБОТЧИК МЕНЮ ВЫБОРА ============

async function handleSelectMenu(interaction) {
    const customId = interaction.customId;
    const value = interaction.values[0];

    if (customId === 'select_class') {
        client.tempData[interaction.user.id] = { class: value };

        const embed = new (require('discord.js').EmbedBuilder)()
            .setColor(config.DISCORD.colors.info)
            .setTitle('🌍 Выбор страны')
            .setDescription(`Класс: **${config.CLASSES[value.toUpperCase()].name}**\n\nТеперь выбери страну:`);

        const countryMenu = UIComponents.createCountrySelectMenu();
        await interaction.update({ embeds: [embed], components: [countryMenu] });
    }
    else if (customId === 'select_country') {
        const tempData = client.tempData[interaction.user.id];
        if (!tempData?.class) {
            return interaction.reply({ content: '❌ Начни заново с /start', flags: 64 });
        }

        client.tempData[interaction.user.id].country = value;

        // Открываем Modal для ввода имени
        const modal = new ModalBuilder()
            .setCustomId('name_modal')
            .setTitle('✏️ Имя персонажа');

        const nameInput = new TextInputBuilder()
            .setCustomId('character_name')
            .setLabel('Введи имя своего бомжа')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Например: Вася Пупкин')
            .setMinLength(2)
            .setMaxLength(20)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(nameInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
}

// ============ СОБЫТИЯ ============

client.once(Events.ClientReady, async () => {
    console.log(`✅ Бот запущен как ${client.user.tag}`);
    
    // Инициализируем БД
    db = await GameDatabase.create('./data/game.db');
    console.log('✅ База данных готова');
    
    await registerCommands();
    
    // Создаём папки
    const fs = require('fs');
    ['./data', './cache', './cache/images', './assets/placeholders'].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
});

client.on(Events.InteractionCreate, async (interaction) => {
    // Проверка готовности БД
    if (!db) {
        if (interaction.isRepliable()) {
            return interaction.reply({ content: '⏳ Бот загружается, подожди пару секунд...', flags: 64 });
        }
        return;
    }
    
    try {
        if (interaction.isChatInputCommand()) {
            switch (interaction.commandName) {
                case 'start': await handleStart(interaction); break;
                case 'play': await handlePlay(interaction); break;
                case 'profile': await handleProfile(interaction); break;
                case 'top': await handleTop(interaction); break;
                case 'daily': await handleDaily(interaction); break;
                case 'delete': await handleDelete(interaction); break;
            }
        }
        else if (interaction.isButton()) {
            await handleButton(interaction);
        }
        else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        }
        else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        }
    } catch (error) {
        console.error('Interaction error:', error);
        try {
            const reply = { content: '❌ Произошла ошибка!', flags: 64 };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else if (interaction.isRepliable()) {
                await interaction.reply(reply);
            }
        } catch (e) {
            // Ignore follow-up errors
        }
    }
});

// ============ ОБРАБОТЧИК MODAL ============

async function handleModalSubmit(interaction) {
    if (interaction.customId === 'name_modal') {
        const name = interaction.fields.getTextInputValue('character_name').trim();
        const tempData = client.tempData[interaction.user.id];
        
        if (!tempData?.class || !tempData?.country) {
            return interaction.reply({ content: '❌ Данные устарели, начни заново с /start', flags: 64 });
        }

        await interaction.deferReply();

        // Создаём персонажа
        const player = db.createPlayer(
            interaction.user.id,
            name,
            tempData.country,
            tempData.class
        );

        delete client.tempData[interaction.user.id];

        const classData = config.CLASSES[player.class.toUpperCase()];
        const countryData = config.COUNTRIES[player.country.toUpperCase()];

        const embed = new (require('discord.js').EmbedBuilder)()
            .setColor(config.DISCORD.colors.success)
            .setTitle('🎉 Персонаж создан!')
            .setDescription(`Добро пожаловать, **${player.name}**!\n\n${classData?.emoji || ''} ${classData?.name || player.class}\n${countryData?.emoji || ''} ${countryData?.name || player.country}`)
            .addFields(
                { name: '💰 Стартовые деньги', value: '100', inline: true },
                { name: '🎒 Рюкзак', value: 'Пластиковый пакет', inline: true },
                { name: '📊 Уровень', value: '1', inline: true }
            )
            .setFooter({ text: 'Используй /play чтобы начать играть!' });

        const buttons = UIComponents.createLobbyButtons();
        await interaction.editReply({ embeds: [embed], components: buttons });
    }
}

client.on(Events.MessageCreate, async () => {});  // Не используется

// ============ ЗАПУСК ============

client.login(process.env.DISCORD_TOKEN);
