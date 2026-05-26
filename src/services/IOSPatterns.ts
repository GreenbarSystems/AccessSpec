/**
 * IOSPatterns
 *
 * Static mapping from `PatternKind` → the native iOS components a developer
 * should reach for to ship a platform-native, accessible implementation.
 *
 * For each pattern we expose:
 *   - `uikit`        — the UIKit class(es) you'd use today
 *   - `swiftui`      — the SwiftUI primitive(s) for new code
 *   - `rationale`    — why going native beats rolling your own
 *   - `accessibility` — what VoiceOver / Dynamic Type / Switch Control get
 *     for free when you use the native API
 *   - `hig`          — the Apple HIG section to cite in reviews
 *   - `swiftSample`  — a minimal SwiftUI snippet you can paste into a view
 *
 * This file is the single source of truth for the "iOS recommendation"
 * surfaces (the Patterns panel today, the Simulator's parity tab next).
 */

import type { PatternKind } from './PatternRecognizer';

export type IOSMapping = {
  kind: PatternKind;
  uikit: string;
  swiftui: string;
  rationale: string;
  /** Bullet list of a11y benefits the native API provides automatically. */
  accessibility: string[];
  hig: string;
  swiftSample: string;
};

export const IOS_PATTERNS: Record<PatternKind, IOSMapping> = {
  'date-picker': {
    kind: 'date-picker',
    uikit: 'UIDatePicker',
    swiftui: 'DatePicker',
    rationale:
      'Honors the user’s locale + calendar, supports inline / compact / wheels styles, and adapts to Dynamic Type.',
    accessibility: [
      'VoiceOver speaks each component (month / day / year) with a rotor for adjustment',
      'Switch Control increments via the standard date rotor',
      'Respects the system 24-hour clock and right-to-left layouts',
    ],
    hig: 'Apple HIG · Date pickers',
    swiftSample: `DatePicker(
  "When",
  selection: $date,
  displayedComponents: [.date]
)
.datePickerStyle(.compact)`,
  },
  'file-upload': {
    kind: 'file-upload',
    uikit: 'UIDocumentPickerViewController',
    swiftui: '.fileImporter / DocumentPicker',
    rationale:
      'Shows the Files browser with iCloud + every installed provider; supports drag-and-drop on iPad and Stage Manager.',
    accessibility: [
      'Picker UI is provided by the system — already VoiceOver-conformant',
      'File-type filters are read aloud',
      'Respects the user’s default storage location',
    ],
    hig: 'Apple HIG · Document picker',
    swiftSample: `.fileImporter(
  isPresented: $showPicker,
  allowedContentTypes: [.image]
) { result in
  // handle Result<URL, Error>
}`,
  },
  navigation: {
    kind: 'navigation',
    uikit: 'UINavigationController / UINavigationBar',
    swiftui: 'NavigationStack / NavigationLink',
    rationale:
      'Provides the iOS swipe-back gesture, large titles, search bar slot, and toolbar — none of which custom navs replicate well.',
    accessibility: [
      'Back button label is announced ("Back to Inbox")',
      'Navigation bar exposes the heading as the screen title',
      'Search bar integrates with .searchable and the Search rotor',
    ],
    hig: 'Apple HIG · Navigation bars',
    swiftSample: `NavigationStack {
  List(threads) { thread in
    NavigationLink(thread.title, value: thread.id)
  }
  .navigationTitle("Inbox")
}`,
  },
  modal: {
    kind: 'modal',
    uikit: 'UIViewController.present(_:animated:) · UIAlertController(.actionSheet)',
    swiftui: '.sheet / .fullScreenCover / .alert · ConfirmationDialog',
    rationale:
      'Native sheets handle the focus trap, swipe-to-dismiss, presentation detents, and announce themselves as modal. UIAlertController action sheets adapt to iPad popovers automatically.',
    accessibility: [
      'VoiceOver focus is moved into the modal and restored on dismiss',
      'Backdrop is announced as "Dimmed"; double-tap outside dismisses',
      '.actionSheet anchors to the source view on iPad, no manual popover work',
    ],
    hig: 'Apple HIG · Modality · Action sheets',
    swiftSample: `.sheet(isPresented: $editing) {
  EditView(item: item)
    .presentationDetents([.medium, .large])
}`,
  },
  toggle: {
    kind: 'toggle',
    uikit: 'UISwitch',
    swiftui: 'Toggle',
    rationale:
      'Renders the platform-correct iOS switch UI with haptics, animation, and the switch accessibility trait.',
    accessibility: [
      'VoiceOver announces the value as "On" or "Off" with the Switch trait',
      'Double-tap toggles without scrubbing',
      'Honors the user’s Reduced Motion + High Contrast settings',
    ],
    hig: 'Apple HIG · Toggles',
    swiftSample: `Toggle("Notifications", isOn: $notificationsEnabled)
  .toggleStyle(.switch)`,
  },
  search: {
    kind: 'search',
    uikit: 'UISearchController · UISearchBar',
    swiftui: '.searchable(text:)',
    rationale:
      'Slot integrates with the navigation bar, supports scope buttons, and the keyboard shows the "Search" return key by default.',
    accessibility: [
      'Search field is exposed with the Search Field trait',
      'Tokenized scope buttons are announced as a segmented control',
      'Respects Smart Punctuation, dictation, and predictive text',
    ],
    hig: 'Apple HIG · Search bars',
    swiftSample: `List(filtered) { item in
  ItemRow(item: item)
}
.searchable(text: $query, prompt: "Search products")`,
  },
  tabs: {
    kind: 'tabs',
    uikit: 'UITabBarController · UITabBar · UITabBarItem',
    swiftui: 'TabView',
    rationale:
      'Standard bottom tab bar on iPhone, sidebar on iPad with .tabViewStyle(.sidebarAdaptable); badges, large icons, and reorderable items come for free.',
    accessibility: [
      'Each tab is exposed with the Tab Bar Item trait',
      'Badge values are read aloud ("Inbox, 3 new items")',
      'Long-press on a tab opens the reorder UI without custom code',
    ],
    hig: 'Apple HIG · Tab bars',
    swiftSample: `TabView(selection: $tab) {
  Inbox().tabItem { Label("Inbox", systemImage: "tray") }
    .badge(unreadCount)
  Sent().tabItem  { Label("Sent",  systemImage: "paperplane") }
}`,
  },
};

export function iosMappingFor(kind: PatternKind): IOSMapping {
  return IOS_PATTERNS[kind];
}

/** Convenience: list of every mapping in a stable order. */
export const IOS_MAPPING_ENTRIES: readonly IOSMapping[] = Object.values(IOS_PATTERNS);
