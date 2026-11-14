import { describe, it } from 'vitest'

// US4 (Breno) — constitution II.9–II.10
describe('updateJobs', () => {
  it.todo('a queued job takes a free living astronaut, who goes outside')
  it.todo('only an astronaut at or below resumeAt who is not resting takes a job')
  it.todo('at most one active job per living astronaut; the rest wait in the queue')
  it.todo(
    "a build job finishes after the structure's buildSeconds and the structure becomes active",
  )
  it.todo(
    'a demolish job removes the structure and refunds demolishRefundShare of its cost and upgrades, whatever its state (log "demolished")',
  )
  it.todo('an upgrade job adds the upgrade to the structure')
  it.todo('a repair job restores damaged or short_circuit structures')
  it.todo('a clean job restores clogged structures and cannot run during an active dust storm')
  it.todo('jobs pause while an event blocks external jobs, and resume after')
  it.todo('the astronaut goes back inside when the job ends')
  it.todo('no job starts while a radiation storm is on (warning or active)')
  it.todo(
    'a job whose astronaut dies or is recalled goes back to the queue with its remaining time',
  )
})
