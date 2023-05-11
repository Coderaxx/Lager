$(document).ready(() => {
  const locationInput = document.getElementById("locationInput");
  const barcodeInput = document.getElementById("barcodeInput");

  // Lagrer den opprinnelige verdien av hylleplasseringen
  let originalLocationValue = locationInput.value;

  // Lytter etter endringer i hylleplasseringsfeltet
  locationInput.addEventListener("input", () => {
    originalLocationValue = locationInput.value;
  });

  // Skanner strekkoden og fyller inn feltene automatisk
  barcodeInput.addEventListener("change", () => {
    const barcode = barcodeInput.value;
    barcodeInput.value = barcode; // Kan endres til å tømme feltet etter skanning hvis ønskelig
    // Bruk strekkoden for å fylle inn plassering og strekkodefelt automatisk
    // Du kan bruke en relevant logikk for å hente plasseringen basert på strekkoden fra lageret
    const fillFieldsFromBarcode = (barcode) => {
        const inventory = readInventoryFromFile();
        const item = Object.values(inventory).find((item) => item.barcode === barcode);

        if (item) {
            locationInput.value = item.location;
            barcodeInput.value = barcode;
        }
    };

    // Lytter etter endringer i strekkodefeltet
    barcodeInput.addEventListener("input", () => {
        const barcode = barcodeInput.value;
        fillFieldsFromBarcode(barcode);
    });

    // Håndterer innsending av skjemaet for å legge til varen
    const addItemForm = document.getElementById("addItemForm");
    addItemForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const location = locationInput.value;
        const brand = addItemForm.elements.brand.value;
        const model = addItemForm.elements.model.value;
        const barcode = barcodeInput.value;

        // Opprett en ny vare basert på innsendt data
        const newItem = {
            brand,
            model,
            barcode,
            location
        };

        // Lagre den nye varen i lageret
        inventory[location] = newItem;
        saveInventoryToFile(inventory);

        // Tilbakestill skjemaet
        addItemForm.reset();
        locationInput.value = originalLocationValue;

        alert("Varen er lagt til i lageret!");
    });
});