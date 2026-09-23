// js/quests.js — Missões da Taberna: geração, início, conclusão e cálculo de recompensas finais.


    // Valor final que uma missão vai efetivamente dar em Ouro/XP, já com o valor base da missão
    // multiplicado por todos os teus bónus ATUAIS (Destreza/Inteligência, Prestígio, Talento,
    // Perícias, Companion) — é exatamente a mesma fórmula usada em completeQuest(), só que
    // calculada aqui só para mostrar na card, sem aplicar nada.
    function getQuestFinalGold(q) {
        return Math.floor(q.gold * (1 + getTotalAttr('dex') / 100) * getPrestigeMultiplier() * getTalentGoldMultiplier() * getPericiaGoldMultiplier() * getCompanionGoldMultiplier());
    }
    function getQuestFinalXp(q) {
        return Math.floor(q.xp * (1 + getTotalAttr('int') / 100) * getPrestigeMultiplier() * getTalentXpMultiplier() * getPericiaXpMultiplier() * getCompanionXpMultiplier());
    }

    // MISSÕES ALEATÓRIAS (CORRIGIDO)
    function generateNewQuests() {
        p.currentQuests = [];
        const types = ['gold', 'xp', 'balanced'];
        types.forEach(type => {
            let name = missionNames[Math.floor(Math.random() * missionNames.length)];
            let g = (type === 'gold' ? 40 : (type === 'xp' ? 10 : 25));
            let x = (type === 'xp' ? 80 : (type === 'gold' ? 20 : 45));

            p.currentQuests.push({
                name: name,
                type: type,
                gold: Math.floor(g * (1 + p.lvl * 0.2)),
                xp: Math.floor(x * (1 + p.lvl * 0.2)),
                duration: Math.max(500, Math.floor(4000 * getPericiaDurationMultiplier()))
            });
        });

        // De vez em quando, uma das missões normais é substituída por uma Lendária:
        // muito mais recompensa, mas também mais tempo e mais risco de vida.
        if (Math.random() < LEGENDARY_QUEST_CHANCE) {
            const idx = Math.floor(Math.random() * p.currentQuests.length);
            const base = p.currentQuests[idx];
            p.currentQuests[idx] = {
                name: legendaryMissionNames[Math.floor(Math.random() * legendaryMissionNames.length)],
                type: 'legendary',
                gold: base.gold * 4,
                xp: base.xp * 4,
                duration: Math.max(1000, Math.floor(7000 * getPericiaDurationMultiplier()))
            };
        }
    }

    function startQuest(idx) {

        // NOVA VERIFICAÇÃO DE VIDA
        if (p.hp <= 1) {
            log("Estás demasiado ferido para ir numa missão! Compra uma poção.", "var(--btn-red)");
            alert("Precisas de recuperar vida antes de continuar!");
            return; // Sai da função e não inicia a missão
        }

        const q = p.currentQuests[idx];
        const bar = document.getElementById('progress-bar');
        const container = document.getElementById('progress-container');
        document.querySelectorAll('.q-btn').forEach(b => b.disabled = true);
        container.style.display = 'block';

        let start = Date.now();
        let interval = setInterval(() => {
            let elapsed = Date.now() - start;
            bar.style.width = (elapsed / q.duration * 100) + "%";
            if (elapsed >= q.duration) {
                clearInterval(interval);
                container.style.display = 'none';
                completeQuest(q);
            }
        }, 50);
    }

    function completeQuest(q) {
        const isLegendary = q.type === 'legendary';

        // 1. Cálculo de bónus de Ouro e XP (com multiplicador de Prestígio, Talento, Perícias e Companion)
        let fG = Math.floor(q.gold * (1 + getTotalAttr('dex') / 100) * getPrestigeMultiplier() * getTalentGoldMultiplier() * getPericiaGoldMultiplier() * getCompanionGoldMultiplier());
        let fX = Math.floor(q.xp * (1 + getTotalAttr('int') / 100) * getPrestigeMultiplier() * getTalentXpMultiplier() * getPericiaXpMultiplier() * getCompanionXpMultiplier());
        p.gold += fG; p.xp += fX;
        p.stats.goldEarned += fG; p.stats.xpEarned += fX;
        addCompanionXp(fX);

        // 2. ADICIONAR PERDA DE VIDA (1% a 10% do HP máximo, o dobro nas missões Lendárias, reduzida
        // por Passos Silenciosos especializado, Fortitude e Tartaruga Guardiã). É percentual (não fixo)
        // para continuar a ser relevante a níveis altos, onde o HP máximo cresce muito.
        const maxHpForDmg = getTotalAttr('vit');
        let dmgPct = Math.random() * 9 + 1; // 1% a 10%
        if (isLegendary) dmgPct *= 2;
        let damageTaken = Math.floor(maxHpForDmg * (dmgPct / 100) * getTalentQuestDmgMult() * getPericiaDefenseMultiplier() * getCompanionDefenseMultiplier());
        if (damageTaken < 1) damageTaken = 1; // perde sempre pelo menos 1 HP, mesmo com muita mitigação
        p.hp -= damageTaken;
        flashDamage();

        // Garantir que o HP não fica negativo ou abaixo de 1 (para não morrer em missões)
        if (p.hp < 1) p.hp = 1;

        p.stats.questsDone++;
        log(`Missão feita: +${fG} Ouro, +${fX} XP. Perdeste ${damageTaken} HP.`, isLegendary ? "var(--gold)" : "#ccc");
        if (isLegendary) sfxVictory(); else sfxClick();

        // 3. Sistema de Loot (chance maior nas missões Lendárias, + bónus de Instinto de Saque)
        if (Math.random() < (isLegendary ? 0.5 : 0.15) + getPericiaLootBonus()) {
            const item = createItem(p.lvl);
            if (addToInventory(item)) {
                p.stats.itemsFound++;
                log(`LOOT: Encontraste ${item.name}!`, "var(--accent)");
                sfxLoot();
            }
        }

        checkLvl();
        generateNewQuests();
        refreshShop();
        updateUI();
    }