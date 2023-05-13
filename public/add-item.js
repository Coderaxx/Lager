$(document).ready(() => {
  const locationInput = document.getElementById("locationInput");
  const barcodeInput = document.getElementById("barcodeInput");
  const brandInput = document.getElementById("brandInput");
  const modelInput = document.getElementById("modelInput");
  const itemInputFields = document.getElementById("itemInputFields");

  locationInput.addEventListener("change", () => {
    const location = locationInput.value;
    fetch(`/inventory/${location}`)
      .then((response) => {
        if (response.ok) {
          itemInputFields.style.display = "block";
          barcodeInput.focus();
        } else {
          return response.json().then((data) => {
            throw new Error(data.message);
          });
        }
      })
      .catch((error) => {
        console.error("Feil ved sjekk av plassering:", error);
        alert("Noe gikk galt. Vennligst prøv igjen.");
      });
  });

  barcodeInput.addEventListener("change", () => {
    const barcode = barcodeInput.value;
    barcodeInput.value = barcode;
    brandInput.focus();
  });

  brandInput.addEventListener("change", () => {
    const brand = brandInput.value;
    brandInput.value = brand;
    modelInput.focus();
  });

  modelInput.addEventListener("change", () => {
    const model = modelInput.value;
    modelInput.value = model;
  });

  const lastLocation = localStorage.getItem("lastLocation");
  const lastLocationDate = localStorage.getItem("lastLocationDate");
  if (lastLocation && lastLocationDate && Date.now() - lastLocationDate < 10 * 60 * 1000) {
    locationInput.value = lastLocation;
    itemInputFields.style.display = "block";
    barcodeInput.focus();
  }

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
      location,
    };

    fetch("/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newItem),
    })
      .then((response) => {
        if (response.ok) {
          alert("Vare lagt til!");
          if (location) {
            itemInputFields.style.display = "block";
          }
          const scannedLocation = localStorage.getItem("scannedLocation");
          if (scannedLocation) {
            locationInput.value = scannedLocation;
            localStorage.removeItem("scannedLocation");
            locationInput.focus();
          } else {
            barcodeInput.focus();
          }
          addItemForm.reset();
          locationInput.value = location;
          locationInput.focus();
          localStorage.setItem("lastLocation", location);
          localStorage.setItem("lastLocationDate", Date.now());
        } else {
          return response.json().then((data) => {
            throw new Error(data.message);
          });
        }
      })
      .catch((error) => {
        console.error("Feil ved lagring av vare:", error);
        alert("Noe gikk galt. Vennligst prøv igjen.");
      });
  });
});
