const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;

const cellsHorizontal = 14;
const cellsVertical = 10;
const width = document.documentElement.clientWidth; // Use visible viewport width
const height = document.documentElement.clientHeight; // Use visible viewport height

// Ensure width and height are positive to avoid division errors
if (width <= 0 || height <= 0) {
  throw new Error("Window dimensions must be positive");
}

const unitlengthX = width / cellsHorizontal;
const unitlengthY = height / cellsVertical;

const engine = Engine.create();
engine.world.gravity.y = 0;
const { world } = engine;
const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    wireframes: false,
    width,
    height,
  },
});
Render.run(render);
Runner.run(Runner.create(), engine);

const walls = [
  Bodies.rectangle(width / 2, 0, width, 2, { isStatic: true }),
  Bodies.rectangle(width / 2, height, width, 2, { isStatic: true }),
  Bodies.rectangle(0, height / 2, 2, height, { isStatic: true }),
  Bodies.rectangle(width, height / 2, 2, height, { isStatic: true }),
];
World.add(world, walls);

const shuffle = (arr) => {
  let counter = arr.length;

  while (counter > 0) {
    const index = Math.floor(Math.random() * counter);

    counter--;

    const temp = arr[counter];
    arr[counter] = arr[index];
    arr[index] = temp;
  }
  return arr;
};

const grid = Array(cellsVertical)
  .fill(null)
  .map(() => Array(cellsHorizontal).fill(false));

const verticals = Array(cellsVertical)
  .fill(null)
  .map(() => Array(cellsHorizontal - 1).fill(false));

const horizontals = Array(cellsVertical - 1)
  .fill(null)
  .map(() => Array(cellsHorizontal).fill(false));

const startRow = Math.floor(Math.random() * cellsVertical);
const startCol = Math.floor(Math.random() * cellsHorizontal);

const stepThroughCell = (row, col) => {
  if (grid[row][col]) {
    return;
  }

  grid[row][col] = true;

  const neighbors = shuffle([
    [row - 1, col, "up"],
    [row, col + 1, "right"],
    [row + 1, col, "down"],
    [row, col - 1, "left"],
  ]);

  for (let neighbor of neighbors) {
    const [nextRow, nextColumn, direction] = neighbor;

    if (
      nextRow < 0 ||
      nextRow >= cellsVertical ||
      nextColumn < 0 ||
      nextColumn >= cellsHorizontal
    ) {
      continue;
    }

    if (grid[nextRow][nextColumn]) {
      continue;
    }

    if (direction === "left" && col > 0) {
      verticals[row][col - 1] = true;
    } else if (direction === "right") {
      verticals[row][col] = true;
    } else if (direction === "up" && row > 0) {
      horizontals[row - 1][col] = true;
    } else if (direction === "down") {
      horizontals[row][col] = true;
    }

    stepThroughCell(nextRow, nextColumn);
  }
};

stepThroughCell(startRow, startCol);

horizontals.forEach((row, rowIndex) => {
  row.forEach((open, columnIndex) => {
    if (open) {
      return;
    }

    const wall = Bodies.rectangle(
      columnIndex * unitlengthX + unitlengthX / 2,
      rowIndex * unitlengthY + unitlengthY,
      unitlengthX,
      5,
      {
        label: "wall",
        isStatic: true,
        render: {
          fillStyle: "red",
        },
      }
    );
    World.add(world, wall);
  });
});

verticals.forEach((row, rowIndex) => {
  row.forEach((open, columnIndex) => {
    if (open) {
      return;
    }

    const wall = Bodies.rectangle(
      columnIndex * unitlengthX + unitlengthX,
      rowIndex * unitlengthY + unitlengthY / 2,
      5,
      unitlengthY,
      {
        label: "wall",
        isStatic: true,
        render: {
          fillStyle: "red",
        },
      }
    );
    World.add(world, wall);
  });
});

const goal = Bodies.rectangle(
  width - unitlengthX / 2,
  height - unitlengthY / 2,
  unitlengthX * 0.7,
  unitlengthY * 0.7,
  {
    label: "goal",
    isStatic: true,
    render: {
      fillStyle: "green",
    },
  }
);

World.add(world, goal);

const ballRadius = Math.min(unitlengthX, unitlengthY) / 4;
const ball = Bodies.circle(unitlengthX / 2, unitlengthY / 2, ballRadius, {
  label: "ball",
  render: {
    fillStyle: "blue",
  },
});

World.add(world, ball);

let hasWon = false;

// Boundary limits considering wall thickness
const wallThickness = 2;
const minX = wallThickness + ballRadius; // Left wall inner edge + ball radius
const maxX = width - wallThickness - ballRadius; // Right wall inner edge - ball radius
const minY = wallThickness + ballRadius; // Top wall inner edge + ball radius
const maxY = height - wallThickness - ballRadius; // Bottom wall inner edge - ball radius

document.addEventListener("keydown", (event) => {
  if (hasWon) return;

  const { x, y } = ball.velocity;
  const { x: posX, y: posY } = ball.position;

  switch (event.key.toLowerCase()) {
    case "w":
      if (posY - ballRadius > minY) {
        Body.setVelocity(ball, { x, y: y - 5 });
      }
      break;
    case "d":
      if (posX + ballRadius < maxX) {
        Body.setVelocity(ball, { x: x + 5, y });
      }
      break;
    case "s":
      if (posY + ballRadius < maxY) {
        Body.setVelocity(ball, { x, y: y + 5 });
      }
      break;
    case "a":
      if (posX - ballRadius > minX) {
        Body.setVelocity(ball, { x: x - 5, y });
      }
      break;
  }
});

Events.on(engine, "collisionStart", (event) => {
  event.pairs.forEach((collision) => {
    const { bodyA, bodyB } = collision;
    if (
      (bodyA.label === "ball" && bodyB.label === "goal") ||
      (bodyA.label === "goal" && bodyB.label === "ball")
    ) {
      hasWon = true;
      document.querySelector(".winner").classList.remove("hidden");
      world.gravity.y = 1;
      world.bodies.forEach((body) => {
        if (body.label === "wall") {
          Body.setStatic(body, false);
        }
      });
    }
  });
});