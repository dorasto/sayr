/**
 * Id of the board's single right-hand panel. It shows the overview (composer, categories, latest release) by default
 * and swaps to a post (Peek) while one is selected. The board registers it on its `Page`; `BoardPanelProvider` drives it.
 * (Renamed from `public-peek-panel` so a persisted open/closed value from the old, closed-by-default panel is not reused.)
 */
export const PUBLIC_BOARD_PANEL_ID = "public-board-panel";
