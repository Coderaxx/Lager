$(document).ready(() => {
  const inventoryTableBody = $("#inventoryTableBody");

  // Hjelpefunksjon for å opprette en rad i tabellen
  function createTableRow(item, location) {
    const { brand, model, barcode } = item;

    const row = $("<tr></tr>");
    row.append(`<td>${brand}</td>`);
    row.append(`<td>${model}</td>`);
    row.append(`<td>${barcode}</td>`);
    row.append(`<td>${location}</td>`);

    const deleteButton = $(`<button class="button is-danger">Slett</button>`);
    deleteButton.click(() => {
      deleteItem(barcode);
    });

    const deleteCell = $("<td></td>");
    deleteCell.append(deleteButton);
    row.append(deleteCell);

    return row;
  }

  // Hent lageret fra serveren og oppdater tabellen
  function fetchInventory() {
    fetch("/inventory")
    .then(response => response.json())
    .then(data => {
      const items = Object.entries(data).flatMap(([category, sections]) =>
        Object.entries(sections).flatMap(([section, levels]) =>
          Object.entries(levels).flatMap(([level, items]) =>
            Object.entries(items).map(([location, item]) => {
              return {
                item,
                location: `H21.${category}.${section}.${level}`
              };
            })
            )
          )
        );

        // Tøm tabellen
      inventoryTableBody.empty();

      items.forEach(({ item, location }) => {
        const row = createTableRow(item, location);
        inventoryTableBody.append(row);
      });
    })
    .catch(error => {
      console.error("Feil ved henting av lageret:", error);
      showAlert("Feil", "Noe gikk galt under henting av lageret. Vennligst prøv igjen.", "error");
    });
  }

  // Slett vare
  function deleteItem(barcode) {
    fetch(`/inventory/${barcode}`, {
      method: "DELETE",
    })
    .then(response => {
      if (response.ok) {
        showAlert("Suksess", "Vare slettet!", "success");
          // Oppdater tabellen ved å fjerne slettet rad
        const deletedRow = $(`tr[data-barcode="${barcode}"]`);
        deletedRow.remove();
      } else {
        console.error("Feil ved sletting av vare:", response);
        showAlert("Feil", "Noe gikk galt under sletting av varen. Vennligst prøv igjen.", "error");
      }
    })
    .catch(error => {
      console.error("Feil ved sletting av vare:", error);
      showAlert("Feil", "Noe gikk galt under sletting av varen. Vennligst prøv igjen.", "error");
    });
  }

  // Hent lageret og oppdater tabellen ved sidenlast
  fetchInventory();

  // Oppdater tabellen når et nytt element blir lagt til
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
        showAlert("Suksess", "Vare lagt til!", "success");
        addItemForm.reset();
        itemInputFields.style.display = "none";
      // Oppdater tabellen ved å hente lageret på nytt
        fetchInventory();
      } else {
        console.error("Feil ved lagring av vare:", response);
        showAlert("Feil", "Noe gikk galt under lagring av varen. Vennligst prøv igjen.", "error");
      }
    })
    .catch((error) => {
      console.error("Feil ved lagring av vare:", error);
      showAlert("Feil", "Noe gikk galt under lagring av varen. Vennligst prøv igjen.", "error");
    });