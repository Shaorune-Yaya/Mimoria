const express = require(
  "express"
);

const Document = require(
  "../models/Document"
);

const Entity = require(
  "../models/Entity"
);

const Relation = require(
  "../models/Relation"
);

const StorySyncCandidate = require(
  "../models/StorySyncCandidate"
);

const {
  getDevUser,
  getOwnedWorld,
} = require(
  "../utils/devUser"
);


const router =
  express.Router();


// ======================================================
// Relation Rules
// ======================================================

const RELATION_RULES = [
  {
    type:
      "member_of",

    labels: [
      "加入了",
      "加入",
      "成为了",
      "成为",
      "隶属于",
      "属于",
      "投靠了",
      "投靠",
      "joined",
      "joined the",
      "member of",
      "belongs to",
    ],

    confidence:
      0.9,
  },

  {
    type:
      "located_in",

    labels: [
      "位于",
      "坐落于",
      "坐落在",
      "位处",
      "located in",
      "located at",
      "lies in",
    ],

    confidence:
      0.92,
  },

  {
    type:
      "from",

    labels: [
      "来自",
      "出生于",
      "出身于",
      "originates from",
      "comes from",
      "came from",
      "born in",
    ],

    confidence:
      0.88,
  },

  {
    type:
      "allied_with",

    labels: [
      "结盟于",
      "结盟",
      "与其结盟",
      "盟友",
      "allied with",
      "alliance with",
    ],

    confidence:
      0.82,
  },

  {
    type:
      "enemy_of",

    labels: [
      "敌对于",
      "敌对",
      "敌视",
      "敌人",
      "enemy of",
      "hostile to",
      "at war with",
    ],

    confidence:
      0.8,
  },

  {
    type:
      "controls",

    labels: [
      "控制了",
      "控制",
      "统治了",
      "统治",
      "占领了",
      "占领",
      "controls",
      "controlled",
      "rules",
      "ruled",
      "occupied",
    ],

    confidence:
      0.88,
  },

  {
    type:
      "founded",

    labels: [
      "创立了",
      "创立",
      "创建了",
      "创建",
      "建立了",
      "建立",
      "founded",
      "created",
      "established",
    ],

    confidence:
      0.9,
  },
];


// ======================================================
// Reverse Rules
//
// Object appears before Subject.
//
// Example:
//
// 共产党接纳了牙牙
//
// → 牙牙 member_of 共产党
// ======================================================

const REVERSE_RELATION_RULES = [
  {
    type:
      "member_of",

    labels: [
      "接纳了",
      "接纳",
      "招募了",
      "招募",
      "吸收了",
      "吸收",
      "accepted",
      "recruited",
    ],

    confidence:
      0.82,
  },
];


// ======================================================
// Helpers
// ======================================================

function normalizeText(
  value
) {
  return String(
    value || ""
  ).toLocaleLowerCase();
}


function splitSentences(
  text
) {
  return String(
    text || ""
  )
    .split(
      /(?<=[。！？!?；;])|\n+/u
    )
    .map(
      (sentence) =>
        sentence.trim()
    )
    .filter(Boolean);
}


function buildEntityNameMap(
  entities
) {
  const groups =
    new Map();


  for (
    const entity of
    entities
  ) {
    const name =
      String(
        entity.name || ""
      ).trim();


    if (!name) {
      continue;
    }


    const key =
      normalizeText(
        name
      );


    if (
      !groups.has(
        key
      )
    ) {
      groups.set(
        key,
        []
      );
    }


    groups
      .get(key)
      .push(entity);
  }


  /*
   * Same-name Entities are ambiguous.
   * Do not guess which one is meant.
   */
  return Array.from(
    groups.entries()
  )
    .filter(
      (
        [
          _name,
          matches,
        ]
      ) =>
        matches.length ===
        1
    )
    .map(
      (
        [
          normalizedName,
          matches,
        ]
      ) => ({
        normalizedName,

        entity:
          matches[0],
      })
    )
    .sort(
      (
        itemA,
        itemB
      ) =>
        itemB
          .normalizedName
          .length -
        itemA
          .normalizedName
          .length
    );
}


