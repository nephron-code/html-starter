// Gera powerapps/tela-exames.yaml (controles para colar no Power Apps Studio)
// a partir do motor em powerapps/extrair-exames.fx.
//
// O código YAML do Studio usa a sintaxe invariante (",") mesmo com o Studio em pt-BR,
// então os ";" do motor viram ",". O motor não tem ";" dentro de textos (verificado abaixo).
//
// Uso: npm run gerar:tela
const fs = require('fs');
const path = require('path');

const fx = fs.readFileSync(path.join(__dirname, 'extrair-exames.fx'), 'utf8').replace(/\n+$/, '');

for (const linha of fx.split('\n')) {
    const codigo = linha.replace(/\/\/.*$/, '');
    let emTexto = false;
    for (const ch of codigo) {
        if (ch === '"') emTexto = !emTexto;
        else if (ch === ';' && emTexto) throw new Error(`";" dentro de texto no motor: ${linha.trim()}`);
    }
}
const motor = fx.replace(/;/g, ',');

// Paleta do site (index.html)
const C = {
    branco: 'RGBA(255, 255, 255, 1)',
    azul: 'RGBA(26, 35, 126, 1)',       // #1a237e
    azulHover: 'RGBA(40, 53, 147, 1)',  // #283593
    azulFoco: 'RGBA(57, 73, 171, 1)',   // #3949ab
    borda: 'RGBA(208, 208, 208, 1)',    // #d0d0d0
    texto: 'RGBA(51, 51, 51, 1)',       // #333
    cinza: 'RGBA(136, 136, 136, 1)',    // #888
    cinzaClaro: 'RGBA(153, 153, 153, 1)', // #999
    hoverClaro: 'RGBA(240, 240, 240, 1)',
};
const FONTE = "Font.'Segoe UI'";

// Converte { Prop: valor } em linhas YAML; valores de várias linhas ou com
// caracteres especiais do YAML (": ", " #") viram bloco "|-"
function controle(nome, tipo, props) {
    const linhas = [`- ${nome}:`, `    Control: ${tipo}`, '    Properties:'];
    for (const [k, v] of Object.entries(props)) {
        const f = '=' + v;
        if (f.includes('\n') || /: | #|:$/.test(f)) {
            linhas.push(`      ${k}: |-`);
            for (const l of f.split('\n')) linhas.push(l ? `        ${l}` : '');
        } else {
            linhas.push(`      ${k}: ${f}`);
        }
    }
    return linhas.join('\n');
}

const texto = s => JSON.stringify(s); // aspas duplas; o motor não usa \ em textos simples

function rotulo(nome, props) {
    return controle(nome, 'Label@2.5.1', { Font: FONTE, Color: C.texto, ...props });
}

const telas = [
    // Fundo da tela (#f5f5f5) é definido à mão em Screen1.Fill: telas não são coladas via YAML
    rotulo('Titulo', {
        X: 40, Y: 20, Width: 800, Height: 44,
        Text: texto('Transcritor de Exames'), Size: 22, FontWeight: 'FontWeight.Semibold', Color: C.azul,
    }),
    rotulo('Subtitulo', {
        X: 40, Y: 62, Width: 1000, Height: 24,
        Text: texto('Transcrição de exames do Laudo Individual do AGHU'), Size: 11, Color: C.cinza,
    }),
    rotulo('RotuloEntrada', {
        X: 40, Y: 104, Width: 620, Height: 24,
        Text: texto('LAUDO INDIVIDUAL'), Size: 11, FontWeight: 'FontWeight.Semibold',
    }),
    rotulo('DicaEntrada', {
        X: 40, Y: 128, Width: 620, Height: 24,
        Text: texto('No AGHU: Laudo Individual → Ctrl+A → Ctrl+C → cole abaixo. Várias datas: cole uma após a outra.'),
        Size: 9, Color: C.cinzaClaro,
    }),
    controle('TextInput1', 'Classic/TextInput@2.3.2', {
        X: 40, Y: 156, Width: 620, Height: 490,
        Default: '""', HintText: texto('Cole o laudo aqui…'), Mode: 'TextMode.MultiLine',
        Font: FONTE, Size: 10, Color: C.texto, Fill: C.branco, HoverFill: C.branco,
        BorderColor: C.borda, BorderThickness: 1, HoverBorderColor: C.azulFoco,
        FocusedBorderColor: C.azulFoco, FocusedBorderThickness: 2,
        RadiusTopLeft: 4, RadiusTopRight: 4, RadiusBottomLeft: 4, RadiusBottomRight: 4,
        PaddingLeft: 10, PaddingRight: 10, PaddingTop: 8, PaddingBottom: 8,
    }),
    rotulo('RotuloResultado', {
        X: 700, Y: 104, Width: 626, Height: 24,
        Text: texto('RESULTADO'), Size: 11, FontWeight: 'FontWeight.Semibold',
    }),
    rotulo('AvisoCulturas', {
        X: 700, Y: 128, Width: 626, Height: 24,
        Text: texto('⚠️ Culturas e anticorpos reumatológicos (FAN, FR) não são importados — transcreva manualmente.'),
        Size: 9, Color: C.cinzaClaro,
    }),
    rotulo('Resultado', {
        X: 700, Y: 156, Width: 626, Height: 490,
        Text: motor, Size: 10, Fill: C.branco,
        BorderColor: C.borda, BorderThickness: 1,
        PaddingLeft: 12, PaddingRight: 12, PaddingTop: 10, PaddingBottom: 10,
        VerticalAlign: 'VerticalAlign.Top', Overflow: 'Overflow.Scroll',
    }),
    controle('BtnLimpar', 'Classic/Button@2.2.0', {
        X: 40, Y: 662, Width: 120, Height: 38,
        Text: texto('Limpar'), OnSelect: 'Reset(TextInput1)',
        Font: FONTE, Size: 11, Fill: C.branco, Color: C.texto,
        BorderColor: C.borda, BorderThickness: 1,
        HoverFill: C.hoverClaro, HoverColor: C.texto, HoverBorderColor: C.borda,
        PressedFill: C.borda, PressedColor: C.texto, PressedBorderColor: C.borda,
        RadiusTopLeft: 4, RadiusTopRight: 4, RadiusBottomLeft: 4, RadiusBottomRight: 4,
    }),
    controle('BtnCopiar', 'Classic/Button@2.2.0', {
        X: 700, Y: 662, Width: 190, Height: 38,
        Text: texto('Copiar resultado'),
        OnSelect: 'Copy(Resultado.Text); Notify("Resultado copiado", NotificationType.Success)',
        Font: FONTE, Size: 11, FontWeight: 'FontWeight.Semibold', Fill: C.azul, Color: C.branco,
        BorderThickness: 0,
        HoverFill: C.azulHover, HoverColor: C.branco,
        PressedFill: C.azulFoco, PressedColor: C.branco,
        RadiusTopLeft: 4, RadiusTopRight: 4, RadiusBottomLeft: 4, RadiusBottomRight: 4,
    }),
    rotulo('Privacidade', {
        X: 40, Y: 716, Width: 1286, Height: 24,
        Text: texto('🔒 Processado dentro do app — nenhum dado do paciente é salvo.'),
        Size: 9, Color: C.cinzaClaro,
    }),
];

const saida = path.join(__dirname, 'tela-exames.yaml');
fs.writeFileSync(saida, telas.join('\n') + '\n');
console.log(`Gerado ${path.relative(process.cwd(), saida)}`);
