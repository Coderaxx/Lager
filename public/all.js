$(document).ready(() => {
    const itemContainer = document.getElementById("itemTableBody");

    // Oppdater varetabellen
    function updateItemsTable(items) {
        console.log("Updating items table:", items);
        itemContainer.innerHTML = "";

        for (const item of items) {
            const row = document.createElement("tr");
            const nameCell = document.createElement("td");
            nameCell.textContent = item.name;
            const descriptionCell = document.createElement("td");
            descriptionCell.textContent = item.description;
            const quantityCell = document.createElement("td");
            quantityCell.textContent = item.quantity;

            row.appendChild(nameCell);
            row.appendChild(descriptionCell);
            row.appendChild(quantityCell);
            itemContainer.appendChild(row);
        }
    }

    // Hent varer fra inventory.json
    async function getItems() {
        try {
            const response = await axios.get("/inventory");
            const data = response.data;
            console.log("Received items data:", data);
            if (data && Array.isArray(data) && data.length > 0) {
                updateItemsTable(data);
            } else {
                console.error("No items found in data");
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
