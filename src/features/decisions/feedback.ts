// Owner: Dev B. Commander Vega's advice after a game over: what to change next time.
// Pure: reads the final GameState (structures, switches, power, stock) and the log, plus the
// config for names and numbers. The EndScreen already says *what* happened; this says *what to try*.
import type { GameConfig, LocalizedText } from '../../config/schema'
import type { GameState } from '../../engine/types'

export interface FeedbackTip {
  id: string
  text: LocalizedText
}

export interface GameOverFeedback {
  /** The first cause of death, or "targets_missed" when the crew survived. */
  cause: string
  tips: FeedbackTip[]
}

const MAX_TIPS = 3

/** What makes each vital reserve. */
const PRODUCER: Record<string, { maker: string; resource: string }> = {
  empty_oxygen: { maker: 'oxygen_generator', resource: 'oxygen' },
  empty_water: { maker: 'ice_melter', resource: 'water' },
  empty_food: { maker: 'greenhouse', resource: 'food' },
}
const RESERVE_MAKER: Record<string, string> = {
  oxygen: 'oxygen_generator',
  water: 'ice_melter',
  food: 'greenhouse',
}

type Pick = (text: LocalizedText) => string
const english: Pick = (x) => x.en
const portuguese: Pick = (x) => x.pt ?? x.en

/** One tip written twice: each template gets a function that picks the right language. */
function tip(id: string, en: (p: Pick) => string, pt: (p: Pick) => string): FeedbackTip {
  return { id, text: { en: en(english), pt: pt(portuguese) } }
}

