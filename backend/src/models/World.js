const mongoose = require("mongoose");

const worldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    icon: {
      type: String,
      default: "🌍",
    },
  },
  {
    timestamps: true,
  }
);

const World = mongoose.model("World", worldSchema);

module.exports = World;