const Roulette = (() => {

  let rouletteCount = 0;
  let ready = false;
  let lastResult = "";

  function update(coins) {
    rouletteCount = Math.floor(coins / 100);
    ready = rouletteCount > 0;
  }

  function draw(ctx) {
    ctx.fillStyle = "yellow";
    ctx.font = "20px Arial";

    if (ready) {
      ctx.fillText("🎰 ROULETTE x" + rouletteCount, 20, 60);
    } else {
      ctx.fillText("🎰 LOCKED", 20, 60);
    }
  }

  function trySpin(coins) {

    if (!ready || rouletteCount <= 0) {
      return {
        used: false,
        coins,
        result: ""
      };
    }

    rouletteCount--;
    coins -= 100;

    const rewards = [
      "+50 COIN",
      "+100 COIN",
      "DOUBLE SCORE",
      "BIG WIN",
      "SMALL WIN",
      "+200 COIN",
      "JACKPOT"
    ];

    const result = rewards[Math.floor(Math.random() * rewards.length)];
    lastResult = result;

    console.log("🎰 RESULT:", result);

    // 🎁 결과 적용
    if (result === "+50 COIN") coins += 50;
    if (result === "+100 COIN") coins += 100;
    if (result === "+200 COIN") coins += 200;
    if (result === "JACKPOT") coins += 500;

    return {
      used: true,
      coins,
      result
    };
  }

  function getLastResult() {
    return lastResult;
  }

  return {
    update,
    draw,
    trySpin,
    getLastResult
  };
})();