import Foundation

#if DEBUG

enum DebugSeed {
    @MainActor
    static func enterDemoEmpty(store: LocalStore, session: AppSession, activeWorkout: ActiveWorkoutStore) {
        store.clearAll()
        let now = Date.now
        session.enterDemo(profile: UserProfile(
            id: UUID().uuidString.lowercased(),
            email: "me@mael-bertocchi.fr",
            displayName: "Maël Bertocchi",
            isAdministrator: true,
            isActive: true,
            weightUnit: .kilograms,
            defaultGymId: nil,
            createdAt: now,
            updatedAt: now
        ))
        activeWorkout.discard()
        activeWorkout.start(gymId: nil)
    }

    @MainActor
    static func startDemoActiveWorkout(store: LocalStore, activeWorkout: ActiveWorkoutStore) {
        guard let gym = store.gyms.first(where: { $0.name == "Iron Temple" }),
              let chest = store.exercises.first(where: { $0.name == "Chest Press" }),
              let incline = store.exercises.first(where: { $0.name == "Incline DB Press" })
        else { return }

        activeWorkout.discard()
        activeWorkout.start(gymId: gym.id, name: "Push day")

        if let chestEntry = activeWorkout.addExercise(chest) {
            for set in chestEntry.sets.prefix(2) {
                activeWorkout.setCompleted(entryId: chestEntry.id, setId: set.id, completed: true, restSeconds: 90)
            }
        }
        if let inclineEntry = activeWorkout.addExercise(incline) {
            for set in inclineEntry.sets {
                activeWorkout.setCompleted(entryId: inclineEntry.id, setId: set.id, completed: true, restSeconds: 90)
            }
        }
        activeWorkout.debugBackdateStart(minutes: 42)
        activeWorkout.startRest(seconds: 72)
    }

