// Avalia uma fórmula Power Fx (sintaxe pt-BR) para cada arquivo de entrada.
// Uso: dotnet run -- <formula.fx> <entrada1.txt> [entrada2.txt ...]
// Saída: JSON { "<arquivo>": "<resultado>" }
// "TextInput1.Text" na fórmula é substituído pela variável com o texto de entrada.
using System.Globalization;
using System.Text.Json;
using Microsoft.PowerFx;
using Microsoft.PowerFx.Types;

var formula = File.ReadAllText(args[0]).Replace("TextInput1.Text", "Laudo");

// O limite padrão de aninhamento do interpretador é baixo; o Power Apps não tem esse limite
var config = new PowerFxConfig(Features.PowerFxV1) { MaxCallDepth = 500 };
#pragma warning disable CS0618
config.EnableRegExFunctions(TimeSpan.FromSeconds(10), 200);
#pragma warning restore CS0618
var opts = new ParserOptions { Culture = new CultureInfo("pt-BR") };

var saida = new Dictionary<string, string>();
foreach (var arquivo in args.Skip(1))
{
    var engine = new RecalcEngine(config);
    engine.UpdateVariable("Laudo", FormulaValue.New(File.ReadAllText(arquivo)));

    var check = engine.Check(formula, opts);
    if (!check.IsSuccess)
    {
        foreach (var e in check.Errors) Console.Error.WriteLine($"ERRO: {e}");
        Environment.Exit(2);
    }
    var r = engine.Eval(formula, null, opts);
    saida[arquivo] = r switch
    {
        StringValue s => s.Value,
        ErrorValue ev => "ERRO_EVAL: " + string.Join("; ", ev.Errors.Select(x => x.Message)),
        _ => r.ToObject()?.ToString() ?? ""
    };
}
Console.Write(JsonSerializer.Serialize(saida));
