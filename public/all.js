$(document).ready(() => {
    const itemContainer = document.getElementById("itemTableBody");

    // Oppdater varetabellen
    function updateItemsTable(items) {
        console.log("Updating items table:", items);
        itemContainer.innerHTML = "";

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

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

    // Hent varer fra inventory.json
    async function getItems() {
        try {
            const response = await axios.get("/inventory");
            const data = response.data;
            console.log("Received items data:", data);
            if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
                const items = [];
                for (const category of data.categories) {
                    for (const shelf of category.shelves) {
                        for (const level of shelf.levels) {
                            if (level.items && Array.isArray(level.items) && level.items.length > 0) {
                                items.push(...level.items);
                            }
                        }
                    }
                }
                if (items.length > 0) {
                    updateItemsTable(items);
                } else {
                    console.error("No items found in data");
                }
            } else {
                console.error("No categories found in data");
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
