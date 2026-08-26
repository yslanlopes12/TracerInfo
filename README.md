# TracerInfo

**TracerInfo** é uma ferramenta profissional de OSINT (Open Source Intelligence) executada pelo terminal, capaz de pesquisar e organizar informações publicamente disponíveis sobre uma pessoa, organização ou identificador.

## ⚠️ Aviso de Uso Responsável

Esta ferramenta foi desenvolvida **exclusivamente para investigação legítima e responsável com base em fontes públicas**. O uso desta ferramenta deve sempre:

- Respeitar a legislação vigente, incluindo a LGPD (Lei Geral de Proteção de Dados).
- Ser limitado a fontes de acesso público e legítimo.
- Nunca tentar contornar autenticação, CAPTCHA ou controles de acesso.
- Nunca ser utilizado para assédio, vigilância ilegal ou qualquer finalidade maliciosa.

Inferências e correlações são apresentadas com **níveis de confiança** e nunca como fatos confirmados.

---

## 🚀 Instalação

### Debian/Ubuntu

Em Linux, gere o pacote `.deb` e instale o comando no sistema:

```bash
npm run package:deb
sudo apt install ./tracerinfo_1.0.0_all.deb
tracerinfo person "João da Silva"
```

O pacote requer Node.js 20 ou superior. Para publicar em um repositório APT,
disponibilize o arquivo `.deb` em um repositório Debian assinado; a instalação
local acima já usa o resolvedor do `apt` e configura o executável em
`/usr/bin/tracerinfo`.

### Desenvolvimento local

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/tracerinfo.git
cd tracerinfo

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Inicializar o banco de dados
npm run db:migrate

# Build do projeto
npm run build
```

Para controlar o intervalo entre requisições ao mesmo provedor, defina
`REQUEST_INTERVAL_MS` no arquivo `.env`. O padrão é `1500` milissegundos; a
primeira requisição é imediata e as seguintes da mesma fonte compartilhada são
enfileiradas:

```dotenv
REQUEST_INTERVAL_MS=2000
```

Valores maiores reduzem a chance de `429`, mas aumentam o tempo total. O
limitador é por provedor, então as redes sociais que usam o mesmo índice não
fazem requisições simultâneas.

### Link global para desenvolvimento

Use `npm link` quando quiser executar o código deste diretório como um comando
global durante o desenvolvimento. Ele cria um link simbólico para o projeto;
não publica nem copia o pacote para o npm.

```bash
npm install
npm run build
npm link

tracerinfo --version
tracerinfo --help
tracerinfo person "João da Silva" --no-cache
```

Para remover o link global:

```bash
npm unlink -g tracerinfo
```

Para instalar uma cópia global local, sem link simbólico, use:

```bash
npm install -g .
```

Para instalar a versão publicada no registro npm:

```bash
npm install -g tracerinfo
```

## 🔧 Uso

```bash
# Pesquisar por pessoa
tracerinfo person "João da Silva"

# Pesquisar com saída JSON
tracerinfo person "João da Silva" --json

# Filtrar por tipo de fonte
tracerinfo person "João da Silva" --source web
tracerinfo person "João da Silva" --source social

# Pesquisar apenas redes específicas
tracerinfo person "João da Silva" --social instagram,x,linkedin

# Testar uma rede sem reutilizar o cache e ver o status da fonte
tracerinfo person "João da Silva" --source instagram --no-cache --json

# Incluir codinome/apelido conhecido na pesquisa
tracerinfo person "João da Silva" --alias "J. Silva" --alias "codinome"

# Forçar nova coleta (ignorar cache)
tracerinfo person "João da Silva" --no-cache

# Busca estendida: mínimo de 50% de confiança e até 120 resultados
tracerinfo person "João da Silva" --extend

# Pesquisar por username
tracerinfo username "joaosilva"

# Busca genérica
tracerinfo search "João da Silva Empresa X"

# Ver relatório de uma pesquisa
tracerinfo report <search-id>

# Modo verbose (diagnóstico)
tracerinfo person "João da Silva" --verbose

# Ajuda
tracerinfo --help
tracerinfo person --help
```

## 🏗️ Arquitetura

```
src/
├── index.ts                    # Ponto de entrada
├── config/
│   └── config.ts               # Configuração e variáveis de ambiente
├── cli/
│   ├── commands/               # Comandos da CLI (sem lógica de negócio)
│   └── ui/                     # Interface do terminal
├── core/
│   ├── models/                 # Modelos de dados padronizados
│   └── search/                 # SearchOrchestrator
├── sources/
│   ├── Source.ts               # Interface SearchSource
│   └── web/                    # Fontes HTTP públicas e registro de fontes
└── storage/
    ├── schema.ts               # Schema Drizzle ORM
    ├── database.ts             # Conexão SQLite
    └── repositories/           # Repositórios de dados
