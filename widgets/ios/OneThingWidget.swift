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
    static let otSuccess = Color(red: 125/255, green: 176/255, blue: 122/255)
    static let otNeutral = Color(red: 217/255, green: 212/255, blue: 206/255)
}

// MARK: - Small Widget View

struct SmallWidgetView: View {
    let data: WidgetData?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "scope")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.otAccent)
                Text("One Thing")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.otAccent)
                Spacer()
            }

            if let data = data, data.hasTask {
                if data.allCompleted {
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.otSuccess)
                    Text(data.encouragingMessage)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.otTextPrimary)
                        .lineLimit(2)
                    Spacer()
                } else {
                    Spacer()
                    Text(data.taskText)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.otTextPrimary)
                        .lineLimit(3)
                    Spacer()
                    if data.totalTasks > 1 {
                        Text("\(data.completedTasks)/\(data.totalTasks) done")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.otTextSecondary)
                    }
                }
            } else {
                Spacer()
                Text("What's your one thing today?")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.otTextPrimary)
                    .lineLimit(2)
                Spacer()
                Text("Tap to start")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.otAccent)
            }

            if let data = data, data.streak > 0 {
                HStack(spacing: 3) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.otAccent)
                    Text("\(data.streak)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.otAccent)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Medium Widget View

struct MediumWidgetView: View {
    let data: WidgetData?

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: "scope")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.otAccent)
                    Text("One Thing")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.otAccent)
                }

                if let data = data, data.hasTask {
                    if data.allCompleted {
                        Spacer()
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.otSuccess)
                            Text("All done!")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.otTextPrimary)
                        }
                        Text(data.encouragingMessage)
                            .font(.system(size: 13, weight: .regular))
                            .foregroundColor(.otTextSecondary)
                            .lineLimit(2)
                        Spacer()
                    } else {
                        Spacer()
                        Text(data.taskText)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.otTextPrimary)
                            .lineLimit(2)
                        Text(data.encouragingMessage)
                            .font(.system(size: 13, weight: .regular))
                            .foregroundColor(.otTextSecondary)
                            .lineLimit(1)
                        Spacer()
                    }
                } else {
                    Spacer()
                    Text("What's your one thing today?")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.otTextPrimary)
                    Text("Tap to pick your focus")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.otAccent)
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 8) {
                if let data = data, data.hasTask && !data.allCompleted && data.totalTasks > 1 {
                    ZStack {
                        Circle()
                            .stroke(Color.otNeutral, lineWidth: 4)
                            .frame(width: 44, height: 44)
                        Circle()
                            .trim(from: 0, to: CGFloat(data.completedTasks) / CGFloat(data.totalTasks))
                            .stroke(Color.otAccent, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                            .frame(width: 44, height: 44)
                        Text("\(data.completedTasks)/\(data.totalTasks)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.otTextPrimary)
                    }
                }

                if let data = data, data.streak > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.otAccent)
                        Text("\(data.streak)")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.otAccent)
                    }
                }
            }
            .frame(width: 60)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
