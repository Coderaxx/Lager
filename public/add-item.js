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
  const tagsInput = document.getElementById("tagsInput");
  const imageInput = document.getElementById("imagePreview");
  const brandImageInput = document.getElementById("brandImagePreview");
  const articleNumberInput = document.getElementById("articleNumberInput");
  const itemInputFields = document.getElementById("itemInputFields");
  const searchButton = document.getElementById("searchButton");

  let checked = false;

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

  async function searchInventoryByBarcode(barcode) {
    checked = true;
    try {
      const response = await fetch(`/inventory/search/${barcode}`);
      if (response.ok) {
        const data = await response.json();
        const matchingItem = data.find((item) => item.barcode === barcode || item.articleNumber === barcode);
        if (matchingItem) {
          const { barcode, brand, model, image, brandImage, articleNumber } = matchingItem;
          return { barcode, brand, model, image, brandImage, articleNumber };
        } else {
          throw new Error("Ingen match funnet for strekkoden");
        }
      } else if (response.status === 404) {
        const checkEFO = await searchEFOByBarcode(barcode);
        if (checkEFO) {
          const brand = checkEFO.Produktinfo.Fabrikat;
          const model = checkEFO.Produktinfo.Varetekst;
          const image = `https://efobasen.no/API/Produktfiler/Skalert?id=${checkEFO.Produktinfo.Bilder[0]}&w=1000&h=1000&m=5`;
          const brandImage = (checkEFO.Produktinfo.Leverandoer.FirmaLogofilId) ? `https://efobasen.no/API/Firmalogoer/Skalert?id=${checkEFO.Produktinfo.Leverandoer.FirmaLogofilId}&w=1000&h=1000&m=5` : null;
          const ean = checkEFO.Produktskjema.Skjema.Grupper[0].Felter.find((Felter) => Felter.Navn === "gtin.nummer").Verdi;
          const articleNumber = checkEFO.Produktinfo.Produktnr;

          document.getElementById("barcodeInput").value = ean;

          return { barcode: ean, brand, model, image, brandImage, articleNumber };
        } else {
          throw new Error("Ingen match funnet for strekkoden");
        }
      } else {
        throw new Error("Noe gikk galt ved søk i lageret");
      }
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }

  async function searchOnninenByBarcode(barcode) {
    checked = true;
    const proxyUrl = "https://cors-oneco.herokuapp.com/";
    //showLoadingIndicator(barcode); // Viser indikatoren før du starter forespørselen
    try {
      const response = await axios.get(`${proxyUrl}https://onninen.no/rest/v2/search/suggestion?term=${barcode}`);
      if (response.status === 200) {
        const data = response.data;
        const productCodes = data.productCodes;
        if (productCodes.length > 0) {
          const productResponse = await axios.get(`${proxyUrl}https://onninen.no/rest/v1/product/${productCodes[0]}`);
          if (productResponse.status === 200) {
            const productData = productResponse.data;
            Swal.close(); // Lukker indikatoren når forespørselen er fullført
            showAlert("Fant produktdata hos Onninnen!", "success");
            return productData;
          } else {
            Swal.close(); // Lukker indikatoren når forespørselen er fullført
            throw new Error("Ingen match funnet for strekkoden");
          }
        } else {
          Swal.close(); // Lukker indikatoren når forespørselen er fullført
          throw new Error("Ingen match funnet for strekkoden");
        }
      } else {
        Swal.close(); // Lukker indikatoren når forespørselen er fullført
        throw new Error("Ingen match funnet for strekkoden");
      }
    } catch (error) {
      Swal.close(); // Lukker indikatoren når forespørselen er fullført
      Sentry.captureException(error);
      throw error;
    }
  }

  async function searchEFOByBarcode(barcode) {
    checked = true;
    const proxyUrl = "https://cors-oneco.herokuapp.com/";
    //showLoadingIndicator(barcode); // Viser indikatoren før du starter forespørselen

    const options = {
      body: {
        "Statusvalg": [],
        "Page": 1,
        "Pagesize": 50,
        "Search": barcode
      }
    };

    try {
      const response = await axios.post(`${proxyUrl}https://efobasen.no/API/AlleProdukter/HentProdukter`, options.body);
      if (response.status === 200) {
        const data = response.data;
        if (data.Produkter[0]) {
          const product = data.Produkter[0].Produktnr;
          const productOptions = {
            body: {
              "Produktnr": product,
            }
          };
          try {
            const productResponse = await axios.post(`${proxyUrl}https://efobasen.no/API/VisProdukt/HentProduktinfo`, productOptions.body);
            if (productResponse.status === 200) {
              const productData = productResponse.data;
              // Swal.close(); // Lukker indikatoren når forespørselen er fullført
              showAlert("Fant produktdata hos EFO!", "success");
              return productData;
            }
          } catch (error) {
            // Swal.close(); // Lukker indikatoren når forespørselen er fullført
            Sentry.captureException(error);
            throw error;
          }
        } else {
          throw new Error("Ingen match funnet for strekkoden");
        }
      } else {
        throw new Error("Ingen match funnet for strekkoden");
      }
    } catch (error) {
      // Swal.close(); // Lukker indikatoren når forespørselen er fullført
      Sentry.captureException(error);
      throw error;
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
        tagsInput.removeAll();
        itemInputFields.style.display = "none";
        locationInput.focus();
        locationInput.value = oldLocation;
      });
  });

  locationInput.addEventListener("input", () => {
    const input = locationInput.value;
    locationInput.value = input.toUpperCase();
  });

  barcodeInput.addEventListener("paste", () => {
    setTimeout(() => {
      const event = new Event("change"); // Opprett en ny "change"-hendelse
      barcodeInput.dispatchEvent(event); // Utløs "change"-hendelsen
      checked = true;
    }, 0);
  });

  barcodeInput.addEventListener("input", () => {
    brandInput.value = "";
    modelInput.value = "";
    articleNumberInput.value = "";
    imageInput.value = "";
  });

  searchButton.addEventListener("click", async () => {
    const event = new Event("change"); // Opprett en ny "change"-hendelse
    barcodeInput.dispatchEvent(event); // Utløs "change"-hendelsen
    checked = true;
  });

  barcodeInput.addEventListener("change", async () => {
    if (checked == true) {
      checked = false;
      return;
    }
    const barcode = barcodeInput.value;
    barcodeInput.value = barcode;
    let shouldCallGoUpc = true;
    const barcodeInputDiv = document.getElementById("barcodeInputDiv");
    const brandInputDiv = document.getElementById("brandInputDiv");
    const modelInputDiv = document.getElementById("modelInputDiv");
    const articleNumberInputDiv = document.getElementById("articleNumberInputDiv");
    const tagsInputDiv = document.getElementById("tagsInputDiv");

    barcodeInputDiv.classList.add("is-loading");
    brandInputDiv.classList.add("is-loading");
    modelInputDiv.classList.add("is-loading");
    articleNumberInputDiv.classList.add("is-loading");
    tagsInputDiv.classList.add("is-loading");

    //barcodeInput.setAttribute("placeholder", "Laster...");
    //brandInput.setAttribute("placeholder", "Laster...");
    //modelInput.setAttribute("placeholder", "Laster...");
    //articleNumberInput.setAttribute("placeholder", "Laster...");

    await searchInventoryByBarcode(barcode)
      .then(async ({ barcode, brand, model, image, brandImage, articleNumber }) => {
        barcodeInput.value = barcode;
        brandInput.value = brand;
        modelInput.value = model;
        imageInput.value = image;
        brandImageInput.value = brandImage;
        articleNumberInput.value = articleNumber;
        
        articleNumberInput.focus();
        shouldCallGoUpc = false; // Sett til false siden en match ble funnet
        barcodeInputDiv.classList.remove("is-loading");
        brandInputDiv.classList.remove("is-loading");
        modelInputDiv.classList.remove("is-loading");
        articleNumberInputDiv.classList.remove("is-loading");

        axios.get(`/getTags/${encodeURIComponent(image)}`)
          .then((response) => {
            if (response.status === 200) {
              const tags = response.data.tags;
              tagsInput.tagsInput().add(tags);
            } else {
              throw new Error(response.data.message);
            }
          })
          .catch((error) => {
            Sentry.captureException(error);
            console.error("Feil ved henting av bilde:", error);
          });
        
        tagsInputDiv.classList.remove("is-loading");
        checked = false;
      })
      .catch((error) => {
        Sentry.captureException(error);
        if (error === "Ingen match funnet for strekkoden") {
          // Søk etter varen i API-et
          shouldCallGoUpc = true; // Sett til true siden ingen match ble funnet
        }
      });

    if (shouldCallGoUpc) {
      axios
        .get(`https://go-upc.com/api/v1/code/${barcode}?key=7c4850dda436605482d38eb52bd77580b94c0495aed963b1df4d7006b1b1eefd`)
        .then((response) => {
          if (response.status === 200) {
            barcodeInput.setAttribute("placeholder", "Skann strekkode/elnummer...");
            brandInput.setAttribute("placeholder", "Skriv inn merke...");
            modelInput.setAttribute("placeholder", "Skriv inn modell...");
            articleNumberInput.setAttribute("placeholder", "Skriv inn artikkelnummer...");
            const { brand, name, imageUrl } = response.data.product;
            brandInput.value = brand;
            modelInput.value = name;
            if (imageUrl.length > 0) {
              imageInput.value = imageUrl;
            }
            barcodeInputDiv.classList.remove("is-loading");
            brandInputDiv.classList.remove("is-loading");
            modelInputDiv.classList.remove("is-loading");
            articleNumberInputDiv.classList.remove("is-loading");
            tagsInputDiv.classList.remove("is-loading");
            modelInput.focus();
          } else {
            throw new Error("Ingen match funnet for strekkoden");
          }
        })
        .catch((error) => {
          barcodeInputDiv.classList.remove("is-loading");
          brandInputDiv.classList.remove("is-loading");
          modelInputDiv.classList.remove("is-loading");
          articleNumberInputDiv.classList.remove("is-loading");
          tagsInputDiv.classList.remove("is-loading");
          Sentry.captureException(error);
          console.error("Feil ved søk etter strekkode:", error);
          brandInput.value = "";
          modelInput.value = "";
          brandInput.focus();
        });
    }
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
    const brandImage = brandImageInput.value;
    const articleNumber = articleNumberInput.value;
    const tags = tagsInput.value;
    const newItem = {
      brand,
      model,
      image,
      brandImage,
      barcode,
      articleNumber,
      location,
      tags,
    };

    axios.get(`/inventory/${location}`)
      .then((response) => {
        if (response.status === 200) {
          // Plasseringen eksisterer, legg til varen i riktig plassering
          axios.post(`/inventory/${location}`, newItem)
            .then((response) => {
              if (response.status === 201) {
                checked = false;
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
                tagsInput.removeAll();
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
        tagsInput.removeAll();
        itemInputFields.style.display = "none";
        locationInput.focus();
        locationInput.value = oldLocation;
      });
  });
});