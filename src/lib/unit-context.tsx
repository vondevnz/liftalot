"use client";

import { createContext, useContext } from "react";
import type { Unit } from "./units";

const UnitContext = createContext<Unit>("kg");

/**
 * The preference is read once in the group layout and handed down, rather than
 * queried per screen. Every weight in the app renders through it.
 */
export function UnitProvider({
  unit,
  children,
}: {
  unit: Unit;
  children: React.ReactNode;
}) {
  return <UnitContext.Provider value={unit}>{children}</UnitContext.Provider>;
}

export function useUnit(): Unit {
  return useContext(UnitContext);
}