function findEntityMentions(
  sentence,
  entityNames
) {
  const normalizedSentence =
    normalizeText(
      sentence
    );


  const mentions =
    [];


  for (
    const item of
    entityNames
  ) {
    let searchFrom =
      0;


    while (
      searchFrom <
      normalizedSentence.length
    ) {
      const index =
        normalizedSentence.indexOf(
          item.normalizedName,
          searchFrom
        );


      if (
        index ===
        -1
      ) {
        break;
      }


      mentions.push({
        entity:
          item.entity,

        start:
          index,

        end:
          index +
          item.normalizedName.length,
      });


      searchFrom =
        index +
        Math.max(
          item.normalizedName.length,
          1
        );
    }
  }


  mentions.sort(
    (
      mentionA,
      mentionB
    ) =>
      mentionA.start -
      mentionB.start
  );


  return mentions;
}


function detectRule(
  betweenText,
  rules
) {
  const normalizedBetween =
    normalizeText(
      betweenText
    );


  for (
    const rule of
    rules
  ) {
    for (
      const label of
      rule.labels
    ) {
      if (
        normalizedBetween.includes(
          normalizeText(
            label
          )
        )
      ) {
        return {
          relationType:
            rule.type,

          relationLabel:
            label,

          confidence:
            rule.confidence,
        };
      }
    }
  }


  return null;
}


function candidateKey({
  subjectEntityId,
  objectEntityId,
  relationType,
}) {
  return [
    String(
      subjectEntityId
    ),

    relationType,

    String(
      objectEntityId
    ),
  ].join(
    "::"
  );
}


// ======================================================
// Analyze Document
//
// POST /api/story-sync/documents/:documentId/analyze
// ======================================================

