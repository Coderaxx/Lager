$(document).ready(() => {
  const locationInput = document.getElementById("locationInput");
  const barcodeInput = document.getElementById("barcodeInput");
  const brandInput = document.getElementById("brandInput");
  const modelInput = document.getElementById("modelInput");
  const itemInputFields = document.getElementById("itemInputFields");

  //vi skal sjekke om scannet verdi av plassering tilsvarer en lokasjon, og hvis det er tilfellet, så skal vi gå videre. hvis ikke, så skal vi vise en feilmelding
  //vi skal sjekke dette med å spørre app.js om det finnes en lokasjon med den scannet verdien
  locationInput.addEventListener("change", () => {
    const location = locationInput.value;
    locationInput.value = location;
    fetch(`/inventory/${location}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert(data.error);
      } else {
        //vi skal lagre lokasjonen i localStorage, slik at vi kan huske den neste gang vi skal legge til en ny vare
        localStorage.setItem("lastLocation", location);
        localStorage.setItem("lastLocationDate", Date.now());
        itemInputFields.style.display = "block";
        barcodeInput.focus();
      }
    })
    .catch((error) => {
      console.error("Feil ved henting av lageret:", error);
      alert("Noe gikk galt ved henting av lageret. Vennligst prøv igjen.");
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
  
  //koden skal også huske hvilken lokasjon jeg valgte sist, slik at jeg slipper å velge den på nytt hver gang jeg skal legge til en ny vare.
  //vi skal kun huske lokasjon hvis det er under 10 minutter siden vi la til en vare
  //hvis en lokasjon er lagret og brukt i feltet, skal alle andre felt vises
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
          //siden vi bruker reset, så må vi åpne alle feltene på nytt. men det skal kun skje hvis vi har lagret en lokasjon
          if (location) {
            itemInputFields.style.display = "block";
          }
          //vi skal også sjekke om bruker scanner en ny plassering, og hvis det er tilfellet, så skal hele locationInput-feltet tømmes, og vi setter inn scannet verdi. vi skal også sette fokus på locationInput-feltet
          //vi skal sjekke om scannet verdi tilsvarer en lokasjon, og hvis det er tilfellet, så skal vi tømme locationInput-feltet og sette fokus på det
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
          console.error("Feil ved lagring av vare:", response);
          alert("Noe gikk galt. Vennligst prøv igjen.");
        }
      })
      .catch((error) => {
        console.error("Feil ved lagring av vare:", error);
        alert("Noe gikk galt. Vennligst prøv igjen.");
      });
  });
});