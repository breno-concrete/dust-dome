#!/usr/bin/env python3
"""Confere a planilha dos POs com os números do jogo (src/config/*.json).

A decisão final dos POs, revisada pelo negócio, é a que está nos JSON. Quando algo não bate,
a planilha está desatualizada: troque o valor dela pelo do JSON. Se a decisão mudou de verdade,
primeiro mude o JSON (PR content/) e depois a planilha.

Uso, na raiz do repositório:

    python docs/check_po_sheet.py          # mostra só o que não bate
    python docs/check_po_sheet.py --tudo   # mostra todos os valores conferidos

Sai com código 1 se algum valor não bater. Usa só a biblioteca padrão do Python.
"""

import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "docs" / "planejamento_viavel_32_colonos_mars_outpost.xlsx"
MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL_ID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


# ---------- leitura da planilha (o .xlsx é um zip de XML) ----------


def read_sheet(z: zipfile.ZipFile, name: str) -> dict:
    """Valores digitados da aba (células com fórmula ficam de fora: não são premissas)."""
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(MAIN + "si"):
            shared.append("".join(t.text or "" for t in si.iter(MAIN + "t")))

    workbook = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid = next(s.get(REL_ID) for s in workbook.iter(MAIN + "sheet") if s.get("name") == name)
    target = next(r.get("Target") for r in rels if r.get("Id") == rid)
    path = target.lstrip("/") if target.startswith("/") else "xl/" + target

    cells = {}
    for c in ET.fromstring(z.read(path)).iter(MAIN + "c"):
        if c.find(MAIN + "f") is not None:
            continue
        kind, v = c.get("t"), c.find(MAIN + "v")
        if kind == "inlineStr":
            cells[c.get("r")] = "".join(t.text or "" for t in c.iter(MAIN + "t"))
        elif v is not None and v.text:
            cells[c.get("r")] = shared[int(v.text)] if kind == "s" else float(v.text)
    return cells


# ---------- números do jogo ----------


def load(name: str):
    return json.loads((ROOT / "src" / "config" / f"{name}.json").read_text(encoding="utf-8"))


structures = {s["id"]: s for s in load("structures")}
upgrades = {u["id"]: u for u in load("upgrades")}
resources = {r["id"]: r for r in load("resources")}
mission = load("mission")
seasons = {s["id"]: s for s in load("seasons")["seasons"]}
cycles = load("seasons")["cycles"]


def out(type_, mode, res):
    return structures[type_]["outputs"][mode][res]


def inp(type_, mode, res):
    return structures[type_]["inputs"][mode][res]


def power(type_, key):
    return structures[type_]["power"][key]


def heat(type_, cycle, season):
    return structures[type_]["heatingKw"][str(cycle)][season]


def same(*values):
    """One value when they all agree; otherwise all of them, so the mismatch shows."""
    return values[0] if len(set(values)) == 1 else " / ".join(str(v) for v in values)


def insulation_cut():
    """Share of the cold add-on that insulation removes, from every habitat and greenhouse cell."""
    cuts = set()
    for type_ in ("habitat", "greenhouse"):
        s = structures[type_]
        base = heat(type_, 1, "spring")
        for cycle, row in s["heatingKw"].items():
            for season, kw in row.items():
                if kw > base:
                    cuts.add(round((kw - s["insulatedHeatingKw"][cycle][season]) / (kw - base), 9))
    return same(*sorted(cuts))


def build_seconds(id_):
    return structures[id_]["buildSeconds"] if id_ in structures else mission["jobs"]["upgradeSeconds"]


def cells_used(id_):
    return structures[id_]["size"] ** 2 if id_ in structures else 0


def at_start(id_):
    return sum(1 for s in mission["startingStructures"] if s["type"] == id_)


def cost(id_, res):
    item = structures.get(id_) or upgrades[id_]
    return item["cost"].get(res, 0)


# ---------- o que comparar: (aba, célula, o que é, valor no JSON) ----------

