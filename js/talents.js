// js/talents.js — Árvore de Talentos: definição por classe, ativação/troca, multiplicadores derivados do talento ativo.


    // --- Árvore de Talentos ---
    // Desbloqueia-se no nível 15 (escolhe 1 de 3), especializa-se automaticamente no nível 40
    // (o mesmo talento fica muito mais forte — não é uma nova escolha). Cada classe tem um talento
    // Ofensivo, um Económico/Progressão e um de Sustentação, para o padrão ser fácil de reconhecer.
    const TALENT_UNLOCK_LEVEL = 15;
    const TALENT_SPEC_LEVEL = 40;
    const TALENT_RESPEC_COST = 200;

    const TALENTS = {
        'Guerreiro': [
            { id: 'furia_implacavel', name: 'Fúria Implacável', icon: '⚔️', type: 'Ofensivo',
              baseDesc: '+20% de dano em combate (Arena e World Boss).',
              specDesc: '+50% de dano em combate, e recuperas 5% do dano causado como HP.' },
            { id: 'muralha_aco', name: 'Muralha de Aço', icon: '🛡️', type: 'Defensivo',
              baseDesc: '-15% de dano recebido na Arena e do World Boss.',
              specDesc: '-35% de dano recebido na Arena e do World Boss.' },
            { id: 'resistencia_inabalavel', name: 'Resistência Inabalável', icon: '💪', type: 'Sustentação',
              baseDesc: 'Recarga da Habilidade -20%.',
              specDesc: 'Recarga da Habilidade -50%, e a cura da Habilidade duplica.' }
        ],
        'Assassino': [
            { id: 'golpe_critico', name: 'Golpe Crítico', icon: '🗡️', type: 'Ofensivo',
              baseDesc: '15% de hipótese de dano crítico (x2) em combate.',
              specDesc: '30% de hipótese de dano crítico (x2.5) em combate.' },
            { id: 'mestre_ladrao', name: 'Mestre Ladrão', icon: '💰', type: 'Económico',
              baseDesc: '+25% de Ouro ganho em missões, Arena e Boss.',
              specDesc: '+60% de Ouro ganho, e -20% nos preços da Loja.' },
            { id: 'passos_silenciosos', name: 'Passos Silenciosos', icon: '🥷', type: 'Sustentação',
              baseDesc: '15% de hipótese de anular o contra-ataque da Arena/Boss.',
              specDesc: '30% de hipótese de anular o contra-ataque, e -20% de dano nas missões.' }
        ],
        'Mago': [
            { id: 'sobrecarga_arcana', name: 'Sobrecarga Arcana', icon: '🔥', type: 'Ofensivo',
              baseDesc: '+30% de dano, mas perdes 5 HP extra sempre que atacas.',
              specDesc: '+70% de dano, mas perdes 8 HP extra sempre que atacas.' },
            { id: 'sabedoria_ancestral', name: 'Sabedoria Ancestral', icon: '📖', type: 'Progressão',
              baseDesc: '+25% de XP ganho.',
              specDesc: '+60% de XP ganho, e 10% de hipótese de subir um nível extra ao subir de nível.' },
            { id: 'escudo_arcano', name: 'Escudo Arcano', icon: '🔮', type: 'Sustentação',
              baseDesc: 'O 1º ataque do World Boss em cada aparição não te causa dano.',
              specDesc: 'Os primeiros 2 ataques do World Boss em cada aparição não te causam dano.' }
        ]
    };

    function getActiveTalent() {
        if (!p.talent || !p.talent.chosen || p.lvl < TALENT_UNLOCK_LEVEL) return null;
        const list = TALENTS[p.class] || [];
        return list.find(t => t.id === p.talent.chosen) || null;
    }
    function hasTalent(id) { const t = getActiveTalent(); return !!t && t.id === id; }
    function isTalentSpecialized() { return p.lvl >= TALENT_SPEC_LEVEL && !!getActiveTalent(); }

    function getTalentDamageMultiplier() {
        if (hasTalent('furia_implacavel')) return isTalentSpecialized() ? 1.5 : 1.2;
        if (hasTalent('sobrecarga_arcana')) return isTalentSpecialized() ? 1.7 : 1.3;
        return 1;
    }
    function getTalentDefenseMultiplier() { // multiplica o dano RECEBIDO
        return hasTalent('muralha_aco') ? (isTalentSpecialized() ? 0.65 : 0.85) : 1;
    }
    function getTalentGoldMultiplier() {
        return hasTalent('mestre_ladrao') ? (isTalentSpecialized() ? 1.6 : 1.25) : 1;
    }
    function getTalentXpMultiplier() {
        return hasTalent('sabedoria_ancestral') ? (isTalentSpecialized() ? 1.6 : 1.25) : 1;
    }
    function getTalentCritChance() { return hasTalent('golpe_critico') ? (isTalentSpecialized() ? 0.30 : 0.15) : 0; }
    function getTalentCritMult() { return isTalentSpecialized() ? 2.5 : 2.0; }
    function getTalentDodgeChance() { return hasTalent('passos_silenciosos') ? (isTalentSpecialized() ? 0.30 : 0.15) : 0; }
    function getTalentArcaneSelfDamage() { return hasTalent('sobrecarga_arcana') ? (isTalentSpecialized() ? 8 : 5) : 0; }
    function getTalentAbilityCooldownMult() { return hasTalent('resistencia_inabalavel') ? (isTalentSpecialized() ? 0.5 : 0.8) : 1; }
    function getTalentShopDiscount() { return (hasTalent('mestre_ladrao') && isTalentSpecialized()) ? 0.8 : 1; }
    function getTalentQuestDmgMult() { return (hasTalent('passos_silenciosos') && isTalentSpecialized()) ? 0.8 : 1; }
    function getTalentShieldHits() { return hasTalent('escudo_arcano') ? (isTalentSpecialized() ? 2 : 1) : 0; }

    function chooseTalent(id) {
        if (p.lvl < TALENT_UNLOCK_LEVEL) return;
        const list = TALENTS[p.class] || [];
        const t = list.find(x => x.id === id);
        if (!t) return;
        showConfirm(`Escolher o talento "${t.name}"? Podes trocar mais tarde por ${TALENT_RESPEC_COST} Ouro.`, () => {
            p.talent.chosen = id;
            log(`Talento escolhido: ${t.name}!`, "var(--gold)");
            sfxLevelUp();
            updateUI();
        });
    }

    function respecTalent() {
        if (p.gold < TALENT_RESPEC_COST) { log(`Precisas de ${TALENT_RESPEC_COST} Ouro para trocar de talento.`, "var(--btn-red)"); return; }
        showConfirm(`Trocar de talento por ${TALENT_RESPEC_COST} Ouro? Vais escolher outra vez.`, () => {
            p.gold -= TALENT_RESPEC_COST;
            p.talent.chosen = null;
            log("Talento reiniciado — escolhe um novo.", "var(--accent)");
            updateUI();
        });
    }

    function renderTalentBox() {
        const box = document.getElementById('talent-box');
        if (!box) return;
        const list = TALENTS[p.class] || [];
        if (p.lvl < TALENT_UNLOCK_LEVEL) {
            box.innerHTML = `<p style="color:#888; font-size:0.85em; background:#292929; padding:10px; border-radius:5px;">🔒 Disponível a partir do nível ${TALENT_UNLOCK_LEVEL} (faltam ${TALENT_UNLOCK_LEVEL - p.lvl} níveis).</p>`;
            return;
        }
        if (!p.talent.chosen) {
            let html = `<p style="font-size:0.8em; color:#aaa;">Escolhe o teu talento (podes trocar mais tarde por ${TALENT_RESPEC_COST} Ouro):</p>`;
            list.forEach(t => {
                html += `<div class="item-card">
                    <b>${t.icon} ${t.name}</b> <small style="color:#888;">(${t.type})</small><br>
                    <small>${t.baseDesc}</small>
                    <button onclick="chooseTalent('${t.id}')" style="background:#4caf50;">Escolher</button>
                </div>`;
            });
            box.innerHTML = html;
            return;
        }
        const t = list.find(x => x.id === p.talent.chosen);
        if (!t) { box.innerHTML = ''; return; }
        const specialized = isTalentSpecialized();
        const desc = specialized ? t.specDesc : t.baseDesc;
        const progressNote = specialized
            ? '<span style="color:var(--gold);">★ Especializado</span>'
            : `Especializa-se no nível ${TALENT_SPEC_LEVEL} (faltam ${TALENT_SPEC_LEVEL - p.lvl} níveis)`;
        box.innerHTML = `<div class="item-card" style="border-color:var(--gold);">
            <b>${t.icon} ${t.name}</b> <small style="color:#888;">(${t.type})</small><br>
            <small>${desc}</small><br>
            <small style="display:block; margin-top:4px;">${progressNote}</small>
            <button onclick="respecTalent()" style="background:#555;">Trocar Talento (${TALENT_RESPEC_COST}G)</button>
        </div>`;
    }