export function buildGameOverFeedback(
  game: GameState,
  config: GameConfig,
): GameOverFeedback | null {
  if (game.status !== 'lost') return null

  const structureName = (id: string): LocalizedText =>
    config.structures.find((s) => s.id === id)?.name ?? { en: id }
  const upgradeName = (id: string): LocalizedText =>
    config.upgrades.find((u) => u.id === id)?.name ?? { en: id }
  const resourceName = (id: string): LocalizedText =>
    config.resources.find((r) => r.id === id)?.name ?? { en: id }

  const habitats = game.structures.filter((s) => s.type === 'habitat')
  const has = (type: string) => game.structures.some((s) => s.type === type)
  const people = config.mission.colonists + config.mission.crew

  const firstDeath = game.log.find((e) => e.kind === 'death')
  const cause =
    game.lostReason === 'targets_missed' ? 'targets_missed' : (firstDeath?.cause ?? 'crew_lost')

  const tips: FeedbackTip[] = []

  const powerTip = (what: string) =>
    tip(
      'power',
      (p) =>
        `${what === 'heat' ? 'The heating' : p(structureName(what))} ran out of power. Add solar panels and a battery, or build the nuclear reactor. Put machines you do not need on Min or Off.`,
      (p) =>
        `${what === 'heat' ? 'O aquecimento' : p(structureName(what))} ficou sem energia. Coloque mais painéis solares e uma bateria, ou construa o reator nuclear. Deixe as máquinas que você não precisa em Mín ou Off.`,
    )

  if (cause === 'cold') {
    const name = upgradeName('thermal_insulation')
    if (habitats.some((h) => !h.upgrades.includes('thermal_insulation'))) {
      const year = config.mission.insulationRequiredFromCycle
      tips.push(
        tip(
          'insulation',
          (p) =>
            `Build ${p(name)} on every habitat before the winter of year ${year}. Without it, the heat escapes and the astronauts freeze when winter starts.`,
          (p) =>
            `Construa o ${p(name)} em todos os habitats antes do inverno do ano ${year}. Sem ele, o calor escapa e os astronautas congelam quando o inverno começa.`,
        ),
      )
    }
    if (game.power.unheated || game.power.shed.length > 0 || game.power.balanceKw < 0) {
      tips.push(powerTip('heat'))
    }
    if (!has('battery')) {
      tips.push(
        tip(
          'battery',
          (p) =>
            `Build a ${p(structureName('battery'))}. It saves extra power from summer for the dark winter, when solar panels make almost nothing.`,
          (p) =>
            `Construa um ${p(structureName('battery'))}. Ela guarda a energia extra do verão para o inverno escuro, quando os painéis solares quase não geram nada.`,
        ),
      )
    }
    tips.push(
      tip(
        'briefing',
        () =>
          'Read my briefing at the start of autumn: I always tell you when the cold is coming and what to prepare.',
        () =>
          'Leia meu aviso no começo do outono: eu sempre digo quando o frio está chegando e o que preparar.',
      ),
    )
  } else if (cause === 'radiation_storm') {
    const shelter = upgradeName('radiation_shelter')
    if (!habitats.some((h) => h.upgrades.includes('radiation_shelter'))) {
      tips.push(
        tip(
          'shelter',
          (p) =>
            `Install the ${p(shelter)} upgrade on a habitat. Only thick regolith walls stop the particles of a solar storm.`,
          (p) =>
            `Instale a melhoria ${p(shelter)} num habitat. Só as paredes grossas de regolito barram as partículas de uma tempestade solar.`,
        ),
      )
    }
    const seconds = config.mission.radiationStorm.warningSeconds
    tips.push(
      tip(
        'alarm',
        () =>
          `When the alarm sounds you have ${seconds} seconds. Press Take shelter right away, before anything else.`,
        () =>
          `Quando o alarme tocar, você tem ${seconds} segundos. Aperte Abrigar tripulação na hora, antes de qualquer outra coisa.`,
      ),
      tip(
        'inside',
        () =>
          `Solar storms start in year ${config.mission.radiationStorm.fromCycle}. From then on, keep an eye on the crew panel and press Bring in for anyone working outside.`,
        () =>
          `As tempestades solares começam no ano ${config.mission.radiationStorm.fromCycle}. A partir daí, fique de olho no painel da tripulação e aperte Trazer para quem estiver trabalhando fora.`,
      ),
    )
  } else if (PRODUCER[cause]) {
    const { maker, resource } = PRODUCER[cause]!
    const made = structureName(maker)
    const stuff = resourceName(resource)
    const present = game.structures.filter((s) => s.type === maker)

    if (present.length === 0) {
      tips.push(
        tip(
          'build',
          (p) => `You had no ${p(made)}. Build one early: the crew needs ${p(stuff)} every season.`,
          (p) =>
            `Você não tinha ${p(made)}. Construa essa máquina cedo: a tripulação precisa de ${p(stuff)} a cada estação.`,
        ),
      )
    } else {
      if (game.power.shed.includes(maker)) tips.push(powerTip(maker))
      if (game.powerModes[maker] === 'off') {
        tips.push(
          tip(
            'switch',
            (p) => `The ${p(made)} was switched Off. Open Power switches and set it to Min or Max.`,
            (p) => `${p(made)} estava em Off. Abra o Controle de energia e coloque em Mín ou Máx.`,
          ),
        )
      }
      if (present.some((s) => s.status !== 'active' && s.status !== 'building')) {
        const workshop = structureName('repair_workshop')
        tips.push(
          tip(
            'fix',
            (p) =>
              `The ${p(made)} was broken or full of dust. Select it and press Repair (it needs repair parts from the ${p(workshop)}) or Clean.`,
            (p) =>
              `Houve defeito ou poeira em ${p(made)}. Selecione e aperte Reparar (precisa de peças de reparo da ${p(workshop)}) ou Limpar.`,
          ),
        )
      }
    }
    if (cause === 'empty_food' && (game.stock['water'] ?? 0) < 1) {
      tips.push(
        tip(
          'water',
          (p) =>
            `The ${p(made)} needs ${p(resourceName('water'))} to grow food. Keep the ${p(structureName('ice_melter'))} running.`,
          (p) =>
            `Para fazer comida, ${p(made)} precisa de ${p(resourceName('water'))}. Mantenha ${p(structureName('ice_melter'))} funcionando.`,
        ),
      )
    }
    if (present.length > 0) {
      tips.push(
        tip(
          'boost',
          (p) =>
            `One ${p(made)} may not be enough for the whole crew. Set it to Max when the bar blinks, or build a second one.`,
          (p) =>
            `Uma máquina só (${p(made)}) pode não bastar para toda a tripulação. Coloque em Máx quando a barra piscar, ou construa outra igual.`,
        ),
      )
    }
  } else if (cause === 'targets_missed') {
    for (const id of ['oxygen', 'water', 'food']) {
      const goal = people
      const have = Math.floor(game.stock[id] ?? 0)
      if (have >= goal) continue
      const res = resourceName(id)
      const maker = structureName(RESERVE_MAKER[id]!)
      tips.push(
        tip(
          `reserve-${id}`,
          (p) =>
            `You stored ${have} ${p(res)} and the goal is ${goal}. Keep the ${p(maker)} on Max and build a second one early, so the reserve grows every season.`,
          (p) =>
            `Você guardou ${have} de ${p(res)} e a meta é ${goal}. Deixe ${p(maker)} em Máx e construa outra igual cedo, para a reserva crescer a cada estação.`,
        ),
      )
    }
    const capacity = config.structures.find((s) => s.id === 'habitat')?.capacity ?? 1
    const needed = Math.ceil(people / capacity)
    if (habitats.length < needed) {
      const more = needed - habitats.length
      tips.push(
        tip(
          'habitats',
          () =>
            `You had ${habitats.length} habitat modules and the colonists need ${needed}. Build ${more} more, side by side.`,
          () =>
            `Você tinha ${habitats.length} módulos habitacionais e os colonos precisam de ${needed}. Construa mais ${more}, lado a lado.`,
        ),
      )
    }
  }

  if (tips.length === 0) {
    tips.push(
      tip(
        'watch',
        () =>
          'Watch the three bars at the top: when one blinks, fix it first. Keep power on and the crew safe.',
        () =>
          'Olhe as três barras do topo: quando uma piscar, resolva primeiro. Mantenha a energia ligada e a tripulação a salvo.',
      ),
    )
  }

  return { cause, tips: tips.slice(0, MAX_TIPS) }
}
