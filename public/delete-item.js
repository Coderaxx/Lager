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
      const { merke, modell, strekkode, antall } = item;

      const row = $("<tr></tr>");
      row.append(`<td>${merke}</td>`);
      row.append(`<td>${modell}</td>`);
      row.append(`<td>${strekkode}</td>`);
      row.append(`<td>${location}</td>`);
      row.append(`<td>${antall}</td>`);

      const deleteButton = $(`<button class="button is-danger">Slett</button>`);
      deleteButton.click(() => {
        deleteItem(strekkode, row);
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
        const items = Object.entries(data).flatMap(([category, shelf]) =>
          Object.entries(shelf).flatMap(([shelf, section]) =>
            Object.entries(section).flatMap(([section, levels]) =>
              Object.entries(levels).flatMap(([level, items]) =>
                Object.entries(items).map(([location, item]) => {
                  return {
                    item,
                    location: `${category}.${shelf}.${section}.${level}.${location}`,
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
