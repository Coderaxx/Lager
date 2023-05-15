$(document).ready(async () => {
  function showAlert(title, type) {
    Swal.fire({
      title: title,
      icon: type,
      timer: 3000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
  }

  const locationInput = document.getElementById("locationInput");
  const barcodeInput = document.getElementById("barcodeInput");
  const brandInput = document.getElementById("brandInput");
  const modelInput = document.getElementById("modelInput");
  const itemInputFields = document.getElementById("itemInputFields");

  // Funksjon for å sjekke om en streng er i riktig plasseringsformat
  function isValidLocationFormat(input) {
    const locationFormat = /^[A-Z]+\d+$/;
    return locationFormat.test(input);
  }

  // Funksjon for å oppdatere plasseringsinndatafeltet med skannet verdi
  function updateLocationInput(scannedLocation) {
    if (isValidLocationFormat(scannedLocation)) {
      locationInput.value = scannedLocation;
    }
  }

  function searchInventoryByBarcode(barcode) {
    return new Promise((resolve, reject) => {
      fetch(`/inventory/search/${barcode}`)
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else if (response.status === 404) {
            throw new Error("Ingen match funnet for strekkoden");
          } else {
            throw new Error("Noe gikk galt ved søk i lageret");
          }
        })
        .then((data) => {
          const matchingItem = data.find((item) => item.barcode === barcode);
          if (matchingItem) {
            const { brand, model } = matchingItem;
            resolve({ brand, model });
          } else {
            reject("Ingen match funnet for strekkoden");
          }
        })
        .catch((error) => {
          reject(error.message);
          Sentry.captureException(error);
        });
    });
  }

  locationInput.addEventListener("change", () => {
    const location = locationInput.value;
    const locationParts = location.split(".");
    const category = locationParts[0];
    const shelf = locationParts[1];
    const level = locationParts[2];
    
    const updatedLocation = `${category}.${shelf}.${level}`;
    
    axios.get(`/inventory/${updatedLocation}`)
      .then((response) => {
        if (response.status === 200) {
          itemInputFields.style.display = "block";
          barcodeInput.focus();
        } else {
          throw new Error(response.data.message);
        }
      })
      .catch((error) => {
        Sentry.captureException(error);
        console.error("Feil ved sjekk av plassering:", error);
        showAlert("Feil!\r\nPlasseringen finnes ikke. Vennligst prøv igjen.", "error");
        document.getElementById("addItemForm").reset();
        itemInputFields.style.display = "none";
        locationInput.focus();
        locationInput.value = updatedLocation;
      });
  });

  locationInput.addEventListener("input", () => {
    const input = locationInput.value;
    locationInput.value = input.toUpperCase();
  });


  barcodeInput.addEventListener("change", () => {
    const barcode = barcodeInput.value;
    barcodeInput.value = barcode;
    brandInput.focus();
    searchInventoryByBarcode(barcode)
      .then(({ brand, model }) => {
        brandInput.value = brand;
        modelInput.value = model;
        modelInput.focus();
      })
      .catch((error) => {
        Sentry.captureException(error);
        if (error === "Ingen match funnet for strekkoden") {
          // Søk etter varen i API-et
          axios.get(`https://brocade.io/api/items/${barcode}`)
            .then((response) => {
              if (response.status === 200) {
                const { brand, model } = response.data;
                brandInput.value = brand;
                modelInput.value = model;
                modelInput.focus();
              } else {
                throw new Error("Ingen match funnet for strekkoden");
              }
            })
            .catch((error) => {
              Sentry.captureException(error);
              console.error("Feil ved søk etter strekkode:", error);
              brandInput.value = "";
              modelInput.value = "";
              brandInput.focus();
            });
        }
      });
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

    axios.post("/inventory", newItem)
      .then((response) => {
        if (response.status === 201) {
          showAlert("Suksess!\r\nVare lagt til!", "success");
          if (location) {
            itemInputFields.style.display = "block";
          }
          const scannedLocation = localStorage.getItem("scannedLocation");
          if (scannedLocation) {
            updateLocationInput(scannedLocation);
            localStorage.removeItem("scannedLocation");
            locationInput.focus();
          } else {
            barcodeInput.focus();
          }
          addItemForm.reset();
          locationInput.value = location;
          barcodeInput.focus();
          localStorage.setItem("lastLocation", location);
          localStorage.setItem("lastLocationDate", Date.now());
        } else {
          throw new Error("Feil ved lagring av vare");
        }
      })
      .catch((error) => {
        Sentry.captureException(error);
        console.error("Feil ved lagring av vare:", error);
        showAlert("Feil!\r\nNoe gikk galt. Vennligst prøv igjen.", "error");
      });
  });
});