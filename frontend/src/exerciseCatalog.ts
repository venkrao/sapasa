import type { ExerciseDefinition, RagaDefinition } from './exerciseModel'
import { MAYAMALAVAGOWLA } from './ragas/mayamalavagowla'
import { MADHYAMAVATHI }   from './ragas/madhyamavathi'

export const RAGAS: RagaDefinition[] = [MAYAMALAVAGOWLA, MADHYAMAVATHI]

export function getRaga(ragaId: string): RagaDefinition | undefined {
  return RAGAS.find(r => r.id === ragaId)
}

export function getExercise(
  ragaId: string,
  exerciseId: string,
): ExerciseDefinition | undefined {
  return RAGAS.find(r => r.id === ragaId)?.exercises.find(e => e.id === exerciseId)
}

