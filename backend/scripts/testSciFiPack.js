const {
  analyzeLexicon,
  analyzeUnknownEntities,
} = require(
  "../src/storyAnalysis"
);


const samples = [
  {
    title:
      "Chinese Space Opera",

    locale:
      "zh-CN",

    text:
      "曙光号是一艘巡洋舰，使用曲率引擎进行超光速航行，舰长林岳率领舰员前往天狼星殖民地。",
  },

  {
    title:
      "Chinese AI",

    locale:
      "zh-CN",

    text:
      "人工智能伊甸在运行三十年后产生了自我意识，并接入了殖民地的数据网络。",
  },

  {
    title:
      "Chinese Cyberpunk",

    locale:
      "zh-CN",

    text:
      "夜岚接受了义体改造，安装了神经接口、机械义肢和战斗用义体。",
  },

  {
    title:
      "Chinese Planet",

    locale:
      "zh-CN",

    text:
      "开普勒七号位于天鹰恒星系，拥有1.2G表面重力和可呼吸大气，宜居度很高。",
  },

  {
    title:
      "Chinese Colony",

    locale:
      "zh-CN",

    text:
      "联邦在新伊甸建立殖民地，并开始进行行星改造。",
  },

  {
    title:
      "Chinese Hacking",

    locale:
      "zh-CN",

    text:
      "黑客灰狐成功入侵空间站主网络，并关闭了守卫AI。",
  },

  {
    title:
      "Chinese Mind Upload",

    locale:
      "zh-CN",

    text:
      "博士在死亡前上传意识，将人格数字化保存到量子网络中。",
  },

  {
    title:
      "Chinese mixed terminology",

    locale:
      "zh-CN",

    text:
      "这艘 starship 使用 FTL drive 和 fusion reactor，舰长拥有 cyberware 与 neural interface。",
  },

  {
    title:
      "English Starship",

    locale:
      "en",

    text:
      "The Aurora is a cruiser-class starship powered by a fusion reactor and equipped with an FTL drive.",
  },

  {
    title:
      "English AI",

    locale:
      "en",

    text:
      "The artificial intelligence Eden became self-aware and connected to the colony data network.",
  },

  {
    title:
      "English Cyberpunk",

    locale:
      "en",

    text:
      "Mira underwent augmentation and received cybernetic implants, neural implants, and military cyberware.",
  },

  {
    title:
      "English Space",

    locale:
      "en",

    text:
      "New Horizon Colony orbits the star Helios in the Epsilon System.",
  },

  {
    title:
      "English events",

    locale:
      "en",

    text:
      "The ship launched, entered hyperspace, docked at the orbital station, and later landed on Mars.",
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
    sample.locale
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
          "sciFi",
        ],

        nsfwEnabled:
          false,
      }
    );


  console.log(
    "\nSci-Fi matches:"
  );


  console.log(
    result.matches
      .filter(
        (match) => {
          const kind =
            match.concept
              ?.kind;


          return [
            "entity-type",
            "field",
            "relation",
            "event",
            "role-signal",
          ].includes(
            kind
          );
        }
      )
      .map(
        (match) => ({
          expression:
            match.expression,

          conceptId:
            match.conceptId,

          kind:
            match.concept
              ?.kind,

          confidence:
            Number(
              match
                .confidence
                .toFixed(2)
            ),

          range: [
            match.start,
            match.end,
          ],
        })
      )
  );


  const unknown =
    analyzeUnknownEntities(
      sample.text,
      sample.locale,
      {
        enabledPacks: [
          "sciFi",
        ],

        nsfwEnabled:
          false,
      }
    );


  console.log(
    "\nUnknown entities:"
  );


  console.log(
    unknown
      .unknownEntities
      .map(
        (candidate) => ({
          name:
            candidate.name,

          likelyType:
            candidate.likelyType,

          role:
            candidate.roleConceptId,

          confidence:
            Number(
              candidate
                .confidence
                .toFixed(2)
            ),
        })
      )
  );
}