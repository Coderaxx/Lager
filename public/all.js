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
