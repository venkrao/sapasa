import type { ExerciseDefinition, RagaDefinition } from './exerciseModel'
import { MAYAMALAVAGOWLA } from './ragas/mayamalavagowla'

export const RAGAS: RagaDefinition[] = [MAYAMALAVAGOWLA]

export function getRaga(ragaId: string): RagaDefinition | undefined {
  return RAGAS.find(r => r.id === ragaId)
}

export function getExercise(
  ragaId: string,
  exerciseId: string,
): ExerciseDefinition | undefined {
  return RAGAS.find(r => r.id === ragaId)?.exercises.find(e => e.id === exerciseId)
}

