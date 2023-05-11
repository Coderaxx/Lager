$(document).ready(() => {
  const locationInput = document.getElementById("locationInput");
  const barcodeInput = document.getElementById("barcodeInput");
  const brandInput = document.getElementById("brandInput");
  const modelInput = document.getElementById("modelInput");
  const itemInputFields = document.getElementById("itemInputFields");

  locationInput.addEventListener("change", () => {
    const location = locationInput.value;
    itemInputFields.style.display = "block";
    barcodeInput.focus();
  });

  barcodeInput.addEventListener("change", () => {
    const barcode = barcodeInput.value;
    barcodeInput.value = barcode;
    brandInput.focus();
  });

  const addItemForm = document.getElementById("addItemForm");
  addItemForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const location = locationInput.value;
    const barcode = barcodeInput.value;
    const brand = brandInput.value;
    const model = modelInput.value;

    const newItem = {
      brand,
      model,
      barcode,
      location
    };

    inventory[location] = newItem;

    saveInventoryToFile(inventory);

    addItemForm.reset();
    itemInputFields.style.display = "none";

    // Vis en melding om at varen ble lagt til
    alert("Vare lagt til!");
  });
});
