import Foundation

enum API {
    static var client: APIClient { .shared }

    struct Message: Decodable {
        var message: String
    }

    static func login(email: String, password: String) async throws -> TokenPair {
        try await client.post("identity/login", body: ["email": email, "password": password])
    }

    static func logout(refreshToken: String) async throws {
        let _: Message = try await client.post("identity/logout", body: ["refreshToken": refreshToken])
    }

    static func me() async throws -> UserProfile {
        try await client.get("identity/me")
    }

    struct UpdateMeRequest: Encodable {
        var displayName: String?
        var weightUnit: WeightUnit?
        var defaultGymId: String??

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encodeIfPresent(displayName, forKey: .displayName)
            try container.encodeIfPresent(weightUnit, forKey: .weightUnit)
            if let defaultGymId {
                try container.encode(defaultGymId, forKey: .defaultGymId)
            }
        }

        enum CodingKeys: String, CodingKey {
            case displayName, weightUnit, defaultGymId
        }
    }

    static func updateMe(_ update: UpdateMeRequest) async throws -> UserProfile {
        try await client.patch("me", body: update)
    }

    static func changePassword(current: String, new: String) async throws {
        let _: Message = try await client.patch(
            "me/password",
            body: ["currentPassword": current, "newPassword": new]
        )
    }

    static func users(search: String? = nil, cursor: String? = nil) async throws -> Page<UserProfile> {
        try await client.page("users", query: ["search": search, "cursor": cursor, "limit": "100"])
    }

    struct CreateUserRequest: Encodable {
        var email: String
        var password: String
        var displayName: String
        var isAdministrator: Bool?
        var weightUnit: WeightUnit?
    }

    static func createUser(_ request: CreateUserRequest) async throws -> UserProfile {
        try await client.post("users", body: request)
    }

    struct UpdateUserRequest: Encodable {
        var displayName: String?
        var isAdministrator: Bool?
        var isActive: Bool?
        var weightUnit: WeightUnit?
    }

    static func updateUser(id: String, _ request: UpdateUserRequest) async throws -> UserProfile {
        try await client.patch("users/\(id)", body: request)
    }

    static func resetPassword(userId: String, newPassword: String) async throws {
        let _: Message = try await client.post(
            "users/\(userId)/reset-password",
            body: ["newPassword": newPassword]
        )
    }

    static func deactivateUser(id: String) async throws {
        let _: Message = try await client.delete("users/\(id)")
    }

    static func brands(search: String? = nil, cursor: String? = nil) async throws -> Page<Brand> {
        try await client.page("brands", query: ["search": search, "cursor": cursor, "limit": "100"])
    }

    static func createBrand(name: String) async throws -> Brand {
        try await client.post("brands", body: ["name": name])
    }

    static func updateBrand(id: String, name: String) async throws -> Brand {
        try await client.patch("brands/\(id)", body: ["name": name])
    }

    static func deleteBrand(id: String) async throws {
        let _: Message = try await client.delete("brands/\(id)")
    }

    static func equipment(
        brandId: String? = nil,
        type: EquipmentType? = nil,
        search: String? = nil,
        cursor: String? = nil
    ) async throws -> Page<Equipment> {
        try await client.page("equipment", query: [
            "brandId": brandId,
            "type": type?.rawValue,
            "search": search,
            "cursor": cursor,
            "limit": "100",
        ])
    }

    struct EquipmentRequest: Encodable {
        var name: String
        var type: EquipmentType
        var brandId: String?
    }

    static func createEquipment(_ request: EquipmentRequest) async throws -> Equipment {
        try await client.post("equipment", body: request)
    }

    static func deleteEquipment(id: String) async throws {
        let _: Message = try await client.delete("equipment/\(id)")
    }

    static func exerciseGroups(search: String? = nil, cursor: String? = nil) async throws -> Page<ExerciseGroup> {
        try await client.page("exercise-groups", query: ["search": search, "cursor": cursor, "limit": "100"])
    }

    static func createExerciseGroup(name: String) async throws -> ExerciseGroup {
        try await client.post("exercise-groups", body: ["name": name])
    }

    static func exercises(
        groupId: String? = nil,
        equipmentId: String? = nil,
        brandId: String? = nil,
        muscle: MuscleGroup? = nil,
        search: String? = nil,
        cursor: String? = nil
    ) async throws -> Page<Exercise> {
        try await client.page("exercises", query: [
            "groupId": groupId,
            "equipmentId": equipmentId,
            "brandId": brandId,
            "muscle": muscle?.rawValue,
            "q": search,
            "cursor": cursor,
            "limit": "100",
        ])
    }

    struct CreateExerciseRequest: Encodable {
        var name: String
        var primaryMuscle: MuscleGroup
        var secondaryMuscles: [MuscleGroup]?
        var equipmentId: String?
        var groupId: String?
    }

    static func createExercise(_ request: CreateExerciseRequest) async throws -> Exercise {
        try await client.post("exercises", body: request)
    }

    struct UpdateExerciseRequest: Encodable {
        var name: String?
        var primaryMuscle: MuscleGroup?
        var secondaryMuscles: [MuscleGroup]?
        var isFavorite: Bool?
        var isArchived: Bool?
    }

    static func updateExercise(id: String, _ request: UpdateExerciseRequest) async throws -> Exercise {
        try await client.patch("exercises/\(id)", body: request)
    }

    static func deleteExercise(id: String) async throws {
        let _: Message = try await client.delete("exercises/\(id)")
    }

    static func exerciseHistory(id: String, gymId: String? = nil) async throws -> ExerciseHistory {
        try await client.get("exercises/\(id)/history", query: ["gymId": gymId])
    }

    static func exerciseStats(id: String, gymId: String? = nil) async throws -> ExerciseStats {
        try await client.get("exercises/\(id)/stats", query: ["gymId": gymId])
    }

    static func exerciseLast(id: String, gymId: String? = nil) async throws -> ExerciseLast {
        try await client.get("exercises/\(id)/last", query: ["gymId": gymId])
    }

    static func gyms(cursor: String? = nil) async throws -> Page<Gym> {
        try await client.page("gyms", query: ["cursor": cursor, "limit": "100"])
    }

    struct GymRequest: Encodable {
        var name: String
        var address: String?
        var notes: String?
    }

    static func createGym(_ request: GymRequest) async throws -> Gym {
        try await client.post("gyms", body: request)
    }

    static func deleteGym(id: String) async throws {
        let _: Message = try await client.delete("gyms/\(id)")
    }

    static func workouts(
        from: Date? = nil,
        to: Date? = nil,
        gymId: String? = nil,
        cursor: String? = nil
    ) async throws -> Page<WorkoutSummary> {
        try await client.page("workouts", query: [
            "from": from.map { ISO8601DateFormatter().string(from: $0) },
            "to": to.map { ISO8601DateFormatter().string(from: $0) },
            "gymId": gymId,
            "cursor": cursor,
            "limit": "100",
        ])
    }

    static func workout(id: String) async throws -> WorkoutDetail {
        try await client.get("workouts/\(id)")
    }

    static func deleteWorkout(id: String) async throws {
        let _: Message = try await client.delete("workouts/\(id)")
    }

    static func exerciseSettings(
        exerciseId: String? = nil,
        gymId: String? = nil
    ) async throws -> Page<ExerciseSetting> {
        try await client.page("exercise-settings", query: [
            "exerciseId": exerciseId,
            "gymId": gymId,
            "limit": "100",
        ])
    }

    struct UpsertSettingRequest: Encodable {
        var exerciseId: String
        var gymId: String
        var settings: [String: JSONValue]
    }

    static func upsertExerciseSetting(_ request: UpsertSettingRequest) async throws -> ExerciseSetting {
        try await client.put("exercise-settings", body: request)
    }

    static func deleteExerciseSetting(id: String) async throws {
        let _: Message = try await client.delete("exercise-settings/\(id)")
    }

    static func statsOverview(from: Date? = nil, to: Date? = nil) async throws -> StatsOverview {
        try await client.get("stats/overview", query: [
            "from": from.map { ISO8601DateFormatter().string(from: $0) },
            "to": to.map { ISO8601DateFormatter().string(from: $0) },
        ])
    }

    static func statsVolume(period: String = "week", from: Date? = nil) async throws -> VolumeStats {
        try await client.get("stats/volume", query: [
            "period": period,
            "from": from.map { ISO8601DateFormatter().string(from: $0) },
        ])
    }

    static func statsMuscleDistribution(from: Date? = nil) async throws -> MuscleDistribution {
        try await client.get("stats/muscle-distribution", query: [
            "from": from.map { ISO8601DateFormatter().string(from: $0) },
        ])
    }

    static func statsPersonalRecords() async throws -> PersonalRecords {
        try await client.get("stats/personal-records")
    }

    static func statsCalendar(from: Date? = nil, to: Date? = nil) async throws -> WorkoutCalendar {
        try await client.get("stats/calendar", query: [
            "from": from.map { ISO8601DateFormatter().string(from: $0) },
            "to": to.map { ISO8601DateFormatter().string(from: $0) },
        ])
    }

    static func conversations(cursor: String? = nil) async throws -> Page<Conversation> {
        try await client.page("assistant/conversations", query: ["cursor": cursor, "limit": "50"])
    }

    static func createConversation(title: String? = nil) async throws -> Conversation {
        struct Request: Encodable {
            var title: String?
        }
        return try await client.post("assistant/conversations", body: Request(title: title))
    }

    static func conversation(id: String) async throws -> ConversationDetail {
        try await client.get("assistant/conversations/\(id)")
    }

    static func sendMessage(conversationId: String, content: String) async throws -> ChatMessage {
        struct Reply: Decodable {
            var message: ChatMessage
        }
        let reply: Reply = try await client.post(
            "assistant/conversations/\(conversationId)/messages",
            body: ["content": content]
        )
        return reply.message
    }

    static func deleteConversation(id: String) async throws {
        let _: Message = try await client.delete("assistant/conversations/\(id)")
    }

    static func insights() async throws -> [String] {
        struct Insights: Decodable {
            var insights: [String]
        }
        let result: Insights = try await client.get("assistant/insights")
        return result.insights
    }

    static func syncPull(since: Date?) async throws -> SyncPull {
        try await client.get("sync", query: [
            "since": since.map { formatterWithMillis.string(from: $0) },
        ])
    }

    static func syncPush(_ push: SyncPush) async throws -> SyncPushResult {
        try await client.post("sync", body: push)
    }

    private static let formatterWithMillis: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
