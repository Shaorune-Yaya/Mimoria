const mongoose = require(
  "mongoose"
);


// ======================================================
// Field Schema
// ======================================================

const fieldSchema =
  new mongoose.Schema(
    {
      key: {
        type:
          String,

        required:
          true,
      },

      label: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      type: {
        type:
          String,

        required:
          true,

        enum: [
          "text",
          "long-text",
          "number",
          "boolean",
          "date",
          "entity-reference",
          "select",
        ],
      },

      required: {
        type:
          Boolean,

        default:
          false,
      },


      // ------------------------------------------------
      // Stable semantic binding
      //
      // Example:
      //
      // key:
      // field_93ea21...
      //
      // label:
      // 出生地
      //
      // canonicalConcept:
      // field.birthplace
      //
      // The user may rename the label later without
      // breaking Story Analysis semantic mapping.
      // ------------------------------------------------

      canonicalConcept: {
        type:
          String,

        trim:
          true,

        default:
          null,

        index:
          false,
      },


      // ------------------------------------------------
      // Used by Entity Reference fields
      // ------------------------------------------------

      referenceEntityTypeId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "EntityType",

        default:
          null,
      },


      // ------------------------------------------------
      // Used by Select fields
      // ------------------------------------------------

      options: {
        type: [
          String
        ],

        default:
          [],
      },

      order: {
        type:
          Number,

        default:
          0,
      },
    },
    {
      _id:
        true,
    }
  );


// ======================================================
// Entity Type Schema
// ======================================================

const entityTypeSchema =
  new mongoose.Schema(
    {
      worldId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "World",

        required:
          true,

        index:
          true,
      },

      name: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      description: {
        type:
          String,

        default:
          "",
      },

      icon: {
        type:
          String,

        default:
          "📄",
      },


      // ------------------------------------------------
      // Optional semantic type binding
      //
      // Example:
      //
      // 角色
      // -> entityType.character
      //
      // 国家
      // -> entityType.country
      //
      // This is optional so existing custom schemas remain
      // fully supported.
      // ------------------------------------------------

      canonicalConcept: {
        type:
          String,

        trim:
          true,

        default:
          null,
      },


      fields: {
        type: [
          fieldSchema
        ],

        default:
          [],
      },
    },
    {
      timestamps:
        true,
    }
  );


// ======================================================
// Model
// ======================================================

const EntityType =
  mongoose.models.EntityType ||
  mongoose.model(
    "EntityType",
    entityTypeSchema
  );


module.exports =
  EntityType;