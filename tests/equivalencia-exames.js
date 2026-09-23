// Compara o motor de exames do Power Apps (powerapps/extrair-exames.fx) com o do site (index.html).
// Para cada laudo em tests/laudos/*.txt, as duas saídas devem ser idênticas.
// Se existir <laudo>.esperado ao lado do .txt, as duas também devem ser iguais a ele.
//
// Requisito: .NET 8 SDK (em ~/.dotnet ou no PATH).
// Uso: npm run test:exames
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const LAUDOS = path.join(__dirname, 'laudos');
const FORMULA = path.join(RAIZ, 'powerapps', 'extrair-exames.fx');

// Carrega parseLaudo do site: trecho do <script> entre UTILITÁRIOS e SEÇÃO 2
function carregarSite() {
    const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    const ini = html.indexOf('// ── UTILITÁRIOS');
    const fim = html.indexOf('// ── SEÇÃO 2: CONTROLES');
    if (ini < 0 || fim < 0) throw new Error('Marcadores de seção não encontrados no index.html');
    const ctx = { document: {}, navigator: {} };
    vm.runInNewContext(html.slice(ini, fim), ctx);
    return ctx.parseLaudo;
}

function acharDotnet() {
    const local = path.join(process.env.HOME, '.dotnet', 'dotnet');
    return fs.existsSync(local) ? local : 'dotnet';
}

const parseLaudo = carregarSite();
const arquivos = fs.readdirSync(LAUDOS).filter(f => f.endsWith('.txt')).sort()
    .map(f => path.join(LAUDOS, f));

const dotnet = acharDotnet();
const json = execFileSync(dotnet,
    ['run', '--project', path.join(__dirname, 'powerfx'), '--', FORMULA, ...arquivos],
    {
        encoding: 'utf8',
        env: { ...process.env, DOTNET_ROOT: path.dirname(dotnet), DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
        maxBuffer: 50 * 1024 * 1024,
    });
const powerfx = JSON.parse(json);

let falhas = 0;
for (const arq of arquivos) {
    const site = parseLaudo(fs.readFileSync(arq, 'utf8'));
    const app = powerfx[arq];
    const arqEsperado = arq.replace(/\.txt$/, '.esperado');
    const esperado = fs.existsSync(arqEsperado) ? fs.readFileSync(arqEsperado, 'utf8').replace(/\n$/, '') : null;
    const ok = site === app && (esperado === null || site === esperado);
    if (!ok) falhas++;
    console.log(`${ok ? '✓' : '✗'} ${path.basename(arq)}${esperado !== null ? ' (com saída esperada)' : ''}`);
    if (!ok) {
        if (esperado !== null) console.log(`  --- esperado:\n${esperado}`);
        console.log(`  --- site:\n${site}\n  --- power apps:\n${app}\n`);
    }
}
console.log(`\n${arquivos.length - falhas}/${arquivos.length} ok`);
process.exit(falhas ? 1 : 0);
