import { on, showUI, emit } from "@create-figma-plugin/utilities";
import { COMMANDS } from "./commands";
import { COLOR_SCALE_STEPS, DEFAULT_COLORS } from "./constants";
import {
   ColorInput,
   ColorScale,
   GenerateColorsResult,
   ExistingColorsResult,
   ExistingColorVariable,
   SearchExistingColorsPayload,
} from "./types";
import { hexToRgb } from "./utils/colorUtils";

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
   // Remove # if present
   hex = hex.replace(/^#/, "");

   // Parse hex values
   const bigint = parseInt(hex, 16);
   const r = (bigint >> 16) & 255;
   const g = (bigint >> 8) & 255;
   const b = bigint & 255;

   return { r, g, b };
}

// Helper function to convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
   return ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// Helper function to convert RGBA to hex
function rgbaToHex(color: RGBA): string {
   const r = Math.round(color.r * 255);
   const g = Math.round(color.g * 255);
   const b = Math.round(color.b * 255);
   return rgbToHex(r, g, b);
}

// Helper function to mix two colors with a given ratio
function mixColors(color1: string, color2: string, ratio: number): string {
   const rgb1 = hexToRgb(color1);
   const rgb2 = hexToRgb(color2);

   const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
   const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
   const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

   return rgbToHex(r, g, b);
}

// Generate a color scale from a base color
function generateColorScale(
   baseColor: string,
   whiteColor: string,
   blackColor: string
): Record<string, string> {
   const scale: Record<string, string> = {};

   // Generate lighter shades (50-400)
   for (let i = 0; i < 5; i++) {
      const step = COLOR_SCALE_STEPS[i];
      const ratio = i / 4; // 0, 0.25, 0.5, 0.75, 1
      scale[step] = mixColors(whiteColor, baseColor, ratio);
   }

   // Set the base color (500)
   scale[500] = baseColor;

   // Generate darker shades (600-900)
   for (let i = 0; i < 4; i++) {
      const step = COLOR_SCALE_STEPS[i + 6];
      const ratio = (i + 1) / 4; // 0.25, 0.5, 0.75, 1
      scale[step] = mixColors(baseColor, blackColor, ratio);
   }

   return scale;
}

// Generate all color scales
function generateColorScales(colorInput: ColorInput): ColorScale {
   return {
      base: {
         white: colorInput.baseWhite,
         black: colorInput.baseBlack,
      },
      brand: generateColorScale(
         colorInput.brand500,
         colorInput.baseWhite,
         colorInput.baseBlack
      ),
      primary: generateColorScale(
         colorInput.primary500,
         colorInput.baseWhite,
         colorInput.baseBlack
      ),
      secondary: generateColorScale(
         colorInput.secondary500,
         colorInput.baseWhite,
         colorInput.baseBlack
      ),
      gray: generateColorScale(
         colorInput.gray500,
         colorInput.baseWhite,
         colorInput.baseBlack
      ),
   };
}

// Update the search function to accept collection name
async function searchExistingColors(collectionName: string): Promise<ExistingColorsResult> {
   console.log("Searching for collection:", collectionName); // Add debug log

   const result: ExistingColorsResult = {
      found: false,
   };

   try {
      // Get all collections
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      console.log("Available collections:", collections.map(c => c.name)); // Add debug log
      
      // Find the specified collection
      const colorCollection = collections.find(c => c.name === collectionName);
      
      if (!colorCollection) {
         console.log(`Collection '${collectionName}' not found`);
         return result;
      }

      // Get all variables from this collection
      const allVariables = figma.variables.getLocalVariables()
         .filter(v => v.variableCollectionId === colorCollection.id);

      if (allVariables.length === 0) {
         return result;
      }

      // Filter for color variables
      const colorVariables = allVariables.filter(
         (variable) => variable.resolvedType === "COLOR"
      );

      if (colorVariables.length === 0) {
         return result;
      }

      // Rest of your existing search logic...
      const searchPatterns = {
         baseWhite: ["base/white"],
         baseBlack: ["base/black"],
         brand500: ["brand/500"],
         primary500: ["primary/500"],
         secondary500: ["secondary/500"],
         gray500: ["gray/500", "grey/500"],
      };

      // Search for each color variable
      for (const variable of colorVariables) {
         const name = variable.name.toLowerCase();
         
         // Get the variable value
         const modeId = colorCollection.modes[0].modeId;
         const value = variable.valuesByMode[modeId];

         if (!value || typeof value !== "object" || !("r" in value)) continue;

         const hexValue = rgbaToHex(value as RGBA);

         // Check against search patterns
         for (const [key, patterns] of Object.entries(searchPatterns)) {
            if (patterns.some((pattern) => name.includes(pattern))) {
               result[key as keyof typeof searchPatterns] = {
                  name: variable.name,
                  value: hexValue,
                  collectionName: colorCollection.name,
                  variableId: variable.id,
               };
               result.found = true;
            }
         }
      }

      return result;
   } catch (error) {
      console.error("Error searching for colors:", error);
      return { found: false };
   }
}

