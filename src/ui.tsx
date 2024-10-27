import {
   Button,
   Columns,
   Container,
   IconGrid32,
   IconTidyGrid32,
   Muted,
   render,
   Text,
   IconCode16,
   TextboxNumeric,
   VerticalSpace,
   IconLibrary32,
   Modal,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { Fragment, h, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
   Bold,
   Code,
   IconChevronDown16,
   IconChevronUp16,
   Layer,
   Stack,
   Toggle,
} from "figma-ui-kit";
import "!./output.css";

import { COMMANDS } from "./commands";
import {
   DndContext,
   DragEndEvent,
   MouseSensor,
   TouchSensor,
   useDraggable,
   useDroppable,
   useSensor,
   useSensors,
} from "@dnd-kit/core";
import { ID_AND_PATH_DELIMETER } from "./constants";
import { AllAliasedVariableValuesWithNewVariableId } from "./types";

type GroupedVariable = Variable & {
   children?: GroupedVariable[];
};

type CollectionWithGroupedVariables = VariableCollection & {
   groupedVariables: GroupedVariable[];
};

function Plugin() {
   const [collections, setCollections] = useState<
      CollectionWithGroupedVariables[]
   >([]);
   const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
   const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
      null
   );
   const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
   const [duplicatedVariables, setDuplicatedVariables] = useState<string[]>([]);
   const [updateDependencies, setUpdateDependencies] = useState<boolean>(true);
   const [modalOpen, setModalOpen] = useState<boolean>(false);
   const [referencesForConfirmation, setReferencesForConfirmation] = useState<
      AllAliasedVariableValuesWithNewVariableId[] | null
   >(null);

   const handleLayerSelection = (
      id: string,
      isSelected: boolean,
      index: number,
      event: MouseEvent
   ) => {
      emit(COMMANDS.FETCH_COLLECTION_CALL);
      setSelectedCollections((prevSelected) => {
         let newSelected = [...prevSelected];

         if (event.metaKey || event.ctrlKey) {
            if (isSelected) {
               newSelected = newSelected.filter((layerId) => layerId !== id);
            } else {
               newSelected.push(id);
            }
         } else if (event.shiftKey && lastSelectedIndex !== null) {
            // Shift key: select range
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            newSelected = collections.slice(start, end + 1).map((c) => c.id);
         } else {
            // Normal click: select only this item
            newSelected = [id];
         }

         setLastSelectedIndex(index);
         return newSelected;
      });
   };

   const handleSetCollections = (
      rawCollections: (VariableCollection & {
         variables: Variable[];
      })[]
   ) => {
      const groupVariables = (variables: Variable[]): GroupedVariable[] => {
         const result: GroupedVariable[] = [];
         const groupMap: { [key: string]: GroupedVariable } = {};

         variables.forEach((variable) => {
            const parts = variable.name.split("/");
            let current = result;
            let currentPath = "";

            parts.forEach((part, index) => {
               currentPath += (index > 0 ? "/" : "") + part;
               if (!groupMap[currentPath]) {
                  const newGroup: GroupedVariable = {
                     ...variable,
                     name: part,
                     children: [],
                  };
                  groupMap[currentPath] = newGroup;
                  current.push(newGroup);
               }
               if (index < parts.length - 1) {
                  current = groupMap[currentPath].children!;
               }
            });
         });

         return result;
      };

      const groupedCollections = rawCollections.map((collection) => ({
         ...collection,
         groupedVariables: groupVariables(collection.variables),
      }));

      setCollections(groupedCollections);
   };

   const handleDuplicateCollectionResult = (duplicatedVariables: string[]) => {
      setDuplicatedVariables(duplicatedVariables);
   };

   const handleLetUserKnowAboutDependencies = (
      references: AllAliasedVariableValuesWithNewVariableId[]
   ) => {
      console.log("go", { references });
      setReferencesForConfirmation(references);
      setModalOpen(true);
   };

   const handleConfirmReferenceChanges = () => {
      if (referencesForConfirmation) {
         emit(COMMANDS.UPDATE_VARIABLE_DEPENDENCIES, referencesForConfirmation);
      }
      setModalOpen(false);
      setReferencesForConfirmation(null);
   };

   const handleCancelChanges = () => {
      setModalOpen(false);
      setReferencesForConfirmation(null);
   };

   useEffect(() => {
      emit(COMMANDS.FETCH_COLLECTION_CALL);
      on(COMMANDS.FETCH_COLLECTION_RESULT, handleSetCollections);
      on(COMMANDS.ERROR, (error) => {
         figma.notify(error.message, { error: true });
      });
      on(COMMANDS.DUPLICATE_COLLECTION_RESULT, handleDuplicateCollectionResult);
      on(
         COMMANDS.LET_USER_KNOW_ABOUT_DEPENDENCIES,
         handleLetUserKnowAboutDependencies
      );
   }, []);

   useEffect(() => {
      if (duplicatedVariables.length > 0) {
         const timer = setTimeout(() => {
            setDuplicatedVariables([]);
         }, 5000);

         return () => clearTimeout(timer);
      }
   }, [duplicatedVariables]);

   const isNoneSelected = selectedCollections.length === 0;
   const isMoreThanOneSelected = selectedCollections.length > 1;

   const toggleGroup = (groupPath: string) => {
      setExpandedGroups((prev) => {
         const newSet = new Set(prev);
         if (newSet.has(groupPath)) {
            newSet.delete(groupPath);
         } else {
            newSet.add(groupPath);
         }
         return newSet;
      });
   };

   const renderGroupedVariables = (
      variables: GroupedVariable[],
      path: string = ""
   ) =>
      variables.map((variable) => (
         <VariableItem
            variable={variable}
            path={path}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            renderGroupedVariables={renderGroupedVariables}
            isDuplicated={duplicatedVariables.includes(variable.id)}
         />
      ));

   const CollectionItem = ({
      collection,
      index,
      handleLayerSelection,
      isSelected,
   }: {
      collection: CollectionWithGroupedVariables;
      index: number;
      handleLayerSelection: (
         id: string,
         isSelected: boolean,
         index: number,
         event: MouseEvent
      ) => void;
      isSelected: boolean;
   }) => {
      const { isOver, setNodeRef } = useDroppable({
         id: collection.id,
      });
      const style = {
         color: isOver ? "green" : undefined,
      };

      return (
         <div className="w-full" ref={setNodeRef} style={style}>
            <Layer
               icon={<IconLibrary32 className="scale-90 -m-2.5" />}
               key={collection.id}
               onClick={(event: JSX.TargetedMouseEvent<HTMLInputElement>) => {
                  handleLayerSelection(
                     collection.id,
                     event.currentTarget.checked,
                     index,
                     event
                  );
               }}
               value={isSelected}
            >
               {collection.name}
            </Layer>
         </div>
      );
   };

   const handleDragEnd = (result: DragEndEvent) => {
      const from = result.active.id;
      const to = result.over?.id;

      if (!from || !to) {
         return;
      }

      emit(COMMANDS.CHANGE_VARIABLE_LOCATION, { from, to, updateDependencies });
   };

   const mouseSensor = useSensor(MouseSensor, {
      activationConstraint: {
         delay: 300,
         distance: 5,
      },
   });

   const sensors = useSensors(mouseSensor);

   const selectedCollection = collections.find(
      (c) => c.id === selectedCollections[0]
   );

   return (
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
         <Modal
            onCloseButtonClick={handleCancelChanges}
            onOverlayClick={handleCancelChanges}
            open={modalOpen}
            title="Confirm Variable References Update"
         >
            <div
               style={{
                  padding: "16px",
                  width: "400px",
                  maxHeight: "300px",
                  display: "flex",
                  flexDirection: "column",
               }}
            >
               <Text>
                  <Muted>
                     {referencesForConfirmation
                        ? `Update ${referencesForConfirmation.length} variable reference(s)?`
                        : "No references to update."}
                  </Muted>
               </Text>

               <VerticalSpace space="small" />

               <Text>
                  <Muted>
                     Description: Variable name, Old collection → New collection
                  </Muted>
               </Text>

               <VerticalSpace space="medium" />

               <div style={{ flexGrow: 1, overflowY: "auto" }}>
                  <ul className="flex flex-col space-y-1">
                     {referencesForConfirmation?.map((reference) => (
                        <li className="py-1">
                           <Text>
                              <Code>
                                 {reference.variableName}:{" "}
                                 <Muted>{reference.collectionName}</Muted> →{" "}
                                 {reference.newVariableCollectionName}
                              </Code>
                           </Text>
                        </li>
                     ))}
                  </ul>
               </div>

               <VerticalSpace space="medium" />

               <div className="flex items-center gap-2 justify-end">
                  {referencesForConfirmation ? (
                     <Fragment>
                        <Button onClick={handleCancelChanges} secondary>
                           Cancel
                        </Button>
                        <Button onClick={handleConfirmReferenceChanges}>
                           Confirm Changes
                        </Button>
                     </Fragment>
                  ) : (
                     <Button onClick={handleCancelChanges} secondary>
                        Close
                     </Button>
                  )}
               </div>
            </div>
         </Modal>

         <div style={{ paddingBottom: BOTTOM_PANEL_HEIGHT }}>
            <div className="grid grid-cols-3">
               <div className="border-r border-white/10">
                  <VerticalSpace space="medium" />

                  <Container space="extraSmall">
                     <Text>
                        <Muted>Collections</Muted>
                     </Text>
                  </Container>

                  <VerticalSpace space="small" />

                  {collections?.map((collection, index) => (
                     <CollectionItem
                        collection={collection}
                        index={index}
                        handleLayerSelection={handleLayerSelection}
                        isSelected={selectedCollections.includes(collection.id)}
                     />
                  ))}
               </div>
               <div className={"col-span-2"}>
                  <VerticalSpace space="medium" />
                  <div>
                     <Container space="small">
                        <Text>
                           <Bold>
                              {isNoneSelected
                                 ? "No collection selected"
                                 : "Selected: "}

                              {isMoreThanOneSelected
                                 ? `${selectedCollections.length} collections`
                                 : selectedCollection?.name}
                           </Bold>
                        </Text>
                     </Container>

                     <VerticalSpace space="small" />

                     {selectedCollections.length === 1 && (
                        <div>
                           {selectedCollection?.groupedVariables.length > 0 ? (
                              renderGroupedVariables(
                                 selectedCollection?.groupedVariables || []
                              )
                           ) : (
                              <Container space="extraSmall">
                                 <Muted>No variables</Muted>
                              </Container>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
         <div
            className="fixed bottom-0 left-0 right-0 bg-[#2C2C2C] z-[1] border-t border-white/10 flex  items-center"
            style={{ height: BOTTOM_PANEL_HEIGHT }}
         >
            <Container space="medium">
               <Toggle
                  onChange={function (
                     event: JSX.TargetedEvent<HTMLInputElement>
                  ) {
                     setUpdateDependencies(event.target.checked);
                  }}
                  value={updateDependencies}
               >
                  <div className="flex flex-col gap-1">
                     <Text>Update dependencies</Text>
                     <Text className="text-[10px]">
                        <Muted>
                           Update all variable references to the new duplicated
                           variable.
                        </Muted>
                     </Text>
                  </div>
               </Toggle>
            </Container>
         </div>
      </DndContext>
   );
}

const BOTTOM_PANEL_HEIGHT = 50;

const VariableItem = ({
   variable,
   path,
   expandedGroups,
   toggleGroup,
   renderGroupedVariables,
   isDuplicated,
}: {
   variable: GroupedVariable;
   path: string;
   expandedGroups: Set<string>;
   toggleGroup: (path: string) => void;
   renderGroupedVariables: (
      variables: GroupedVariable[],
      currentPath: string
   ) => JSX.Element;
   isDuplicated: boolean;
}) => {
   const currentPath = path ? `${path}/${variable.name}` : variable.name;
   const isExpanded = expandedGroups.has(currentPath);
   const hasChildren = variable.children && variable.children.length > 0;
   const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
         id: variable.id + ID_AND_PATH_DELIMETER + currentPath,
      });
   const style = transform
      ? {
           transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
           zIndex: 999,
           cursor: "copy",
        }
      : undefined;

   const className = isDuplicated ? "bg-green-500/10" : undefined;

   return (
      <Fragment key={variable.id}>
         <div
            ref={setNodeRef}
            style={style}
            className={className}
            {...listeners}
            {...attributes}
         >
            <Layer
               value={false}
               onClick={(e: JSX.TargetedMouseEvent<HTMLInputElement>) => {
                  e.stopPropagation();
                  toggleGroup(currentPath);
               }}
               icon={
                  hasChildren ? (
                     <div className={isExpanded ? "rotate-180" : "rotate-90"}>
                        <IconChevronUp16 />
                     </div>
                  ) : null
               }
            >
               {variable.name} {isDragging && "🚁"}{" "}
            </Layer>
         </div>
         {isExpanded && hasChildren && (
            <div className="ml-4">
               {renderGroupedVariables(variable.children!, currentPath)}
            </div>
         )}
      </Fragment>
   );
};

export default render(Plugin);
