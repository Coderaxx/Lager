$(document).ready(() => {
    const addLocationForm = document.getElementById("addLocationForm");
    const locationInput = document.getElementById("locationInput");
    const locationsContainer = document.getElementById("locationsTableBody");

    // Oppdater plasseringstabellene
    function updateLocationsTables(locations) {
        locationsContainer.innerHTML = "";

        for (const shelfName in locations) {
            const shelfTable = document.createElement("table");
            shelfTable.classList.add("table", "is-hoverable", "is-striped", "is-fullwidth");

            const tableHead = document.createElement("thead");
            const headRow = document.createElement("tr");
            const sectionHead = document.createElement("th");
            sectionHead.textContent = "Seksjon";
            const levelHead = document.createElement("th");
            levelHead.textContent = "Etasje";
            const actionHead = document.createElement("th");
            actionHead.textContent = "";

            headRow.appendChild(sectionHead);
            headRow.appendChild(levelHead);
            headRow.appendChild(actionHead);
            tableHead.appendChild(headRow);
            shelfTable.appendChild(tableHead);

            const tableBody = document.createElement("tbody");

            const sections = locations[shelfName];
            for (const sectionName in sections) {
                const levels = sections[sectionName];
                for (const levelName in levels) {
                    const row = document.createElement("tr");
                    const sectionCell = document.createElement("td");
                    sectionCell.textContent = shelfName + "." + sectionName;
                    const levelCell = document.createElement("td");
                    levelCell.textContent = levelName;
                    const actionCell = document.createElement("td");
                    const deleteButton = document.createElement("button");
                    deleteButton.textContent = "Slett";
                    deleteButton.classList.add("button", "is-danger", "is-small");
                    deleteButton.addEventListener("click", () => {
                        deleteLocation(shelfName, sectionName, levelName);
                    });

                    actionCell.appendChild(deleteButton);
                    row.appendChild(sectionCell);
                    row.appendChild(levelCell);
                    row.appendChild(actionCell);
                    tableBody.appendChild(row);
                }
            }

            shelfTable.appendChild(tableBody);
            locationsContainer.appendChild(shelfTable);
        }
    }

    // Hent eksisterende plasseringer fra serveren
    async function getLocations() {
        try {
            const response = await axios.get("/locations");
            const data = response.data;
            updateLocationsTables(data);
        } catch (error) {
            Sentry.captureException(error);
            console.error("Feil ved henting av plasseringer:", error);
            Sentry.captureException(error);
        }
    }

    // Legg til en ny plassering
    async function addLocation(shelf, section, level) {
        const location = `${shelf}.${section}.${level}`;

        try {
            const response = await axios.post("/locations", { location });
            const data = response.data;
            if (data.success) {
                await getLocations();
                locationInput.value = "";
            } else {
                console.error("Feil ved legging til plassering:", data.error);
            }
        } catch (error) {
            Sentry.captureException(error);
            console.error("Feil ved legging til plassering:", error);
        }
    }

    // Slett en plassering
    async function deleteLocation(shelf, section, level) {
        const location = `${shelf}.${section}.${level}`;

        try {
            const response = await axios.delete(`/locations/${location}`);
            const data = response.data;
            if (data.success) {
                await getLocations();
            } else {
                console.error("Feil ved sletting av plassering:", data.error);
            }
        } catch (error) {
            Sentry.captureException(error);
            console.error("Feil ved sletting av plassering:", error);
        }
    }

    // Lytt til innsending av skjema for å legge til en ny plassering
    addLocationForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const location = locationInput.value.trim();
        if (location) {
            const locationParts = location.split(".");
            if (locationParts.length === 2) {
                const shelf = locationParts[0];
                const section = locationParts[1];
                const level = "1";
                addLocation(shelf, section, level);
            } else if (locationParts.length === 3) {
                const shelf = locationParts[0];
                const section = locationParts[1];
                const level = locationParts[2];
                addLocation(shelf, section, level);
            } else {
                console.error("Feil format på plassering");
            }
        }
    });

    // Hent og vis plasseringer ved lasting av siden
    getLocations();
});