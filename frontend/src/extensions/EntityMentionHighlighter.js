import {
  Extension,
} from "@tiptap/core";

import {
  Plugin,
  PluginKey,
} from "@tiptap/pm/state";

import {
  Decoration,
  DecorationSet,
} from "@tiptap/pm/view";


export const ENTITY_MENTION_REFRESH_META =
  "mimoria:refresh-entity-mentions";


const entityMentionPluginKey =
  new PluginKey(
    "mimoria-entity-mentions"
  );


// ======================================================
// Helpers
// ======================================================

function normalizeName(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLocaleLowerCase();
}


function isAsciiWordCharacter(
  character
) {
  if (!character) {
    return false;
  }

  return /[A-Za-z0-9_]/.test(
    character
  );
}


function matchHasValidBoundaries(
  text,
  start,
  end,
  entityName
) {
  const firstCharacter =
    entityName[0];

  const lastCharacter =
    entityName[
      entityName.length - 1
    ];


  /*
   * ASCII names use word boundaries.
   *
   * Example:
   * Alice should not match inside Alicea.
   *
   * CJK names do not require spaces, so normal
   * ASCII word-boundary checks are not applied.
   */
  if (
    isAsciiWordCharacter(
      firstCharacter
    )
  ) {
    const before =
      start > 0
        ? text[
            start - 1
          ]
        : "";

    if (
      isAsciiWordCharacter(
        before
      )
    ) {
      return false;
    }
  }


  if (
    isAsciiWordCharacter(
      lastCharacter
    )
  ) {
    const after =
      end < text.length
        ? text[end]
        : "";

    if (
      isAsciiWordCharacter(
        after
      )
    ) {
      return false;
    }
  }


  return true;
}


function prepareEntities(
  entities
) {
  const groups =
    new Map();


  for (
    const entity of
    entities || []
  ) {
    const name =
      String(
        entity?.name || ""
      ).trim();


    if (!name) {
      continue;
    }


    const normalizedName =
      normalizeName(
        name
      );


    if (
      !groups.has(
        normalizedName
      )
    ) {
      groups.set(
        normalizedName,
        []
      );
    }


    groups
      .get(
        normalizedName
      )
      .push(
        entity
      );
  }


  /*
   * Do not automatically connect ambiguous names.
   *
   * If two Entities share exactly the same name,
   * Mimoria waits for future disambiguation support
   * instead of guessing.
   */
  return Array.from(
    groups.values()
  )
    .filter(
      (group) =>
        group.length === 1
    )
    .map(
      (group) =>
        group[0]
    )
    .sort(
      (
        entityA,
        entityB
      ) =>
        String(
          entityB.name
        ).length -
        String(
          entityA.name
        ).length
    );
}


// ======================================================
// Decoration Builder
// ======================================================

