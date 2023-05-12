$(document).ready(() => {
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

    // Hent lageret fra serveren
    fetch("/inventory")
      .then((response) => response.json())
      .then((data) => {
        const items = Object.entries(data).flatMap(([category, sections]) =>
          Object.entries(sections).flatMap(([section, levels]) =>
            Object.entries(levels).flatMap(([level, items]) =>
              Object.entries(items).map(([location, item]) => {
                return {
                  item,
                  location: `H21.${category}.${section}.${level}`,
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
  function deleteItem(barcode) {
    fetch(`/inventory/${barcode}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          showAlert("Suksess", "Vare slettet!", "success");
          const row = $(`tr:has(td:contains(${barcode}))`);
          row.remove();
        } else {
          console.error("Feil ved sletting av vare:", response);
        showAlert("Feil", "Noe gikk galt under sletting av vare. Vennligst prøv igjen.",
            "error");
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
