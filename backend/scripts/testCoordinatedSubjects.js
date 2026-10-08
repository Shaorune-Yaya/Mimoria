const {
  extractEnglishCoordinatedSubjects,
  getPreEventSubjectPhrase,
  splitCoordinatedPhrase,
  isEnglishNamedPhrase,
} = require(
  "../src/storyAnalysis/l2/coordinatedSubjectResolver"
);


// ======================================================
// Test Helper
// ======================================================

function runCase({
  text,
  eventText,
  expected,
}) {
  const eventStart =
    text.indexOf(
      eventText
    );


  if (
    eventStart <
    0
  ) {
    throw new Error(
      `Event text "${eventText}" was not found in "${text}".`
    );
  }


  const clause = {
    text,

    start:
      0,

    end:
      text.length,
  };


  const eventMatch = {
    start:
      eventStart,

    end:
      eventStart +
      eventText.length,
  };


  const phrase =
    getPreEventSubjectPhrase({
      clause,
      eventMatch,
    });


  const split =
    splitCoordinatedPhrase(
      phrase
    );


  const result =
    extractEnglishCoordinatedSubjects({
      clause,
      eventMatch,
    });


  const passed =
    JSON.stringify(
      result
    ) ===
    JSON.stringify(
      expected
    );


  console.log(
    "\n========================================"
  );

  console.log(
    "Text:",
    text
  );

  console.log(
    "Pre-event phrase:",
    phrase
  );

  console.log(
    "Split:",
    split
  );

  console.log(
    "Name validation:",
    split.map(
      (item) => ({
        item,

        valid:
          isEnglishNamedPhrase(
            item
          ),
      })
    )
  );

  console.log(
    "Result:",
    result
  );

  console.log(
    "Expected:",
    expected
  );

  console.log(
    passed
      ? "PASS"
      : "FAIL"
  );


  if (
    !passed
  ) {
    process.exitCode =
      1;
  }
}


// ======================================================
// Cases
// ======================================================

runCase({
  text:
    "Alice and John joined the Black Rose Church.",

  eventText:
    "joined",

  expected: [
    "Alice",
    "John",
  ],
});


runCase({
  text:
    "Alice, John, and Mary joined the Black Rose Church.",

  eventText:
    "joined",

  expected: [
    "Alice",
    "John",
    "Mary",
  ],
});


runCase({
  text:
    "Later Alice and John joined the Black Rose Church.",

  eventText:
    "joined",

  expected: [
    "Alice",
    "John",
  ],
});


runCase({
  text:
    "The United States and Canada established diplomatic relations.",

  eventText:
    "established",

  expected: [
    "The United States",
    "Canada",
  ],
});


runCase({
  text:
    "Yesterday, Alice joined the Black Rose Church.",

  eventText:
    "joined",

  expected:
    [],
});


if (
  process.exitCode
) {
  console.error(
    "\nOne or more coordinated subject tests failed."
  );
} else {
  console.log(
    "\nAll coordinated subject tests passed."
  );
}