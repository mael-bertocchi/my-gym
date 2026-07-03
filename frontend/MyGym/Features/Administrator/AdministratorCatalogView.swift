import SwiftUI

struct AdministratorCatalogView: View {
    @Environment(LocalStore.self) private var store

    private let tileColumns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("Catalog")
                    .font(Theme.font(24, .heavy))
                    .tracking(-0.3)
                    .foregroundStyle(Theme.ink)
                    .padding(.bottom, 18)

                LazyVGrid(columns: tileColumns, spacing: 12) {
                    AdministratorCountTile(value: store.brands.count, caption: "Brands")
                    AdministratorCountTile(value: store.exercises.count, caption: "Exercises")
                    AdministratorCountTile(value: store.exerciseGroups.count, caption: "Groups")
                    AdministratorCountTile(value: store.gyms.count, caption: "Gyms")
                }
                .padding(.bottom, 20)

                SectionLabel("MANAGE")
                    .padding(.leading, 4)
                    .padding(.bottom, 10)

                VStack(spacing: 0) {
                    AdministratorHubRow(title: "Brands") {
                        AdministratorBrandsView()
                    }
                    RowDivider()
                    AdministratorHubRow(title: "Exercises & groups") {
                        AdministratorExercisesView()
                    }
                    RowDivider()
                    AdministratorHubRow(title: "Gyms") {
                        AdministratorGymsView()
                    }
                }
                .card(radius: 16)
            }
            .padding(.horizontal, 22)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .background(Color.white.ignoresSafeArea())
        .administratorNavigationChrome("Catalog")
    }
}

struct AdministratorCountTile: View {
    let value: Int
    let caption: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(value)")
                .font(Theme.font(22, .heavy))
                .foregroundStyle(Theme.ink)
            Text(caption)
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            Theme.screenBackground,
            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
    }
}
