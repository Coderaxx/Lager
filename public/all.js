$(document).ready(() => {
    const itemContainer = document.getElementById("itemTableBody");

    // Oppdater varetabellen
    function updateItemsTable(items) {
        console.log("Updating items table:", items);
        itemContainer.innerHTML = "";

        let currentLocation = null;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.location !== currentLocation) {
                const locationRow = document.createElement("tr");
                const locationHeader = document.createElement("th");
                locationHeader.setAttribute("colspan", "4");
                locationHeader.setAttribute("align", "center");
                locationHeader.textContent = item.location;
                locationRow.appendChild(locationHeader);
                itemContainer.appendChild(locationRow);

                currentLocation = item.location;
            }

            const row = document.createElement("tr");
            const nameCell = document.createElement("td");
            nameCell.textContent = item.brand + " " + item.model;
            const barcodeCell = document.createElement("td");
            barcodeCell.textContent = item.barcode;
            const articleNumberCell = document.createElement("td");
            articleNumberCell.textContent = item.articleNumber;
            const locationCell = document.createElement("td");
            locationCell.textContent = item.location;

            row.appendChild(nameCell);
            row.appendChild(barcodeCell);
            row.appendChild(articleNumberCell);
            row.appendChild(locationCell);
            itemContainer.appendChild(row);
        }
    }

    // Hent varer fra inventory
    async function getItems() {
        try {
            const response = await axios.get("/inventory");
            const data = response.data;
            console.log("Received items data:", data);
            if (Array.isArray(data) && data.length > 0) {
                const items = data.flatMap((inventory) =>
                    inventory.shelves.flatMap((shelf) =>
                        shelf.levels.flatMap((level) => level.items)
                    )
                );
                if (items.length > 0) {
                    updateItemsTable(items);
                } else {
                    console.error("No items found in data");
                }
            } else {
                console.error("No inventory data found");
            }
        } catch (error) {
            Sentry.captureException(error);
            console.error("Feil ved henting av varer:", error);
        }
    }

    // Kall getItems() ved lasting av siden
    console.log("Fetching items...");
    getItems();
});