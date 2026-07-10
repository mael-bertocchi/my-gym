import Foundation

struct HistoryPersonalRecordIndex {
    struct Hit: Identifiable {
        let exerciseId: String
        let weightKg: Double
        let reps: Int?

        var id: String { exerciseId }
    }

    private let hitsByWorkout: [String: [Hit]]

    init(workouts: [LocalWorkout]) {
        let finished = workouts
            .filter { $0.endedAt != nil }
            .sorted { $0.startedAt < $1.startedAt }

        var bests: [String: [(workoutId: String, weightKg: Double, reps: Int?)]] = [:]
        for workout in finished {
            var workoutBest: [String: (weightKg: Double, reps: Int?)] = [:]
            for entry in workout.exercises {
                for set in entry.sets where set.isCompleted {
                    guard let weight = set.weightKg else { continue }
                    if let current = workoutBest[entry.exerciseId] {
                        let isHeavier = weight > current.weightKg
                        let isMoreReps = weight == current.weightKg && (set.reps ?? 0) > (current.reps ?? 0)
                        if isHeavier || isMoreReps {
                            workoutBest[entry.exerciseId] = (weight, set.reps)
                        }
                    } else {
                        workoutBest[entry.exerciseId] = (weight, set.reps)
                    }
                }
            }
            for (exerciseId, best) in workoutBest {
                bests[exerciseId, default: []].append((workout.id, best.weightKg, best.reps))
            }
        }

        var hits: [String: [Hit]] = [:]
        for (exerciseId, records) in bests {
            guard let allTimeMax = records.map(\.weightKg).max(),
                  let first = records.first(where: { $0.weightKg == allTimeMax })
            else { continue }
            hits[first.workoutId, default: []].append(
                Hit(exerciseId: exerciseId, weightKg: allTimeMax, reps: first.reps)
            )
        }
        hitsByWorkout = hits
    }

    func hits(for workoutId: String) -> [Hit] {
        hitsByWorkout[workoutId] ?? []
    }

    func personalRecordCount(for workoutId: String) -> Int {
        hitsByWorkout[workoutId]?.count ?? 0
    }
}