export default function () {
   // Handle generate colors command
   on(COMMANDS.GENERATE_COLORS, function (colorInput: ColorInput) {
      try {
         const colorScale = generateColorScales(colorInput);

         figma.notify("Color scale generated successfully!");

         // Send the result back to the UI
         emit(COMMANDS.GENERATE_COLORS_RESULT, {
            colors: colorScale,
         });
      } catch (error) {
         figma.notify("Error generating color scale", { error: true });
      }
   });

   // Handle search for existing colors
   on(COMMANDS.SEARCH_EXISTING_COLORS, async function (payload: SearchExistingColorsPayload) {
      console.log("Search command received:", payload);
      try {
         const existingColors = await searchExistingColors(payload.collectionName);
         console.log("Search completed:", existingColors);
         emit(COMMANDS.SEARCH_EXISTING_COLORS_RESULT, existingColors);
      } catch (error) {
         console.error("Search error:", error);
         emit(COMMANDS.SEARCH_EXISTING_COLORS_RESULT, {
            found: false
         });
      }
   });

   // Handle applying color scales
   on(COMMANDS.APPLY_COLOR_SCALE, async function (payload) {
      console.log("Applying color scales:", payload);
      try {
         const { colorScales, collectionName } = payload;
         const result = await applyColorScalesToCollection(colorScales, collectionName);
         if (result.success) {
            figma.notify("Color scales applied succe  ssfully! Please wait a few minutes until all variables are updated.");
         } else {
            figma.notify("Failed to apply color scales: " + result.error, { error: true });
         }
      } catch (error) {
         console.error("Error applying color scales:", error);
         figma.notify("Error applying color scales", { error: true });
      }
   });

   // Show UI first
   showUI({
      height: 500,
      width: 400,
   });
}

// Add a new function to apply color scales to a collection
async function applyColorScalesToCollection(colorScales, collectionName) {
   try {
      // Get the specified collection
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const colorCollection = collections.find(c => c.name === collectionName);
      
      if (!colorCollection) {
         return { success: false, error: `Collection '${collectionName}' not found` };
      }
      
      // Find or create variables for each color in the scale
      const modeId = colorCollection.modes[0].modeId;
      
      // Base colors
      await createOrUpdateColorVariable("base/white", colorScales.base.white, colorCollection.id, modeId);
      await createOrUpdateColorVariable("base/black", colorScales.base.black, colorCollection.id, modeId);
      
      // Create variables for each color in the scale
      for (const [name, scale] of Object.entries(colorScales)) {
         if (name === "base") continue; // Skip base colors
         
         const colorScale = scale as Record<string, string>;
         for (const [step, hexColor] of Object.entries(colorScale)) {
            await createOrUpdateColorVariable(`${name}/${step}`, hexColor, colorCollection.id, modeId);
         }
      }
      
      return { success: true };
   } catch (error) {
      console.error("Error applying color scales:", error);
      return { success: false, error: error.message };
   }
}

// Helper function to create or update a color variable
async function createOrUpdateColorVariable(name, hexColor, collectionId, modeId) {
   // Convert hex to RGB
   const rgb = hexToRgb(hexColor);
   const rgbObj = { r: rgb.r/255, g: rgb.g/255, b: rgb.b/255 };
   
   // Check if variable already exists
   const existingVariables = figma.variables.getLocalVariables()
      .filter(v => v.name === name && v.variableCollectionId === collectionId);
   
   let variable;
   
   if (existingVariables.length > 0) {
      // Update existing variable
      variable = existingVariables[0];
   } else {
      // Create new variable
      variable = figma.variables.createVariable(name, collectionId, "COLOR");
   }
   
   // Set the variable value
   variable.setValueForMode(modeId, rgbObj);
   
   return variable;
}

// Helper for converting Figma RGB to hex
function rgbToHexString(rgb: { r: number, g: number, b: number }): string {
   const r = Math.round(rgb.r * 255);
   const g = Math.round(rgb.g * 255);
   const b = Math.round(rgb.b * 255);
   
   return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}
