import WidgetKit
import SwiftUI

// MARK: - Data Model

struct WidgetData: Decodable {
    let taskText: String
    let isCompleted: Bool
    let allCompleted: Bool
    let totalTasks: Int
    let completedTasks: Int
    let streak: Int
    let level: Int
    let encouragingMessage: String
    let hasTask: Bool
}

// MARK: - Timeline Provider

struct OneThingProvider: TimelineProvider {
    func placeholder(in context: Context) -> OneThingEntry {
        OneThingEntry(date: Date(), data: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (OneThingEntry) -> Void) {
        let entry = OneThingEntry(date: Date(), data: loadWidgetData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<OneThingEntry>) -> Void) {
        let entry = OneThingEntry(date: Date(), data: loadWidgetData())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadWidgetData() -> WidgetData? {
        guard let defaults = UserDefaults(suiteName: "group.com.kanishkaanand.onethingfocus"),
              let jsonString = defaults.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetData.self, from: jsonData)
    }
}

// MARK: - Timeline Entry

struct OneThingEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
}

// MARK: - Colors

extension Color {
    static let otBackground = Color(red: 250/255, green: 247/255, blue: 242/255)
    static let otSurface = Color.white
    static let otTextPrimary = Color(red: 45/255, green: 42/255, blue: 38/255)
    static let otTextSecondary = Color(red: 138/255, green: 133/255, blue: 128/255)
    static let otAccent = Color(red: 232/255, green: 145/255, blue: 58/255)
    static let otAccentLight = Color(red: 232/255, green: 145/255, blue: 58/255).opacity(0.12)
    static let otSuccess = Color(red: 125/255, green: 176/255, blue: 122/255)
    static let otNeutral = Color(red: 217/255, green: 212/255, blue: 206/255)
}

// MARK: - Shared Components

struct LeftAccentBar: View {
    let color: Color

    var body: some View {
        RoundedRectangle(cornerRadius: 1.5)
            .fill(color)
            .frame(width: 3)
    }
}

struct StreakBadge: View {
    let streak: Int
    var fontSize: CGFloat = 11

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: "flame.fill")
                .font(.system(size: fontSize, weight: .semibold))
                .foregroundColor(.otAccent)
            Text("\(streak)")
                .font(.system(size: fontSize, weight: .bold, design: .rounded))
                .foregroundColor(.otAccent)
        }
    }
}

struct DecorativeCircle: View {
    var size: CGFloat = 60

    var body: some View {
        Circle()
            .fill(Color.otAccent.opacity(0.08))
            .frame(width: size, height: size)
    }
}

struct LevelPill: View {
    let level: Int

    var body: some View {
        Text("Lv. \(level)")
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundColor(.otAccent)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.otAccentLight)
            )
    }
}

// MARK: - Small Widget View

struct SmallWidgetView: View {
    let data: WidgetData?

    var body: some View {
        if let data = data, data.hasTask {
            if data.allCompleted {
                smallCompletedView(data: data)
            } else {
                smallActiveView(data: data)
            }
        } else {
            smallEmptyView(streak: data?.streak ?? 0)
        }
    }

