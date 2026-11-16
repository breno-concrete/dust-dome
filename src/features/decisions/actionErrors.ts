// Owner: Dev B. Why the game refused an action, in plain words. One place, so every panel that
// shows a refusal (machine panel, placement banner) says the same thing.
import type { ActionError } from '../../engine/types'
import type { LocalizedText } from '../../config/schema'

export const actionErrorMessages: Record<ActionError, LocalizedText> = {
  not_enough_resources: {
    en: 'There are not enough materials for this action.',
    pt: 'Não há materiais suficientes para esta ação.',
  },
  tile_blocked: {
    en: 'That spot is blocked. Choose a free tile.',
    pt: 'Esse espaço está ocupado. Escolha um espaço livre.',
  },
  out_of_bounds: {
    en: 'That spot is outside the base grid.',
    pt: 'Esse espaço está fora da grade da base.',
  },
  not_connected: {
    en: 'Habitat modules must stay connected side by side.',
    pt: 'Os módulos habitacionais precisam ficar conectados lado a lado.',
  },
  last_habitat: {
    en: 'The last habitat cannot be removed.',
    pt: 'O último habitat não pode ser removido.',
  },
  no_room_for_crew: {
    en: 'Move the crew before removing this habitat.',
    pt: 'Mova a tripulação antes de remover este habitat.',
  },
  external_jobs_blocked: {
    en: 'It is too dark and cold to work outside. Wait for spring.',
    pt: 'Está escuro e frio demais para trabalhar lá fora. Espere a primavera.',
  },
  repair_failed: {
    en: 'The bolts came loose and the repair parts were lost. Try again!',
    pt: 'Os parafusos soltaram e as peças de reparo foram perdidas. Tente de novo!',
  },
  not_allowed: {
    en: 'You cannot do this right now.',
    pt: 'Você não pode fazer isso agora.',
  },
  not_implemented: {
    en: 'This action is not ready yet.',
    pt: 'Esta ação ainda não está disponível.',
  },
}
