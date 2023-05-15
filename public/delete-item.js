$(document).ready(() => {
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
            shelf.levels.flatMap((level) =>
                level.items.map((item) => {
                  return {
                    item,
                    location: `${category.name}.${shelf.name}.${level.name}`,
                  };
                })
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
        Sentry.captureException(error);
        console.error("Feil ved henting av lageret:", error);
        showAlert(
          "Feil!\r\nNoe gikk galt ved henting av lageret. Vennligst prøv igjen.",
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
          showAlert("Suksess!\r\nVare slettet!", "success");
          row.remove();
        } else {
          console.error("Feil ved sletting av vare:", response);
          showAlert(
            "Feil!\r\nNoe gikk galt under sletting av vare. Vennligst prøv igjen.",
            "error"
          );
        }
      })
      .catch((error) => {
        Sentry.captureException(error);
        console.error("Feil ved sletting av vare:", error);
        showAlert(
          "Feil!\r\nNoe gikk galt under sletting av vare. Vennligst prøv igjen.",
          "error"
        );
      });
  }
});