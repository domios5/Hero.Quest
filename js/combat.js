// js/combat.js — Combate: cálculo de atributos totais em combate, Arena e World Boss.


    // Corre um combate turno a turno, em vez de o resolver tudo instantaneamente: chama onTurn(n)
    // repetidamente, com uma pausa entre cada turno para a UI dar sensação de simulação real (as
    // barras de vida vão descendo, não saltam logo para o resultado final). onTurn devolve false
    // quando o combate deve parar (alguém morreu). Combates muito longos (dano baixo vs HP alto)
    // são limitados a maxAnimatedTurns turnos animados — a partir daí o resto resolve-se instantâneo
    // (com um limite de segurança de iterações, para nunca travar o browser num empate infinito).
    function runBattleTurns(onTurn, onEnd, opts = {}) {
        const delay = opts.delay || 450;
        const maxAnimated = opts.maxAnimatedTurns || 12;
        let turn = 0;
        function step() {
            turn++;
            const keepGoing = onTurn(turn);
            updateCombatBars();
            if (!keepGoing) { onEnd(); return; }
            if (turn >= maxAnimated) {
                let more = true;
                let safety = 0;
                while (more && safety < 5000) { turn++; more = onTurn(turn); safety++; }
                updateCombatBars();
                onEnd();
                return;
            }
            setTimeout(step, delay);
        }
        step();
    }

    let bossAnimating = false;
    function setBossButtonsDisabled(disabled) {
        const atk = document.getElementById('btn-attack-boss');
        const buy = document.getElementById('btn-buy-attempt');
        if (atk) atk.disabled = disabled;
        if (buy) buy.disabled = disabled;
    }

    let arenaAnimating = false;
    function setArenaButtonDisabled(disabled) {
        const btn = document.getElementById('btn-fight-arena');
        if (btn) btn.disabled = disabled;
    }

    function checkBossSpawn() {
        const agora = Date.now();
        if (p.lvl < 2) return; // Boss só aparece depois do 1º level up, para não confundir no início
        if (!p.boss.active && agora >= p.boss.nextSpawn) {
            // Criar novo Boss baseado no nível do jogador
            p.boss.maxHp = p.lvl * 1000;
            p.boss.hp = p.boss.maxHp;
            p.boss.dmg = p.lvl * 15; // Dano do boss escala com o nível DELE, não com a tua vida
            p.boss.attempts = 5 + getPrestigePerkBossAttempts(); // Perk de Prestígio "Tenacidade"
            p.boss.active = true;
            p.boss.depletedAt = 0;
            p.boss.shieldHitsUsed = 0; // reinicia o Escudo Arcano (Mago) para esta nova aparição
            p.boss.dots = []; // reinicia queimadura/veneno de Itens Únicos para esta nova aparição
            log("UM BOSS MÍTICO APARECEU!", "var(--gold)");
        }
    }

    // Se ficares sem tentativas e não pagares por mais, o boss não fica preso para sempre:
    // foge ao fim de 1h e volta a contar os 3 dias normais para o próximo aparecer.
    function checkBossFlee() {
        if (p.boss.active && p.boss.attempts <= 0 && p.boss.depletedAt) {
            if (Date.now() - p.boss.depletedAt >= BOSS_FLEE_TIME) {
                p.boss.active = false;
                p.boss.depletedAt = 0;
                p.boss.nextSpawn = Date.now() + (BOSS_RESPAWN_TIME * getPrestigePerkBossCooldownMultiplier());
                log("O Boss fugiu enquanto recuperavas forças! Vai demorar a aparecer outro.", "var(--btn-red)");
            }
        }
    }

    function getBossAttemptCost() { return p.lvl * 15; }

    function buyBossAttempt() {
        if (!p.boss.active) return;
        const cost = getBossAttemptCost();
        if (p.gold < cost) { log(`Precisas de ${cost} Ouro para uma tentativa extra.`, "var(--btn-red)"); return; }
        showConfirm(`Comprar 1 tentativa extra contra o Boss por ${cost} Ouro?`, () => {
            p.gold -= cost;
            p.boss.attempts++;
            p.boss.depletedAt = 0; // já não está "sem tentativas", para parar a contagem de fuga
            log("Compraste uma tentativa extra contra o Boss!", "var(--accent)");
            updateUI();
        });
    }

    // Animado em 2 tempos: 1) o teu ataque acontece e a barra do Boss desce logo; 2) depois de uma
    // pausa curta, o contra-ataque dele (ou esquiva/escudo) resolve-se e o resto do turno (vitória,
    // nocaute, etc.) só então é decidido — em vez de tudo saltar para o resultado final de repente.
    function attackBoss() {
        // 1. Verificações básicas
        if (!p.boss.active || p.boss.attempts <= 0 || bossAnimating) return;
        if (p.hp <= 1) {
            log("Estás demasiado fraco para enfrentar o Boss! Cura-te primeiro.", "var(--btn-red)");
            return;
        }

        // 2. Calcular Dano do Jogador
        let dmgAttr = p.class === 'Guerreiro' ? 'str' : p.class === 'Assassino' ? 'dex' : 'int';
        let playerDamage = getTotalAttr(dmgAttr) * 5;
        if (p.buffs.dmgBoostNext) {
            playerDamage = Math.floor(playerDamage * 1.5);
            p.buffs.dmgBoostNext = false;
            log("Elixir de Fúria ativo! +50% de dano.", "var(--accent)");
        }

        // Talentos: dano ofensivo (Fúria Implacável / Sobrecarga Arcana)
        playerDamage = Math.floor(playerDamage * getTalentDamageMultiplier());
        // Perícias: Poder Ofensivo, e Companion: Lobo de Batalha
        playerDamage = Math.floor(playerDamage * getPericiaDamageMultiplier() * getCompanionDamageMultiplier());
        // Crítico: Talento Golpe Crítico + hipótese base da Sorte
        const isCrit = Math.random() < getTotalCritChance();
        if (isCrit) {
            playerDamage = Math.floor(playerDamage * getEffectiveCritMult());
            log("Golpe Crítico!", "var(--gold)");
        }
        // Itens Únicos: dano % (Cálice de Circe, Selo do Rei Salomão, ...)
        playerDamage = Math.floor(playerDamage * (1 + getUniqueDamagePercent() / 100) * (1 + getRunePercent('dano') / 100));

        bossAnimating = true;
        setBossButtonsDisabled(true);

        // --- Queimadura/Veneno de Itens Únicos ativos desde ataques anteriores ---
        if (p.boss.dots && p.boss.dots.length) {
            const dot = tickUniqueDots(p.boss.dots, p.boss.hp, p.boss.maxHp);
            p.boss.hp = dot.hp;
            if (dot.log) log(dot.log, "var(--btn-red)");
        }

        // --- Escudo Místico do Boss: hipótese de bloquear metade do teu dano, a não ser que uses
        // uma arma de assinatura que o ignora (Excalibur, Cajado de Odin, Adaga de Brutus). ---
        if (p.boss.hp > 0 && !hasUniqueIgnoreBossShield() && Math.random() < BOSS_SHIELD_CHANCE) {
            playerDamage = Math.floor(playerDamage * (1 - BOSS_SHIELD_BLOCK));
            log("O Escudo Místico do Boss bloqueou parte do teu ataque!", "var(--btn-red)");
        }

        // --- 1º tempo: o teu ataque ---
        p.boss.hp -= playerDamage;
        p.boss.attempts--;
        flashDamage();
        log(`Ataque feroz! Causaste ${playerDamage} de dano.`, "var(--accent)");
        // Itens Únicos: aplica/renova queimadura ou veneno no Boss, se estiver equipado algum
        if (p.boss.hp > 0) applyUniqueDots(p.boss.dots);
        updateCombatBars();

        setTimeout(() => {
            // --- 2º tempo: o contra-ataque do Boss (só se ele ainda estiver vivo) ---
            if (p.boss.hp > 0) {
                // O dano do Boss é fixo por combate (definido quando ele nasce) e escala com o
                // nível DELE, não com a tua vida/equipamento.
                let bossDamage = p.boss.dmg || (p.lvl * 15);

                // Talentos: dano recebido reduzido (Muralha de Aço)
                bossDamage = Math.floor(bossDamage * getTalentDefenseMultiplier());
                // Perícias: Fortitude, e Companion: Tartaruga Guardiã
                bossDamage = Math.max(0, Math.floor(bossDamage * getPericiaDefenseMultiplier() * getCompanionDefenseMultiplier()));

                // Talentos: Escudo Arcano — absorve os primeiros N ataques do Boss em cada aparição
                const shieldHits = getTalentShieldHits();
                let shieldBlocked = false;
                if (shieldHits > 0 && (p.boss.shieldHitsUsed || 0) < shieldHits) {
                    p.boss.shieldHitsUsed = (p.boss.shieldHitsUsed || 0) + 1;
                    bossDamage = 0;
                    shieldBlocked = true;
                }

                // Talentos: esquiva total ao contra-ataque (Passos Silenciosos)
                let dodged = false;
                if (!shieldBlocked && Math.random() < getTotalDodgeChance()) {
                    bossDamage = 0;
                    dodged = true;
                }

                // Talentos: custo de vida da Sobrecarga Arcana
                const arcaneSelfDmg = getTalentArcaneSelfDamage();

                p.hp -= bossDamage;
                if (arcaneSelfDmg > 0) p.hp -= arcaneSelfDmg;
                flashDamage();

                if (shieldBlocked) log("O Escudo Arcano absorveu o contra-ataque do Boss!", "var(--accent)");
                else if (dodged) log("Esquivaste-te do contra-ataque do Boss!", "var(--accent)");
                else log(`O Boss contra-atacou! Perdeste ${bossDamage} de HP.`, "var(--btn-red)");

                // Itens Únicos: reflete parte do dano recebido de volta para o Boss (Grevas de Marte)
                const reflectPct = getUniqueReflectPercent();
                if (reflectPct > 0 && bossDamage > 0 && p.boss.hp > 0) {
                    const reflectDmg = Math.max(1, Math.round(bossDamage * reflectPct / 100));
                    p.boss.hp -= reflectDmg;
                    log(`As Grevas de Marte devolveram ${reflectDmg} de dano ao Boss!`, "var(--accent)");
                }

                // 4. Verificação de Morte do Jogador
                if (p.hp <= 0) {
                    p.hp = 1; // Deixa com 1 de HP para não quebrar o jogo
                    log("Foste nocauteado pelo Boss! Recupera as tuas forças.", "var(--btn-red)");
                }
            }

            // Talentos: lifesteal da Fúria Implacável especializada
            if (hasTalent('furia_implacavel') && isTalentSpecialized() && playerDamage > 0 && p.hp > 0) {
                const heal = Math.floor(playerDamage * 0.05);
                if (heal > 0) { p.hp = Math.min(getTotalAttr('vit'), p.hp + heal); log(`Fúria Implacável drena ${heal} HP do Boss!`, "var(--accent)"); }
            }
            // Runas: lifesteal da Runa Vampírica (somado ao da Fúria Implacável, se tiveres as duas)
            const vampPct = getRunePercent('vampira');
            if (vampPct > 0 && playerDamage > 0 && p.hp > 0) {
                const heal = Math.floor(playerDamage * vampPct / 100);
                if (heal > 0) { p.hp = Math.min(getTotalAttr('vit'), p.hp + heal); log(`A Runa Vampírica drena ${heal} HP do Boss!`, "var(--accent)"); }
            }

            // 4b. Se as tentativas chegaram a 0 e o boss continua vivo, começa a contagem para ele fugir
            if (p.boss.attempts <= 0 && p.boss.hp > 0 && !p.boss.depletedAt) {
                p.boss.depletedAt = Date.now();
            }

            // 5. Verificação de Vitória (Se o Boss morreu)
            if (p.boss.hp <= 0) {
                p.boss.hp = 0;
                p.boss.active = false;
                p.boss.depletedAt = 0;
                p.boss.nextSpawn = Date.now() + (BOSS_RESPAWN_TIME * getPrestigePerkBossCooldownMultiplier()); // 3 dias, reduzíveis pela Perk "Caçador Incansável"

                // Recompensas (com multiplicador de Prestígio, Talento, Perícias e Companion)
                const gEarn = Math.floor(p.lvl * 500 * getPrestigeMultiplier() * getTalentGoldMultiplier() * getPericiaGoldMultiplier() * getCompanionGoldMultiplier() * getRuneGoldMultiplier());
                const xEarn = Math.floor(p.lvl * 1000 * getPrestigeMultiplier() * getTalentXpMultiplier() * getPericiaXpMultiplier() * getCompanionXpMultiplier() * getRuneXpMultiplier());
                p.gold += gEarn; p.xp += xEarn;
                p.stats.goldEarned += gEarn; p.stats.xpEarned += xEarn;
                addCompanionXp(xEarn);
                p.stats.bossesKilled++;

                // Gera o item Mítico (agora sempre com os 5 atributos, não só o rótulo trocado)
                const itemMitico = createMythicItem(p.lvl);
                const coube = addToInventory(itemMitico);
                if (coube) p.stats.itemsFound++;

                // Runas: hipótese de dropar Pó de Runa, usado para melhorar runas já encaixadas
                let dustTxt = '';
                if (Math.random() < RUNE_DUST_DROP_CHANCE_BOSS) {
                    const dust = Math.floor(Math.random() * (RUNE_DUST_AMOUNT_BOSS[1] - RUNE_DUST_AMOUNT_BOSS[0] + 1)) + RUNE_DUST_AMOUNT_BOSS[0];
                    p.runeDust = (p.runeDust || 0) + dust;
                    dustTxt = ` e ${dust} Pó de Runa`;
                }

                log("VITÓRIA LENDÁRIA! O Boss caiu e deixou um rasto de ouro" + (coube ? " e um item Mítico" : "") + dustTxt + "!", "var(--gold)");
                sfxVictory();
                checkLvl();
            }

            bossAnimating = false;
            setBossButtonsDisabled(false);
            updateUI(); // Atualiza tudo (barras, tentativas, texto) e grava o save
        }, 500);
    }

    // Animado turno a turno (tu atacas primeiro em cada turno; o inimigo só contra-ataca se
    // sobreviver a esse golpe) em vez de resolver o combate inteiro num instante — mesmos números
    // e mesmas regras de antes, só que agora dá para ver a barra de vida do inimigo a descer.
    function fightArena() {
        if (arenaAnimating) return;
        const enemyName = ARENA_ENEMIES[Math.floor(Math.random() * ARENA_ENEMIES.length)];
        const bMaxHp = p.arenaRank * 70;
        let bDmg = p.arenaRank * 12;
        let pDmg = getTotalAttr(p.class === 'Guerreiro' ? 'str' : p.class === 'Assassino' ? 'dex' : 'int');
        if (p.buffs.dmgBoostNext) {
            pDmg = Math.floor(pDmg * 1.5);
            p.buffs.dmgBoostNext = false;
            log("Elixir de Fúria ativo! +50% de dano.", "var(--accent)");
        }

        // Talentos: dano ofensivo (Fúria Implacável / Sobrecarga Arcana)
        pDmg = Math.floor(pDmg * getTalentDamageMultiplier());
        // Perícias: Poder Ofensivo, e Companion: Lobo de Batalha
        pDmg = Math.floor(pDmg * getPericiaDamageMultiplier() * getCompanionDamageMultiplier());
        // Crítico: Talento Golpe Crítico + hipótese base da Sorte
        if (Math.random() < getTotalCritChance()) {
            pDmg = Math.floor(pDmg * getEffectiveCritMult());
            log("Golpe Crítico!", "var(--gold)");
        }
        // Itens Únicos: dano % (Cálice de Circe, Selo do Rei Salomão, ...)
        pDmg = Math.floor(pDmg * (1 + getUniqueDamagePercent() / 100) * (1 + getRunePercent('dano') / 100));
        // Talentos: dano recebido reduzido (Muralha de Aço); Perícias: Fortitude; Companion: Tartaruga Guardiã
        bDmg = Math.max(0, Math.floor(bDmg * getTalentDefenseMultiplier() * getPericiaDefenseMultiplier() * getCompanionDefenseMultiplier()));
        // Talentos: esquiva total ao contra-ataque (Passos Silenciosos), + Perícias: Reflexos
        let arenaDodged = false;
        if (Math.random() < getTotalDodgeChance()) {
            bDmg = 0;
            arenaDodged = true;
            log("Esquivaste-te de todos os contra-ataques!", "var(--accent)");
        }
        // Talentos: custo de vida da Sobrecarga Arcana
        const arcaneSelfDmg = getTalentArcaneSelfDamage();
        if (arcaneSelfDmg > 0) { p.hp -= arcaneSelfDmg; if (p.hp < 1) p.hp = 1; }

        arenaAnimating = true;
        setArenaButtonDisabled(true);
        arenaEnemyState = { name: enemyName, hp: bMaxHp, maxHp: bMaxHp };
        document.getElementById('arena-enemy-area').style.display = 'block';
        const enemyImgEl = document.getElementById('arena-enemy-img');
        const enemyImgSrc = ARENA_ENEMY_IMAGES[enemyName];
        if (enemyImgSrc) { enemyImgEl.src = enemyImgSrc; enemyImgEl.style.display = 'inline-block'; }
        else { enemyImgEl.style.display = 'none'; }
        log(`A enfrentar ${enemyName} (Rank ${p.arenaRank})...`);

        let totalDealt = 0;
        let arenaDots = []; // queimadura/veneno de Itens Únicos, só para esta luta (não persiste)
        runBattleTurns(
            (turn) => {
                // Queimadura/Veneno de turnos anteriores desta luta
                if (arenaDots.length) {
                    const dot = tickUniqueDots(arenaDots, arenaEnemyState.hp, bMaxHp);
                    arenaEnemyState.hp = dot.hp; totalDealt += dot.dmg;
                    if (dot.log) log(dot.log, "var(--btn-red)");
                    if (arenaEnemyState.hp <= 0) { arenaEnemyState.hp = 0; return false; }
                }
                arenaEnemyState.hp -= pDmg; totalDealt += pDmg;
                if (arenaEnemyState.hp <= 0) { arenaEnemyState.hp = 0; return false; } // inimigo morreu, não chega a contra-atacar
                applyUniqueDots(arenaDots); // renova queimadura/veneno se tiveres o item equipado
                if (bDmg > 0) {
                    p.hp -= bDmg;
                    const reflectPct = getUniqueReflectPercent();
                    if (reflectPct > 0) {
                        const reflectDmg = Math.max(1, Math.round(bDmg * reflectPct / 100));
                        arenaEnemyState.hp -= reflectDmg; totalDealt += reflectDmg;
                        if (arenaEnemyState.hp <= 0) { arenaEnemyState.hp = 0; return false; } // reflexo matou o inimigo
                    }
                }
                if (p.hp <= 0) { p.hp = 0; return false; } // ficaste sem HP, combate acaba aqui
                return true;
            },
            () => {
                // Talentos: lifesteal da Fúria Implacável especializada
                if (hasTalent('furia_implacavel') && isTalentSpecialized() && totalDealt > 0 && p.hp > 0) {
                    const heal = Math.floor(totalDealt * 0.05);
                    if (heal > 0) { p.hp = Math.min(getTotalAttr('vit'), p.hp + heal); log(`Fúria Implacável drena ${heal} HP do inimigo!`, "var(--accent)"); }
                }
                // Runas: lifesteal da Runa Vampírica
                const vampPctArena = getRunePercent('vampira');
                if (vampPctArena > 0 && totalDealt > 0 && p.hp > 0) {
                    const heal = Math.floor(totalDealt * vampPctArena / 100);
                    if (heal > 0) { p.hp = Math.min(getTotalAttr('vit'), p.hp + heal); log(`A Runa Vampírica drena ${heal} HP do inimigo!`, "var(--accent)"); }
                }

                if (arenaEnemyState.hp <= 0) {
                    log(`VITÓRIA contra ${enemyName}!`);
                    const gEarn = Math.floor(p.arenaRank * 100 * getPrestigeMultiplier() * getTalentGoldMultiplier() * getPericiaGoldMultiplier() * getCompanionGoldMultiplier() * getRuneGoldMultiplier());
                    const xEarn = Math.floor(p.arenaRank * 50 * getPrestigeMultiplier() * getTalentXpMultiplier() * getPericiaXpMultiplier() * getCompanionXpMultiplier() * getRuneXpMultiplier());
                    p.gold += gEarn; p.xp += xEarn;
                    p.stats.goldEarned += gEarn; p.stats.xpEarned += xEarn;
                    addCompanionXp(xEarn);
                    p.stats.arenaWins++;
                    p.arenaRank++; checkLvl();
                    // Runas: hipótese de dropar Pó de Runa
                    if (Math.random() < RUNE_DUST_DROP_CHANCE_ARENA) {
                        const dust = Math.floor(Math.random() * (RUNE_DUST_AMOUNT_ARENA[1] - RUNE_DUST_AMOUNT_ARENA[0] + 1)) + RUNE_DUST_AMOUNT_ARENA[0];
                        p.runeDust = (p.runeDust || 0) + dust;
                        log(`+${dust} Pó de Runa!`, "var(--accent)");
                    }
                    sfxVictory();
                } else {
                    p.hp = 1; flashDamage(); log(`DERROTA contra ${enemyName}!`); sfxDefeat();
                }

                arenaAnimating = false;
                setArenaButtonDisabled(false);
                updateUI();
            },
            { delay: 400, maxAnimatedTurns: 12 }
        );
    }