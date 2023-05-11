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

    fetch(`./inventory/${location}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newItem)
    })
      .then(response => {
        if (response.ok) {
          alert("Vare lagt til!");
          addItemForm.reset();
          itemInputFields.style.display = "none";
        } else {
          console.error("Feil ved lagring av vare:", response);
          alert("Noe gikk galt. Vennligst prøv igjen.");
        }
      })
      .catch(error => {
        console.error("Feil ved lagring av vare:", error);
        alert("Noe gikk galt. Vennligst prøv igjen.");
      });
  });
});
