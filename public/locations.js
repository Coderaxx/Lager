$(document).ready(() => {
    const addLocationForm = document.getElementById("addLocationForm");
    const locationInput = document.getElementById("locationInput");
    const locationsContainer = document.getElementById("locationsContainer");

    // Oppdater plasseringstabellene
    function updateLocationsTables(locations) {
        locationsContainer.innerHTML = "";

        locations.forEach((shelf) => {
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

            shelf.sections.forEach((section) => {
                section.levels.forEach((level) => {
                    const row = document.createElement("tr");
                    const sectionCell = document.createElement("td");
                    sectionCell.textContent = section.name;
                    const levelCell = document.createElement("td");
                    levelCell.textContent = level.name;
                    const actionCell = document.createElement("td");
                    const deleteButton = document.createElement("button");
                    deleteButton.textContent = "Slett";
                    deleteButton.classList.add("button", "is-danger", "is-small");
                    deleteButton.addEventListener("click", () => {
                        deleteLocation(shelf.name, section.name, level.name);
                    });

                    actionCell.appendChild(deleteButton);
                    row.appendChild(sectionCell);
                    row.appendChild(levelCell);
                    row.appendChild(actionCell);
                    tableBody.appendChild(row);
                });
            });

            shelfTable.appendChild(tableBody);
            locationsContainer.appendChild(shelfTable);
        });
    }

    // Hent eksisterende plasseringer fra serveren
    function getLocations() {
        fetch("/locations")
            .then((response) => response.json())
            .then((data) => {
                updateLocationsTables(data.locations);
            })
            .catch((error) => {
                console.error("Feil ved henting av plasseringer:", error);
            });
    }

    // Legg til en ny plassering
    function addLocation(shelf, section, level) {
        const location = `${shelf}.${section}.${level}`;

        fetch("/locations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ location }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    getLocations();
                    locationInput.value = "";
                } else {
                    console.error("Feil ved legging til plassering:", data.error);
                }
            })
            .catch((error) => {
                console.error("Feil ved legging til plassering:", error);
            });
    }

    // Slett en plassering
    function deleteLocation(shelf, section, level) {
        const location = `${shelf}.${section}.${level}`;

        fetch(`/locations/${location}`, {
            method: "DELETE",
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    getLocations();
                } else {
                    console.error("Feil ved sletting av plassering:", data.error);
                }
            })
            .catch((error) => {
                console.error("Feil ved sletting av plassering:", error);
            });
    }

    // Lytt til innsending av skjema for å legge til en ny plassering
    addLocationForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const [shelf, section, level] = locationInput.value.trim().split(".");
        if (shelf && section && level) {
            addLocation(shelf, section, level);
        }
    });

    // Hent og vis plasseringer ved lasting av siden
    getLocations();
});