    @MainActor
    static func enterDemo(store: LocalStore, session: AppSession) {
        store.clearAll()

        let ironTemple = mkGym("Iron Temple")
        let downtown = mkGym("Downtown Fitness")
        let hotelLisbon = mkGym("Hotel Gym — Lisbon")

        let hammerStrength = mkBrand("Hammer Strength")
        let technogym = mkBrand("Technogym")
        let cybex = mkBrand("Cybex")

        let chestPressGroup = mkGroup("Chest Press")
        let inclinePressGroup = mkGroup("Incline Press")
        let cableFlyGroup = mkGroup("Cable Fly")
        let benchPressGroup = mkGroup("Bench Press")
        let legPressGroup = mkGroup("Leg Press")
        let legCurlGroup = mkGroup("Leg Curl")
        let latPulldownGroup = mkGroup("Lat Pulldown")
        let seatedRowGroup = mkGroup("Seated Row")
        let squatGroup = mkGroup("Squat")
        let shoulderPressGroup = mkGroup("Shoulder Press")

        let hsChestPress = mkEquipment("Chest Press · Hammer Strength", .machine, brandId: hammerStrength.id)
        let tgChestPress = mkEquipment("Chest Press · Technogym", .machine, brandId: technogym.id)
        let barbell = mkEquipment("Barbell", .barbell, brandId: nil)
        let dumbbells = mkEquipment("Dumbbells", .dumbbell, brandId: nil)
        let tgCableFly = mkEquipment("Cable Fly · Technogym", .cable, brandId: technogym.id)
        let tgLegPress = mkEquipment("Leg Press · Technogym", .machine, brandId: technogym.id)
        let cybexLegCurl = mkEquipment("Leg Curl · Cybex", .machine, brandId: cybex.id)
        let hsLatPulldown = mkEquipment("Lat Pulldown · Hammer Strength", .machine, brandId: hammerStrength.id)
        let tgSeatedRow = mkEquipment("Seated Row · Technogym", .cable, brandId: technogym.id)
        let cybexShoulderPress = mkEquipment("Shoulder Press · Cybex", .machine, brandId: cybex.id)

        let chestPress = mkExercise(
            "Chest Press", .chest, secondary: [.triceps, .frontDelts],
            equipmentId: hsChestPress.id, groupId: chestPressGroup.id, favorite: true
        )
        let chestPressTechnogym = mkExercise(
            "Chest Press (Technogym)", .chest, secondary: [.triceps, .frontDelts],
            equipmentId: tgChestPress.id, groupId: chestPressGroup.id
        )
        let benchPress = mkExercise(
            "Barbell Bench Press", .chest, secondary: [.triceps],
            equipmentId: barbell.id, groupId: benchPressGroup.id
        )
        let inclineDumbbellPress = mkExercise(
            "Incline DB Press", .chest, secondary: [.frontDelts],
            equipmentId: dumbbells.id, groupId: inclinePressGroup.id
        )
        let cableFly = mkExercise(
            "Cable Fly", .chest,
            equipmentId: tgCableFly.id, groupId: cableFlyGroup.id
        )
        let legPress = mkExercise(
            "Leg Press", .quadriceps, secondary: [.glutes],
            equipmentId: tgLegPress.id, groupId: legPressGroup.id
        )
        let legCurl = mkExercise(
            "Leg Curl", .hamstrings,
            equipmentId: cybexLegCurl.id, groupId: legCurlGroup.id
        )
        let latPulldown = mkExercise(
            "Lat Pulldown", .lats, secondary: [.biceps],
            equipmentId: hsLatPulldown.id, groupId: latPulldownGroup.id
        )
        let seatedRow = mkExercise(
            "Seated Row", .upperBack, secondary: [.biceps],
            equipmentId: tgSeatedRow.id, groupId: seatedRowGroup.id
        )
        let squat = mkExercise(
            "Squat", .quadriceps, secondary: [.glutes],
            equipmentId: barbell.id, groupId: squatGroup.id
        )
        let shoulderPress = mkExercise(
            "Shoulder Press", .frontDelts, secondary: [.sideDelts, .triceps],
            equipmentId: cybexShoulderPress.id, groupId: shoulderPressGroup.id
        )

        store.applyCatalog(SyncPull.Catalog(
            brands: [hammerStrength, technogym, cybex],
            equipment: [
                hsChestPress, tgChestPress, barbell, dumbbells, tgCableFly,
                tgLegPress, cybexLegCurl, hsLatPulldown, tgSeatedRow, cybexShoulderPress,
            ],
            exerciseGroups: [
                chestPressGroup, inclinePressGroup, cableFlyGroup, benchPressGroup,
                legPressGroup, legCurlGroup, latPulldownGroup, seatedRowGroup,
                squatGroup, shoulderPressGroup,
            ],
            exercises: [
                chestPress, chestPressTechnogym, benchPress, inclineDumbbellPress,
                cableFly, legPress, legCurl, latPulldown, seatedRow, squat, shoulderPress,
            ],
            gyms: [ironTemple, downtown, hotelLisbon]
        ))

        let ex = ExerciseRefs(
            chestPress: chestPress.id,
            chestPressTechnogym: chestPressTechnogym.id,
            benchPress: benchPress.id,
            inclineDumbbellPress: inclineDumbbellPress.id,
            cableFly: cableFly.id,
            legPress: legPress.id,
            legCurl: legCurl.id,
            latPulldown: latPulldown.id,
            seatedRow: seatedRow.id,
            squat: squat.id,
            shoulderPress: shoulderPress.id
        )

        var log: [LocalWorkout] = [
            showcasePushDay(gymId: ironTemple.id, ex: ex),
            showcaseLegDay(gymId: downtown.id, ex: ex),
            showcasePullDay(gymId: ironTemple.id, ex: ex),
        ]

        let rotation: [(offset: Int, split: Split)] = [
            (8, .push), (10, .legs), (12, .pull),
            (15, .push), (17, .travel), (19, .pull),
            (22, .push), (24, .legs), (26, .pull),
            (29, .push), (31, .legs), (36, .pull),
            (38, .push), (43, .legs), (45, .pull),
            (47, .push), (50, .legs), (52, .pull),
            (57, .push), (59, .legs), (64, .pull),
            (66, .push), (68, .legs),
        ]
        let downtownLegDays: Set<Int> = [24, 43]
        for (offset, split) in rotation {
            switch split {
            case .push:
                log.append(pushDay(daysAgo: offset, gymId: ironTemple.id, ex: ex))
            case .pull:
                log.append(pullDay(daysAgo: offset, gymId: ironTemple.id, ex: ex))
            case .legs:
                let gymId = downtownLegDays.contains(offset) ? downtown.id : ironTemple.id
                log.append(legDay(daysAgo: offset, gymId: gymId, ex: ex))
            case .travel:
                log.append(travelPushDay(daysAgo: offset, gymId: hotelLisbon.id, ex: ex))
            }
        }
        for workout in log {
            store.upsertWorkout(workout, markDirty: false)
        }

        let bodyweight = (0...11).reversed().map { week -> BodyweightEntry in
            let daysAgo = week * 7 + 1
            let progress = Double(84 - daysAgo) / 84
            let wobble = sin(Double(week) * 1.3) * 0.3
            return BodyweightEntry(
                date: sessionStart(daysAgo: daysAgo),
                weightKg: ((77.0 + 1.8 * progress + wobble) * 10).rounded() / 10
            )
        }
        store.replaceBodyweight(entries: bodyweight)

        store.upsertSetting(exerciseId: chestPress.id, gymId: ironTemple.id, settings: [
            "Seat height": .number(4),
            "Back pad": .string("B"),
            "Weight pin": .number(7),
        ])
        store.upsertSetting(exerciseId: legPress.id, gymId: downtown.id, settings: [
            "Seat": .number(3),
        ])

        InsightCache.write([
            "Plateau — Chest Press · Hammer Strength: stuck at 62.5kg for 3 sessions. Try a back-off drop set or +1 rep before adding load.",
            "Imbalance — Pull volume is low: back sets are 40% below push over 4 weeks. Add a row variation next session.",
            "Suggestion — Ready to progress: Leg Press · Technogym hit all reps with room to spare. Add 5kg next time.",
        ])

        session.enterDemo(profile: UserProfile(
            id: newId(),
            email: "me@mael-bertocchi.fr",
            displayName: "Maël Bertocchi",
            isAdministrator: true,
            isActive: true,
            weightUnit: .kilograms,
            defaultGymId: ironTemple.id,
            createdAt: catalogBirth,
            updatedAt: catalogBirth
        ))
    }