```

## 📋 Roadmap

| Fase | Status | Descrição |
|------|--------|-----------|
| 1 | ✅ Em progresso | Base: CLI, SQLite, SearchResult, Mock Source, Terminal UI |
| 2 | ✅ | Múltiplas fontes HTTP, X/Twitter, normalização, deduplicação, cache |
| 3 | 🔜 | EntityResolver, confidence score, relationships |
| 4 | 🔜 | JSON/Markdown/HTML output, relatórios completos |
| 5 | 🔜 | Sistema de plugins, IA opcional |

## 🛠️ Desenvolvimento

```bash
# Executar em modo dev
npm run dev -- person "João da Silva"

# Executar testes
npm test

# Executar testes com watch
npm run test:watch

# Verificar tipos TypeScript
npm run lint
```

## 📦 Stack

- **Runtime:** Node.js 20+ com ESM
- **Linguagem:** TypeScript (strict mode)
- **CLI:** Commander.js
- **Banco de dados:** SQLite + Drizzle ORM
- **Validação:** Zod
- **Interface:** Chalk + Ora
- **Testes:** Vitest
- **HTTP:** Undici
- **HTML Parsing:** Cheerio

### Fontes HTTP

A CLI registra 20 fontes públicas por padrão, incluindo DuckDuckGo, X/Twitter,
Bing, Brave, Google, Yahoo, Yandex, Startpage, Mojeek, Qwant, Ecosia,
Swisscows, Wiby, Marginalia, Wikipedia, GitHub, Reddit, Hacker News,
Internet Archive e Crossref. As presets de redes sociais usam índices públicos
de busca, com fallback automático entre Brave Search, Google e Bing. Cada fonte é
consultada apenas em páginas públicas;
indisponibilidade, bloqueios e limites de cada serviço são reportados
individualmente. As redes sociais são consultas de páginas públicas indexadas,
não acesso autenticado às APIs ou aos perfis privados.

#### Diagnóstico de redes sociais

Use `--no-cache --json` para separar os estados da consulta:

- `status: success` com resultados: a fonte respondeu e os links foram
    reconhecidos como pertencentes à rede selecionada.
- `status: success` sem resultados: a fonte respondeu, mas não há links públicos
    indexados para aquela combinação de nome e variante.
- `status: failure` com aviso HTTP `429`, `403` ou `202`: todos os provedores
    disponíveis aplicaram limite, bloqueio ou desafio anti-bot. O TracerInfo não
    tenta contornar esses mecanismos; aguarde, use o cache ou tente outra fonte.

Os presets `instagram`, `x`, `youtube`, `linkedin`, `facebook`, `threads` e
`github` filtram o domínio final do link. Isso impede que um resultado do
buscador ou de outra rede apareça atribuído à rede errada. A disponibilidade e
a quantidade de resultados dependem da indexação pública e podem variar.

#### Filtros

`--source` aceita um tipo (`web`, `social`, `academic` ou `document`) ou o ID
de uma fonte específica. `--social` é um atalho para vários IDs separados por
vírgulas:

```bash
tracerinfo person "João da Silva" --source instagram
tracerinfo person "João da Silva" --social instagram,x,youtube,linkedin
tracerinfo person "João da Silva" --source social
```

#### Nome, apelidos e codinomes

Para pesquisas de pessoa, o sistema gera formas normalizadas, nome invertido,
iniciais e nome compacto. Apelidos ou codinomes devem ser informados quando
forem conhecidos, pois não é seguro inventar equivalências automaticamente:

```bash
tracerinfo person "João da Silva" --alias "J. Silva" --alias "Nome de guerra"
```

As variantes são consultadas sequencialmente por fonte para reduzir respostas
429 e cada fonte aparece uma única vez no resumo da execução. A chave do cache
inclui filtros e aliases, portanto uma pesquisa com outra rede ou variante não
reutiliza resultados incompatíveis.

#### Limites e confiança

No modo padrão, somente resultados com confiança mínima de 70% são exibidos e
o total fica limitado a 20 resultados. A confiança é uma pontuação heurística
da fonte, não uma confirmação de identidade.

Com `--extend`, o limite mínimo passa para 50% e o total máximo para 120:

```bash
tracerinfo person "João da Silva" --extend
tracerinfo person "João da Silva" --extend --social instagram,x,youtube
```

O limite de 120 é global para a execução, não 120 por rede. Resultados
duplicados continuam sendo removidos antes do corte final.

O `MockSource` permanece somente como fixture de testes offline e não é
registrado pelos comandos da aplicação.

## 📝 Licença

Este projeto é disponibilizado para fins educacionais e de investigação legítima. Utilize com responsabilidade.
