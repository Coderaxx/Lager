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
  const imageInput = document.getElementById("imagePreview");
  const articleNumberInput = document.getElementById("articleNumberInput");
  const itemInputFields = document.getElementById("itemInputFields");

  // Funksjon for å sjekke om en streng er i riktig plasseringsformat
  function isValidLocationFormat(input) {
    const locationFormat = /^[A-Z]+\d+$/;
    return locationFormat.test(input);
  }

  // Funksjon for å oppdatere plasseringsinndatafeltet med skannet verdi
  function updateLocationInput(scannedLocation) {
    if (isValidLocationFormat(scannedLocation)) {
      const [category, shelf, level] = scannedLocation.match(/(\D+)(\d+)/).slice(1);
      locationInput.value = `${category}.${shelf}${level}`;
    }
  }

  function searchInventoryByBarcode(barcode) {
    return new Promise((resolve, reject) => {
      fetch(`/inventory/search/${barcode}`)
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else if (response.status === 404) {
            searchInventoryByShortBarcode(barcode.substring(0, 7))
            .then((response) => {
              if (response.ok) {
                console.log(response);
                return response.json();
              }
            })
            .then((data) => {
              console.log(data);
              if (result) {
                console.log(result);
                const { brand } = result.brand;
                console.log(brand);
                resolve( { brand });
              } else {
                reject("Ingen match funnet for strekkoden");
              }
            })
            .catch((error) => {
              reject(error.message);
              Sentry.captureException(error);
            });
            //throw new Error("Ingen match funnet for strekkoden");
          } else {
            throw new Error("Noe gikk galt ved søk i lageret");
          }
        })
        .then((data) => {
          const matchingItem = data.find((item) => item.barcode === barcode);
          if (matchingItem) {
            const { brand, model, image } = matchingItem;
            resolve({ brand, model, image });
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

  async function searchInventoryByShortBarcode(barcode) {
    const response = await fetch(`/inventory/search/${barcode}`);
    if (response.ok) {
      const data = await response.json();
      const matchingItem = data.find((item) => item.barcode === barcode);
      if (matchingItem) {
        const brand = matchingItem;
        return brand;
      } else {
        return null;
      }
    } else if (response.status === 404) {
      return null;
    } else {
      return null;
    }
  }

  const oldLocation = locationInput.value;

  locationInput.addEventListener("change", () => {
    let location = locationInput.value.trim();

    // Sjekk om plasseringen er i ønsket format, ellers konverter den
    if (!isValidLocationFormat(location)) {
      const [category, shelfLevel] = location.split(".");
      const shelf = shelfLevel.charAt(0);
      const level = shelfLevel.substr(1);
      location = `${category}.${shelf}${level}`;
    }

    axios.get(`/inventory/${location}`)
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
        locationInput.value = oldLocation;
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
      .then(({ brand, model, image }) => {
        brandInput.value = brand;
        modelInput.value = model;
        imageInput.value = image;
        modelInput.focus();
      })
      .catch((error) => {
        Sentry.captureException(error);
        if (error === "Ingen match funnet for strekkoden") {
          // Søk etter varen i API-et
          axios.get(`https://go-upc.com/api/v1/code/${barcode}?key=7c4850dda436605482d38eb52bd77580b94c0495aed963b1df4d7006b1b1eefd`)
            .then((response) => {
              if (response.status === 200) {
                const { brand, name, imageUrl } = response.data.product;
                brandInput.value = brand;
                modelInput.value = name;
                if (imageUrl.length > 0) {
                  imageInput.value = imageUrl;
                }
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
    let location = locationInput.value.trim();

    // Sjekk om plasseringen er i ønsket format, ellers konverter den
    if (!isValidLocationFormat(location)) {
      const [category, shelfLevel] = location.split(".");
      const shelf = shelfLevel.charAt(0);
      const level = shelfLevel.substr(1);
      location = `${category}.${shelf}${level}`;
    }

    const barcode = barcodeInput.value;
    const brand = brandInput.value;
    const model = modelInput.value;
    const image = imageInput.value;
    const articleNumber = articleNumberInput.value;
    const newItem = {
      brand,
      model,
      image,
      barcode,
      articleNumber,
      location,
    };

    axios.get(`/inventory/${location}`)
      .then((response) => {
        if (response.status === 200) {
          // Plasseringen eksisterer, legg til varen i riktig plassering
          axios.post(`/inventory/${location}`, newItem)
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
        } else if (response.status === 404) {
          // Plasseringen finnes ikke, vis feilmelding
          throw new Error("Plasseringen finnes ikke");
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
        locationInput.value = oldLocation;
      });
  });
});