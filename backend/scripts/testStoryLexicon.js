const {
  analyzeLexicon,
  getConcept,
} = require(
  "../src/storyAnalysis"
);


const samples = [
  {
    title:
      "Chinese character attributes",

    locale:
      "zh-CN",

    text:
      "牙牙是一名24岁的魔法师，出生于美利坚合众国，后来加入了共产党。",
  },

  {
    title:
      "Chinese location and organization",

    locale:
      "zh-CN",

    text:
      "银月港位于诺兰帝国北部，黑月骑士团的总部设在城内。",
  },

  {
    title:
      "Chinese ancient fantasy",

    locale:
      "zh-CN",

    text:
      "赤霞山上的天机宗由玄真道人建立，后来玄真道人归隐山林。",
  },

  {
    title:
      "Chinese context",

    locale:
      "zh-CN",

    text:
      "牙牙一开始加入的是民主党，但是最后还是退出了，加入了共产党。",
  },

  {
    title:
      "Chinese negation",

    locale:
      "zh-CN",

    text:
      "牙牙并没有加入黑月教团，只是计划以后加入。",
  },

  {
    title:
      "Chinese internet",

    locale:
      "zh-CN",

    text:
      "牙牙进群以后很快就退群跑路了，后来又跑去另一个圈子站队。",
  },

  {
    title:
      "English character",

    locale:
      "en",

    text:
      "Alice is a 24 year old mage from Silvermoon City and later joined the Black Rose Guild.",
  },

  {
    title:
      "English historical",

    locale:
      "en",

    text:
      "Sir Aldric swore fealty to the Northern Kingdom and later defected to the Imperial Army.",
  },

  {
    title:
      "English context",

    locale:
      "en",

    text:
      "Alice initially joined the Democratic Party, but later left and eventually joined the Communist Party.",
  },

  {
    title:
      "English negation",

    locale:
      "en",

    text:
      "Alice did not join the Black Rose Guild, although she plans to join it later.",
  },

  {
    title:
      "English fantasy",

    locale:
      "en",

    text:
      "The old wizard lived in Silvermoon City and served under the king before he was exiled.",
  },

  {
    title:
      "English internet",

    locale:
      "en",

    text:
      "Alice joined the server, rage quit the group, and later became a streamer.",
  },

  {
    title:
      "English substring safety",

    locale:
      "en",

    text:
      "The mage used magic in the village.",
  },
];


function printResult(
  sample
) {
  console.log(
    "\n======================================"
  );

  console.log(
    sample.title
  );

  console.log(
    sample.locale
  );

  console.log(
    sample.text
  );


  const result =
    analyzeLexicon(
      sample.text,
      sample.locale
    );


  if (
    result.matches.length ===
    0
  ) {
    console.log(
      "(no matches)"
    );

    return;
  }


  for (
    const match of
    result.matches
  ) {
    console.log({
      expression:
        match.expression,

      conceptId:
        match.conceptId,

      concept:
        getConcept(
          match.conceptId
        ),

      evidenceType:
        match.evidenceType,

      strength:
        match.strength,

      confidence:
        Number(
          match.confidence
            .toFixed(2)
        ),

      range: [
        match.start,
        match.end,
      ],
    });
  }
}


for (
  const sample of
  samples
) {
  printResult(
    sample
  );
}