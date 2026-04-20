import type { ExerciseDefinition, RagaDefinition } from './exerciseModel'
import { CUSTOM_MELODY_RAGA } from './ragas/customMelodyRaga'
import { PALTA_RAGA } from './ragas/paltaRaga'
import { MAYAMALAVAGOWLA } from './ragas/mayamalavagowla'
import { MADHYAMAVATHI } from './ragas/madhyamavathi'

export const RAGAS: RagaDefinition[] = [
  CUSTOM_MELODY_RAGA,
  PALTA_RAGA,
  MAYAMALAVAGOWLA,
  MADHYAMAVATHI,
]

export function getRaga(ragaId: string): RagaDefinition | undefined {
  return RAGAS.find(r => r.id === ragaId)
}

export function getExercise(
  ragaId: string,
  exerciseId: string,
): ExerciseDefinition | undefined {
  return RAGAS.find(r => r.id === ragaId)?.exercises.find(e => e.id === exerciseId)
}

