/**
 * БОМЖ СИМУЛЯТОР - Генерация изображений через PixelLab
 * Интеграция с локальным Stable Diffusion / ComfyUI
 */

const axios = require('axios');
const config = require('../config/gameConfig');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ImageGenerator {
    constructor() {
        this.apiUrl = config.PIXELLAB.apiUrl;
        this.cacheDir = path.join(__dirname, '../../cache/images');
        this.ensureCacheDir();
    }

    async ensureCacheDir() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (e) {
            console.error('Failed to create cache dir:', e);
        }
    }

    buildCharacterPrompt(player) {
        const classDescriptions = {
            thief: 'sneaky hooded figure, dark clothes, lockpicks',
            businessman: 'shabby suit, fake watches, briefcase',
            cunning: 'sly expression, tattered smart clothes, fox-like',
            junkie: 'thin pale figure, track marks, glazed eyes',
            alcoholic: 'red nose, beer belly, bottle in hand, stubble'
        };

        const countryVibes = {
            russia: 'soviet style, ushanka, vodka, khrushchevka background',
            usa: 'american urban, shopping cart, highway underpass',
            ukraine: 'eastern european, vyshyvanka torn, bazaar',
            germany: 'german urban, pfandflaschen, ubahn station',
            brazil: 'tropical favela, flip flops, colorful but poor'
        };

        return `pixel art portrait, 16-bit retro game style, homeless character, 
            ${classDescriptions[player.class] || ''}, 
            ${countryVibes[player.country] || ''}, 
            detailed pixel art, game avatar, front facing`;
    }

    buildLobbyPrompt(country, variant = 0) {
        const countryData = config.COUNTRIES[country.toUpperCase()];
        if (!countryData) return null;

        const backgrounds = countryData.backgrounds.lobby;
        const selectedBg = backgrounds[variant % backgrounds.length];

        const lobbyDescriptions = {
            moscow_yard: 'moscow courtyard, khrushchevka buildings, playground, dumpsters',
            spb_kommunalka: 'saint petersburg kommunalka, old building, peeling wallpaper',
            vladik_port: 'vladivostok port area, ships, containers, foggy',
            la_alley: 'los angeles back alley, palm trees, graffiti, tents',
            nyc_subway: 'new york subway station, underground, tiles, rats',
            detroit_abandoned: 'detroit abandoned building, broken windows, urban decay',
            kyiv_podil: 'kyiv podil district, old buildings, cobblestone',
            odessa_privoz: 'odessa privoz market, vendors, seafood, chaos',
            kharkiv_barabashova: 'kharkiv barabashova market, huge bazaar, containers',
            berlin_kreuzberg: 'berlin kreuzberg, graffiti, alternative scene',
            hamburg_hafen: 'hamburg harbor, ships, red brick, rainy',
            munich_marienplatz: 'munich area, bavarian architecture',
            rio_favela: 'rio de janeiro favela, colorful houses, steep hills',
            sao_paulo_centro: 'sao paulo downtown, skyscrapers, street vendors',
            salvador_pelourinho: 'salvador pelourinho, colonial buildings, bright colors'
        };

        return `pixel art background, 16-bit retro game style, 
            ${lobbyDescriptions[selectedBg] || selectedBg}, 
            homeless shelter area, urban environment, detailed pixel art`;
    }

    buildDistrictPrompt(country, timeOfDay = 'day') {
        const timeDescriptions = {
            day: 'daytime, bright sun, clear sky, busy streets',
            evening: 'evening, orange sunset, long shadows',
            night: 'nighttime, dark, street lights, neon signs, shadows'
        };

        return `pixel art scene, 16-bit retro game style, 
            urban district, poor neighborhood, 
            ${timeDescriptions[timeOfDay]}, 
            shops, people, detailed environment`;
    }

    buildShopPrompt(shopType, country) {
        const shopDescriptions = {
            larek: 'small kiosk, cramped space, cigarettes display, candy, beer, old refrigerator',
            lombard: 'pawn shop interior, display cases, jewelry, electronics, security bars',
            reshaly: 'dark back room, weapons on wall, shady dealer, smoke',
            black_market: 'underground bunker, illegal goods, drugs, weapons, dim red lighting'
        };

        return `pixel art interior, 16-bit retro game style, 
            ${shopDescriptions[shopType] || shopType}, 
            shop interior, shelves with items, counter, merchant`;
    }

    buildFightPrompt(country, enemyType) {
        const arenas = ['soviet stairwell, graffiti, dim light', 'garage cooperative, metal doors, oil stains', 
                       'urban wasteland, rubble, abandoned cars', 'empty parking lot, night, street lights',
                       'narrow alley, dumpsters, fire escape', 'junkyard, crushed cars, scrap metal'];
        
        const randomArena = arenas[Math.floor(Math.random() * arenas.length)];
        return `pixel art battle scene, 16-bit retro game style, ${randomArena}, 
            fight arena, tense atmosphere, combat zone`;
    }

    buildBossPrompt(bossId) {
        const bossDescriptions = {
            trash_king: 'giant homeless king, crown made of trash, throne of garbage bags, rats around',
            metro_ghost: 'ghostly figure, transparent, subway tunnel, glowing eyes, ethereal',
            rat_emperor: 'humanoid rat creature, crown, sewer throne, rat army',
            drunk_titan: 'massive drunk giant, red face, huge beer belly, bottles everywhere',
            oligarch_fallen: 'fallen rich man, torn expensive suit, golden accessories, desperate'
        };

        return `pixel art boss character, 16-bit retro game style, 
            ${bossDescriptions[bossId] || bossId}, 
            intimidating, powerful, unique design, boss battle ready`;
    }

    async generate(prompt, options = {}) {
        const { width = 512, height = 512, negativePrompt = 'blurry, bad quality, realistic, 3d, photograph, watermark', 
                steps = 25, cfg = 7, seed = -1 } = options;

        try {
            const cacheKey = crypto.createHash('md5').update(`${prompt}_${width}_${height}`).digest('hex').substring(0, 16);
            const cachedPath = path.join(this.cacheDir, `${cacheKey}.png`);
            
            try {
                await fs.access(cachedPath);
                return cachedPath;
            } catch {}

            const response = await axios.post(`${this.apiUrl}/sdapi/v1/txt2img`, {
                prompt, negative_prompt: negativePrompt, width, height, steps, cfg_scale: cfg, seed,
                sampler_name: 'DPM++ 2M Karras'
            }, { timeout: 120000 });

            if (response.data?.images?.[0]) {
                const imageBuffer = Buffer.from(response.data.images[0], 'base64');
                await fs.writeFile(cachedPath, imageBuffer);
                return cachedPath;
            }
            throw new Error('No image in response');
        } catch (error) {
            console.error('Image generation failed:', error.message);
            return path.join(__dirname, '../../assets/placeholders/default.png');
        }
    }

    async generateCharacter(player) {
        return this.generate(this.buildCharacterPrompt(player), { width: 256, height: 256, type: 'character' });
    }

    async generateLobby(country, variant = 0) {
        return this.generate(this.buildLobbyPrompt(country, variant), { width: 800, height: 600, type: 'lobby' });
    }

    async generateDistrict(country, timeOfDay = 'day') {
        return this.generate(this.buildDistrictPrompt(country, timeOfDay), { width: 600, height: 400, type: 'district' });
    }

    async generateShop(shopType, country) {
        return this.generate(this.buildShopPrompt(shopType, country), { width: 600, height: 400, type: 'shop' });
    }

    async generateFightScene(country, enemyType) {
        return this.generate(this.buildFightPrompt(country, enemyType), { width: 600, height: 400, type: 'fight' });
    }

    async generateBoss(bossId) {
        return this.generate(this.buildBossPrompt(bossId), { width: 512, height: 512, type: 'boss' });
    }
}

module.exports = new ImageGenerator();
