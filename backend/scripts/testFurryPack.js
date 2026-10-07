const {
  analyzeLexicon,
} = require(
  "../src/storyAnalysis"
);


const samples = [
  {
    title:
      "Chinese Furry",

    locale:
      "zh-CN",

    text:
      "我的兽设夜岚是一只狼，anthro体型，主色是蓝色，副色白色，异色瞳，趾行，肉垫是粉色。",
  },

  {
    title:
      "Chinese Fursuit",

    locale:
      "zh-CN",

    text:
      "这套兽装是日系全套，使用曲腿，包含兽头、手爪和脚爪。",
  },

  {
    title:
      "English Furry",

    locale:
      "en",

    text:
      "My fursona is a wolf hybrid with digitigrade legs, blue fur, white markings, and pink paw pads.",
  },

  {
    title:
      "English Fursuit",

    locale:
      "en",

    text:
      "The fursuit is a Kemono fullsuit with digitigrade legs, handpaws, feetpaws, and a fluffy tail.",
  },
];


for (
  const sample of
  samples
) {
  console.log(
    "\n======================================"
  );

  console.log(
    sample.title
  );

  console.log(
    sample.text
  );


  const result =
    analyzeLexicon(
      sample.text,
      sample.locale,
      {
        enabledPacks: [
          "furry",
        ],

        nsfwEnabled:
          false,
      }
    );


  console.log(
    result.matches.map(
      (match) => ({
        expression:
          match.expression,

        conceptId:
          match.conceptId,

        confidence:
          Number(
            match.confidence
              .toFixed(2)
          ),
      })
    )
  );
}


// ======================================================
// NSFW Switch Test
// ======================================================

const nsfwText =
  "这个犬科兽设包含狗结设定，而龙类角色使用龙缝设定。";


console.log(
  "\n======================================"
);

console.log(
  "NSFW OFF"
);

console.log(
  analyzeLexicon(
    nsfwText,
    "zh-CN",
    {
      enabledPacks: [
        "furry",
      ],

      nsfwEnabled:
        false,
    }
  )
    .matches
    .map(
      (match) => ({
        expression:
          match.expression,

        conceptId:
          match.conceptId,
      })
    )
);


console.log(
  "\n======================================"
);

console.log(
  "NSFW ON"
);

console.log(
  analyzeLexicon(
    nsfwText,
    "zh-CN",
    {
      enabledPacks: [
        "furry",
      ],

      nsfwEnabled:
        true,
    }
  )
    .matches
    .map(
      (match) => ({
        expression:
          match.expression,

        conceptId:
          match.conceptId,
      })
    )
);