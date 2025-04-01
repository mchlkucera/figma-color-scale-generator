export type ColorInput = {
   baseWhite: string;
   baseBlack: string;
   brand500: string;
   primary500: string;
   secondary500: string;
   gray500: string;
};

export type ColorScale = {
   base: {
      white: string;
      black: string;
   };
   brand: Record<string, string>;
   primary: Record<string, string>;
   secondary: Record<string, string>;
   gray: Record<string, string>;
};

export type GenerateColorsResult = {
   colors: ColorScale;
};

export type ExistingColorVariable = {
   name: string;
   value: string;
   collectionName: string;
   variableId: string;
};

export type ExistingColorsResult = {
   baseWhite?: ExistingColorVariable;
   baseBlack?: ExistingColorVariable;
   brand500?: ExistingColorVariable;
   primary500?: ExistingColorVariable;
   secondary500?: ExistingColorVariable;
   gray500?: ExistingColorVariable;
   found: boolean;
};
