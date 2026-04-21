const input = document.getElementById("amount");

input.addEventListener("input", () => {
  const val = parseFloat(input.value || 0);

  const invest = val * 0.45;
  const reserve = val * 0.55;

  document.getElementById("invest").innerText = invest.toFixed(2) + " €";
  document.getElementById("reserve").innerText = reserve.toFixed(2) + " €";
});
