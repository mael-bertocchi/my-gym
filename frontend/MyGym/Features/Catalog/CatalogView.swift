import SwiftUI

struct CatalogView: View {
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
                    CatalogCountTile(value: store.brands.count, caption: "Brands")
                    CatalogCountTile(value: store.exercises.count, caption: "Exercises")
                    CatalogCountTile(value: store.exerciseGroups.count, caption: "Groups")
                    CatalogCountTile(value: store.gyms.count, caption: "Gyms")
                }
                .padding(.bottom, 20)

                SectionLabel("MANAGE")
                    .padding(.leading, 4)
                    .padding(.bottom, 10)

                VStack(spacing: 0) {
                    ManageHubRow(title: "Brands") {
                        CatalogBrandsView()
                    }
                    RowDivider()
                    ManageHubRow(title: "Exercises & groups") {
                        CatalogExercisesView()
                    }
                    RowDivider()
                    ManageHubRow(title: "Gyms") {
                        CatalogGymsView()
                    }
                }
                .card(radius: 16)
            }
            .padding(.horizontal, 22)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .background(Theme.screenBackground.ignoresSafeArea())
        .manageNavigationChrome("Catalog")
    }
}

struct CatalogCountTile: View {
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
        .card(radius: 16)
    }
}
