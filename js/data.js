// js/data.js — Dados estáticos do jogo: configuração geral, listas de nomes, raridades, habilidades, poções, missões lendárias.


    const CURRENT_SAVE_VERSION = 2;
    const INV_CAPACITY_BASE = 12; // capacidade base da mochila; o total real é getInvCapacity() (base + compras + Perícia)
    const INV_CAPACITY_PER_PURCHASE = 2; // slots ganhos por cada compra de expansão de mochila
    const SHOP_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos
    const PRESTIGE_LEVEL_REQ = 10;

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
    // específico (checkUniqueItems(), em economy.js). Stats muito acima de um Mítico normal,
    // com lore própria, borda dourada especial na UI, e NUNCA podem ser vendidos.
    const UNIQUE_ITEMS = {
        excalibur: {
            id: 'excalibur', name: 'Excalibur', icon: '⚔️', slot: 'weapon',
            condDesc: '100 vitórias na Arena',
            cond: () => p.stats.arenaWins >= 100,
            lore: 'A lâmina cravada na pedra, que só se rende a quem provou o seu valor em incontáveis batalhas.'
        },
        placas_titan: {
            id: 'placas_titan', name: 'Placas do Titã', icon: '🛡️', slot: 'armor',
            condDesc: '15 World Bosses derrotados',
            cond: () => p.stats.bossesKilled >= 15,
            lore: 'Forjada com o núcleo de um titã caído — nada atravessa este aço.'
        },
        amuleto_eternidade: {
            id: 'amuleto_eternidade', name: 'Amuleto da Eternidade', icon: '📿', slot: 'amulet',
            condDesc: 'Prestígio 3',
            cond: () => p.prestige >= 3,
            lore: 'Sobreviveu a três vidas inteiras deste herói, e guarda a memória de todas.'
        },
        anel_do_um: {
            id: 'anel_do_um', name: 'Anel do Um', icon: '💍', slot: 'ring',
            condDesc: '500 missões completas',
            cond: () => p.stats.questsDone >= 500,
            lore: 'Diz-se que concede um pouco de tudo a quem nunca desiste de servir.'
        },
        botas_hermes: {
            id: 'botas_hermes', name: 'Botas de Hermes', icon: '🥾', slot: 'boots',
            condDesc: 'Sequência de login de 30 dias',
            cond: () => p.loginStreak >= 30,
            lore: 'Nunca perdem o passo — nem um só dia de descanso as trava.'
        },
        capa_sombras: {
            id: 'capa_sombras', name: 'Capa das Sombras', icon: '🌑', slot: 'cape',
            condDesc: '50 itens encantados',
            cond: () => p.stats.enchantsDone >= 50,
            lore: 'Tecida na escuridão por um ferreiro arcano obcecado pela perfeição.'
        }
    };