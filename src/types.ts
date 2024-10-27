export type AllAliasedVariableValue = {
   aliasedValue: {
      type: "VARIABLE_ALIAS";
      id: string;
      name: string | undefined;
   };
   variableId: string;
   variableName: string;
   modeId: string;
};

export type AllAliasedVariableValuesWithNewVariableId =
   (AllAliasedVariableValue & {
      newVariableId: string;
      newVariableCollectionName: string;
      collectionName: string;
   })[];