function buildDecorations(
  doc,
  entities
) {
  const usableEntities =
    prepareEntities(
      entities
    );


  if (
    usableEntities.length ===
    0
  ) {
    return DecorationSet.empty;
  }


  const decorations =
    [];


  doc.descendants(
    (
      node,
      position
    ) => {
      if (
        !node.isText ||
        !node.text
      ) {
        return;
      }


      const containsCodeMark =
        node.marks?.some(
          (mark) =>
            mark.type.name ===
            "code"
        );


      if (
        containsCodeMark
      ) {
        return;
      }


      const text =
        node.text;

      const normalizedText =
        text.toLocaleLowerCase();

      const matches =
        [];


      for (
        const entity of
        usableEntities
      ) {
        const entityName =
          String(
            entity.name
          );


        const normalizedName =
          normalizeName(
            entityName
          );


        if (!normalizedName) {
          continue;
        }


        let searchFrom =
          0;


        while (
          searchFrom <
          normalizedText.length
        ) {
          const index =
            normalizedText.indexOf(
              normalizedName,
              searchFrom
            );


          if (
            index === -1
          ) {
            break;
          }


          const end =
            index +
            normalizedName.length;


          if (
            matchHasValidBoundaries(
              text,
              index,
              end,
              entityName
            )
          ) {
            matches.push({
              start:
                index,

              end,

              entity,
            });
          }


          searchFrom =
            index +
            Math.max(
              normalizedName.length,
              1
            );
        }
      }


      /*
       * Prefer the longest Entity name when matches
       * overlap.
       *
       * Example:
       *
       * Black Rose
       * Black Rose Church
       *
       * → Black Rose Church wins.
       */
      matches.sort(
        (
          matchA,
          matchB
        ) => {
          if (
            matchA.start !==
            matchB.start
          ) {
            return (
              matchA.start -
              matchB.start
            );
          }


          return (
            (
              matchB.end -
              matchB.start
            ) -
            (
              matchA.end -
              matchA.start
            )
          );
        }
      );


      let lastEnd =
        -1;


      for (
        const match of
        matches
      ) {
        if (
          match.start <
          lastEnd
        ) {
          continue;
        }


        const entity =
          match.entity;

        const entityType =
          entity.entityTypeId ||
          {};


        decorations.push(
          Decoration.inline(
            position +
              match.start,

            position +
              match.end,

            {
              class:
                "entity-mention",

              "data-entity-id":
                String(
                  entity._id
                ),

              "data-entity-name":
                entity.name,

              "data-entity-type":
                entityType.name ||
                "",

              "data-entity-type-icon":
                entityType.icon ||
                "",

              "data-entity-description":
                entityType.description ||
                "",
            }
          )
        );


        lastEnd =
          match.end;
      }
    }
  );


  return DecorationSet.create(
    doc,
    decorations
  );
}


// ======================================================
// TipTap Extension
// ======================================================

const EntityMentionHighlighter =
  Extension.create({
    name:
      "entityMentionHighlighter",


    addOptions() {
      return {
        getEntities:
          () => [],

        onEntityClick:
          null,
      };
    },


    addProseMirrorPlugins() {
      const getEntities =
        this.options.getEntities;

      const onEntityClick =
        this.options.onEntityClick;


      return [
        new Plugin({
          key:
            entityMentionPluginKey,


          state: {
            init: (
              _,
              state
            ) => {
              return buildDecorations(
                state.doc,
                getEntities()
              );
            },


            apply: (
              transaction,
              oldDecorations,
              _oldState,
              newState
            ) => {
              const shouldRefresh =
                transaction.docChanged ||
                transaction.getMeta(
                  ENTITY_MENTION_REFRESH_META
                );


              if (
                shouldRefresh
              ) {
                return buildDecorations(
                  newState.doc,
                  getEntities()
                );
              }


              return oldDecorations.map(
                transaction.mapping,
                transaction.doc
              );
            },
          },


          props: {
            decorations(
              state
            ) {
              return (
                entityMentionPluginKey.getState(
                  state
                )
              );
            },


            handleClick(
              view,
              _position,
              event
            ) {
              const target =
                event.target;


              if (
                !target ||
                typeof target.closest !==
                  "function"
              ) {
                return false;
              }


              const mentionElement =
                target.closest(
                  ".entity-mention[data-entity-id]"
                );


              if (
                !mentionElement ||
                !view.dom.contains(
                  mentionElement
                )
              ) {
                return false;
              }


              const entityId =
                mentionElement.dataset
                  .entityId;


              const entity =
                getEntities().find(
                  (item) =>
                    String(
                      item._id
                    ) ===
                    String(
                      entityId
                    )
                );


              if (!entity) {
                return false;
              }


              /*
               * Prevent the editor from treating the
               * Entity click as a normal cursor click.
               */
              event.preventDefault();
              event.stopPropagation();


              if (
                typeof onEntityClick ===
                "function"
              ) {
                onEntityClick(
                  entity,
                  {
                    element:
                      mentionElement,

                    event,
                  }
                );
              }


              return true;
            },
          },
        }),
      ];
    },
  });


export default EntityMentionHighlighter;