router.post(
  "/documents/:documentId/analyze",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const document =
        await Document.findById(
          req.params.documentId
        );


      if (!document) {
        return res
          .status(404)
          .json({
            message:
              "Document not found.",
          });
      }


      const world =
        await getOwnedWorld(
          document.worldId,
          user._id
        );


      if (!world) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this document.",
          });
      }


      const entities =
        await Entity.find({
          worldId:
            world._id,
        }).populate(
          "entityTypeId",
          "name icon description"
        );


      const entityNames =
        buildEntityNameMap(
          entities
        );


      const sentences =
        splitSentences(
          document.plainText
        );


      const discovered =
        [];

      const discoveredKeys =
        new Set();


      for (
        const sentence of
        sentences
      ) {
        const mentions =
          findEntityMentions(
            sentence,
            entityNames
          );


        if (
          mentions.length <
          2
        ) {
          continue;
        }


        /*
         * Check every mention pair in text order.
         */
        for (
          let leftIndex = 0;
          leftIndex <
          mentions.length -
            1;
          leftIndex +=
            1
        ) {
          for (
            let rightIndex =
              leftIndex + 1;
            rightIndex <
            mentions.length;
            rightIndex +=
              1
          ) {
            const leftMention =
              mentions[
                leftIndex
              ];

            const rightMention =
              mentions[
                rightIndex
              ];


            if (
              String(
                leftMention
                  .entity
                  ._id
              ) ===
              String(
                rightMention
                  .entity
                  ._id
              )
            ) {
              continue;
            }


            const betweenText =
              sentence.slice(
                leftMention.end,
                rightMention.start
              );


            /*
             * Normal relationship direction:
             *
             * Alice joined Black Rose.
             *
             * Alice -> member_of -> Black Rose
             */
            const directRule =
              detectRule(
                betweenText,
                RELATION_RULES
              );


            if (
              directRule
            ) {
              const discoveredItem =
                {
                  worldId:
                    world._id,

                  documentId:
                    document._id,

                  contentVersion:
                    document.contentVersion,

                  candidateType:
                    "relation",

                  subjectEntityId:
                    leftMention
                      .entity
                      ._id,

                  objectEntityId:
                    rightMention
                      .entity
                      ._id,

                  relationType:
                    directRule
                      .relationType,

                  relationLabel:
                    directRule
                      .relationLabel,

                  sourceText:
                    sentence,

                  confidence:
                    directRule
                      .confidence,
                };


              const key =
                candidateKey(
                  discoveredItem
                );


              if (
                !discoveredKeys.has(
                  key
                )
              ) {
                discoveredKeys.add(
                  key
                );

                discovered.push(
                  discoveredItem
                );
              }


              continue;
            }


            /*
             * Reverse relationship:
             *
             * Black Rose recruited Alice.
             *
             * Alice -> member_of -> Black Rose
             */
            const reverseRule =
              detectRule(
                betweenText,
                REVERSE_RELATION_RULES
              );


            if (
              reverseRule
            ) {
              const discoveredItem =
                {
                  worldId:
                    world._id,

                  documentId:
                    document._id,

                  contentVersion:
                    document.contentVersion,

                  candidateType:
                    "relation",

                  subjectEntityId:
                    rightMention
                      .entity
                      ._id,

                  objectEntityId:
                    leftMention
                      .entity
                      ._id,

                  relationType:
                    reverseRule
                      .relationType,

                  relationLabel:
                    reverseRule
                      .relationLabel,

                  sourceText:
                    sentence,

                  confidence:
                    reverseRule
                      .confidence,
                };


              const key =
                candidateKey(
                  discoveredItem
                );


              if (
                !discoveredKeys.has(
                  key
                )
              ) {
                discoveredKeys.add(
                  key
                );

                discovered.push(
                  discoveredItem
                );
              }
            }
          }
        }
      }


      /*
       * Pending candidates from an older analysis of
       * this same content version can safely be rebuilt.
       *
       * Accepted / ignored history is preserved.
       */
      await StorySyncCandidate.deleteMany({
        documentId:
          document._id,

        contentVersion:
          document.contentVersion,

        status:
          "pending",
      });


      let createdCandidates =
        [];


      if (
        discovered.length >
        0
      ) {
        createdCandidates =
          await StorySyncCandidate.insertMany(
            discovered
          );
      }


      /*
       * "Synced" means this content version has now
       * been analyzed.
       *
       * It does NOT mean every candidate was accepted.
       */
      document.syncedVersion =
        document.contentVersion;

      document.lastSyncedAt =
        new Date();


      await document.save();


      const populatedCandidates =
        await StorySyncCandidate.find({
          _id: {
            $in:
              createdCandidates.map(
                (candidate) =>
                  candidate._id
              ),
          },
        })
          .populate(
            "subjectEntityId",
            "name entityTypeId"
          )
          .populate(
            "objectEntityId",
            "name entityTypeId"
          )
          .sort({
            createdAt:
              1,
          });


      res.json({
        document,

        candidates:
          populatedCandidates,

        analysis: {
          sentenceCount:
            sentences.length,

          candidateCount:
            populatedCandidates.length,

          contentVersion:
            document.contentVersion,
        },
      });
    } catch (error) {
      console.error(
        "Story Sync analysis failed:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Story Sync analysis failed.",

          error:
            error.message,
        });
    }
  }
);


// ======================================================
// Get Candidates for Document
//
// GET /api/story-sync/documents/:documentId/candidates
// ======================================================

router.get(
  "/documents/:documentId/candidates",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const document =
        await Document.findById(
          req.params.documentId
        );


      if (!document) {
        return res
          .status(404)
          .json({
            message:
              "Document not found.",
          });
      }


      const world =
        await getOwnedWorld(
          document.worldId,
          user._id
        );


      if (!world) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this document.",
          });
      }


      const candidates =
        await StorySyncCandidate.find({
          documentId:
            document._id,

          contentVersion:
            document.syncedVersion,
        })
          .populate(
            "subjectEntityId",
            "name entityTypeId"
          )
          .populate(
            "objectEntityId",
            "name entityTypeId"
          )
          .populate(
            "appliedRelationId"
          )
          .sort({
            createdAt:
              1,
          });


      res.json({
        documentId:
          document._id,

        contentVersion:
          document.syncedVersion,

        candidates,
      });
    } catch (error) {
      console.error(
        "Failed to load Story Sync candidates:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to load Story Sync candidates.",
        });
    }
  }
);


