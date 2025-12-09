import { createContext, useContext } from "react";

export type PageId = "today" | "inbox" | "board" | "calendar" | "settings";

export const NavContext = createContext<(page: PageId) => void>(() => {});

/** Switch page from anywhere (e.g. "Open inbox" after processing a note). */
export const useNav = () => useContext(NavContext);
