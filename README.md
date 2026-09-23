# ⚔️ Hero Quest: Gear Master

Um RPG de progressão em navegador — missões, Arena, World Boss, loot, talentos, perícias e um companion — tudo num único jogo instalável como PWA, sem backend e sem build step.

Joga aqui: abre o `index.html` num browser, ou instala como app (ver [Instalar como PWA](#-instalar-como-pwa)).

## 🎮 Funcionalidades

- **3 Classes** — Guerreiro, Assassino e Mago, cada uma com dano principal, habilidade e talentos próprios.
- **Missões (Taberna)** — 3 a cada vez, com hipótese de uma missão Lendária (mais recompensa, mais risco).
- **Arena** — combates por turnos contra inimigos que escalam com o teu Rank.
- **World Boss** — aparece a cada 3 dias, tentativas limitadas (compráveis com ouro), foge se ficar muito tempo sem ataques.
- **Loot & Equipamento** — 6 raridades (Comum a Mítico), 6 slots de equipamento, nomes de Arma/Armadura próprios de cada classe, comparação automática ao equipar.
- **Itens Únicos** — 6 itens lendários (um por slot), com nome, lore e stats fixos muito acima de um Mítico normal, ganhos uma única vez ao cumprir um marco específico (ex.: Excalibur às 100 vitórias na Arena). Nunca podem ser vendidos, e têm borda dourada especial na interface.
- **Loja** — poções e itens à venda, com refresh periódico ou manual.
- **Mochila expansível** — capacidade base de 12, aumentável com Ouro ou com a Perícia "Mochila Expandida".
- **Atributos com Ouro** — Força, Vida, Destreza, Inteligência e Sorte sobem gastando ouro, com custo a crescer exponencialmente por compra.
- **Perícias** — 9 perks passivos (a maioria até 20 pontos, alguns com limite próprio) pagos com Pontos de Perícia ganhos ao subir de nível.
- **Árvore de Talentos** — 3 talentos por classe, desbloqueiam no nível 15 e especializam-se no nível 40.
- **Companion** — desbloqueia no nível 20; 3 tipos à escolha, ganha 50% da tua XP (nunca ultrapassa o teu nível), retreinável sem perder progresso.
- **Sorte e Destreza** — dão hipótese de crítico e de esquiva a todas as classes, combinando-se com talentos e perícias.
- **Prestígio** — reinicia o progresso a troco de um bónus permanente de Ouro/XP.
- **Conquistas** — dão bónus permanentes de atributos, por tier (incluindo conquistas ligadas aos Itens Únicos).
- **Resumo de Bónus** — painel no Perfil com todos os bónus atuais já agregados (dano, defesa, crítico, esquiva, ouro, XP, etc.).
- **Sequência de login diário** e **ganhos offline**.
- **Multi-personagem** — cria quantos personagens quiseres, cada um com o seu progresso.
- **PWA instalável** — funciona offline via Service Worker, com ícone e ecrã próprio.
- **Som** (Web Audio, sem ficheiros de áudio) e persistência local (localStorage), com exportar/importar save.

## 📁 Estrutura do projeto

```
Hero.Quest-main/
├── index.html          # Marcação HTML (ecrãs, tabs, elementos do jogo)
├── manifest.json        # Manifesto da PWA
├── sw.js                 # Service Worker (cache offline)
├── css/
│   └── style.css          # Todo o estilo visual do jogo
└── js/
    ├── data.js             # Configuração e dados estáticos (raridades, poções, missões, etc.)
    ├── state.js             # Estado do personagem, save/load, multi-personagens
    ├── achievements.js       # Sistema de Conquistas
    ├── talents.js             # Árvore de Talentos
    ├── progression.js          # Atributos (Ouro), Perícias, Level Up, Prestígio
    ├── companion.js             # Sistema de Companion
    ├── economy.js                 # Loja, inventário e itens
    ├── quests.js                   # Missões da Taberna
    ├── combat.js                    # Arena e World Boss
    ├── ui.js                         # Renderização da interface
    └── main.js                       # Som, instalação PWA, janelas de diálogo, arranque
```

Os ficheiros em `js/` são carregados como scripts clássicos (não módulos ES), pela ordem definida no `index.html`, e partilham o mesmo scope global — tal como um único ficheiro, só que organizado por zona de responsabilidade.

## 🚀 Como correr localmente

Não há build nem dependências. Basta servir a pasta com qualquer servidor estático, por exemplo:

```bash
cd Hero.Quest-main
python3 -m http.server 8080
```

Depois abre `http://localhost:8080` no browser.

> Abrir o `index.html` diretamente como ficheiro (`file://`) também funciona para jogar, mas o Service Worker (cache offline / instalação PWA) só regista corretamente quando servido por `http://` ou `https://`.

## 📲 Instalar como PWA

Com o jogo aberto num browser compatível (Chrome, Edge, Android...), usa o botão **"📲 Instalar"** no canto superior do jogo, ou a opção "Instalar app" do próprio browser. Depois de instalado, funciona offline.

## 💾 Guardar progresso

O progresso é guardado automaticamente no `localStorage` do browser (por personagem). Também podes:
- **Exportar Save** — descarrega um `.json` com o progresso do personagem atual.
- **Importar Save** — carrega um `.json` exportado anteriormente.

## 🛠️ Notas técnicas

- Sem dependências externas, sem build step — HTML, CSS e JS puros.
- Sempre que alterares algo em `css/` ou `js/`, sobe a versão da cache no `sw.js` (`CACHE_NAME`), para o Service Worker atualizar os ficheiros em cache.
