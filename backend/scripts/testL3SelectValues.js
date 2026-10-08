const {
  resolveFieldValue,
} = require(
  "../src/storyAnalysis"
);


const field = {
  key:
    "field-primary-color",

  label:
    "主色",

  type:
    "Select",

  options: [
    "红色",
    "蓝色",
    "白色",
  ],
};


const samples = [
  "蓝色",
  "白色",
  "紫罗兰色",
];


for (
  const value of
  samples
) {
  console.log(
    "\n======================================"
  );


  console.log(
    "Value:",
    value
  );


  console.log(
    resolveFieldValue({
      value,
      field,
    })
  );
}