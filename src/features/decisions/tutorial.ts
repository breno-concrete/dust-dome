// Owner: Dev B. Commander Vega's tutorial at the start of a new game, before the first season
// briefing. Reading steps first, then "do it" steps that wait for the player, then goodbye.
// The texts live here (fixed UI texts); the product owners review them.
import { create } from 'zustand'
import type { PowerMode } from '../../engine/types'
import type { LocalizedText } from '../../config/schema'
import type { VegaMood } from './vegaMood'

export type StepCheck = 'pick' | 'place' | 'select' | 'switch'
/** What the dock buttons should draw attention to. */
export type Highlight = 'build' | 'power' | null

export interface TutorialStep {
  id: string
  kind: 'read' | 'do'
  /** Chapter title, shown as the dialog title. */
  chapter: LocalizedText & { pt: string }
  /** Which Vega portrait goes with the step. */
  mood: VegaMood
  text: LocalizedText & { pt: string }
  /** Only for "do" steps: what the player has to do. */
  check?: StepCheck
  highlight?: Highlight
}

const ch = (en: string, pt: string) => ({ en, pt })
const MISSION = ch('The mission', 'A missão')
const TIME = ch('Time and seasons', 'Tempo e estações')
const CREW = ch('Your crew', 'Sua tripulação')
const MATERIALS = ch('Materials', 'Materiais')
const POWER = ch('Power', 'Energia')
const LIFE = ch('Life support', 'Suporte à vida')
const DANGERS = ch('Dangers of Mars', 'Perigos de Marte')
const PRACTICE = ch("Let's practice", 'Vamos praticar')
const READY = ch('Ready!', 'Pronto!')

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    kind: 'read',
    chapter: MISSION,
    mood: 'welcome',
    text: {
      en: "Hi, cadet! I'm Commander Vega. Our 4 astronauts landed on Mars at Hellas Planitia, where NASA radar found ice buried underground. In 4 Martian years, 32 colonists will arrive. Your job: get the base ready for them!",
      pt: 'Oi, cadete! Eu sou a Comandante Vega. Nossos 4 astronautas pousaram em Marte, em Hellas Planitia, onde o radar da NASA achou gelo enterrado. Em 4 anos marcianos, 32 colonos vão chegar. Seu trabalho: deixar a base pronta para eles!',
    },
  },
  {
    id: 'goal',
    kind: 'read',
    chapter: MISSION,
    mood: 'neutral',
    text: {
      en: 'To win, when the 32 colonists land at the end of year 4, the base must store 36 oxygen, 36 water and 36 food (one season for 36 people) and have 6 habitat modules to sleep in. The white mark on each top bar is that goal. You lose if all 4 astronauts are lost.',
      pt: 'Para vencer, quando os 32 colonos pousarem no fim do ano 4, a base precisa guardar 36 de oxigênio, 36 de água e 36 de comida (uma estação para 36 pessoas) e ter 6 módulos habitacionais para dormir. A marquinha branca em cada barra do topo é essa meta. Você perde se os 4 astronautas forem perdidos.',
    },
  },
  {
    id: 'year',
    kind: 'read',
    chapter: TIME,
    mood: 'neutral',
    text: {
      en: "A Martian year has 4 seasons and lasts 20 minutes of play. Mars' south is wild: summer is short and stormy, winter is long, dark and freezing. Use the clock to pause, or to go 2× or 4× faster. I pause the game whenever I talk to you.",
      pt: 'Um ano marciano tem 4 estações e dura 20 minutos de jogo. O sul de Marte é selvagem: o verão é curto e cheio de tempestades, o inverno é longo, escuro e gelado. Use o relógio para pausar ou acelerar 2× ou 4×. Eu pauso o jogo sempre que falo com você.',
    },
  },
  {
    id: 'briefings',
    kind: 'read',
    chapter: TIME,
    mood: 'neutral',
    text: {
      en: 'At the start of every season I will brief you: dust devils in spring, storms in summer, cold in autumn and winter. Each year is harder than the last. Read my briefings, because I always tell you what to prepare!',
      pt: 'No começo de cada estação eu vou avisar você: redemoinhos de poeira na primavera, tempestades no verão, frio no outono e no inverno. Cada ano é mais difícil que o anterior. Leia meus avisos, porque eu sempre digo o que preparar!',
    },
  },
  {
    id: 'crew',
    kind: 'read',
    chapter: CREW,
    mood: 'caring',
    text: {
      en: 'We have only 4 astronauts, and they do every job outside the base: building, upgrading, repairing and cleaning. Each astronaut does one job at a time, so choose what comes first. Their names and radiation are at the bottom left.',
      pt: 'Temos só 4 astronautas, e eles fazem todos os trabalhos fora da base: construir, melhorar, consertar e limpar. Cada astronauta faz um trabalho por vez, então escolha o que vem primeiro. Os nomes e a radiação deles ficam no canto inferior esquerdo.',
    },
  },
  {
    id: 'radiation',
    kind: 'read',
    chapter: CREW,
    mood: 'warning',
    text: {
      en: "Mars has no thick air or magnetic shield, so outside an astronaut's radiation keeps rising. At 75% they stop and come back inside to rest. You can also press Bring in to call someone home earlier. Radiation never kills by itself, but it keeps the crew from working.",
      pt: 'Marte não tem ar grosso nem escudo magnético, então fora da base a radiação do astronauta só sobe. Ao chegar em 75%, ele para e volta para descansar. Você também pode apertar Trazer para chamar alguém antes. A radiação sozinha não mata, mas impede a tripulação de trabalhar.',
    },
  },
  {
    id: 'raw',
    kind: 'read',
    chapter: MATERIALS,
    mood: 'neutral',
    text: {
      en: 'The mine digs two raw materials: hematite and regolith. Hematite builds the first machines. Regolith is Martian soil, used for foundations and thick walls against cold and radiation. Your stock is the box at the top right.',
      pt: 'A mina cava dois materiais brutos: hematita e regolito. A hematita constrói as primeiras máquinas. O regolito é o solo marciano, usado em fundações e paredes grossas contra o frio e a radiação. Seu estoque é a caixa no canto superior direito.',
    },
  },
  {
    id: 'chain',
    kind: 'read',
    chapter: MATERIALS,
    mood: 'neutral',
    text: {
      en: 'Better machines need better materials. The iron refinery turns hematite into iron and unlocks level 2. The steel factory turns iron into steel and unlocks level 3. The repair workshop turns iron into repair parts. Build the refinery early!',
      pt: 'Máquinas melhores precisam de materiais melhores. A refinaria transforma hematita em ferro e libera o nível 2. A fábrica de aço transforma ferro em aço e libera o nível 3. A oficina transforma ferro em peças de reparo. Construa a refinaria cedo!',
    },
  },
  {
    id: 'solar',
    kind: 'read',
    chapter: POWER,
    mood: 'neutral',
    text: {
      en: 'Machines run on power. Solar panels make it: a lot in spring and summer, less in autumn, very little in winter and almost none in a dust storm. A battery saves extra power for bad days. The nuclear reactor makes power in any weather.',
      pt: 'As máquinas funcionam com energia. Os painéis solares a geram: muita na primavera e no verão, menos no outono, quase nada no inverno e quase nada em tempestade de poeira. A bateria guarda energia extra para os dias ruins. O reator nuclear gera energia com qualquer clima.',
    },
  },
  {
    id: 'switches',
    kind: 'read',
    chapter: POWER,
    mood: 'neutral',
    text: {
      en: 'Every kind of machine has a switch: Off, Min or Max. Max makes more but burns more power. When power runs out, machines shut down one by one, so watch the Power number at the top. In a crisis, switch to Min!',
      pt: 'Cada tipo de máquina tem uma chave: Off, Mín ou Máx. O Máx produz mais, mas gasta mais energia. Quando a energia acaba, as máquinas desligam uma a uma, então olhe o número de Energia no topo. Numa crise, mude para Mín!',
    },
  },
  {
    id: 'survive',
    kind: 'read',
    chapter: LIFE,
    mood: 'neutral',
    text: {
      en: "Three machines keep us alive: the oxygen generator (it turns the carbon dioxide of Mars into oxygen, like NASA's MOXIE), the ice melter (water from underground ice) and the greenhouse (food, and it needs water too). Each astronaut uses 1 oxygen, 1 water and 1 food per season.",
      pt: 'Três máquinas mantêm a gente vivo: o gerador de oxigênio (transforma o gás carbônico de Marte em oxigênio, como o MOXIE da NASA), o derretedor de gelo (água do gelo subterrâneo) e a estufa (comida, e ela também gasta água). Cada astronauta usa 1 de oxigênio, 1 de água e 1 de comida por estação.',
    },
  },
  {
    id: 'empty',
    kind: 'read',
    chapter: LIFE,
    mood: 'warning',
    text: {
      en: 'If oxygen, water or food reaches zero, or the habitat has no heat, an astronaut is lost after 15 seconds, and another one every 15 seconds. A bar blinks when it holds less than one season for the crew. Act before it hits zero!',
      pt: 'Se o oxigênio, a água ou a comida chegar a zero, ou se o habitat ficar sem aquecimento, um astronauta é perdido depois de 15 segundos, e outro a cada 15 segundos. A barra pisca quando guarda menos que uma estação para a tripulação. Aja antes de zerar!',
    },
  },
  {
    id: 'dust',
    kind: 'read',
    chapter: DANGERS,
    mood: 'warning',
    text: {
      en: 'Dust devils damage machines: they work at half power until repaired. A repair costs 4 repair parts and a quick bolt game. Dust also clogs machines: cleaning needs no parts, but an astronaut goes outside for a while. Select a machine to repair or clean it.',
      pt: 'Redemoinhos de poeira danificam as máquinas: elas funcionam com metade da força até serem consertadas. Um conserto custa 4 peças de reparo e um jogo rápido de parafusos. A poeira também entope as máquinas: limpar não gasta peças, mas um astronauta sai por um tempo. Selecione uma máquina para consertar ou limpar.',
    },
  },
  {
    id: 'cold',
    kind: 'read',
    chapter: DANGERS,
    mood: 'warning',
    text: {
      en: 'Autumn and winter are cold, so habitats burn more power for heat. Before the winter of year 3, build Thermal insulation on the habitat: without it, the astronauts freeze when winter starts. In deep winter it is also too dark and cold to go outside.',
      pt: 'O outono e o inverno são frios, então os habitats gastam mais energia para aquecer. Antes do inverno do ano 3, construa o Isolamento térmico no habitat: sem ele, os astronautas congelam quando o inverno começa. No inverno profundo também fica escuro e frio demais para sair.',
    },
  },
  {
    id: 'storm',
    kind: 'read',
    chapter: DANGERS,
    mood: 'alert',
    text: {
      en: 'From year 2, solar storms can hit, like the real ones NASA tracks. An alarm gives you 10 seconds. Astronauts who are not inside a habitat with a Radiation shelter are lost. Build that upgrade, then press Take shelter to bring everyone in!',
      pt: 'A partir do ano 2, tempestades solares podem chegar, como as reais que a NASA acompanha. Um alarme dá 10 segundos para você. Astronautas que não estiverem num habitat com Abrigo antirradiação são perdidos. Construa essa melhoria e aperte Abrigar tripulação para trazer todos para dentro!',
    },
  },
  {
    id: 'do-pick',
    kind: 'do',
    chapter: PRACTICE,
    check: 'pick',
    highlight: 'build',
    mood: 'neutral',
    text: {
      en: "Now it's your turn! We need more power. Press the Build base button and choose a Solar panel. Read its science card first!",
      pt: 'Agora é com você! Precisamos de mais energia. Aperte o botão Construir e escolha um Painel solar. Leia a ficha de ciência dele primeiro!',
    },
  },
  {
    id: 'do-place',
    kind: 'do',
    chapter: PRACTICE,
    check: 'place',
    mood: 'neutral',
    text: {
      en: 'Great! Now click a free spot on the ground to place the panel. An astronaut will go outside to build it.',
      pt: 'Ótimo! Agora clique num espaço livre no chão para colocar o painel. Um astronauta vai sair para construí-lo.',
    },
  },
  {
    id: 'do-select',
    kind: 'do',
    chapter: PRACTICE,
    check: 'select',
    mood: 'neutral',
    text: {
      en: 'Well done! Now click any machine on the ground. You will see its name, its state, what it makes and what it uses.',
      pt: 'Muito bem! Agora clique em qualquer máquina no chão. Você vai ver o nome, o estado, o que ela produz e o que ela gasta.',
    },
  },
  {
    id: 'do-switch',
    kind: 'do',
    chapter: PRACTICE,
    check: 'switch',
    highlight: 'power',
    mood: 'neutral',
    text: {
      en: 'Last one: open Power switches and change one switch, for example from Min to Max. You can change it back anytime.',
      pt: 'Só falta uma: abra o Controle de energia e mude uma chave, por exemplo de Mín para Máx. Você pode voltar atrás quando quiser.',
    },
  },
  {
    id: 'bye',
    kind: 'read',
    chapter: READY,
    mood: 'celebrating',
    text: {
      en: 'Your first goals: add solar panels and a battery, build the iron refinery to reach level 2, and keep the three bars growing. I will be watching from Earth. Good luck, cadet!',
      pt: 'Seus primeiros objetivos: coloque mais painéis solares e uma bateria, construa a refinaria de ferro para chegar ao nível 2 e faça as três barras crescerem. Vou acompanhar da Terra. Boa sorte, cadete!',
    },
  },
]

export interface StepContext {
  placing: string | null
  solarPanels: number
  solarPanelsAtStart: number
  selectedStructureId: string | null
  powerModes: Record<string, PowerMode>
  powerModesAtStart: Record<string, PowerMode>
}

/** Has the player done what a "do it" step asked for? */
export function isStepDone(check: StepCheck, ctx: StepContext): boolean {
  switch (check) {
    case 'pick':
      return ctx.placing === 'solar_panel' || ctx.solarPanels > ctx.solarPanelsAtStart
    case 'place':
      return ctx.solarPanels > ctx.solarPanelsAtStart
    case 'select':
      return ctx.selectedStructureId !== null
    case 'switch':
      return Object.keys(ctx.powerModes).some((k) => ctx.powerModes[k] !== ctx.powerModesAtStart[k])
  }
}

/** The dock buttons read this to pulse while the tutorial points at them. */
export const useTutorialUi = create<{ highlight: Highlight; setHighlight: (h: Highlight) => void }>(
  (set) => ({ highlight: null, setHighlight: (highlight) => set({ highlight }) }),
)
