/**
 * AndroidPatterns
 *
 * Sibling of IOSPatterns — the static mapping table from `PatternKind` to
 * the native Android components a developer should reach for to ship a
 * Material 3 / TalkBack-friendly implementation.
 *
 * For each pattern we expose:
 *   - `views`         — the View-system (XML / Material Components) class(es)
 *   - `compose`       — the Jetpack Compose Material 3 primitive(s)
 *   - `rationale`     — why going native beats a custom implementation
 *   - `accessibility` — what TalkBack / Switch Access / Dynamic Color get
 *     for free with the native API
 *   - `material`      — the Material 3 spec section to cite in reviews
 *   - `kotlinSample`  — a minimal Compose snippet
 *
 * This and `IOSPatterns.ts` are the two sources of truth for the parity
 * recommendations shown in the Patterns panel.
 */

import type { PatternKind } from './PatternRecognizer';

export type AndroidMapping = {
  kind: PatternKind;
  views: string;
  compose: string;
  rationale: string;
  /** Bullet list of a11y benefits the native API provides automatically. */
  accessibility: string[];
  material: string;
  kotlinSample: string;
};

export const ANDROID_PATTERNS: Record<PatternKind, AndroidMapping> = {
  'date-picker': {
    kind: 'date-picker',
    views: 'MaterialDatePicker (com.google.android.material.datepicker)',
    compose: 'DatePicker / DatePickerDialog (Material 3)',
    rationale:
      'Honors the user’s calendar, locale, and 24-hour preference; ships a range mode and respects Dynamic Color.',
    accessibility: [
      'TalkBack reads the year-month-day spinner with the date-picker role',
      'Switch Access can advance components without custom focus orders',
      'Date format mirrors the system locale automatically',
    ],
    material: 'Material 3 · Date pickers',
    kotlinSample: `val state = rememberDatePickerState()
DatePicker(state = state)`,
  },
  'file-upload': {
    kind: 'file-upload',
    views: 'ActivityResultContracts.OpenDocument · GetContent',
    compose: 'rememberLauncherForActivityResult(OpenDocument())',
    rationale:
      'Uses the Storage Access Framework — works with Drive, Photos, and every installed provider; persists permissions across reboots.',
    accessibility: [
      'Picker UI is provided by the system — already TalkBack-conformant',
      'MIME-type filters are surfaced as accessible filter chips',
      'Returns a content:// URI that respects the user’s sharing intent',
    ],
    material: 'Material 3 · File pickers · Storage Access Framework',
    kotlinSample: `val pick = rememberLauncherForActivityResult(
  ActivityResultContracts.OpenDocument()
) { uri -> /* handle the content URI */ }

Button(onClick = { pick.launch(arrayOf("image/*")) }) {
  Text("Choose photo")
}`,
  },
  navigation: {
    kind: 'navigation',
    views: 'BottomNavigationView · NavigationRailView · MaterialToolbar',
    compose: 'NavigationBar / NavigationRail · NavHost (androidx.navigation.compose)',
    rationale:
      'Adapts the bottom bar to a rail on tablets / foldables automatically; integrates with predictive back gesture.',
    accessibility: [
      'Each destination is exposed with the Tab role and selected state',
      'Predictive back animation reads correctly with TalkBack',
      'Edge-to-edge insets are handled without manual padding',
    ],
    material: 'Material 3 · Navigation bar · Navigation rail',
    kotlinSample: `NavigationBar {
  destinations.forEachIndexed { index, item ->
    NavigationBarItem(
      selected = current == index,
      onClick = { current = index },
      icon = { Icon(item.icon, null) },
      label = { Text(item.label) },
    )
  }
}`,
  },
  modal: {
    kind: 'modal',
    views: 'BottomSheetDialogFragment · MaterialAlertDialogBuilder',
    compose: 'ModalBottomSheet · AlertDialog · ConfirmationDialog (M3)',
    rationale:
      'ModalBottomSheet handles the scrim, drag handle, and predictive-back; AlertDialog enforces the focus trap and respects per-app language.',
    accessibility: [
      'TalkBack focus moves into the sheet/dialog and returns on dismiss',
      'Drag handle is exposed as a button for Switch Access users',
      'Scrim taps + back gesture both close the sheet without custom code',
    ],
    material: 'Material 3 · Bottom sheets · Dialogs',
    kotlinSample: `if (showSheet) {
  ModalBottomSheet(
    onDismissRequest = { showSheet = false },
    sheetState = sheetState,
  ) {
    EditView(item)
  }
}`,
  },
  toggle: {
    kind: 'toggle',
    views: 'com.google.android.material.materialswitch.MaterialSwitch',
    compose: 'Switch (Material 3)',
    rationale:
      'Renders the Material 3 switch with selected-thumb icon, ripple, and Dynamic Color tinting.',
    accessibility: [
      'TalkBack announces "Switch · On" / "Switch · Off" with the switch role',
      'Switch Access toggles via the standard action',
      'Honors the system "Press and hold" delay for haptics',
    ],
    material: 'Material 3 · Switch',
    kotlinSample: `Switch(
  checked = notifications,
  onCheckedChange = { notifications = it },
)`,
  },
  search: {
    kind: 'search',
    views: 'com.google.android.material.search.SearchBar · SearchView',
    compose: 'SearchBar (Material 3)',
    rationale:
      'Integrates with the IME "Search" action, supports the search transition animation, and exposes scrolling history / suggestions.',
    accessibility: [
      'Edit field is exposed with the Search role and announces results count',
      'Suggestions list is keyboard-navigable',
      'Voice input button appears automatically when speech is available',
    ],
    material: 'Material 3 · Search',
    kotlinSample: `SearchBar(
  query = query,
  onQueryChange = { query = it },
  onSearch = { runSearch(it) },
  active = active,
  onActiveChange = { active = it },
  placeholder = { Text("Search products") },
) { /* suggestions */ }`,
  },
  tabs: {
    kind: 'tabs',
    views: 'com.google.android.material.tabs.TabLayout',
    compose: 'TabRow · ScrollableTabRow · PrimaryTabRow (Material 3)',
    rationale:
      'TabLayout / TabRow render the indicator, ripple, and scrolling overflow correctly; pair with HorizontalPager for swipe-to-switch.',
    accessibility: [
      'Each Tab is exposed with the Tab role and selected state',
      'TalkBack swipes left/right scroll through tabs in order',
      'Pager integration speaks position ("tab 2 of 5") for free',
    ],
    material: 'Material 3 · Tabs',
    kotlinSample: `TabRow(selectedTabIndex = selected) {
  tabs.forEachIndexed { i, label ->
    Tab(
      selected = selected == i,
      onClick = { selected = i },
      text = { Text(label) },
    )
  }
}`,
  },
};

export function androidMappingFor(kind: PatternKind): AndroidMapping {
  return ANDROID_PATTERNS[kind];
}

/** Convenience: list of every mapping in a stable order. */
export const ANDROID_MAPPING_ENTRIES: readonly AndroidMapping[] =
  Object.values(ANDROID_PATTERNS);
