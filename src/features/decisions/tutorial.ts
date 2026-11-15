// Owner: Dev B. Commander Vega's tutorial at the start of a new game, before the first season
// briefing. Reading steps first, then "do it" steps that wait for the player, then goodbye.
// The texts live here (fixed UI texts); the product owners review them.
import { create } from 'zustand'
import type { PowerMode } from '../../engine/types'
import type { LocalizedText } from '../../config/schema'

export type StepCheck = 'pick' | 'place' | 'select' | 'switch'
/** What the dock buttons should draw attention to. */
export type Highlight = 'build' | 'power' | null

export interface TutorialStep {
  id: string
  kind: 'read' | 'do'
  text: LocalizedText & { pt: string }
  /** Only for "do" steps: what the player has to do. */
  check?: StepCheck
  highlight?: Highlight
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    kind: 'read',
    text: {
      en: "Hi, cadet! I'm Commander Vega. Our 4 astronauts and I just landed on Mars, in a place called Hellas Planitia. In 4 Martian years, 32 colonists will arrive. Our mission: get the base ready for them!",
      pt: 'Oi, cadete! Eu sou a Comandante Vega. Nossos 4 astronautas e eu acabamos de pousar em Marte, num lugar chamado Hellas Planitia. Em 4 anos marcianos, 32 colonos vão chegar. Nossa missão: deixar a base pronta para eles!',
    },
  },
  {
    id: 'goal',
    kind: 'read',
    text: {
      en: 'Look at the three bars at the top: oxygen, water and food. The little white mark on each bar is our goal. When the colonists land, every bar must reach its mark. If a bar hits zero, our crew is in danger!',
      pt: 'Olhe as três barras no topo: oxigênio, água e comida. A marquinha branca em cada barra é a nossa meta. Quando os colonos pousarem, todas as barras precisam chegar na marca. Se uma barra zerar, a tripulação corre perigo!',
    },
  },
  {
    id: 'time',
    kind: 'read',
    text: {
      en: 'Time on Mars flows in real time. A year has four seasons: spring, summer, autumn and winter, and each one changes the weather. Use the clock to pause or speed things up. I pause the game whenever I need to talk to you.',
      pt: 'O tempo em Marte passa em tempo real. Um ano tem quatro estações: primavera, verão, outono e inverno, e cada uma muda o clima. Use o relógio para pausar ou acelerar. Eu pauso o jogo sempre que preciso falar com você.',
    },
  },
  {
    id: 'materials',
    kind: 'read',
    text: {
      en: 'Building needs materials, shown at the top right. The mine digs hematite and regolith. The iron refinery turns hematite into iron, the steel factory turns iron into steel, and the repair workshop makes repair parts.',
      pt: 'Construir precisa de materiais, mostrados no canto superior direito. A mina cava hematita e regolito. A refinaria transforma hematita em ferro, a fábrica transforma ferro em aço, e a oficina faz peças de reparo.',
    },
  },
  {
    id: 'power',
    kind: 'read',
    text: {
      en: 'Machines need power. Solar panels make it, but less in winter and when dust covers them. With too little power, machines shut down one by one. Use Power switches to set each kind of machine to Off, Min or Max.',
      pt: 'As máquinas precisam de energia. Os painéis solares a geram, mas menos no inverno e quando a poeira os cobre. Com pouca energia, as máquinas desligam uma a uma. Use o Controle de energia para deixar cada tipo de máquina em Off, Mín ou Máx.',
    },
  },
  {
    id: 'crew',
    kind: 'read',
    text: {
      en: 'Our 4 astronauts do the outside jobs, like building. Outside, they get radiation, shown as a percentage by their name. When it gets high, they come back inside on their own. You can also call them in with the Bring in buttons.',
      pt: 'Nossos 4 astronautas fazem os trabalhos lá fora, como construir. Fora da base, eles recebem radiação, mostrada em porcentagem ao lado do nome. Quando fica alta, eles voltam para dentro sozinhos. Você também pode chamá-los com os botões Trazer.',
    },
  },
  {
    id: 'hazards',
    kind: 'read',
    text: {
      en: 'Mars fights back! Dust devils break machines: repair them with repair parts. Dust clogs panels: clean them. From year 3, winter is deadly cold, so build Thermal insulation on the habitat. Against solar storms, build the Radiation shelter and press Take shelter.',
      pt: 'Marte reage! Redemoinhos de poeira quebram máquinas: conserte com peças de reparo. A poeira entope os painéis: limpe. A partir do ano 3, o inverno é gelado demais, então construa o Isolamento térmico no habitat. Contra as tempestades solares, construa o Abrigo antirradiação e aperte Abrigar tripulação.',
    },
  },
  {
    id: 'do-pick',
    kind: 'do',
    check: 'pick',
    highlight: 'build',
    text: {
      en: "Now it's your turn! We need more power. Press the Build base button and choose a Solar panel.",
      pt: 'Agora é com você! Precisamos de mais energia. Aperte o botão Construir e escolha um Painel solar.',
    },
  },
  {
    id: 'do-place',
    kind: 'do',
    check: 'place',
    text: {
      en: 'Great! Now click a free spot on the ground to place the panel. An astronaut will go outside to build it.',
      pt: 'Ótimo! Agora clique num espaço livre no chão para colocar o painel. Um astronauta vai sair para construí-lo.',
    },
  },
  {
    id: 'do-select',
    kind: 'do',
    check: 'select',
    text: {
      en: 'Well done! Now click any machine on the ground. You will see its name, what it makes and what it uses.',
      pt: 'Muito bem! Agora clique em qualquer máquina no chão. Você vai ver o nome dela, o que ela produz e o que ela gasta.',
    },
  },
  {
    id: 'do-switch',
    kind: 'do',
    check: 'switch',
    highlight: 'power',
    text: {
      en: 'Last one: open Power switches and change one switch, for example from Min to Max. You can change it back anytime.',
      pt: 'Só falta uma: abra o Controle de energia e mude uma chave, por exemplo de Mín para Máx. Você pode voltar atrás quando quiser.',
    },
  },
  {
    id: 'bye',
    kind: 'read',
    text: {
      en: 'You are ready, cadet! Keep the bars growing, keep the power on and keep the crew safe. Next I will tell you about the first season. Good luck!',
      pt: 'Você está pronto, cadete! Faça as barras crescerem, mantenha a energia ligada e a tripulação a salvo. Agora vou contar sobre a primeira estação. Boa sorte!',
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
