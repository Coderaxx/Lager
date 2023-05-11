$(document).ready(() => {
  const categorySelect = document.getElementById("categorySelect");
  const sectionSelect = document.getElementById("sectionSelect");
  const levelSelect = document.getElementById("levelSelect");
  const barcodeInput = document.getElementById("barcodeInput");

  // Fyller inn hylleplasseringsvalgene basert på valgt kategori
  categorySelect.addEventListener("change", () => {
    const category = categorySelect.value;
    const sections = Object.keys(inventory[category] || {});

    // Tøm seksjons- og planvalgene
    sectionSelect.innerHTML = "<option value=''>Velg seksjon</option>";
    levelSelect.innerHTML = "<option value=''>Velg plan</option>";

    // Fyll inn seksjonsvalgene
    for (const section of sections) {
      const option = document.createElement("option");
      option.value = section;
      option.textContent = section;
      sectionSelect.appendChild(option);
    }
  });

  // Fyller inn planvalgene basert på valgt kategori og seksjon
  sectionSelect.addEventListener("change", () => {
    const category = categorySelect.value;
    const section = sectionSelect.value;
    const levels = Object.keys(inventory[category][section] || {});

    // Tøm planvalgene
    levelSelect.innerHTML = "<option value=''>Velg plan</option>";

    // Fyll inn planvalgene
    for (const level of levels) {
      const option = document.createElement("option");
      option.value = level;
      option.textContent = level;
      levelSelect.appendChild(option);
    }
  });

  // Skanner strekkoden og fyller inn feltene automatisk
  barcodeInput.addEventListener("change", () => {
    const barcode = barcodeInput.value;
    barcodeInput.value = barcode; // Kan endres til å tømme feltet etter skanning hvis ønskelig
    // Bruk strekkoden for å fylle inn plassering og strekkodefelt automatisk
    // Du kan bruke en relevant logikk for å hente plasseringen basert på strekkoden fra lageret
    const category = categorySelect.value;
    const section = sectionSelect.value;
    const level = levelSelect.value;
    const location = `H${category}.${section}.${level}`;

    fillFieldsFromBarcode(barcode, location);
  });

  // Funksjon for å fylle inn feltene basert på strekkode og plassering
  const fillFieldsFromBarcode = (barcode, location) => {
    const item = inventory[location] && inventory[location][barcode];

    if (item) {
      categorySelect.value = item.category;
      sectionSelect.value = item.section;
      levelSelect.value = item.level;
      barcodeInput.value = barcode;
    }
  };

  // Håndterer innsending av skjemaet for å legge til varen
  const addItemForm = document.getElementById("addItemForm");
  addItemForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const category = categorySelect.value;
    const section = sectionSelect.value;
    const level = levelSelect.value;
    const location = `H${category}.${section}.${level}`;
    const brand = addItemForm.elements.brand.value;
    const model = addItemForm.elements.model.value;
    const barcode = barcodeInput.value;

    // Opprett en ny vare basert på innsendt data
    const newItem = {
      category,
      section,
      level,
      brand,
      model,
      barcode,
    };

    inventory[category] = inventory[category] || {};
    inventory[category][section] = inventory[category][section] || {};
    inventory[category][section][level] = inventory[category][section][level] || {};
    inventory[category][section][level][location] = newItem;

    res.status(201).json({ message: "Vare lagt til", location, item: newItem });

    saveInventoryToFile(inventory);

    // Tilbakestill skjemaet
    addItemForm.reset();
    categorySelect.value = "";
    sectionSelect.innerHTML = "<option value=''>Velg seksjon</option>";
    levelSelect.innerHTML = "<option value=''>Velg plan</option>";
  });
});