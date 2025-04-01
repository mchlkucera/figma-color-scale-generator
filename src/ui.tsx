import {
   Button,
   Container,
   Text,
   TextboxColor,
   VerticalSpace,
   render,
   Dropdown,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { h, Fragment } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import "!./output.css";

import { COMMANDS } from "./commands";
import { COLOR_SCALE_STEPS, DEFAULT_COLORS } from "./constants";
import {
   ColorInput,
   ColorScale,
   ExistingColorsResult,
   GenerateColorsResult,
} from "./types";
import { generateColorScale, rgbToHex, hexToRgb } from "./utils/colorUtils";

function Plugin() {
   // State management
   const [colorInput, setColorInput] = useState<ColorInput>(DEFAULT_COLORS);
   const [loadingState, setLoadingState] = useState<
      "loading" | "error" | "success"
   >("loading");
   const [previewColors, setPreviewColors] = useState<ColorScale | null>(null);
   const [selectedCollection, setSelectedCollection] =
      useState<string>(" 1. Colors");

   // Collection options - could be fetched from the main thread
   const collectionOptions = [{ value: " 1. Colors" }];

   // Event handlers
   const handleApplyColorScale = useCallback(() => {
      const colorScales = generateColorScale(colorInput);
      console.log("Applying color scales to collection:", selectedCollection);

      emit(COMMANDS.APPLY_COLOR_SCALE, {
         colorScales,
         collectionName: selectedCollection,
      });
   }, [colorInput, selectedCollection]);

   const handleCollectionChange = useCallback(
      (event: h.JSX.TargetedEvent<HTMLInputElement>) => {
         const newValue = event.currentTarget.value;
         console.log("Selected collection:", newValue);
         setSelectedCollection(newValue);
         emit(COMMANDS.SEARCH_EXISTING_COLORS, { collectionName: newValue });
         setLoadingState("loading");
      },
      []
   );

   const handleColorChange = useCallback(
      (key: keyof ColorInput, value: string) => {
         setColorInput((prev) => ({
            ...prev,
            [key]: value,
         }));
      },
      []
   );

   // Set up event listeners
   useEffect(() => {
      // Handle search results
      const handleSearchExistingColorsResult = on(
         COMMANDS.SEARCH_EXISTING_COLORS_RESULT,
         (result: ExistingColorsResult) => {
            console.log("Search result received:", result);

            if (!result || result.found === false) {
               setLoadingState("error");
               return;
            }

            if (result.found) {
               // Create a new color input object with found values
               const newColorInput = { ...DEFAULT_COLORS };
               debugger
               if (result.baseWhite)
                  newColorInput.baseWhite = result.baseWhite.value;
               if (result.baseBlack)
                  newColorInput.baseBlack = result.baseBlack.value;
               if (result.brand500)
                  newColorInput.brand500 = result.brand500.value;
               if (result.primary500)
                  newColorInput.primary500 = result.primary500.value;
               if (result.secondary500)
                  newColorInput.secondary500 = result.secondary500.value;
               if (result.gray500) newColorInput.gray500 = result.gray500.value;

               // Generate preview with the new colors
               const preview = generateColorScale(newColorInput);

               // Update all states
               setColorInput(newColorInput);
               setPreviewColors(preview);
               setLoadingState("success");
            }
         }
      );

      // Clean up listeners
      return () => {
         handleSearchExistingColorsResult();
      };
   }, []);

   // Initial setup
   useEffect(() => {
      console.log("Setting up initial search...");
      setLoadingState("loading");

      // Initial search
      emit(COMMANDS.SEARCH_EXISTING_COLORS, {
         collectionName: selectedCollection,
      });

      // Fallback if search takes too long
      const timeout = setTimeout(() => {
         console.log("Search timeout triggered, showing UI anyway");
         const defaultPreview = generateColorScale(DEFAULT_COLORS);
         setPreviewColors(defaultPreview);
         setLoadingState("success");
      }, 2000);

      return () => clearTimeout(timeout);
   }, []);

   // Update preview when colors change
   useEffect(() => {
      const preview = generateColorScale(colorInput);
      setPreviewColors(preview);
   }, [colorInput]);

   return (
      <Container space="medium">
         <VerticalSpace space="large" />
         <Text className="text-xl font-bold mb-4">Color Scale Generator</Text>

         {/* Collection Selection */}
         <div className="mb-4">
            <Text>Collection</Text>
            <VerticalSpace space="small" />
            <Dropdown
               onChange={handleCollectionChange}
               options={collectionOptions}
               value={selectedCollection}
            />
         </div>

         {/* Loading States */}
         {loadingState === "loading" && <Text>Loading color variables...</Text>}
         {loadingState === "error" && (
            <Text>Failed to load color variables</Text>
         )}

         {/* Main Content */}
         {loadingState === "success" && (
            <div>
               <ColorInputsPanel
                  colorInput={colorInput}
                  onColorChange={handleColorChange}
               />

               <VerticalSpace space="medium" />

               <div className="w-full">
                  <Button onClick={handleApplyColorScale} fullWidth>
                     Apply Color Scale
                  </Button>
               </div>

               <VerticalSpace space="large" />

               <ColorPreview previewColors={previewColors} />
            </div>
         )}
      </Container>
   );
}

// Component for color inputs
function ColorInputsPanel({
   colorInput,
   onColorChange,
}: {
   colorInput: ColorInput;
   onColorChange: (key: keyof ColorInput, value: string) => void;
}) {
   return (
      <div className="grid grid-cols-2 gap-4">
         <div>
            <ColorInputField
               label="White"
               value={colorInput.baseWhite}
               onChange={(value) => onColorChange("baseWhite", value)}
            />
            <ColorInputField
               label="Black"
               value={colorInput.baseBlack}
               onChange={(value) => onColorChange("baseBlack", value)}
            />
         </div>

         <div>
            <ColorInputField
               label="Brand"
               value={colorInput.brand500}
               onChange={(value) => onColorChange("brand500", value)}
            />
            <ColorInputField
               label="Primary"
               value={colorInput.primary500}
               onChange={(value) => onColorChange("primary500", value)}
            />
            <ColorInputField
               label="Secondary"
               value={colorInput.secondary500}
               onChange={(value) => onColorChange("secondary500", value)}
            />
            <div>
               <ColorInputField
                  label="Gray"
                  value={colorInput.gray500}
                  onChange={(value) => onColorChange("gray500", value)}
               />
            </div>
         </div>
      </div>
   );
}

// Color input field component
function ColorInputField({
   label,
   value,
   onChange,
}: {
   label: string;
   value: string;
   onChange: (value: string) => void;
}) {
   const [hexColor, setHexColor] = useState<string>(value);
   const [opacity, setOpacity] = useState<string>("100");

   useEffect(() => {
      setHexColor(value);
   }, [value]);

   const handleHexColorInput = (
      event: h.JSX.TargetedEvent<HTMLInputElement>
   ) => {
      setHexColor(event.currentTarget.value);
   };

   const handleBlur = () => {
      onChange(hexColor);
   };

   const handleOpacityInput = (
      event: h.JSX.TargetedEvent<HTMLInputElement>
   ) => {
      setOpacity(event.currentTarget.value);
   };

   return (
      <div className="mb-4">
         <div className="flex items-center mb-2">
            <Text>{label}</Text>
         </div>
         <div onBlur={handleBlur}>
            <TextboxColor
               hexColor={hexColor}
               onHexColorInput={handleHexColorInput}
               onOpacityInput={handleOpacityInput}
               opacity={opacity}
            />
         </div>
      </div>
   );
}

// Color preview component
function ColorPreview({ previewColors }: { previewColors: ColorScale | null }) {
   if (!previewColors) return null;

   return (
      <div className="mt-6">
         <Text className="font-bold text-lg mb-4">Color Scale Preview</Text>

         <div>
            <ColorScaleRow title="Brand" colors={previewColors.brand} />
            <ColorScaleRow title="Primary" colors={previewColors.primary} />
            <ColorScaleRow title="Secondary" colors={previewColors.secondary} />
            <ColorScaleRow title="Gray" colors={previewColors.gray} />
         </div>
      </div>
   );
}

// Color scale row component
function ColorScaleRow({
   title,
   colors,
}: {
   title: string;
   colors: Record<string, string>;
}) {
   return (
      <div className="mb-6">
         <Text className="font-bold mb-2">{title}</Text>
         <div className="flex justify-between">
            {COLOR_SCALE_STEPS.map((step) => (
               <ColorSwatch
                  key={`${title}-${step}`}
                  color={colors[step]}
                  label={step.toString()}
               />
            ))}
         </div>
      </div>
   );
}

// Color swatch component
function ColorSwatch({ color, label }: { color: string; label: string }) {
   return (
      <div className="flex flex-col items-center">
         <div
            className="w-6 h-6 rounded mb-1"
            style={{ backgroundColor: `#${color}` }}
         />
         <Text className="text-xs">{label}</Text>
      </div>
   );
}

export default render(Plugin);
