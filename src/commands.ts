import { EventHandler } from "@create-figma-plugin/utilities";
import {
   ColorInput,
   ExistingColorsResult,
   GenerateColorsResult,
} from "./types";

export const COMMANDS = {
   GENERATE_COLORS: "GENERATE_COLORS",
   GENERATE_COLORS_RESULT: "GENERATE_COLORS_RESULT",
   SEARCH_EXISTING_COLORS: "SEARCH_EXISTING_COLORS",
   SEARCH_EXISTING_COLORS_RESULT: "SEARCH_EXISTING_COLORS_RESULT",
   APPLY_COLOR_SCALE: "APPLY_COLOR_SCALE"
};

// Add types for the search command payload
export type SearchExistingColorsPayload = {
   collectionName: string;
};

export interface GenerateColorsHandler extends EventHandler {
   name: typeof COMMANDS.GENERATE_COLORS;
   handler: (colorInput: ColorInput) => void;
}

export interface GenerateColorsResultHandler extends EventHandler {
   name: typeof COMMANDS.GENERATE_COLORS_RESULT;
   handler: (result: GenerateColorsResult) => void;
}

export interface SearchExistingColorsHandler extends EventHandler {
   name: typeof COMMANDS.SEARCH_EXISTING_COLORS;
   handler: () => void;
}

export interface SearchExistingColorsResultHandler extends EventHandler {
   name: typeof COMMANDS.SEARCH_EXISTING_COLORS_RESULT;
   handler: (result: ExistingColorsResult) => void;
}
