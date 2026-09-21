const [slotText, requestedName] = process.argv.slice(2);
const requestedSlot = Number(slotText);

function refuse(message) {
  console.error(message);
  process.exit(2);
}

let response;
try {
  const input = await new Promise((resolve, reject) => {
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => resolve(body));
    process.stdin.on("error", reject);
  });
  response = JSON.parse(input);
} catch (error) {
  refuse(`Could not verify the selected slot: invalid response from the board (${error.message}).`);
}

if (!response || !Array.isArray(response.sketches)) {
  refuse("Could not verify the selected slot: the board response has no sketches list.");
}

const matches = response.sketches.filter((sketch) => sketch?.slot === requestedSlot);
if (matches.length > 1 || (matches.length === 1 && typeof matches[0].name !== "string")) {
  refuse("Could not verify the selected slot: the board returned invalid slot metadata.");
}

if (matches.length === 1 && matches[0].name !== requestedName) {
  refuse(
    `Slot ${requestedSlot} is occupied by ${JSON.stringify(matches[0].name)}; ` +
    `refusing to overwrite it with ${JSON.stringify(requestedName)}. ` +
    `Choose another PHYLLO_SLOT or delete the existing sketch first.`,
  );
}