    // State 1: No Task — warm invitation
    private func smallEmptyView(streak: Int) -> some View {
        ZStack {
            // Decorative circle top-right
            VStack {
                HStack {
                    Spacer()
                    DecorativeCircle(size: 60)
                        .offset(x: 10, y: -10)
                }
                Spacer()
            }

            VStack(spacing: 6) {
                Spacer()

                Image(systemName: "scope")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundColor(.otAccent)

                Text("What's your\none thing?")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundColor(.otTextPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                Spacer()

                Text("Tap to start")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.otAccent)
            }
            .padding(14)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // State 2: Active Task — left accent bar, hero text
    private func smallActiveView(data: WidgetData) -> some View {
        HStack(spacing: 0) {
            LeftAccentBar(color: .otAccent)
                .padding(.vertical, 14)
                .padding(.leading, 6)

            VStack(alignment: .leading, spacing: 4) {
                Text(data.taskText)
                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                    .foregroundColor(.otTextPrimary)
                    .lineLimit(3)

                Text(data.encouragingMessage)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundColor(.otTextSecondary)
                    .lineLimit(1)

                Spacer()

                HStack(spacing: 8) {
                    if data.streak > 0 {
                        StreakBadge(streak: data.streak)
                    }
                    if data.totalTasks > 1 {
                        Text("\(data.completedTasks)/\(data.totalTasks)")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundColor(.otTextSecondary)
                    }
                }
            }
            .padding(.leading, 10)
            .padding(.trailing, 14)
            .padding(.vertical, 14)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // State 3: All Completed — green accent bar, celebration
    private func smallCompletedView(data: WidgetData) -> some View {
        HStack(spacing: 0) {
            LeftAccentBar(color: .otSuccess)
                .padding(.vertical, 14)
                .padding(.leading, 6)

            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundColor(.otSuccess)

                Text("All done!")
                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                    .foregroundColor(.otTextPrimary)

                Text(data.encouragingMessage)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundColor(.otTextSecondary)
                    .lineLimit(2)

                Spacer()

                if data.streak > 0 {
                    StreakBadge(streak: data.streak)
                }
            }
            .padding(.leading, 10)
            .padding(.trailing, 14)
            .padding(.vertical, 14)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

// MARK: - Medium Widget View

struct MediumWidgetView: View {
    let data: WidgetData?

    var body: some View {
        if let data = data, data.hasTask {
            if data.allCompleted {
                mediumCompletedView(data: data)
            } else {
                mediumActiveView(data: data)
            }
        } else {
            mediumEmptyView()
        }
    }

    // State 1: No Task — warm invitation with decorative element
    private func mediumEmptyView() -> some View {
        ZStack {
            HStack {
                Spacer()
                DecorativeCircle(size: 80)
                    .offset(x: 10, y: -10)
            }

            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Image(systemName: "scope")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundColor(.otAccent)
                        .padding(.bottom, 2)

                    Text("What's your\none thing today?")
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .foregroundColor(.otTextPrimary)
                        .lineLimit(2)

                    Text("Tap to pick your focus")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.otAccent)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Spacer()
            }
            .padding(16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // State 2: Active Task — accent bar, task text, progress ring
    private func mediumActiveView(data: WidgetData) -> some View {
        HStack(spacing: 0) {
            LeftAccentBar(color: .otAccent)
                .padding(.vertical, 16)
                .padding(.leading, 6)

            HStack(spacing: 12) {
                // Left: task content
                VStack(alignment: .leading, spacing: 4) {
                    Text(data.taskText)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .foregroundColor(.otTextPrimary)
                        .lineLimit(2)

                    Text(data.encouragingMessage)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.otTextSecondary)
                        .lineLimit(1)

                    Spacer()

                    if data.streak > 0 {
                        StreakBadge(streak: data.streak, fontSize: 12)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Right: progress ring or streak
                VStack(spacing: 8) {
                    if data.totalTasks > 1 {
                        ZStack {
                            Circle()
                                .stroke(Color.otNeutral, lineWidth: 4)
                                .frame(width: 48, height: 48)
                            Circle()
                                .trim(from: 0, to: CGFloat(data.completedTasks) / CGFloat(max(data.totalTasks, 1)))
                                .stroke(Color.otAccent, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                .rotationEffect(.degrees(-90))
                                .frame(width: 48, height: 48)
                            Text("\(data.completedTasks)/\(data.totalTasks)")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundColor(.otTextPrimary)
                        }
                    }
                }
                .frame(width: 60)
            }
            .padding(.leading, 12)
            .padding(.trailing, 16)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // State 3: All Completed — green accent bar, checkmark, level pill
    private func mediumCompletedView(data: WidgetData) -> some View {
        HStack(spacing: 0) {
            LeftAccentBar(color: .otSuccess)
                .padding(.vertical, 16)
                .padding(.leading, 6)

            HStack(spacing: 12) {
                // Left: completion info
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 22, weight: .medium))
                            .foregroundColor(.otSuccess)
                        Text("All done!")
                            .font(.system(size: 17, weight: .semibold, design: .rounded))
                            .foregroundColor(.otTextPrimary)
                    }

                    Text(data.encouragingMessage)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.otTextSecondary)
                        .lineLimit(2)

                    Spacer()

                    if data.streak > 0 {
                        StreakBadge(streak: data.streak, fontSize: 12)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Right: level pill
                VStack {
                    LevelPill(level: data.level)
                }
                .frame(width: 60)
            }
            .padding(.leading, 12)
            .padding(.trailing, 16)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

// MARK: - Widget Configuration

struct OneThingWidget: Widget {
    let kind: String = "OneThingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: OneThingProvider()) { entry in
            if #available(iOS 17.0, *) {
                ZStack {
                    ContainerRelativeShape()
                        .fill(Color.otBackground)
                    OneThingWidgetEntryView(entry: entry)
                }
                .containerBackground(.clear, for: .widget)
            } else {
                OneThingWidgetEntryView(entry: entry)
                    .background(Color.otBackground)
            }
        }
        .configurationDisplayName("One Thing")
        .description("See your daily focus at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct OneThingWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: OneThingEntry

    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(data: entry.data)
        default:
            SmallWidgetView(data: entry.data)
        }
    }
}

// MARK: - Widget Bundle

@main
struct OneThingWidgets: WidgetBundle {
    var body: some Widget {
        OneThingWidget()
    }
}
