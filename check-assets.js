/**
 * БОМЖ СИМУЛЯТОР - Проверка ассетов
 * Запусти: node check-assets.js
 */

const fs = require('fs');
const path = require('path');

const ASSETS_PATH = path.join(__dirname, 'assets');

const REQUIRED_ASSETS = {
    'lobby': [
        'russia_1.png', 'russia_2.png', 'russia_3.png',
        'usa_1.png', 'usa_2.png', 'usa_3.png',
        'ukraine_1.png', 'ukraine_2.png', 'ukraine_3.png',
        'germany_1.png', 'germany_2.png', 'germany_3.png',
        'brazil_1.png', 'brazil_2.png', 'brazil_3.png'
    ],
    'district': [
        'day.png', 'evening.png', 'night.png'
    ],
    'shops': [
        'larek.png', 'lombard.png', 'reshaly.png', 'black_market.png'
    ],
    'arenas': [
        'podezd.png', 'garazhi.png', 'wasteland.png',
        'parking.png', 'alley.png', 'junkyard.png'
    ],
    'bosses': [
        'trash_king.png', 'metro_ghost.png', 'rat_emperor.png',
        'drunk_titan.png', 'oligarch_fallen.png'
    ],
    'classes': [
        'thief.png', 'businessman.png', 'cunning.png',
        'junkie.png', 'alcoholic.png'
    ],
    'enemies': [
        'gopnik.png', 'sinyak.png', 'homeless.png',
        'baryga.png', 'veteran.png', 'ghost.png'
    ]
};

console.log('🎮 БОМЖ СИМУЛЯТОР - Проверка ассетов\n');
console.log('=' .repeat(50));

let totalRequired = 0;
let totalFound = 0;
let totalMissing = 0;

for (const [folder, files] of Object.entries(REQUIRED_ASSETS)) {
    const folderPath = path.join(ASSETS_PATH, folder);
    
    console.log(`\n📁 ${folder}/`);
    
    if (!fs.existsSync(folderPath)) {
        console.log(`   ❌ Папка не существует!`);
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`   ✅ Папка создана`);
    }
    
    for (const file of files) {
        totalRequired++;
        const filePath = path.join(folderPath, file);
        
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`   ✅ ${file} (${sizeKB}KB)`);
            totalFound++;
        } else {
            console.log(`   ❌ ${file} - ОТСУТСТВУЕТ`);
            totalMissing++;
        }
    }
}

console.log('\n' + '=' .repeat(50));
console.log(`\n📊 ИТОГО:`);
console.log(`   Требуется: ${totalRequired} файлов`);
console.log(`   Найдено:   ${totalFound} ✅`);
console.log(`   Не хватает: ${totalMissing} ❌`);

if (totalMissing === 0) {
    console.log('\n🎉 Все ассеты на месте! Бот готов к работе.');
} else {
    console.log(`\n⚠️  Не хватает ${totalMissing} файлов.`);
    console.log('   Сгенерируй их через PixelLab и положи в соответствующие папки.');
    console.log('\n📝 Промпты для генерации смотри в README.md или спроси у Claude.');
}

console.log('\n📂 Путь к ассетам:', ASSETS_PATH);
