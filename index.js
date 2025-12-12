//since using only one javascript file, we need to
//load the elements safely, any errors will prevent all JS from running after the failure

function safeClick(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === "terms") {
    const button = document.getElementById("submitBtn");
    el.addEventListener("change", (e) => {
      e.preventDefault();
      button.disabled = !el.checked;
    });
  } else if (
    ["magicCake", "easyVegetarianPasta", "koreanFriedChicken"].includes(id)
  ) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = `detailed-recipe-${id}.html`;
    });
  }
}

safeClick("terms");
safeClick("magicCake");
safeClick("easyVegetarianPasta");
safeClick("koreanFriedChicken");
