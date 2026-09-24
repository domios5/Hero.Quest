// js/data.js — Dados estáticos do jogo: configuração geral, listas de nomes, raridades, habilidades, poções, missões lendárias.


    const CURRENT_SAVE_VERSION = 2;
    const INV_CAPACITY_BASE = 12; // capacidade base da mochila; o total real é getInvCapacity() (base + compras + Perícia)
    const INV_CAPACITY_PER_PURCHASE = 2; // slots ganhos por cada compra de expansão de mochila
    const SHOP_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos
    const PRESTIGE_LEVEL_REQ = 10;
    const BOSS_RESPAWN_TIME = 3 * 24 * 60 * 60 * 1000; // 3 dias (reduzível pela Perk de Prestígio "Caçador Incansável")

    const missionNames = ["Caçar Ratos", "Limpar Esgotos", "Escolta Real", "Colher Ervas", "Roubar os Planos", "Matar Slimes", "Pescar", "Treinar Tropas", "Explorar Mina"];

    // Nomes de Arma/Armadura são por classe (para não saíres com um Mago empunhando uma Adaga);
    // Colar/Anel/Botas/Capa são neutros (qualquer classe os usa), mas com várias variantes por slot.
    const itemNamesByClass = {
        weapon: {
            Guerreiro: ["Espada Longa", "Machado de Guerra", "Martelo de Guerra"],
            Assassino: ["Adaga", "Punhal Gémeo", "Lâmina Curva"],
            Mago: ["Cajado", "Grimório", "Varinha Rúnica"]
        },
        armor: {
            Guerreiro: ["Placas", "Armadura de Ferro", "Couraça Reforçada"],
            Assassino: ["Couro", "Armadura de Couro Cravejado", "Manto Reforçado"],
            Mago: ["Túnica", "Robe Arcano", "Manto do Sábio"]
        }
    };
    const itemNamesGeneric = {
        amulet: ["Colar", "Pingente Antigo", "Berlinde Encantado", "Medalhão Rúnico"],
        ring: ["Anel", "Aliança Rúnica", "Anel Selado", "Anel Gravado"],
        boots: ["Botas", "Botas de Couro", "Sapatos Élficos", "Botas de Viagem"],
        cape: ["Capa", "Manto Curto", "Capuz Sombrio", "Capa Esfarrapada"]
    };
    const slotLabels = { weapon: "Arma", armor: "Armadura", amulet: "Colar", ring: "Anel", boots: "Botas", cape: "Capa" };
    const attrNames = { str: "Força", vit: "Vida", dex: "Destreza", int: "Inteligência", luk: "Sorte" };

    const ARENA_ENEMIES = ["Goblin Feroz", "Orc Selvagem", "Lobo das Sombras", "Esqueleto Guerreiro", "Troll da Montanha", "Bandido Mascarado", "Aranha Gigante", "Golem de Pedra"];

    const ABILITIES = {
        'Guerreiro': { name: 'Fúria de Batalha', desc: 'Cura instantaneamente 50% do teu HP máximo.', cooldown: 60000 },
        'Assassino': { name: 'Golpe Certeiro', desc: 'Ganha ouro instantâneo (5x o teu nível).', cooldown: 60000 },
        'Mago': { name: 'Surto Arcano', desc: 'Ganha XP instantâneo (5x o teu nível).', cooldown: 60000 }
    };

    const POTIONS = [
        { id: 'small', name: 'Poção de Vida', price: 20, effect: 'heal', amount: 50 },
        { id: 'full', name: 'Elixir Maior', price: 50, effect: 'full_heal' },
        { id: 'fury', name: 'Elixir de Fúria', price: 40, effect: 'dmg_boost' }
    ];

    // Configuração de Raridades
    const RARITIES = {
        COMUM:     { name: "Comum", color: "#ffffff", chance: 0.60, slots: 1 },
        INCOMUM:   { name: "Incomum", color: "#1eff00", chance: 0.20, slots: 2 }, // 1 a 2 bónus
        RARO:      { name: "Raro", color: "#0070dd", chance: 0.10, slots: 2 },
        EPICO:     { name: "Épico", color: "#a335ee", chance: 0.06, slots: 3 }, // 2 a 3 bónus
        LENDARIO:  { name: "Lendário", color: "#ff8000", chance: 0.03, slots: 3 },
        MITICO:    { name: "Mítico", color: "#ff0000", chance: 0.01, slots: 5 }
    };

    const OFFLINE_GOLD_CAP_MIN = 8 * 60; // no máximo 8h de ganhos offline contabilizados

    const LEGENDARY_QUEST_CHANCE = 0.08; // ~1 em cada 12 gerações de missões traz uma Lendária
    const legendaryMissionNames = ["Derrotar o Dragão Ancião", "Assaltar a Fortaleza Negra", "Recuperar a Coroa Perdida", "Selar o Portal Amaldiçoado"];

    const BOSS_FLEE_TIME = 60 * 60 * 1000; // 1 hora sem tentativas e o boss foge

    // --- Itens Únicos ---
    // Não são sorteados na loja/loot normal: cada um é ganho uma única vez, ao cumprir um marco
    // específico (checkUniqueItems(), em economy.js). Stats muito acima de um Mítico normal, com
    // lore própria, borda dourada especial na UI, e NUNCA podem ser vendidos.
    //
    // Além dos stats, cada um pode ter "effects": habilidades passivas que só se aplicam enquanto o
    // item está EQUIPADO (getEquippedUniqueEffects(), em economy.js) — ver abilityDesc para o texto.
    // "classReq" restringe o desbloqueio e o equipar a essa classe; sem classReq, é comum a todas.
    // Tipos de effect suportados: statPercent (stat, percent), defensePercent, hpPercent,
    // dodgePercent, critPercent, damagePercent, reflectPercent (% do dano recebido devolvido ao
    // atacante), ignoreBossShield (ignora sempre o Escudo Místico do World Boss — ver
    // BOSS_SHIELD_CHANCE), dot (key, name, percent, turns — queimadura/veneno: % da vida MÁXIMA do
    // alvo por turno, renovado sempre que atacas com o item equipado).
    const UNIQUE_ITEMS = {
        // --- Guerreiro ---
        excalibur: {
            id: 'excalibur', name: 'Excalibur', icon: '⚔️', slot: 'weapon', classReq: 'Guerreiro',
            condDesc: '100 vitórias na Arena',
            cond: () => p.stats.arenaWins >= 100,
            lore: 'A lâmina cravada na pedra, que só se rende a quem provou o seu valor em incontáveis batalhas.',
            abilityDesc: 'Ignora sempre o Escudo Místico do World Boss; +5% de Força enquanto equipada.',
            effects: [{ type: 'ignoreBossShield' }, { type: 'statPercent', stat: 'str', percent: 5 }]
        },
        placas_titan: {
            id: 'placas_titan', name: 'Placas do Titã', icon: '🛡️', slot: 'armor', classReq: 'Guerreiro',
            condDesc: '15 World Bosses derrotados',
            cond: () => p.stats.bossesKilled >= 15,
            lore: 'Forjada com o núcleo de um titã caído — nada atravessa este aço.',
            abilityDesc: '-5% de dano recebido enquanto equipada.',
            effects: [{ type: 'defensePercent', percent: 5 }]
        },
        grevas_marte: {
            id: 'grevas_marte', name: 'Grevas de Marte', icon: '🥾', slot: 'boots', classReq: 'Guerreiro',
            condDesc: 'Nível 50',
            cond: () => p.lvl >= 50,
            lore: 'Cravadas com o símbolo do deus da guerra — cada golpe que sofres, ele devolve em dobro.',
            abilityDesc: 'Devolve 1% do dano recebido ao atacante, como dano extra.',
            effects: [{ type: 'reflectPercent', percent: 1 }]
        },

        // --- Mago ---
        cajado_odin: {
            id: 'cajado_odin', name: 'Cajado de Odin', icon: '🪄', slot: 'weapon', classReq: 'Mago',
            condDesc: 'Arena Rank 30',
            cond: () => p.arenaRank >= 30,
            lore: 'Entalhado com runas que já viram o fim de nove mundos — nenhuma barreira lhe resiste.',
            abilityDesc: 'Ignora sempre o Escudo Místico do World Boss; +5% de Inteligência enquanto equipado.',
            effects: [{ type: 'ignoreBossShield' }, { type: 'statPercent', stat: 'int', percent: 5 }]
        },
        manto_avalon: {
            id: 'manto_avalon', name: 'Manto de Avalon', icon: '🧥', slot: 'armor', classReq: 'Mago',
            condDesc: '25 000 XP total ganho',
            cond: () => p.stats.xpEarned >= 25000,
            lore: 'Tecido na ilha onde o tempo não toca — quem o veste sente a vida transbordar.',
            abilityDesc: '+5% de Vida máxima enquanto equipado.',
            effects: [{ type: 'hpPercent', percent: 5 }]
        },
        botas_cinza_fenica: {
            id: 'botas_cinza_fenica', name: 'Botas da Cinza Fénica', icon: '🔥', slot: 'boots', classReq: 'Mago',
            condDesc: '10 World Bosses derrotados',
            cond: () => p.stats.bossesKilled >= 10,
            lore: 'Forjadas nas cinzas de uma fénix — deixam um rasto que nunca para de arder.',
            abilityDesc: 'Queima o alvo: -1% da vida máxima dele por turno, durante 10 turnos (renovado a cada ataque).',
            effects: [{ type: 'dot', key: 'burn', name: 'Queimadura', percent: 1, turns: 10 }]
        },

        // --- Assassino ---
        adaga_brutus: {
            id: 'adaga_brutus', name: 'Adaga de Brutus', icon: '🗡️', slot: 'weapon', classReq: 'Assassino',
            condDesc: '150 vitórias na Arena',
            cond: () => p.stats.arenaWins >= 150,
            lore: 'A lâmina da traição perfeita — encontra sempre uma brecha, por mais bem guardada que esteja.',
            abilityDesc: 'Ignora sempre o Escudo Místico do World Boss; +5% de Destreza enquanto equipada.',
            effects: [{ type: 'ignoreBossShield' }, { type: 'statPercent', stat: 'dex', percent: 5 }]
        },
        manto_vazio: {
            id: 'manto_vazio', name: 'Manto do Vazio', icon: '🌌', slot: 'armor', classReq: 'Assassino',
            condDesc: '20 000 Ouro total ganho',
            cond: () => p.stats.goldEarned >= 20000,
            lore: 'Tecido com sombra pura — quem o veste torna-se quase um rumor entre os inimigos.',
            abilityDesc: '+5% de Vida máxima enquanto equipado.',
            effects: [{ type: 'hpPercent', percent: 5 }]
        },
        botas_hermes: {
            id: 'botas_hermes', name: 'Botas de Hermes', icon: '👟', slot: 'boots', classReq: 'Assassino',
            condDesc: 'Sequência de login de 30 dias',
            cond: () => p.loginStreak >= 30,
            lore: 'Nunca perdem o passo — nem um só dia de descanso as trava.',
            abilityDesc: '+5% de hipótese de esquiva enquanto equipadas.',
            effects: [{ type: 'dodgePercent', percent: 5 }]
        },

        // --- Comuns (qualquer classe) ---
        amuleto_eternidade: {
            id: 'amuleto_eternidade', name: 'Amuleto da Eternidade', icon: '📿', slot: 'amulet',
            condDesc: 'Prestígio 3',
            cond: () => p.prestige >= 3,
            lore: 'Sobreviveu a três vidas inteiras deste herói, e guarda a memória de todas.',
            abilityDesc: '+10% de Vida máxima enquanto equipado.',
            effects: [{ type: 'hpPercent', percent: 10 }]
        },
        pedra_filosofal: {
            id: 'pedra_filosofal', name: 'Pedra Filosofal', icon: '⚗️', slot: 'amulet',
            condDesc: '50 pontos investidos em Fortitude',
            cond: () => getPericiaPoints('fortitude') >= 50,
            lore: 'A obsessão de gerações de alquimistas, reduzida a uma única pedra perfeita.',
            abilityDesc: '-5% de dano recebido enquanto equipada.',
            effects: [{ type: 'defensePercent', percent: 5 }]
        },
        calice_circe: {
            id: 'calice_circe', name: 'Cálice de Circe', icon: '🍷', slot: 'amulet',
            condDesc: 'Arena Rank 50',
            cond: () => p.arenaRank >= 50,
            lore: 'Quem bebe dele nunca mais volta a lutar da mesma forma — o poder cobra sempre o seu preço.',
            abilityDesc: '+10% de dano em combate enquanto equipado.',
            effects: [{ type: 'damagePercent', percent: 10 }]
        },
        anel_do_um: {
            id: 'anel_do_um', name: 'Anel do Um', icon: '💍', slot: 'ring',
            condDesc: '500 missões completas',
            cond: () => p.stats.questsDone >= 500,
            lore: 'Diz-se que concede um pouco de tudo a quem nunca desiste de servir.'
        },
        anel_engano: {
            id: 'anel_engano', name: 'Anel do Engano', icon: '🎭', slot: 'ring',
            condDesc: 'Nível 30',
            cond: () => p.lvl >= 30,
            lore: 'Nunca mostra a mesma face duas vezes — nem os golpes mais certeiros o encontram.',
            abilityDesc: '+5% de hipótese de esquiva enquanto equipado.',
            effects: [{ type: 'dodgePercent', percent: 5 }]
        },
        selo_salomao: {
            id: 'selo_salomao', name: 'Selo do Rei Salomão', icon: '👑', slot: 'ring',
            condDesc: '300 vitórias na Arena',
            cond: () => p.stats.arenaWins >= 300,
            lore: 'Gravado com o nome que comandava exércitos e espíritos por igual.',
            abilityDesc: '+10% de dano em combate enquanto equipado.',
            effects: [{ type: 'damagePercent', percent: 10 }]
        },
        anel_borgia: {
            id: 'anel_borgia', name: 'Anel de Borgia', icon: '☠️', slot: 'ring',
            condDesc: '20 World Bosses derrotados',
            cond: () => p.stats.bossesKilled >= 20,
            lore: 'Uma gota do seu veneno bastava para reescrever a linha de sucessão de um reino inteiro.',
            abilityDesc: 'Envenena o alvo: -2% da vida máxima dele por turno, durante 5 turnos (renovado a cada ataque).',
            effects: [{ type: 'dot', key: 'poison', name: 'Veneno', percent: 2, turns: 5 }]
        },
        capa_sombras: {
            id: 'capa_sombras', name: 'Capa das Sombras', icon: '🌑', slot: 'cape',
            condDesc: '50 itens encantados',
            cond: () => p.stats.enchantsDone >= 50,
            lore: 'Tecida na escuridão por um ferreiro arcano obcecado pela perfeição.',
            abilityDesc: '+5% de hipótese de crítico enquanto equipada.',
            effects: [{ type: 'critPercent', percent: 5 }]
        },
        veu_morgana: {
            id: 'veu_morgana', name: 'Véu de Morgana le Fay', icon: '🌫️', slot: 'cape',
            condDesc: '200 missões completas',
            cond: () => p.stats.questsDone >= 200,
            lore: 'Quem o usa caminha meio-fora do mundo — os golpes passam onde já não estás.',
            abilityDesc: '+5% de hipótese de esquiva enquanto equipado.',
            effects: [{ type: 'dodgePercent', percent: 5 }]
        },
        estandarte_dragao: {
            id: 'estandarte_dragao', name: 'Estandarte do Dragão Vermelho', icon: '🐉', slot: 'cape',
            condDesc: '15 Conquistas desbloqueadas',
            cond: () => Object.keys(p.achievements).length >= 15,
            lore: 'Ergue-se sobre o teu ombro como se um dragão inteiro respirasse contigo.',
            abilityDesc: '+10% de Vida máxima enquanto equipado.',
            effects: [{ type: 'hpPercent', percent: 10 }]
        }
    };

    // Escudo Místico do World Boss: hipótese de bloquear metade do teu dano em cada ataque — as 3
    // armas de assinatura (Excalibur/Cajado de Odin/Adaga de Brutus) ignoram-no sempre.
    const BOSS_SHIELD_CHANCE = 0.20;
    const BOSS_SHIELD_BLOCK = 0.5;