    private enum Split {
        case push, pull, legs, travel
    }

    private struct ExerciseRefs {
        var chestPress: String
        var chestPressTechnogym: String
        var benchPress: String
        var inclineDumbbellPress: String
        var cableFly: String
        var legPress: String
        var legCurl: String
        var latPulldown: String
        var seatedRow: String
        var squat: String
        var shoulderPress: String
    }

    private static func showcasePushDay(gymId: String, ex: ExerciseRefs) -> LocalWorkout {
        workout("Push day", daysAgo: 1, gymId: gymId, minutes: 58, entries: [
            entry(ex.chestPress, 1, sets: [
                mkSet(1, type: .warmup, 40, 12),
                mkSet(2, 60, 10),
                mkSet(3, 62.5, 10),
                mkSet(4, 62.5, 8),
                mkSet(5, 60, 8),
            ]),
            entry(ex.chestPressTechnogym, 2, sets: straightSets(3, weight: 55, reps: 10)),
            entry(ex.inclineDumbbellPress, 3, sets: [
                mkSet(1, 26, 10),
                mkSet(2, 26, 10),
                mkSet(3, 24, 12),
            ]),
            entry(ex.cableFly, 4, sets: straightSets(3, weight: 22, reps: 12)),
            entry(ex.shoulderPress, 5, sets: straightSets(3, weight: 40, reps: 10)),
            entry(ex.benchPress, 6, sets: straightSets(3, weight: 80, reps: 8)),
        ])
    }

    private static func showcaseLegDay(gymId: String, ex: ExerciseRefs) -> LocalWorkout {
        workout("Leg day", daysAgo: 3, gymId: gymId, minutes: 64, entries: [
            entry(ex.squat, 1, sets: [
                mkSet(1, type: .warmup, 70, 10),
                mkSet(2, 100, 8),
                mkSet(3, 110, 6),
                mkSet(4, 110, 5),
            ]),
            entry(ex.legPress, 2, sets: [
                mkSet(1, 150, 12),
                mkSet(2, 170, 10),
                mkSet(3, 170, 10),
            ]),
            entry(ex.legCurl, 3, sets: straightSets(3, weight: 47.5, reps: 12)),
        ])
    }

