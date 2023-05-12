$(document).ready(() => {
  const inventoryTableBody = $("#inventoryTableBody");

  // Hjelpefunksjon for å opprette en rad i tabellen
  function createTableRow(item) {
    const { brand, model, barcode, location } = item;

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
  .then(response => response.json())
  .then(data => {
    const items = Object.values(data).flatMap(category =>
      Object.values(category).flatMap(section =>
        Object.values(section).flatMap(level =>
          Object.values(level)
          )
        )
      );

    items.forEach(item => {
      const row = createTableRow(item);
      inventoryTableBody.append(row);
    });
  })
  .catch(error => {
    console.error("Feil ved henting av lageret:", error);
    alert("Noe gikk galt. Vennligst prøv igjen.");
  });

// Slett vare
  function deleteItem(barcode) {
    fetch(`/inventory/${barcode}`, {
      method: "DELETE",
    })
    .then(response => {
      if (response.ok) {
        alert("Vare slettet!");
        location.reload();
      } else {
        console.error("Feil ved sletting av vare:", response);
        alert("Noe gikk galt. Vennligst prøv igjen.");
      }
    })
    .catch(error => {
      console.error("Feil ved sletting av vare:", error);
      alert("Noe gikk galt. Vennligst prøv igjen.");
    });
  }

// Hent lageret fra serveren
  fetch("/inventory")
  .then(response => response.json())
  .then(data => {
    const items = Object.values(data).flatMap(category =>
      Object.values(category).flatMap(section =>
        Object.values(section).flatMap(level =>
          Object.values(level)
          )
        )
      );

    items.forEach(item => {
      const row = createTableRow(item);
      inventoryTableBody.append(row);
    });
  })
  .catch(error => {
    console.error("Feil ved henting av lageret:", error);
    alert("Noe gikk galt. Vennligst prøv igjen.");
  });