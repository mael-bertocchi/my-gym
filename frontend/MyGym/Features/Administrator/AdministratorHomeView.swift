import SwiftUI

struct AdministratorHomeView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("Administrator")
                    .font(Theme.font(24, .heavy))
                    .tracking(-0.3)
                    .foregroundStyle(Theme.ink)
                    .padding(.bottom, 18)

                VStack(spacing: 0) {
                    AdministratorHubRow(title: "Users") {
                        AdministratorUsersView()
                    }
                    RowDivider()
                    AdministratorHubRow(title: "Catalog") {
                        AdministratorCatalogView()
                    }
                }
                .card(radius: 16)
            }
            .padding(.horizontal, 22)
            .padding(.top, 8)
            .padding(.bottom, 40)
        }
        .background(Color.white.ignoresSafeArea())
        .administratorNavigationChrome("Administrator")
    }
}
