/**
 * БОМЖ СИМУЛЯТОР - Игровая конфигурация
 * Все константы, баланс и настройки игры
 */

module.exports = {
    // ============ КЛАССЫ ПЕРСОНАЖЕЙ ============
    CLASSES: {
        THIEF: {
            id: 'thief',
            name: '🗡️ Вор',
            emoji: '🗡️',
            description: 'Мастер краж и карманничества. Повышенный шанс найти ценные вещи.',
            bonuses: {
                lootChance: 0.25,      // +25% к шансу лута
                stealthDamage: 0.15,   // +15% урона из скрытности
                pickpocket: 0.20       // +20% к карманным кражам
            },
            startingItems: ['lockpick', 'dark_hood'],
            weakness: 'cops'  // Легавые наносят +30% урона
        },
        BUSINESSMAN: {
            id: 'businessman',
            name: '💼 Бизнесмен',
            emoji: '💼',
            description: 'Торговец и делец. Лучшие цены и уникальные сделки.',
            bonuses: {
                sellPrice: 0.30,       // +30% к цене продажи
                buyDiscount: 0.15,     // -15% к цене покупки
                charisma: 0.20         // +20% к переговорам
            },
            startingItems: ['fake_rolex', 'business_card'],
            weakness: 'bandits'  // Решалы видят в нём лёгкую добычу
        },
        CUNNING: {
            id: 'cunning',
            name: '🦊 Хитрый',
            emoji: '🦊',
            description: 'Манипулятор и интриган. Может обмануть кого угодно.',
            bonuses: {
                escapeChance: 0.35,    // +35% к побегу
                manipulate: 0.25,      // +25% к манипуляциям
                trapDamage: 0.20       // +20% урона от ловушек
            },
            startingItems: ['fake_id', 'smoke_bomb'],
            weakness: 'elites'  // Элитные бомжи видят его насквозь
        },
        JUNKIE: {
            id: 'junkie',
            name: '💉 Наркоман',
            emoji: '💉',
            description: 'Безумец под веществами. Непредсказуемый боец.',
            bonuses: {
                critChance: 0.30,      // +30% крит. шанс
                painResist: 0.40,      // +40% устойчивость к боли
                berserker: 0.25        // +25% урона при низком HP
            },
            startingItems: ['syringe', 'dirty_spoon'],
            weakness: 'withdrawal'  // Без веществ теряет бонусы
        },
        ALCOHOLIC: {
            id: 'alcoholic',
            name: '🍺 Алкаш',
            emoji: '🍺',
            description: 'Закалённый выпивохой боец. Танк с регенерацией.',
            bonuses: {
                maxHealth: 0.25,       // +25% к макс. здоровью
                healthRegen: 0.15,     // +15% к регенерации
                drunkResist: 0.50      // +50% устойчивость к алкоголю
            },
            startingItems: ['bottle_vodka', 'can_opener'],
            weakness: 'liver'  // Быстрее получает урон от отравления
        }
    },

    // ============ СТРАНЫ И ЛОКАЦИИ ============
    COUNTRIES: {
        RUSSIA: {
            id: 'russia',
            name: '🇷🇺 Россия',
            emoji: '🇷🇺',
            currency: 'рубль',
            backgrounds: {
                lobby: ['moscow_yard', 'spb_kommunalka', 'vladik_port'],
                district: ['khrushchevka_yard', 'garage_coop', 'railway_station'],
                shop: ['larek_90s', 'produkty', 'pivnoy'],
                pawnshop: ['lombard_zoloto', 'skupka_metalla'],
                fight: ['podezd', 'garazhi', 'wasteland']
            },
            specialItems: ['valenki', 'ushanka', 'vodka_beluga'],
            dialect: 'russian'
        },
        USA: {
            id: 'usa',
            name: '🇺🇸 Америка',
            emoji: '🇺🇸',
            currency: 'доллар',
            backgrounds: {
                lobby: ['la_alley', 'nyc_subway', 'detroit_abandoned'],
                district: ['trailer_park', 'downtown_corner', 'highway_underpass'],
                shop: ['liquor_store', 'gas_station', 'pawn_america'],
                pawnshop: ['cash_4_gold', 'we_buy_anything'],
                fight: ['parking_lot', 'back_alley', 'junkyard']
            },
            specialItems: ['baseball_bat', 'shopping_cart', 'american_flag_blanket'],
            dialect: 'american'
        },
        UKRAINE: {
            id: 'ukraine',
            name: '🇺🇦 Украина',
            emoji: '🇺🇦',
            currency: 'гривна',
            backgrounds: {
                lobby: ['kyiv_podil', 'odessa_privoz', 'kharkiv_barabashova'],
                district: ['panel_house', 'bazar', 'tram_depot'],
                shop: ['produkty_24', 'tochka', 'bulochnaya'],
                pawnshop: ['lombardna', 'skupka_techniki'],
                fight: ['stadium_ruins', 'abandoned_factory', 'park_night']
            },
            specialItems: ['salo', 'vyshyvanka_torn', 'horilka'],
            dialect: 'ukrainian'
        },
        GERMANY: {
            id: 'germany',
            name: '🇩🇪 Германия',
            emoji: '🇩🇪',
            currency: 'евро',
            backgrounds: {
                lobby: ['berlin_kreuzberg', 'hamburg_hafen', 'munich_marienplatz'],
                district: ['ubahn_station', 'park_bench', 'recycling_center'],
                shop: ['spati', 'kiosk', 'pfandautomat'],
                pawnshop: ['goldankauf', 'second_hand'],
                fight: ['baustelle', 'underground_parking', 'industrial_area']
            },
            specialItems: ['pfandflaschen', 'sleeping_bag_quality', 'bratwurst'],
            dialect: 'german'
        },
        BRAZIL: {
            id: 'brazil',
            name: '🇧🇷 Бразилия',
            emoji: '🇧🇷',
            currency: 'реал',
            backgrounds: {
                lobby: ['rio_favela', 'sao_paulo_centro', 'salvador_pelourinho'],
                district: ['favela_street', 'beach_copacabana', 'mercado'],
                shop: ['boteco', 'padaria', 'banca'],
                pawnshop: ['casa_de_penhores', 'compra_ouro'],
                fight: ['beco_escuro', 'quadra', 'viaduto']
            },
            specialItems: ['flip_flops', 'cachaca', 'hammock'],
            dialect: 'brazilian'
        }
    },

    // ============ ХАРАКТЕРИСТИКИ ============
    STATS: {
        HEALTH: {
            id: 'health',
            name: '❤️ Здоровье',
            emoji: '❤️',
            max: 100,
            criticalThreshold: 20,
            regenPerHour: 5,
            deathPenalty: 0.5  // Теряет 50% денег при смерти
        },
        HUNGER: {
            id: 'hunger',
            name: '🍖 Голод',
            emoji: '🍖',
            max: 100,
            decayPerHour: 4,
            criticalThreshold: 15,
            healthDamageWhenCritical: 2  // Урон здоровью в час
        },
        THIRST: {
            id: 'thirst',
            name: '💧 Жажда',
            emoji: '💧',
            max: 100,
            decayPerHour: 6,
            criticalThreshold: 15,
            healthDamageWhenCritical: 3
        },
        ADDICTION: {
            id: 'addiction',
            name: '🌀 Зависимость',
            emoji: '🌀',
            max: 100,
            decayPerHour: 2,  // Растёт если употребляет
            withdrawalThreshold: 70,
            withdrawalDebuff: 0.30  // -30% к характеристикам
        },
        ENERGY: {
            id: 'energy',
            name: '⚡ Энергия',
            emoji: '⚡',
            max: 100,
            decayPerAction: 10,
            regenPerHour: 15,
            criticalThreshold: 10
        }
    },

    // ============ СИСТЕМА УРОВНЕЙ ============
    LEVELS: {
        maxLevel: 100,
        baseXP: 100,
        multiplier: 1.15,  // XP = baseXP * (multiplier ^ level)
        
        // Награды за уровни
        rewards: {
            5: { title: 'Новичок района', item: 'basic_backpack', money: 500 },
            10: { title: 'Бывалый бомж', item: 'cardboard_armor', money: 1000, skillPoint: 1 },
            15: { title: 'Король помойки', item: 'trash_crown', money: 2000 },
            20: { title: 'Авторитет', item: 'golden_cart', money: 5000, skillPoint: 1 },
            25: { title: 'Легенда подворотни', item: 'legendary_bottle', money: 10000 },
            30: { title: 'Теневой босс', item: 'shadow_cloak', money: 20000, skillPoint: 2 },
            40: { title: 'Криминальный гений', item: 'master_lockpick', money: 50000, skillPoint: 2 },
            50: { title: 'Магнат из грязи', item: 'golden_shopping_cart', money: 100000, skillPoint: 3 },
            75: { title: 'Подпольный олигарх', item: 'diamond_cardboard', money: 500000, skillPoint: 5 },
            100: { title: 'Бомж-Миллиардер', item: 'platinum_crown', money: 10000000, skillPoint: 10 }
        },
        
        // Разблокировки по уровню
        unlocks: {
            5: ['basic_fights'],
            10: ['lombard_premium', 'bandit_quests'],
            15: ['elite_fights', 'cop_friendship'],
            20: ['boss_fights', 'gang_creation'],
            30: ['territory_control', 'black_market'],
            50: ['casino', 'business_empire']
        }
    },

    // ============ РЕПУТАЦИЯ ============
    REPUTATION: {
        COPS: {
            id: 'cops',
            name: '👮 Легавые',
            emoji: '👮',
            levels: {
                '-100': { title: 'Враг народа', effect: 'instant_arrest' },
                '-50': { title: 'В розыске', effect: 'patrol_danger' },
                '0': { title: 'Нейтрал', effect: 'normal' },
                '50': { title: 'Информатор', effect: 'protection_minor' },
                '100': { title: 'Свой человек', effect: 'protection_full' }
            }
        },
        BANDITS: {
            id: 'bandits',
            name: '🔪 Решалы',
            emoji: '🔪',
            levels: {
                '-100': { title: 'Смертник', effect: 'instant_attack' },
                '-50': { title: 'Крыса', effect: 'price_x3' },
                '0': { title: 'Никто', effect: 'normal' },
                '50': { title: 'Свой', effect: 'discount_20' },
                '100': { title: 'Правая рука', effect: 'discount_50_protection' }
            }
        },
        STREET: {
            id: 'street',
            name: '🏚️ Район',
            emoji: '🏚️',
            levels: {
                '-100': { title: 'Изгой', effect: 'no_help' },
                '-50': { title: 'Чужак', effect: 'suspicion' },
                '0': { title: 'Местный', effect: 'normal' },
                '50': { title: 'Уважаемый', effect: 'help_chance' },
                '100': { title: 'Авторитет', effect: 'gang_leader' }
            }
        }
    },

    // ============ ПРЕДМЕТЫ ============
    ITEMS: {
        // === ЕДА ===
        FOOD: {
            bread_stale: { name: 'Чёрствый хлеб', emoji: '🍞', hunger: 15, price: 10, rarity: 'common' },
            can_beans: { name: 'Банка фасоли', emoji: '🥫', hunger: 25, price: 25, rarity: 'common' },
            sandwich_found: { name: 'Найденный бутер', emoji: '🥪', hunger: 35, health: -5, price: 0, rarity: 'common' },
            sausage: { name: 'Сосиска', emoji: '🌭', hunger: 30, price: 40, rarity: 'uncommon' },
            soup_hot: { name: 'Горячий суп', emoji: '🍲', hunger: 50, health: 10, price: 80, rarity: 'uncommon' },
            steak: { name: 'Стейк', emoji: '🥩', hunger: 80, health: 15, price: 200, rarity: 'rare' },
            golden_kebab: { name: 'Золотой шашлык', emoji: '🍢', hunger: 100, health: 30, price: 1000, rarity: 'legendary' }
        },
        
        // === НАПИТКИ ===
        DRINKS: {
            water_dirty: { name: 'Грязная вода', emoji: '🚰', thirst: 20, health: -10, price: 0, rarity: 'common' },
            water_bottle: { name: 'Бутылка воды', emoji: '💧', thirst: 40, price: 15, rarity: 'common' },
            soda: { name: 'Газировка', emoji: '🥤', thirst: 35, energy: 10, price: 25, rarity: 'common' },
            beer: { name: 'Пиво', emoji: '🍺', thirst: 25, addiction: 5, price: 50, rarity: 'uncommon' },
            vodka: { name: 'Водка', emoji: '🥃', thirst: 10, addiction: 15, health: 20, price: 100, rarity: 'uncommon' },
            energy_drink: { name: 'Энергетик', emoji: '⚡', thirst: 30, energy: 50, addiction: 10, price: 80, rarity: 'uncommon' },
            champagne: { name: 'Шампанское', emoji: '🍾', thirst: 40, addiction: 8, reputation: 10, price: 500, rarity: 'rare' }
        },
        
        // === ОРУЖИЕ ===
        WEAPONS: {
            fists: { name: 'Кулаки', emoji: '👊', damage: 5, speed: 10, price: 0, rarity: 'common' },
            pipe: { name: 'Труба', emoji: '🔧', damage: 15, speed: 7, price: 30, rarity: 'common' },
            knife_rusty: { name: 'Ржавый нож', emoji: '🔪', damage: 20, speed: 9, bleed: 5, price: 80, rarity: 'uncommon' },
            baseball_bat: { name: 'Бита', emoji: '🏏', damage: 25, speed: 6, stun: 10, price: 150, rarity: 'uncommon' },
            chain: { name: 'Цепь', emoji: '⛓️', damage: 22, speed: 5, range: 2, price: 120, rarity: 'uncommon' },
            machete: { name: 'Мачете', emoji: '🗡️', damage: 35, speed: 7, bleed: 15, price: 300, rarity: 'rare' },
            brass_knuckles: { name: 'Кастет', emoji: '🤜', damage: 28, speed: 10, crit: 15, price: 250, rarity: 'rare' },
            sawed_off: { name: 'Обрез', emoji: '🔫', damage: 60, speed: 3, ammo: 2, price: 1000, rarity: 'epic' },
            katana_broken: { name: 'Сломанная катана', emoji: '⚔️', damage: 45, speed: 8, crit: 20, price: 800, rarity: 'epic' },
            legendary_brick: { name: 'Легендарный кирпич', emoji: '🧱', damage: 100, speed: 4, stun: 50, price: 5000, rarity: 'legendary' }
        },
        
        // === БРОНЯ ===
        ARMOR: {
            rags: { name: 'Лохмотья', emoji: '👕', defense: 2, price: 0, rarity: 'common' },
            cardboard_armor: { name: 'Картонная броня', emoji: '📦', defense: 8, price: 50, rarity: 'common' },
            leather_jacket: { name: 'Кожанка', emoji: '🧥', defense: 15, style: 5, price: 200, rarity: 'uncommon' },
            bulletproof_vest: { name: 'Бронежилет', emoji: '🦺', defense: 35, speed: -2, price: 800, rarity: 'rare' },
            golden_tracksuit: { name: 'Золотой адидас', emoji: '🥇', defense: 25, style: 50, price: 2000, rarity: 'epic' },
            diamond_coat: { name: 'Бриллиантовое пальто', emoji: '💎', defense: 50, style: 100, price: 50000, rarity: 'legendary' }
        },
        
        // === РЮКЗАКИ ===
        BACKPACKS: {
            plastic_bag: { name: 'Пакет', emoji: '🛍️', slots: 5, price: 0, rarity: 'common' },
            old_backpack: { name: 'Старый рюкзак', emoji: '🎒', slots: 10, price: 100, rarity: 'common' },
            sports_bag: { name: 'Спортивная сумка', emoji: '👜', slots: 15, price: 300, rarity: 'uncommon' },
            military_backpack: { name: 'Армейский рюкзак', emoji: '🎖️', slots: 25, price: 800, rarity: 'rare' },
            shopping_cart: { name: 'Тележка', emoji: '🛒', slots: 40, speed: -3, price: 500, rarity: 'rare' },
            golden_cart: { name: 'Золотая тележка', emoji: '✨', slots: 50, style: 30, price: 10000, rarity: 'legendary' }
        },
        
        // === СПЕЦИАЛЬНЫЕ ===
        SPECIAL: {
            lockpick: { name: 'Отмычка', emoji: '🔑', use: 'unlock', charges: 3, price: 100, rarity: 'uncommon' },
            smoke_bomb: { name: 'Дымовуха', emoji: '💨', use: 'escape', charges: 1, price: 150, rarity: 'uncommon' },
            first_aid: { name: 'Аптечка', emoji: '🏥', use: 'heal', health: 50, price: 200, rarity: 'uncommon' },
            map_treasure: { name: 'Карта сокровищ', emoji: '🗺️', use: 'quest', price: 500, rarity: 'rare' },
            boss_key: { name: 'Ключ босса', emoji: '🗝️', use: 'boss_access', price: 1000, rarity: 'epic' },
            resurrection_vodka: { name: 'Водка воскрешения', emoji: '🌟', use: 'revive', price: 5000, rarity: 'legendary' }
        },
        
        // === РАСХОДНИКИ (наркотики/алкоголь) ===
        CONSUMABLES: {
            cigarette: { name: 'Сигарета', emoji: '🚬', addiction: 3, stress: -10, price: 10, rarity: 'common' },
            weed: { name: 'Травка', emoji: '🌿', addiction: 8, stress: -30, hunger: 20, price: 100, rarity: 'uncommon' },
            pills: { name: 'Колёса', emoji: '💊', addiction: 15, energy: 50, health: -10, price: 200, rarity: 'rare' },
            heroin: { name: 'Герыч', emoji: '💉', addiction: 40, health: 100, damage_over_time: 5, price: 500, rarity: 'epic' }
        },
        
        // === ТРОФЕИ С БОССОВ ===
        BOSS_LOOT: {
            king_crown: { name: 'Корона Короля Помойки', emoji: '👑', style: 100, reputation: 50, price: 10000, rarity: 'legendary' },
            golden_tooth: { name: 'Золотой зуб Деда', emoji: '🦷', sellPrice: 5000, rarity: 'epic' },
            metro_pass: { name: 'Вечный проездной', emoji: '🎫', use: 'fast_travel', price: 3000, rarity: 'epic' },
            rat_king_tail: { name: 'Хвост Крысиного Короля', emoji: '🐀', crafting: true, price: 2000, rarity: 'rare' }
        }
    },

    // ============ БОССЫ ============
    BOSSES: {
        TRASH_KING: {
            id: 'trash_king',
            name: '👑 Король Помойки',
            emoji: '👑',
            level: 10,
            health: 500,
            damage: 25,
            defense: 15,
            abilities: ['garbage_throw', 'rat_summon', 'stink_cloud'],
            loot: ['king_crown', 'golden_tooth', 'rare_garbage'],
            respawnHours: 24,
            description: 'Легендарный бомж, контролирующий все помойки района'
        },
        METRO_GHOST: {
            id: 'metro_ghost',
            name: '👻 Призрак Метро',
            emoji: '👻',
            level: 20,
            health: 800,
            damage: 40,
            defense: 20,
            abilities: ['phase_shift', 'tunnel_echo', 'train_summon'],
            loot: ['metro_pass', 'ghost_rags', 'phantom_bottle'],
            respawnHours: 48,
            description: 'Бомж, живущий в метро так долго, что стал его частью'
        },
        RAT_EMPEROR: {
            id: 'rat_emperor',
            name: '🐀 Крысиный Император',
            emoji: '🐀',
            level: 30,
            health: 1200,
            damage: 35,
            defense: 30,
            abilities: ['rat_swarm', 'plague_bite', 'tunnel_network'],
            loot: ['rat_king_tail', 'plague_mask', 'rat_crown'],
            respawnHours: 72,
            description: 'Повелитель всех крыс, живёт в канализации'
        },
        DRUNK_TITAN: {
            id: 'drunk_titan',
            name: '🍺 Пьяный Титан',
            emoji: '🍺',
            level: 40,
            health: 2000,
            damage: 60,
            defense: 40,
            abilities: ['drunk_rage', 'bottle_barrage', 'alcohol_breath'],
            loot: ['titan_bottle', 'beer_belly_armor', 'eternal_hangover'],
            respawnHours: 96,
            description: 'Гигантский алкаш, выпивший целую цистерну'
        },
        OLIGARCH_FALLEN: {
            id: 'oligarch_fallen',
            name: '💰 Падший Олигарх',
            emoji: '💰',
            level: 50,
            health: 3000,
            damage: 80,
            defense: 50,
            abilities: ['money_throw', 'bodyguard_summon', 'bribe'],
            loot: ['oligarch_watch', 'diamond_coat', 'black_card'],
            respawnHours: 168,  // 1 неделя
            description: 'Бывший миллиардер, потерявший всё, но не амбиции'
        }
    },

    // ============ ЭЛИТНЫЕ БОМЖИ (обычные враги) ============
    ELITE_ENEMIES: {
        GOPNIK: { name: 'Гопник', health: 50, damage: 10, xp: 20, loot: ['semechki', 'cap'] },
        ALKASH: { name: 'Синяк', health: 70, damage: 8, xp: 25, loot: ['beer', 'bottle_empty'] },
        BEZDOMNY: { name: 'Бездомный', health: 60, damage: 12, xp: 30, loot: ['cardboard', 'blanket'] },
        BARIGA: { name: 'Барыга', health: 100, damage: 15, xp: 50, loot: ['pills', 'weed', 'money_small'] },
        VETERAN: { name: 'Ветеран улиц', health: 150, damage: 20, xp: 80, loot: ['military_backpack', 'knife_rusty'] },
        PRIZRAK: { name: 'Призрак', health: 80, damage: 25, xp: 60, loot: ['smoke_bomb', 'dark_cloak'] }
    },

    // ============ ПРОГУЛКА (лут и события) ============
    WALK: {
        duration: {
            short: { minutes: 30, energyCost: 20, lootChance: 0.4 },
            medium: { minutes: 60, energyCost: 40, lootChance: 0.6 },
            long: { minutes: 120, energyCost: 70, lootChance: 0.85 }
        },
        events: {
            NOTHING: { chance: 0.20, description: 'Ничего интересного' },
            FIND_MONEY: { chance: 0.15, reward: { money: [10, 100] } },
            FIND_ITEM: { chance: 0.20, reward: { item: 'random_common' } },
            FIND_RARE: { chance: 0.05, reward: { item: 'random_rare' } },
            FIGHT_RANDOM: { chance: 0.15, enemy: 'random' },
            POLICE_CHECK: { chance: 0.10, reputation: 'cops' },
            TREASURE: { chance: 0.03, reward: { item: 'random_epic', money: [500, 2000] } },
            BOSS_ENCOUNTER: { chance: 0.02, boss: true }
        }
    },

    // ============ ЕЖЕДНЕВНЫЕ НАГРАДЫ ============
    DAILY: {
        chest: {
            common: { chance: 0.60, items: 1, rarity: 'common', money: [50, 200] },
            uncommon: { chance: 0.25, items: 2, rarity: 'uncommon', money: [200, 500] },
            rare: { chance: 0.10, items: 2, rarity: 'rare', money: [500, 1500] },
            epic: { chance: 0.04, items: 3, rarity: 'epic', money: [1500, 5000] },
            legendary: { chance: 0.01, items: 3, rarity: 'legendary', money: [5000, 20000] }
        },
        streakBonus: {
            3: { multiplier: 1.2 },
            7: { multiplier: 1.5, bonusItem: true },
            14: { multiplier: 2.0, bonusItem: true },
            30: { multiplier: 3.0, bonusItem: true, rareGuarantee: true }
        }
    },

    // ============ МАГАЗИНЫ ============
    SHOPS: {
        LAREK: {
            name: '🏪 Ларёк',
            items: ['bread_stale', 'can_beans', 'water_bottle', 'beer', 'cigarette', 'soda'],
            priceMultiplier: 1.0,
            refreshHours: 6
        },
        LOMBARD: {
            name: '🏦 Ломбард',
            sellPriceMultiplier: 0.4,  // 40% от цены
            premiumMultiplier: 0.6,    // 60% для VIP
            acceptedCategories: ['WEAPONS', 'ARMOR', 'BOSS_LOOT', 'SPECIAL']
        },
        RESHALY: {
            name: '🔪 Решалы',
            items: ['knife_rusty', 'pipe', 'brass_knuckles', 'machete', 'sawed_off', 'bulletproof_vest'],
            priceMultiplier: 1.5,  // Накрутка
            reputationRequired: 0,
            discountPerReputation: 0.005  // -0.5% за каждое очко репутации
        },
        BLACK_MARKET: {
            name: '🕳️ Чёрный рынок',
            items: ['heroin', 'pills', 'boss_key', 'legendary_brick', 'sawed_off'],
            priceMultiplier: 2.0,
            levelRequired: 30,
            reputationRequired: { bandits: 50 }
        }
    },

    // ============ ЛИЧНОСТЬ ПЕРСОНАЖА ============
    PERSONALITY: {
        traits: {
            AGGRESSIVE: { threshold: 100, description: 'Всегда выбирает драку' },
            PEACEFUL: { threshold: -100, description: 'Избегает конфликтов' },
            GREEDY: { threshold: 100, description: 'Жадность превыше всего' },
            GENEROUS: { threshold: -100, description: 'Делится с другими' },
            LOYAL: { threshold: 100, description: 'Верен своим' },
            TRAITOR: { threshold: -100, description: 'Предаст любого' },
            ADDICT: { threshold: 100, description: 'Раб зависимости' },
            SOBER: { threshold: -100, description: 'Чист и трезв' }
        },
        actions: {
            FIGHT_WIN: { aggressive: 5, peaceful: -2 },
            FIGHT_LOSE: { aggressive: -3, peaceful: 2 },
            STEAL: { greedy: 5, generous: -3 },
            SHARE: { greedy: -5, generous: 5 },
            BETRAY_FRIEND: { loyal: -10, traitor: 10 },
            HELP_FRIEND: { loyal: 10, traitor: -5 },
            USE_DRUGS: { addict: 5, sober: -10 },
            REFUSE_DRUGS: { addict: -5, sober: 10 }
        }
    },

    // ============ PIXELLAB НАСТРОЙКИ ============
    PIXELLAB: {
        apiUrl: process.env.PIXELLAB_API_URL || 'http://localhost:7860',
        styles: {
            default: 'pixel art, 16-bit style, retro game aesthetic',
            dark: 'pixel art, dark atmosphere, noir style, shadows',
            bright: 'pixel art, colorful, vibrant, cheerful',
            gritty: 'pixel art, gritty, dirty, urban decay, realistic'
        },
        sizes: {
            lobby: { width: 800, height: 600 },
            portrait: { width: 256, height: 256 },
            scene: { width: 600, height: 400 },
            item: { width: 64, height: 64 }
        }
    },

    // ============ DISCORD НАСТРОЙКИ ============
    DISCORD: {
        colors: {
            success: 0x00FF00,
            error: 0xFF0000,
            warning: 0xFFFF00,
            info: 0x0099FF,
            rare: 0x9B59B6,
            epic: 0xE91E63,
            legendary: 0xFFD700
        },
        cooldowns: {
            walk: 60000,       // 1 минута
            fight: 30000,      // 30 секунд
            daily: 86400000,   // 24 часа
            shop: 5000         // 5 секунд
        }
    }
};