    private static func showcasePullDay(gymId: String, ex: ExerciseRefs) -> LocalWorkout {
        workout("Pull day", daysAgo: 5, gymId: gymId, minutes: 51, entries: [
            entry(ex.latPulldown, 1, sets: [
                mkSet(1, 60, 12),
                mkSet(2, 65, 10),
                mkSet(3, 65, 10),
                mkSet(4, 60, 12),
            ]),
            entry(ex.seatedRow, 2, sets: straightSets(3, weight: 57.5, reps: 10)),
            entry(ex.seatedRow, 3, notes: "Close grip", sets: straightSets(3, weight: 45, reps: 12)),
        ])
    }

    private static func pushDay(daysAgo offset: Int, gymId: String, ex: ExerciseRefs) -> LocalWorkout {
        let top = ramp(52.5, 60, daysAgo: offset)
        let secondary = ramp(47.5, 55, daysAgo: offset)
        let dumbbell = ramp(22, 26, daysAgo: offset, step: 2)
        let fly = ramp(18, 22, daysAgo: offset, step: 2)
        let press = ramp(32.5, 40, daysAgo: offset)
        let bench = ramp(70, 80, daysAgo: offset)
        return workout("Push day", daysAgo: offset, gymId: gymId, minutes: 54 + (offset % 3) * 2, entries: [
            entry(ex.chestPress, 1, sets: [
                mkSet(1, type: .warmup, top - 20, 12),
                mkSet(2, top - 2.5, 10),
                mkSet(3, top, 10),
                mkSet(4, top, 8),
                mkSet(5, top - 2.5, 8),
            ]),
            entry(ex.chestPressTechnogym, 2, sets: straightSets(3, weight: secondary, reps: 10)),
            entry(ex.inclineDumbbellPress, 3, sets: [
                mkSet(1, dumbbell, 10),
                mkSet(2, dumbbell, 10),
                mkSet(3, dumbbell - 2, 12),
            ]),
            entry(ex.cableFly, 4, sets: straightSets(3, weight: fly, reps: 12)),
            entry(ex.shoulderPress, 5, sets: straightSets(3, weight: press, reps: 10)),
            entry(ex.benchPress, 6, sets: straightSets(3, weight: bench, reps: 8)),
        ])
    }

    private static func pullDay(daysAgo offset: Int, gymId: String, ex: ExerciseRefs) -> LocalWorkout {
        let top = ramp(55, 65, daysAgo: offset)
        let row = ramp(50, 57.5, daysAgo: offset)
        let closeGrip = ramp(40, 45, daysAgo: offset)
        return workout("Pull day", daysAgo: offset, gymId: gymId, minutes: 50 + (offset % 3) * 2, entries: [
            entry(ex.latPulldown, 1, sets: [
                mkSet(1, top - 5, 12),
                mkSet(2, top, 10),
                mkSet(3, top, 10),
                mkSet(4, top - 5, 12),
            ]),
            entry(ex.seatedRow, 2, sets: straightSets(3, weight: row, reps: 10)),
            entry(ex.seatedRow, 3, notes: "Close grip", sets: straightSets(3, weight: closeGrip, reps: 12)),
        ])
    }

    private static func legDay(daysAgo offset: Int, gymId: String, ex: ExerciseRefs) -> LocalWorkout {
        let squat = ramp(90, 110, daysAgo: offset)
        let legPress = ramp(140, 170, daysAgo: offset)
        let curl = ramp(40, 47.5, daysAgo: offset)
        return workout("Leg day", daysAgo: offset, gymId: gymId, minutes: 58 + (offset % 4) * 2, entries: [
            entry(ex.squat, 1, sets: [
                mkSet(1, type: .warmup, squat - 40, 10),
                mkSet(2, squat - 10, 8),
                mkSet(3, squat, 6),
                mkSet(4, squat, 5),
            ]),
            entry(ex.legPress, 2, sets: [
                mkSet(1, legPress - 20, 12),
                mkSet(2, legPress, 10),
                mkSet(3, legPress, 10),
            ]),
            entry(ex.legCurl, 3, sets: straightSets(3, weight: curl, reps: 12)),
        ])
    }

