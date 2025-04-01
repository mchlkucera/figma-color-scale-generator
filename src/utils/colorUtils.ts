import { ColorInput, ColorScale } from "../types";
import { COLOR_SCALE_STEPS } from "../constants";

// Generate a complete color scale from input colors
export function generateColorScale(colors: ColorInput): ColorScale {
   return {
      base: {
         white: colors.baseWhite,
         black: colors.baseBlack,
      },
      brand: generateColorScaleForColor(
         colors.brand500,
         colors.baseWhite,
         colors.baseBlack
      ),
      primary: generateColorScaleForColor(
         colors.primary500,
         colors.baseWhite,
         colors.baseBlack
      ),
      secondary: generateColorScaleForColor(
         colors.secondary500,
         colors.baseWhite,
         colors.baseBlack
      ),
      gray: generateColorScaleForColor(
         colors.gray500,
         colors.baseWhite,
         colors.baseBlack
      ),
   };
}

// Generate color scale for a single color
function generateColorScaleForColor(
   baseColor: string,
   whiteColor: string,
   blackColor: string
): Record<string, string> {
   const scale: Record<string, string> = {};
   
   // Generate lighter shades (50-400)
   for (let i = 0; i < 5; i++) {
      const step = COLOR_SCALE_STEPS[i];
      const ratio = i / 4;
      scale[step] = mixColors(whiteColor, baseColor, ratio);
   }

   // Set the base color (500)
   scale[500] = baseColor;

   // Generate darker shades (600-900) with improved algorithm
   for (let i = 0; i < 4; i++) {
      const step = COLOR_SCALE_STEPS[i + 6];
      // Use a more aggressive darkening ratio for the darkest colors
      // Progressively increase the darkening effect as we go from 600 to 900
      const ratio = Math.min(0.85, (i + 1) / 4); // Higher maximum value (0.85 instead of 0.7)
      scale[step] = mixColorWithHSL(baseColor, blackColor, ratio);
   }

   return scale;
}

// Mix colors using RGB interpolation
export function mixColors(color1: string, color2: string, ratio: number): string {
   // Remove # if present
   color1 = color1.replace(/^#/, "");
   color2 = color2.replace(/^#/, "");

   // Parse hex values
   const rgb1 = hexToRgb(color1);
   const rgb2 = hexToRgb(color2);

   const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
   const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
   const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

   return rgbToHex(r, g, b);
}

// Mix color with black using HSL for better results
function mixColorWithHSL(baseColor: string, blackColor: string, ratio: number): string {
   // Remove # if present
   baseColor = baseColor.replace(/^#/, "");
   
   // Parse hex values
   const rgb = hexToRgb(baseColor);
   
   // Convert to HSL to better preserve the hue
   const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
   
   // When mixing with black, we primarily want to reduce lightness
   // but preserve the hue and slightly adjust saturation
   
   // More aggressive darkening for darker colors (900)
   const newLightness = hsl.l * (1 - ratio * 0.85); // Increase from 0.7 to 0.85
   
   // More vibrant dark colors by maintaining more saturation
   // For very dark colors, we may actually want to increase saturation slightly
   let newSaturation = hsl.s;
   if (ratio > 0.6) {
      // For the darkest shades (800-900), slightly increase saturation to maintain color vibrancy
      newSaturation = Math.min(1, hsl.s * (1 + (ratio - 0.6) * 0.5));
   } else {
      // For medium dark shades (600-700), slightly reduce saturation
      newSaturation = hsl.s * (1 - ratio * 0.2);
   }
   
   // Convert back to RGB
   const newRgb = hslToRgb(hsl.h, newSaturation, newLightness);
   
   return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

// Convert hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
   const bigint = parseInt(hex, 16);
   const r = (bigint >> 16) & 255;
   const g = (bigint >> 8) & 255;
   const b = bigint & 255;
   return { r, g, b };
}

// Convert RGB to hex
export function rgbToHex(r: number, g: number, b: number): string {
   return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number, s: number, l: number } {
   r /= 255;
   g /= 255;
   b /= 255;
   
   const max = Math.max(r, g, b);
   const min = Math.min(r, g, b);
   let h = 0, s = 0;
   const l = (max + min) / 2;

   if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
         case r: h = (g - b) / d + (g < b ? 6 : 0); break;
         case g: h = (b - r) / d + 2; break;
         case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
   }

   return { h, s, l };
}

// Convert HSL to RGB
export function hslToRgb(h: number, s: number, l: number): { r: number, g: number, b: number } {
   let r, g, b;

   if (s === 0) {
      r = g = b = l; // achromatic
   } else {
      const hue2rgb = (p: number, q: number, t: number) => {
         if (t < 0) t += 1;
         if (t > 1) t -= 1;
         if (t < 1/6) return p + (q - p) * 6 * t;
         if (t < 1/2) return q;
         if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
         return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
   }

   return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
   };
} 