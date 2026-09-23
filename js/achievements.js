// js/achievements.js — Sistema de Conquistas: lista, bónus de atributos por tier, verificação de desbloqueio.


    // Cada tier dá um bónus PERMANENTE em todos os 5 atributos por cada conquista desse tier desbloqueada.
    // É calculado sempre a partir de p.achievements (nunca guardado à parte), por isso nunca se perde
    // e nunca fica desatualizado — inclui conquistas já desbloqueadas antes desta funcionalidade existir.
    const ACHIEVEMENT_TIER_BONUS = { simple: 1, medium: 5, complex: 10 };
    const TIER_LABELS = { simple: 'Simples', medium: 'Média', complex: 'Complexa' };

    // Cada conquista: condição sobre o estado atual, tier (que define o bónus de atributos) e
    // recompensa extra em ouro/pontos dada uma única vez ao desbloquear.
    const ACHIEVEMENTS = [
        { id: 'first_quest', name: 'Primeiros Passos', desc: 'Completa 1 missão.', tier: 'simple', cond: () => p.stats.questsDone >= 1, reward: { gold: 20 } },
        { id: 'quests_25', name: 'Aventureiro Dedicado', desc: 'Completa 25 missões.', tier: 'medium', cond: () => p.stats.questsDone >= 25, reward: { gold: 150 } },
        { id: 'quests_100', name: 'Lenda da Taberna', desc: 'Completa 100 missões.', tier: 'complex', cond: () => p.stats.questsDone >= 100, reward: { gold: 500, points: 5 } },
        { id: 'arena_10', name: 'Gladiador', desc: 'Vence 10 combates na Arena.', tier: 'medium', cond: () => p.stats.arenaWins >= 10, reward: { gold: 100 } },
        { id: 'arena_rank10', name: 'Campeão da Arena', desc: 'Chega ao Arena Rank 10.', tier: 'complex', cond: () => p.arenaRank >= 10, reward: { gold: 300, points: 3 } },
        { id: 'first_boss', name: 'Caçador de Bosses', desc: 'Derrota o World Boss pela primeira vez.', tier: 'medium', cond: () => p.stats.bossesKilled >= 1, reward: { gold: 200 } },
        { id: 'boss_5', name: 'Flagelo dos Titãs', desc: 'Derrota o World Boss 5 vezes.', tier: 'complex', cond: () => p.stats.bossesKilled >= 5, reward: { gold: 750, points: 5 } },
        { id: 'lvl_10', name: 'Veterano', desc: 'Chega ao nível 10.', tier: 'medium', cond: () => p.lvl >= 10, reward: { gold: 150 } },
        { id: 'lvl_25', name: 'Herói Consagrado', desc: 'Chega ao nível 25.', tier: 'complex', cond: () => p.lvl >= 25, reward: { gold: 500, points: 5 } },
        { id: 'mythic_item', name: 'Sortudo', desc: 'Equipa um item Mítico.', tier: 'medium', cond: () => Object.values(p.equip).some(it => it && it.rarityName === 'Mítico'), reward: { gold: 250 } },
        { id: 'full_gear', name: 'Bem Equipado', desc: 'Equipa item em todos os 6 slots.', tier: 'medium', cond: () => Object.values(p.equip).every(it => !!it), reward: { gold: 200 } },
        { id: 'enchant_10', name: 'Ferreiro Arcano', desc: 'Encanta 10 itens.', tier: 'medium', cond: () => p.stats.enchantsDone >= 10, reward: { gold: 200 } },
        { id: 'streak_7', name: 'Hábito Heróico', desc: 'Joga 7 dias seguidos.', tier: 'medium', cond: () => p.loginStreak >= 7, reward: { gold: 300 } },
        { id: 'prestige_1', name: 'Recomeço Lendário', desc: 'Faz o teu primeiro Prestígio.', tier: 'complex', cond: () => p.prestige >= 1, reward: { gold: 100 } },
        { id: 'gold_5000', name: 'Magnata', desc: 'Acumula 5000 de Ouro ganho ao longo do jogo.', tier: 'medium', cond: () => p.stats.goldEarned >= 5000, reward: { gold: 100 } }
    ];

    // Soma dos bónus de atributo de todas as conquistas já desbloqueadas (aplica-se igualmente aos 5 atributos)
    function getAchievementBonus() {
        let total = 0;
        ACHIEVEMENTS.forEach(a => { if (p.achievements[a.id]) total += ACHIEVEMENT_TIER_BONUS[a.tier] || 0; });
        return total;
    }

    // Verifica todas as conquistas ainda não desbloqueadas e dá a recompensa uma única vez.
    function checkAchievements() {
        ACHIEVEMENTS.forEach(a => {
            if (p.achievements[a.id]) return;
            if (!a.cond()) return;
            p.achievements[a.id] = true;
            let rewardTxt = [];
            if (a.reward.gold) { p.gold += a.reward.gold; p.stats.goldEarned += a.reward.gold; rewardTxt.push(`+${a.reward.gold} Ouro`); }
            if (a.reward.points) { p.points += a.reward.points; rewardTxt.push(`+${a.reward.points} Pontos`); }
            const bonus = ACHIEVEMENT_TIER_BONUS[a.tier] || 0;
            if (bonus > 0) rewardTxt.push(`+${bonus} em todos os atributos (permanente)`);
            log(`CONQUISTA: ${a.name}! ${rewardTxt.join(', ')}`, "var(--gold)");
            sfxLevelUp();
        });
    }