// ======================================================
// Apply Candidate
//
// POST /api/story-sync/candidates/:candidateId/apply
// ======================================================

router.post(
  "/candidates/:candidateId/apply",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const candidate =
        await StorySyncCandidate.findById(
          req.params.candidateId
        );


      if (!candidate) {
        return res
          .status(404)
          .json({
            message:
              "Story Sync candidate not found.",
          });
      }


      const world =
        await getOwnedWorld(
          candidate.worldId,
          user._id
        );


      if (!world) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this candidate.",
          });
      }


      if (
        candidate.status ===
        "accepted"
      ) {
        const existingRelation =
          candidate
            .appliedRelationId
            ? await Relation.findById(
                candidate
                  .appliedRelationId
              )
            : null;


        return res.json({
          candidate,

          relation:
            existingRelation,
        });
      }


      let relation =
        await Relation.findOne({
          worldId:
            candidate.worldId,

          subjectEntityId:
            candidate
              .subjectEntityId,

          objectEntityId:
            candidate
              .objectEntityId,

          relationType:
            candidate
              .relationType,
        });


      if (!relation) {
        relation =
          await Relation.create({
            worldId:
              candidate.worldId,

            subjectEntityId:
              candidate
                .subjectEntityId,

            objectEntityId:
              candidate
                .objectEntityId,

            relationType:
              candidate
                .relationType,

            relationLabel:
              candidate
                .relationLabel,

            sourceDocumentId:
              candidate
                .documentId,

            sourceContentVersion:
              candidate
                .contentVersion,

            sourceText:
              candidate
                .sourceText,

            sourceCandidateId:
              candidate
                ._id,

            confidence:
              candidate
                .confidence,
          });
      }


      candidate.status =
        "accepted";

      candidate.appliedRelationId =
        relation._id;

      candidate.resolvedAt =
        new Date();


      await candidate.save();


      const populatedCandidate =
        await StorySyncCandidate
          .findById(
            candidate._id
          )
          .populate(
            "subjectEntityId",
            "name entityTypeId"
          )
          .populate(
            "objectEntityId",
            "name entityTypeId"
          )
          .populate(
            "appliedRelationId"
          );


      res.json({
        candidate:
          populatedCandidate,

        relation,
      });
    } catch (error) {
      console.error(
        "Failed to apply Story Sync candidate:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to apply Story Sync candidate.",
        });
    }
  }
);


// ======================================================
// Ignore Candidate
//
// POST /api/story-sync/candidates/:candidateId/ignore
// ======================================================

router.post(
  "/candidates/:candidateId/ignore",

  async (
    req,
    res
  ) => {
    try {
      const user =
        await getDevUser();


      const candidate =
        await StorySyncCandidate.findById(
          req.params.candidateId
        );


      if (!candidate) {
        return res
          .status(404)
          .json({
            message:
              "Story Sync candidate not found.",
          });
      }


      const world =
        await getOwnedWorld(
          candidate.worldId,
          user._id
        );


      if (!world) {
        return res
          .status(403)
          .json({
            message:
              "You do not have access to this candidate.",
          });
      }


      candidate.status =
        "ignored";

      candidate.resolvedAt =
        new Date();


      await candidate.save();


      const populatedCandidate =
        await StorySyncCandidate
          .findById(
            candidate._id
          )
          .populate(
            "subjectEntityId",
            "name entityTypeId"
          )
          .populate(
            "objectEntityId",
            "name entityTypeId"
          );


      res.json({
        candidate:
          populatedCandidate,
      });
    } catch (error) {
      console.error(
        "Failed to ignore Story Sync candidate:",
        error
      );


      res
        .status(500)
        .json({
          message:
            "Failed to ignore Story Sync candidate.",
        });
    }
  }
);


module.exports =
  router;