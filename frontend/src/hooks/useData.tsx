// @refresh reset
import { useContext } from "react";
import { DataContext } from "./contexts/DataContext";
import type { DataContextType } from "./contexts/DataContext";

export const useData = (): DataContextType => useContext(DataContext);