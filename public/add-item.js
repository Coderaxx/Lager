$(document).ready(() => {
  const locationInput = document.getElementById("locationInput");
  const barcodeInput = document.getElementById("barcodeInput");
  const brandInput = document.getElementById("brandInput");
  const modelInput = document.getElementById("modelInput");
  const itemInputFields = document.getElementById("itemInputFields");
  const inventory = {};

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

    res.status(201).json({ message: "Vare lagt til", location, item: newItem });

    saveInventoryToFile(inventory);

    addItemForm.reset();
    itemInputFields.style.display = "none";
  });
});