P = "Premissas"
CHECKS = [
    ("Planejamento_32_Colonos", "B6", "Novos colonos", mission["colonists"]),
    (P, "B6", "Astronautas iniciais", mission["crew"]),
    (P, "B7", "Pessoas por módulo", structures["habitat"]["capacity"]),
    (P, "B8", "O₂ por pessoa por estação", mission["needs"]["oxygen"]),
    (P, "B9", "Comida por pessoa por estação", mission["needs"]["food"]),
    (P, "B10", "Água por pessoa por estação", mission["needs"]["water"]),
    (P, "B13", "Gerador de O₂: O₂ (Base)", out("oxygen_generator", "min", "oxygen")),
    (P, "C13", "Gerador de O₂: O₂ (Máx)", out("oxygen_generator", "max", "oxygen")),
    (P, "B14", "Estufa: comida (Base)", out("greenhouse", "min", "food")),
    (P, "C14", "Estufa: comida (Máx)", out("greenhouse", "max", "food")),
    (P, "B15", "Estufa: água consumida (Base)", inp("greenhouse", "min", "water")),
    (P, "C15", "Estufa: água consumida (Máx)", inp("greenhouse", "max", "water")),
    (P, "B16", "Derretedor: água (Base)", out("ice_melter", "min", "water")),
    (P, "C16", "Derretedor: água (Máx)", out("ice_melter", "max", "water")),
    (P, "B17", "Gerador de O₂: kW (Base)", power("oxygen_generator", "minKw")),
    (P, "C17", "Gerador de O₂: kW (Máx)", power("oxygen_generator", "maxKw")),
    (P, "B18", "Mina: hematita (Base)", out("mine", "min", "hematite")),
    (P, "C18", "Mina: hematita (Máx)", out("mine", "max", "hematite")),
    (P, "B19", "Mina: regolito (Base)", out("mine", "min", "regolith")),
    (P, "C19", "Mina: regolito (Máx)", out("mine", "max", "regolith")),
    (P, "B20", "Refinaria: ferro (Base)", out("iron_refinery", "min", "iron")),
    (P, "C20", "Refinaria: ferro (Máx)", out("iron_refinery", "max", "iron")),
    (P, "B21", "Fábrica de aço: aço (Base)", out("steel_factory", "min", "steel")),
    (P, "C21", "Fábrica de aço: aço (Máx)", out("steel_factory", "max", "steel")),
    (P, "B24", "Módulo: aquecimento base (kW)", heat("habitat", 1, "spring")),
    (P, "B25", "Módulo: inverno ciclos 3–4 sem isolamento", same(heat("habitat", 3, "winter"), heat("habitat", 4, "winter"))),
    (P, "B26", "Estufa: aquecimento base (kW)", heat("greenhouse", 1, "spring")),
    (P, "B27", "Estufa: inverno ciclos 3–4 sem isolamento", same(heat("greenhouse", 3, "winter"), heat("greenhouse", 4, "winter"))),
    (P, "B28", "Derretedor: aquecimento base (kW)", heat("ice_melter", 1, "spring")),
    (P, "B29", "Derretedor: inverno ciclos 3–4", same(heat("ice_melter", 3, "winter"), heat("ice_melter", 4, "winter"))),
    (P, "B30", "Isolamento corta do acréscimo de frio", insulation_cut()),
    (P, "B31", "Isolamento vale para o derretedor (1/0)", int("thermal_insulation" in structures["ice_melter"]["upgrades"])),
    (P, "B32", "Modo Máx: kW a mais (estufa e derretedor)", same(power("greenhouse", "maxKw") - power("greenhouse", "minKw"), power("ice_melter", "maxKw") - power("ice_melter", "minKw"))),
    (P, "B33", "Reator nuclear (kW)", power("nuclear_reactor", "kw")),
    (P, "B47", "Primavera (s)", seasons["spring"]["durationSeconds"]),
    (P, "B48", "Verão (s)", seasons["summer"]["durationSeconds"]),
    (P, "B49", "Outono (s)", seasons["autumn"]["durationSeconds"]),
    (P, "B50", "Inverno (s)", seasons["winter"]["durationSeconds"]),
    (P, "B52", "Número de ciclos", cycles),
    (P, "B53", "Fração da estação fora da base", mission["exposure"]["maxShareOfSeason"]),
    (P, "B60", "Células da grade", mission["grid"]["width"] * mission["grid"]["height"]),
    (P, "B61", "Hematita inicial", resources["hematite"]["start"]),
    (P, "B62", "Regolito inicial", resources["regolith"]["start"]),
]

# Tabela de custos (linhas 65–76): colunas B–E custo, F tempo, G células, H quantas no início.
COST_ROWS = {
    65: "habitat", 66: "solar_panel", 67: "mine", 68: "oxygen_generator", 69: "ice_melter",
    70: "iron_refinery", 71: "greenhouse", 72: "repair_workshop", 73: "steel_factory",
    74: "nuclear_reactor", 75: "thermal_insulation", 76: "radiation_shelter",
}
for row, id_ in COST_ROWS.items():
    for col, res in zip("BCDE", ("hematite", "regolith", "iron", "steel")):
        CHECKS.append((P, f"{col}{row}", f"{id_}: custo em {res}", cost(id_, res)))
    CHECKS.append((P, f"F{row}", f"{id_}: tempo de obra (s)", build_seconds(id_)))
    CHECKS.append((P, f"G{row}", f"{id_}: células", cells_used(id_)))
    CHECKS.append((P, f"H{row}", f"{id_}: quantas no início", at_start(id_)))


def ratio_checks(cells):
    """The batch rows (B39–B42) only matter as a proportion: 10 → 6 is the same as 30 → 18."""
    pairs = [
        ("B39", "B40", "Refinaria: hematita por ferro", inp("iron_refinery", "min", "hematite") / out("iron_refinery", "min", "iron")),
        ("B41", "B42", "Fábrica: ferro por aço", inp("steel_factory", "min", "iron") / out("steel_factory", "min", "steel")),
    ]
    for a, b, label, game in pairs:
        yield (P, f"{a}/{b}", label, cells[P].get(a, 0) / cells[P].get(b, 1), game)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    with zipfile.ZipFile(SHEET) as z:
        cells = {name: read_sheet(z, name) for name in {sheet for sheet, *_ in CHECKS}}

    rows = [(s, c, label, cells[s].get(c), game) for s, c, label, game in CHECKS if game is not None]
    rows += list(ratio_checks(cells))

    show_all = "--tudo" in sys.argv
    wrong = 0
    for sheet, cell, label, value, game in rows:
        ok = isinstance(value, float) and isinstance(game, (int, float)) and abs(value - game) < 1e-9
        wrong += not ok
        if ok and not show_all:
            continue
        shown = f"{value:g}" if isinstance(value, float) else value
        played = f"{game:g}" if isinstance(game, (int, float)) else game
        print(f"{'ok  ' if ok else 'ERRO'} {sheet}!{cell:<8} {label:<45} planilha={shown}  jogo={played}")

    print()
    if wrong:
        print(f"{wrong} valor(es) diferentes. A decisão final dos POs está nos JSON de src/config:")
        print("atualize a planilha com o valor do jogo (ou, se a decisão mudou, o JSON primeiro).")
        return 1
    print(f"Planilha e jogo batem ({len(rows)} valores conferidos).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
