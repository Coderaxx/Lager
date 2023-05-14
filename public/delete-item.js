$(document).ready(() => {
  // Opprett en Socket.IO-tilkobling til serveren
  const socket = io();

  // Lytt etter initialt varelager fra serveren
  socket.on("initialInventory", (inventory) => {
    updateInventoryTable(inventory);
  });

  // Lytt etter oppdateringer i varelageret fra serveren
  socket.on("updateInventory", (inventory) => {
    updateInventoryTable(inventory);
  });

  // Funksjon for å oppdatere varetabellen
  function updateInventoryTable(inventory) {
    const tableBody = document.getElementById("inventoryTableBody");
    tableBody.innerHTML = ""; // Tøm tabellen før oppdatering

    // Gå gjennom hvert element i varelageret og oppdater tabellen
    for (const category of inventory.categories) {
      for (const shelf of category.shelves) {
        for (const section of shelf.sections) {
          for (const level of section.levels) {
            for (const item of level.items) {
              const row = document.createElement("tr");

              // Opprett celler for hver kolonne i tabellen
              const locationCell = document.createElement("td");
              const brandCell = document.createElement("td");
              const modelCell = document.createElement("td");
              const barcodeCell = document.createElement("td");

              // Sett innholdet for hver celle
              locationCell.textContent = item.location;
              brandCell.textContent = item.brand;
              modelCell.textContent = item.model;
              barcodeCell.textContent = item.barcode;

              // Legg til cellene i raden
              row.appendChild(locationCell);
              row.appendChild(brandCell);
              row.appendChild(modelCell);
              row.appendChild(barcodeCell);

              // Legg til raden i tabellens tbody
              tableBody.appendChild(row);
            }
          }
        }
      }
    }
  }

  function showAlert(title, message, type) {
    Swal.fire({
      title: title,
      text: message,
      icon: type,
      timer: 3000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
  }

  function fetchInventory() {
    const inventoryTableBody = $("#inventoryTableBody");

    // Hjelpefunksjon for å opprette en rad i tabellen
    function createTableRow(item, location) {
      const { brand, model, barcode, location: itemLocation } = item;

      const row = $("<tr></tr>");
      row.append(`<td>${brand}</td>`);
      row.append(`<td>${model}</td>`);
      row.append(`<td>${barcode}</td>`);
      row.append(`<td>${itemLocation}</td>`);

      const deleteButton = $(`<button class="button is-danger">Slett</button>`);
      deleteButton.click(() => {
        deleteItem(barcode, row);
      });

      const deleteCell = $("<td></td>");
      deleteCell.append(deleteButton);
      row.append(deleteCell);

      return row;
    }

    // Hent lageret fra serveren
    fetch("/inventory")
      .then((response) => response.json())
      .then((data) => {
        const items = data.categories.flatMap((category) =>
          category.shelves.flatMap((shelf) =>
            shelf.sections.flatMap((section) =>
              section.levels.flatMap((level) =>
                level.items.map((item) => {
                  return {
                    item,
                    location: `${category.name}.${shelf.name}.${section.name}.${level.name}`,
                  };
                })
              )
            )
          )
        );

        inventoryTableBody.empty();

        items.forEach(({ item, location }) => {
          const row = createTableRow(item, location);
          inventoryTableBody.append(row);
        });
      })
      .catch((error) => {
        console.error("Feil ved henting av lageret:", error);
        showAlert(
          "Feil",
          "Noe gikk galt ved henting av lageret. Vennligst prøv igjen.",
          "error"
        );
      });
  }

  // Oppdater tabellen ved sidenlast
  fetchInventory();

  // Slett vare
  function deleteItem(barcode, row) {
    fetch(`/inventory/${barcode}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          showAlert("Suksess", "Vare slettet!", "success");
          row.remove();
        } else {
          console.error("Feil ved sletting av vare:", response);
          showAlert(
            "Feil",
            "Noe gikk galt under sletting av vare. Vennligst prøv igjen.",
            "error"
          );
        }
      })
      .catch((error) => {
        console.error("Feil ved sletting av vare:", error);
        showAlert(
          "Feil",
          "Noe gikk galt under sletting av vare. Vennligst prøv igjen.",
          "error"
        );
      });
  }
});