    private static func travelPushDay(daysAgo offset: Int, gymId: String, ex: ExerciseRefs) -> LocalWorkout {
        let dumbbell = ramp(22, 26, daysAgo: offset, step: 2)
        let fly = ramp(18, 22, daysAgo: offset, step: 2)
        let press = ramp(32.5, 40, daysAgo: offset)
        return workout(
            "Push day", daysAgo: offset, gymId: gymId, minutes: 50,
            notes: "Hotel gym — light push while traveling",
            entries: [
                entry(ex.inclineDumbbellPress, 1, sets: [
                    mkSet(1, type: .warmup, dumbbell - 8, 12),
                    mkSet(2, dumbbell, 10),
                    mkSet(3, dumbbell, 10),
                    mkSet(4, dumbbell - 2, 12),
                ]),
                entry(ex.cableFly, 2, sets: straightSets(3, weight: fly, reps: 12)),
                entry(ex.shoulderPress, 3, sets: straightSets(3, weight: press, reps: 10)),
            ]
        )
    }

    private static func workout(
        _ name: String,
        daysAgo offset: Int,
        gymId: String,
        minutes: Int,
        notes: String? = nil,
        entries: [LocalWorkoutExercise]
    ) -> LocalWorkout {
        let start = sessionStart(daysAgo: offset)
        let end = start.addingTimeInterval(TimeInterval(minutes) * 60)
        return LocalWorkout(
            gymId: gymId,
            name: name,
            startedAt: start,
            endedAt: end,
            notes: notes,
            updatedAt: end,
            exercises: entries
        )
    }

    private static func entry(
        _ exerciseId: String,
        _ position: Int,
        notes: String? = nil,
        sets: [LocalSet]
    ) -> LocalWorkoutExercise {
        LocalWorkoutExercise(exerciseId: exerciseId, position: position, notes: notes, sets: sets)
    }

    private static func mkSet(
        _ number: Int,
        type: SetType = .normal,
        _ weightKg: Double,
        _ reps: Int
    ) -> LocalSet {
        LocalSet(setNumber: number, setType: type, weightKg: weightKg, reps: reps, isCompleted: true)
    }

    private static func straightSets(_ count: Int, weight: Double, reps: Int) -> [LocalSet] {
        (1...count).map { number in
            LocalSet(
                setNumber: number,
                setType: .normal,
                weightKg: weight,
                reps: reps,
                isCompleted: true
            )
        }
    }

    private static func ramp(_ start: Double, _ end: Double, daysAgo offset: Int, step: Double = 2.5) -> Double {
        let progress = Double(70 - min(offset, 70)) / 70
        let raw = start + (end - start) * progress
        return (raw / step).rounded() * step
    }

    private static func sessionStart(daysAgo offset: Int) -> Date {
        let calendar = Calendar.current
        let day = calendar.date(byAdding: .day, value: -offset, to: .now) ?? .now
        return calendar.date(bySettingHour: 18, minute: (offset % 4) * 15, second: 0, of: day) ?? day
    }

    private static let catalogBirth: Date = Calendar.current.date(byAdding: .day, value: -84, to: .now) ?? .now

    private static func newId() -> String {
        UUID().uuidString.lowercased()
    }

    private static func mkGym(_ name: String) -> Gym {
        Gym(id: newId(), name: name, address: nil, notes: nil, createdAt: catalogBirth, updatedAt: catalogBirth)
    }

    private static func mkBrand(_ name: String) -> Brand {
        Brand(id: newId(), name: name, createdAt: catalogBirth, updatedAt: catalogBirth)
    }

    private static func mkGroup(_ name: String) -> ExerciseGroup {
        ExerciseGroup(id: newId(), name: name, createdAt: catalogBirth, updatedAt: catalogBirth)
    }

    private static func mkEquipment(_ name: String, _ type: EquipmentType, brandId: String?) -> Equipment {
        Equipment(id: newId(), name: name, type: type, brandId: brandId, createdAt: catalogBirth, updatedAt: catalogBirth)
    }

    private static func mkExercise(
        _ name: String,
        _ primary: MuscleGroup,
        secondary: [MuscleGroup] = [],
        equipmentId: String,
        groupId: String,
        favorite: Bool = false
    ) -> Exercise {
        Exercise(
            id: newId(),
            name: name,
            primaryMuscle: primary,
            secondaryMuscles: secondary,
            equipmentId: equipmentId,
            groupId: groupId,
            isFavorite: favorite,
            isArchived: false,
            createdAt: catalogBirth,
            updatedAt: catalogBirth
        )
    }
}

#endif
